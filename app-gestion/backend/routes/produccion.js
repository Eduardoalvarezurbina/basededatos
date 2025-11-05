const express = require('express');
const { Pool } = require('pg');
const { verifyToken, authorizeRole } = require('./authMiddleware');
const router = express.Router();


// DB Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});



// GET /produccion/iniciada - Obtiene las jornadas de producción que aún no han finalizado
router.get('/iniciada', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pd.*, fp.formato, p.nombre as nombre_producto
      FROM Produccion_Diaria pd
      JOIN Formatos_Producto fp ON pd.id_formato_producto = fp.id_formato_producto
      JOIN Productos p ON fp.id_producto = p.id_producto
      WHERE pd.estado = 'Iniciada'
      ORDER BY pd.fecha_jornada, p.nombre
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting initiated production shifts:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /produccion/iniciar - Guarda el inicio de una o más jornadas de producción
router.post('/iniciar', authorizeRole(['admin', 'trabajador']), async (req, res) => {
  // El body es un array de: { id_formato_producto, etiqueta_inicial, origen, id_trabajador }
  const jornadasIniciadas = req.body;

  if (!Array.isArray(jornadasIniciadas) || jornadasIniciadas.length === 0) {
    return res.status(400).json({ message: 'Input must be an array of production entries' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultados = [];
    for (const jornada of jornadasIniciadas) {
      const { id_proceso, etiqueta_inicial, origen, id_trabajador } = jornada;

      const result = await client.query(
        'INSERT INTO Produccion_Diaria (id_proceso, id_trabajador, etiqueta_inicial, costo_por_unidad, origen, hora_inicio) VALUES ($1, $2, $3, 0, $4, CURRENT_TIME) RETURNING *',
        [id_proceso, id_trabajador, etiqueta_inicial, origen]
      );
      resultados.push(result.rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json({ message: 'Production shifts started successfully', jornadas: resultados });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error starting production shifts:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

// PUT /produccion/:id/finalizar - Finaliza una jornada, crea los lotes y mueve el inventario
router.put('/:id/finalizar', authorizeRole(['admin', 'trabajador']), async (req, res) => {
  const { id } = req.params;
  // Ahora aceptamos opcionalmente las etiquetas defectuosas
  const { etiqueta_final, etiquetas_defectuosas } = req.body;

  if (!etiqueta_final) {
    return res.status(400).json({ message: 'Final label is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener y bloquear la jornada
    const jornadaResult = await client.query("SELECT * FROM Produccion_Diaria WHERE id_produccion_diaria = $1 AND estado = 'Iniciada' FOR UPDATE", [id]);
    if (jornadaResult.rowCount === 0) {
      throw new Error('Production shift not found or already finalized.');
    }
    const jornada = jornadaResult.rows[0];

    if (etiqueta_final < jornada.etiqueta_inicial) {
      throw new Error('Final label cannot be less than the initial label.');
    }

    // 2. Actualizar la jornada a 'Finalizada' con la nueva información
    await client.query(
      "UPDATE Produccion_Diaria SET etiqueta_final = $1, estado = 'Finalizada', hora_finalizacion = CURRENT_TIME, etiquetas_defectuosas = $2 WHERE id_produccion_diaria = $3",
      [etiqueta_final, etiquetas_defectuosas, id]
    );

    // 3. Crear los lotes, omitiendo los defectuosos
    const defectiveSet = new Set((etiquetas_defectuosas || '').split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)));
    let lotesCreados = 0;

    const formatoResult = await client.query('SELECT id_producto FROM Formatos_Producto WHERE id_formato_producto = $1', [jornada.id_formato_producto]);
    const id_producto_lote = formatoResult.rows[0].id_producto;

    for (let i = jornada.etiqueta_inicial; i <= etiqueta_final; i++) {
      if (!defectiveSet.has(i)) {
        const codigo_lote = `LOTE-${jornada.id_formato_producto}-${jornada.fecha_jornada.toISOString().slice(0,10)}-${i}`;
        await client.query(
          'INSERT INTO Lotes_Produccion (codigo_lote, id_producto, fecha_produccion, cantidad_inicial, costo_por_unidad, origen) VALUES ($1, $2, $3, $4, $5, $6)',
          [codigo_lote, id_producto_lote, jornada.fecha_jornada, 1, jornada.costo_por_unidad, jornada.origen]
        );
        lotesCreados++;
      }
    }

    // 4. Lógica de transformación de inventario basada en el Proceso
    const procesoResult = await client.query(
      'SELECT p.id_formato_producto_final, dp.id_formato_producto_ingrediente, dp.cantidad_requerida FROM Procesos p JOIN Detalle_Procesos dp ON p.id_proceso = dp.id_proceso WHERE p.id_proceso = $1',
      [jornada.id_proceso]
    );

    if (procesoResult.rowCount === 0) {
      throw new Error(`Proceso con ID ${jornada.id_proceso} no encontrado.`);
    }

    // Descontar cada ingrediente del inventario
    for (const ingrediente of procesoResult.rows) {
      const cantidadConsumida = lotesCreados * ingrediente.cantidad_requerida;
      const updateIngredienteResult = await client.query(
        'UPDATE Inventario SET stock_actual = stock_actual - $1 WHERE id_formato_producto = $2 AND id_ubicacion = 1 AND stock_actual >= $1', // Asumiendo ubicación 1 para materia prima
        [cantidadConsumida, ingrediente.id_formato_producto_ingrediente]
      );
      if (updateIngredienteResult.rowCount === 0) {
        throw new Error(`Stock insuficiente para el ingrediente ID ${ingrediente.id_formato_producto_ingrediente}.`);
      }
    }

    // Sumar el producto final al inventario
    const productoFinal = procesoResult.rows[0]; // Todos los detalles de un proceso llevan al mismo producto final
    const updateProductoFinalResult = await client.query(
      'UPDATE Inventario SET stock_actual = stock_actual + $1 WHERE id_formato_producto = $2 AND id_ubicacion = 2', // Asumiendo ubicación 2 para producto terminado
      [lotesCreados, productoFinal.id_formato_producto_final]
    );

    if (updateProductoFinalResult.rowCount === 0) {
      await client.query(
        'INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual) VALUES ($1, $2, $3)',
        [productoFinal.id_formato_producto_final, 2, lotesCreados]
      );
    }

    await client.query('COMMIT');
    res.status(200).json({ message: `Production shift finalized. ${lotesCreados} lots created successfully.` });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error finalizing production shift:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;