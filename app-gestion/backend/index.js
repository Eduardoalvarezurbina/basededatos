const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const productsRouter = require('./routes/products');
const ubicacionesRouter = require('./routes/ubicaciones');
const tiposClienteRouter = require('./routes/tiposCliente');
const inventarioRouter = require('./routes/inventario');
const ciudadesRouter = require('./routes/ciudades');
const tiposPagoRouter = require('./routes/tiposPago');
const fuentesContactoRouter = require('./routes/fuentesContacto');
const puntosVentaRouter = require('./routes/puntosVenta');
const trabajadoresRouter = require('./routes/trabajadores');
const regionesRouter = require('./routes/regiones');
const comunasRouter = require('./routes/comunas');
const categoriasClienteRouter = require('./routes/categoriasCliente');
const clasificacionesClienteRouter = require('./routes/clasificacionesCliente');
const frecuenciasCompraRouter = require('./routes/frecuenciasCompra');
const tiposConsumoRouter = require('./routes/tiposConsumo');
const cuentasBancariasRouter = require('./routes/cuentasBancarias');
const clientsRouter = require('./routes/clients');
const proveedoresRouter = require('./routes/proveedores');
const comprasRouter = require('./routes/compras');

const app = express();
const port = 3001;

// DB Connection
// Lee la configuración de la base de datos desde variables de entorno para que sea compatible con Docker.
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});

app.use(cors());
app.use(express.json());

app.use('/products', productsRouter);
app.use('/ubicaciones', ubicacionesRouter);
app.use('/tipos-cliente', tiposClienteRouter);
app.use('/inventario', inventarioRouter);
app.use('/ciudades', ciudadesRouter);
app.use('/tipos-pago', tiposPagoRouter);
app.use('/fuentes-contacto', fuentesContactoRouter);
app.use('/puntos-venta', puntosVentaRouter);
app.use('/trabajadores', trabajadoresRouter);
app.use('/regiones', regionesRouter);
app.use('/comunas', comunasRouter);
app.use('/categorias-cliente', categoriasClienteRouter);
app.use('/clasificaciones-cliente', clasificacionesClienteRouter);
app.use('/frecuencias-compra', frecuenciasCompraRouter);
app.use('/tipos-consumo', tiposConsumoRouter);
app.use('/cuentas-bancarias', cuentasBancariasRouter);
app.use('/clients', clientsRouter);
app.use('/proveedores', proveedoresRouter);
app.use('/compras', comprasRouter);

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM Usuarios WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({ message: 'Login successful', role: user.role });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});






// GET /formatos-producto - Obtener todos los formatos de producto
app.get('/formatos-producto', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT fp.*, p.nombre as nombre_producto
      FROM Formatos_Producto fp
      JOIN Productos p ON fp.id_producto = p.id_producto
      ORDER BY p.nombre, fp.formato
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting product formats:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /formatos-producto - Crear un nuevo formato de producto
app.post('/formatos-producto', async (req, res) => {
  const { id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Formatos_Producto (id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating product format:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /formatos-producto/:id - Eliminar un formato de producto
app.delete('/formatos-producto/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Importante: Considerar si se debe permitir borrar formatos usados en ventas, etc.
    // Por ahora, se permite el borrado directo.
    const result = await pool.query('DELETE FROM Formatos_Producto WHERE id_formato_producto = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product format not found' });
    }
    res.json({ message: 'Product format deleted successfully', formato: result.rows[0] });
  } catch (err) {
    console.error('Error deleting product format:', err);
    // Manejar error de FK si el formato está en uso
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this format because it is referenced by other records (e.g., inventory, sales).', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /formatos-producto/:id - Actualizar un formato de producto y registrar cambios de precio
app.put('/formatos-producto/:id', async (req, res) => {
  const { id } = req.params;
  const { formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener los precios actuales antes de actualizar
    const preciosAnterioresResult = await client.query(
      'SELECT precio_detalle_neto, precio_mayorista_neto FROM Formatos_Producto WHERE id_formato_producto = $1',
      [id]
    );

    if (preciosAnterioresResult.rowCount === 0) {
      // Lanza un error que será capturado por el bloque catch
      throw new Error('Product format not found');
    }
    const preciosAnteriores = preciosAnterioresResult.rows[0];

    // 2. Actualizar el formato del producto
    const result = await client.query(
      'UPDATE Formatos_Producto SET formato = $1, precio_detalle_neto = $2, precio_mayorista_neto = $3, ultimo_costo_neto = $4, unidad_medida = $5 WHERE id_formato_producto = $6 RETURNING *',
      [formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida, id]
    );

    // 3. Comparar precios y si han cambiado, insertar en el historial
    const precioDetalleCambio = precio_detalle_neto !== undefined && parseFloat(precio_detalle_neto) !== parseFloat(preciosAnteriores.precio_detalle_neto);
    const precioMayoristaCambio = precio_mayorista_neto !== undefined && parseFloat(precio_mayorista_neto) !== parseFloat(preciosAnteriores.precio_mayorista_neto);

    if (precioDetalleCambio || precioMayoristaCambio) {
      await client.query(
        'INSERT INTO Historial_Precios (id_formato_producto, precio_detalle_neto_anterior, precio_detalle_neto_nuevo, precio_mayorista_neto_anterior, precio_mayorista_neto_nuevo) VALUES ($1, $2, $3, $4, $5)',
        [id, preciosAnteriores.precio_detalle_neto, precio_detalle_neto, preciosAnteriores.precio_mayorista_neto, precio_mayorista_neto]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Product format updated successfully', formato_producto: result.rows[0] });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating product format:', err);
    if (err.message === 'Product format not found') {
        return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

// GET /historial-precios/:id_formato_producto - Obtener el historial de precios de un formato de producto
app.get('/historial-precios/:id_formato_producto', async (req, res) => {
  const { id_formato_producto } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Historial_Precios WHERE id_formato_producto = $1 ORDER BY fecha_cambio DESC', [id_formato_producto]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting price history:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// --- Endpoints para Lotes de Producción ---

// GET /lotes - Obtener todos los lotes
app.get('/lotes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Lotes_Produccion ORDER BY fecha_produccion DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /lotes/:id - Obtener un lote por ID
app.get('/lotes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Lotes_Produccion WHERE id_lote = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Lot not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /lotes - Crear un nuevo lote
app.post('/lotes', async (req, res) => {
  const { codigo_lote, id_producto, fecha_produccion, fecha_vencimiento, cantidad_inicial, unidad_medida, costo_por_unidad, origen } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Lotes_Produccion (codigo_lote, id_producto, fecha_produccion, fecha_vencimiento, cantidad_inicial, unidad_medida, costo_por_unidad, origen) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [codigo_lote, id_producto, fecha_produccion, fecha_vencimiento, cantidad_inicial, unidad_medida, costo_por_unidad, origen]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating lot:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /lotes/:id - Actualizar un lote
app.put('/lotes/:id', async (req, res) => {
  const { id } = req.params;
  const { codigo_lote, id_producto, fecha_produccion, fecha_vencimiento, cantidad_inicial, unidad_medida, costo_por_unidad, origen } = req.body;
  try {
    const result = await pool.query(
      'UPDATE Lotes_Produccion SET codigo_lote = $1, id_producto = $2, fecha_produccion = $3, fecha_vencimiento = $4, cantidad_inicial = $5, unidad_medida = $6, costo_por_unidad = $7, origen = $8 WHERE id_lote = $9 RETURNING *',
      [codigo_lote, id_producto, fecha_produccion, fecha_vencimiento, cantidad_inicial, unidad_medida, costo_por_unidad, origen, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Lot not found' });
    }
    res.json({ message: 'Lot updated successfully', lot: result.rows[0] });
  } catch (err) {
    console.error('Error updating lot:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /lotes/:id - Eliminar un lote
app.delete('/lotes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Opcional: Se podría verificar si el lote está en uso antes de borrar.
    const result = await pool.query('DELETE FROM Lotes_Produccion WHERE id_lote = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Lot not found' });
    }
    res.json({ message: 'Lot deleted successfully', lot: result.rows[0] });
  } catch (err) {
    console.error('Error deleting lot:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// --- Endpoints para Gestión de Procesos ---

// POST /procesos - Crear un nuevo proceso con sus detalles
app.post('/procesos', async (req, res) => {
  const { nombre_proceso, tipo_proceso, id_formato_producto_final, observacion, ingredientes } = req.body;

  if (!nombre_proceso || !tipo_proceso || !id_formato_producto_final || !ingredientes || !Array.isArray(ingredientes) || ingredientes.length === 0) {
    return res.status(400).json({ message: 'Missing required fields for process creation.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insertar en la tabla principal de Procesos
    const procesoResult = await client.query(
      'INSERT INTO Procesos (nombre_proceso, tipo_proceso, id_formato_producto_final, observacion) VALUES ($1, $2, $3, $4) RETURNING id_proceso',
      [nombre_proceso, tipo_proceso, id_formato_producto_final, observacion]
    );
    const newProcesoId = procesoResult.rows[0].id_proceso;

    // Insertar cada ingrediente en Detalle_Procesos
    for (const ingrediente of ingredientes) {
      await client.query(
        'INSERT INTO Detalle_Procesos (id_proceso, id_formato_producto_ingrediente, cantidad_requerida) VALUES ($1, $2, $3)',
        [newProcesoId, ingrediente.id_formato_producto_ingrediente, ingrediente.cantidad_requerida]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Process created successfully', id_proceso: newProcesoId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating process:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

// GET /procesos - Obtener todos los procesos con sus detalles
app.get('/procesos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id_proceso, p.nombre_proceso, p.tipo_proceso, p.observacion,
        fp.formato as formato_producto_final,
        prod.nombre as nombre_producto_final,
        (SELECT json_agg(json_build_object(
          'id_detalle_proceso', dp.id_detalle_proceso,
          'id_formato_producto_ingrediente', dp.id_formato_producto_ingrediente,
          'cantidad_requerida', dp.cantidad_requerida,
          'nombre_ingrediente', p_ing.nombre,
          'formato_ingrediente', fp_ing.formato
        )) FROM Detalle_Procesos dp
           JOIN Formatos_Producto fp_ing ON dp.id_formato_producto_ingrediente = fp_ing.id_formato_producto
           JOIN Productos p_ing ON fp_ing.id_producto = p_ing.id_producto
           WHERE dp.id_proceso = p.id_proceso
        ) as ingredientes
      FROM Procesos p
      JOIN Formatos_Producto fp ON p.id_formato_producto_final = fp.id_formato_producto
      JOIN Productos prod ON fp.id_producto = prod.id_producto
      ORDER BY p.nombre_proceso
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting processes:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /procesos/:id - Actualizar un proceso (incluyendo detalles)
app.put('/procesos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre_proceso, tipo_proceso, id_formato_producto_final, observacion, ingredientes } = req.body;

  if (!nombre_proceso || !tipo_proceso || !id_formato_producto_final || !ingredientes || !Array.isArray(ingredientes) || ingredientes.length === 0) {
    return res.status(400).json({ message: 'Missing required fields for process update.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Actualizar la tabla principal
    await client.query(
      'UPDATE Procesos SET nombre_proceso = $1, tipo_proceso = $2, id_formato_producto_final = $3, observacion = $4 WHERE id_proceso = $5',
      [nombre_proceso, tipo_proceso, id_formato_producto_final, observacion, id]
    );

    // 2. Borrar los detalles antiguos
    await client.query('DELETE FROM Detalle_Procesos WHERE id_proceso = $1', [id]);

    // 3. Insertar los nuevos detalles
    for (const ingrediente of ingredientes) {
      await client.query(
        'INSERT INTO Detalle_Procesos (id_proceso, id_formato_producto_ingrediente, cantidad_requerida) VALUES ($1, $2, $3)',
        [id, ingrediente.id_formato_producto_ingrediente, ingrediente.cantidad_requerida]
      );
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Process updated successfully', id_proceso: id });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating process:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /procesos/:id - Eliminar un proceso
app.delete('/procesos/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Primero eliminar los detalles para no violar la FK
    await client.query('DELETE FROM Detalle_Procesos WHERE id_proceso = $1', [id]);
    // Luego eliminar el proceso principal
    const result = await client.query('DELETE FROM Procesos WHERE id_proceso = $1 RETURNING *', [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Process not found');
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Process deleted successfully', proceso: result.rows[0] });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting process:', err);
    if (err.message === 'Process not found') {
      return res.status(404).json({ message: 'Process not found' });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});



// GET /produccion/iniciada - Obtiene las jornadas de producción que aún no han finalizado
app.get('/produccion/iniciada', async (req, res) => {
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
app.post('/produccion/iniciar', async (req, res) => {
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
app.put('/produccion/:id/finalizar', async (req, res) => {
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

// --- Endpoints para Reclamos ---

// GET /reclamos - Obtener todos los reclamos
app.get('/reclamos', async (req, res) => {
  try {
    // Unir con la tabla de clientes para obtener el nombre del cliente
    const result = await pool.query(`
      SELECT r.*, c.nombre as nombre_cliente 
      FROM Reclamos r
      LEFT JOIN Clientes c ON r.id_cliente = c.id_cliente
      ORDER BY fecha_reclamo DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting claims:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /reclamos - Crear un nuevo reclamo
app.post('/reclamos', async (req, res) => {
  const { id_cliente, id_venta, descripcion } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Reclamos (id_cliente, id_venta, descripcion) VALUES ($1, $2, $3) RETURNING *',
      [id_cliente, id_venta, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating claim:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /reclamos/:id - Actualizar un reclamo (ej. cambiar estado)
app.put('/reclamos/:id', async (req, res) => {
  const { id } = req.params;
  const { estado, solucion_entregada } = req.body;
  
  let updateQuery = 'UPDATE Reclamos SET ';
  const queryParams = [];
  let paramIndex = 1;

  if (estado !== undefined) {
    updateQuery += `estado = $${paramIndex++}, `;
    queryParams.push(estado);
  }
  if (solucion_entregada !== undefined) {
    updateQuery += `solucion_entregada = $${paramIndex++}, `;
    queryParams.push(solucion_entregada);
  }

  if (estado === 'Resuelto' || estado === 'Cerrado') {
      updateQuery += `fecha_resolucion = CURRENT_TIMESTAMP, `;
  }

  updateQuery = updateQuery.slice(0, -2);
  updateQuery += ` WHERE id_reclamo = $${paramIndex} RETURNING *`;
  queryParams.push(id);

  if (queryParams.length <= 1) {
      return res.status(400).json({ message: 'No fields to update provided' });
  }

  try {
    const result = await pool.query(updateQuery, queryParams);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Claim not found' });
    }
    res.json({ message: 'Claim updated successfully', claim: result.rows[0] });
  } catch (err) {
    console.error('Error updating claim:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /reclamos/:id - Eliminar un reclamo
app.delete('/reclamos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Reclamos WHERE id_reclamo = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Claim not found' });
    }
    res.json({ message: 'Claim deleted successfully', claim: result.rows[0] });
  } catch (err) {
    console.error('Error deleting claim:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// --- Endpoints para Pedidos (Flujo de Agendamiento) ---

// POST /pedidos - Agenda un pedido y descuenta el stock para reservar
app.post('/pedidos', async (req, res) => {
  const { id_cliente, id_trabajador, total, fecha_entrega, detalles } = req.body;
  // 'detalles' es un array de { id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion }

  if (!detalles || detalles.length === 0) {
    return res.status(400).json({ message: 'Order details cannot be empty' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insertar en la tabla principal de Pedidos
    const pedidoResult = await client.query(
      'INSERT INTO Pedidos (id_cliente, id_trabajador, total, estado, fecha, fecha_entrega) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5) RETURNING id_pedido',
      [id_cliente, id_trabajador, total, 'Agendado', fecha_entrega]
    );
    const newPedidoId = pedidoResult.rows[0].id_pedido;

    // 2. Iterar sobre los detalles para insertarlos y descontar el inventario
    for (const item of detalles) {
      // 2a. Insertar en Detalle_Pedidos (ahora con lote y ubicacion)
      await client.query(
        'INSERT INTO Detalle_Pedidos (id_pedido, id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion) VALUES ($1, $2, $3, $4, $5, $6)',
        [newPedidoId, item.id_formato_producto, item.cantidad, item.precio_unitario, item.id_lote, item.id_ubicacion]
      );

      // 2b. Descontar del inventario
      const updateInventarioResult = await client.query(
        'UPDATE Inventario SET stock_actual = stock_actual - $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_formato_producto = $2 AND id_ubicacion = $3 AND stock_actual >= $1',
        [item.cantidad, item.id_formato_producto, item.id_ubicacion]
      );
      
      if (updateInventarioResult.rowCount === 0) {
        throw new Error(`Not enough stock for product format ${item.id_formato_producto} in location ${item.id_ubicacion}.`);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Order scheduled successfully', id_pedido: newPedidoId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error scheduling order:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

// POST /pedidos/:id/convertir-a-venta - Convierte un pedido agendado en una venta final
app.post('/pedidos/:id/convertir-a-venta', async (req, res) => {
    const { id } = req.params;
    const { id_punto_venta, id_tipo_pago, con_factura, neto_venta, iva_venta, total_bruto_venta, estado_pago, observacion } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Obtener datos del pedido y sus detalles
        const pedidoResult = await client.query('SELECT * FROM Pedidos WHERE id_pedido = $1 AND estado = \'Agendado\'', [id]);
        if (pedidoResult.rowCount === 0) {
            throw new Error('Order not found or already processed.');
        }
        const pedido = pedidoResult.rows[0];

        const detallesPedidoResult = await client.query('SELECT * FROM Detalle_Pedidos WHERE id_pedido = $1', [id]);
        const detallesPedido = detallesPedidoResult.rows;

        // 2. Crear el registro de Venta
        const ventaResult = await client.query(
            `INSERT INTO Ventas (id_cliente, id_punto_venta, id_tipo_pago, id_trabajador, neto_venta, iva_venta, total_bruto_venta, con_iva_venta, observacion, estado, estado_pago, con_factura, fecha, hora) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_DATE, CURRENT_TIME) RETURNING id_venta`,
            [pedido.id_cliente, id_punto_venta, id_tipo_pago, pedido.id_trabajador, neto_venta, iva_venta, total_bruto_venta, true, observacion, 'Finalizada', estado_pago, con_factura]
        );
        const newVentaId = ventaResult.rows[0].id_venta;

        // 3. Crear los detalles de la venta, ahora con la información correcta
        for (const detalle of detallesPedido) {
            const loteResult = await client.query('SELECT costo_por_unidad FROM Lotes_Produccion WHERE id_lote = $1', [detalle.id_lote]);
            if (loteResult.rowCount === 0) {
                throw new Error(`Lot with id ${detalle.id_lote} not found for product in order.`);
            }
            const costoUnitario = loteResult.rows[0].costo_por_unidad;

            await client.query(
                'INSERT INTO Detalle_Ventas (id_venta, id_formato_producto, cantidad, precio_unitario, id_lote, costo_unitario_en_venta) VALUES ($1, $2, $3, $4, $5, $6)',
                [newVentaId, detalle.id_formato_producto, detalle.cantidad, detalle.precio_unitario, detalle.id_lote, costoUnitario]
            );
        }
        
        // 4. Actualizar la fecha de última compra del cliente
        if (pedido.id_cliente) {
            await client.query('UPDATE Clientes SET fecha_ultima_compra = CURRENT_DATE WHERE id_cliente = $1', [pedido.id_cliente]);
        }

        // 5. Actualizar estado del pedido
        await client.query('UPDATE Pedidos SET estado = \'Convertido a Venta\' WHERE id_pedido = $1', [id]);

        await client.query('COMMIT');
        res.status(201).json({ message: 'Order converted to sale successfully', id_venta: newVentaId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error converting order to sale:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
        client.release();
    }
});

// --- Endpoints para Pedidos (Flujo de Agendamiento) ---

// GET /pedidos - Obtener todos los pedidos agendados
app.get('/pedidos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id_pedido, p.fecha, p.estado, p.total, p.fecha_entrega, c.nombre as nombre_cliente
      FROM Pedidos p
      LEFT JOIN Clientes c ON p.id_cliente = c.id_cliente
      ORDER BY p.fecha DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting orders:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /pedidos/:id - Obtener un pedido específico con sus detalles
app.get('/pedidos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pedidoResult = await pool.query('SELECT id_pedido, fecha, id_cliente, id_trabajador, estado, total, con_factura, fecha_entrega FROM Pedidos WHERE id_pedido = $1', [id]);
        if (pedidoResult.rowCount === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const detallesResult = await pool.query('SELECT * FROM Detalle_Pedidos WHERE id_pedido = $1', [id]);
        const pedido = pedidoResult.rows[0];
        pedido.detalles = detallesResult.rows;
        res.json(pedido);
    } catch (err) {
        console.error('Error getting order details:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT /pedidos/:id - Actualizar un pedido
app.put('/pedidos/:id', async (req, res) => {
  const { id } = req.params;
  const { id_cliente, id_trabajador, total, estado, fecha_entrega } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'UPDATE Pedidos SET id_cliente = $1, id_trabajador = $2, total = $3, estado = $4, fecha_entrega = $5 WHERE id_pedido = $6 RETURNING *',
      [id_cliente, id_trabajador, total, estado, fecha_entrega, id]
    );
    if (result.rowCount === 0) {
      throw new Error('Order not found');
    }

    await client.query('COMMIT');
    res.json({ message: 'Order updated successfully', pedido: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating order:', err);
    if (err.message === 'Order not found') {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

// --- Endpoints para Ventas ---

// GET /ventas - Obtener un historial de todas las ventas
app.get('/ventas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        v.id_venta, v.fecha, v.total_bruto_venta, v.estado, v.estado_pago,
        c.nombre as nombre_cliente
      FROM Ventas v
      LEFT JOIN Clientes c ON v.id_cliente = c.id_cliente
      ORDER BY v.fecha DESC, v.hora DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting sales history:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /ventas/:id - Obtener el detalle completo de una venta
app.get('/ventas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Consulta para la cabecera de la venta
    const ventaResult = await pool.query(`
      SELECT 
        v.*, 
        c.nombre as nombre_cliente, c.telefono as telefono_cliente, c.email as email_cliente,
        pv.nombre as nombre_punto_venta,
        tp.nombre_tipo_pago
      FROM Ventas v
      LEFT JOIN Clientes c ON v.id_cliente = c.id_cliente
      LEFT JOIN Puntos_Venta pv ON v.id_punto_venta = pv.id_punto_venta
      LEFT JOIN Tipos_Pago tp ON v.id_tipo_pago = tp.id_tipo_pago
      WHERE v.id_venta = $1
    `, [id]);

    if (ventaResult.rowCount === 0) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    // Consulta para los detalles de la venta
    const detallesResult = await pool.query(`
      SELECT
        dv.cantidad, dv.precio_unitario, dv.costo_unitario_en_venta,
        fp.formato as formato_producto,
        p.nombre as nombre_producto,
        lp.codigo_lote
      FROM Detalle_Ventas dv
      JOIN Formatos_Producto fp ON dv.id_formato_producto = fp.id_formato_producto
      JOIN Productos p ON fp.id_producto = p.id_producto
      LEFT JOIN Lotes_Produccion lp ON dv.id_lote = lp.id_lote
      WHERE dv.id_venta = $1
    `, [id]);

    const venta = ventaResult.rows[0];
    venta.detalles = detallesResult.rows;

    res.json(venta);

  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /ventas/:id - Eliminar una venta y revertir el inventario
app.delete('/ventas/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener los detalles de la venta para saber qué revertir
    const detallesResult = await client.query('SELECT * FROM Detalle_Ventas WHERE id_venta = $1', [id]);
    const detalles = detallesResult.rows;

    if (detalles.length === 0) {
      const ventaExistResult = await client.query('SELECT 1 FROM Ventas WHERE id_venta = $1', [id]);
      if (ventaExistResult.rowCount === 0) {
        throw new Error('Sale not found');
      }
    }

    // 2. Revertir el inventario por cada detalle
    for (const item of detalles) {
      // Para la reversión, necesitamos la ubicación que se usó en el pedido original.
      // Esta información no está en Detalle_Ventas. Asumiremos la ubicación del detalle del pedido si existe,
      // o una ubicación por defecto. ESTO ES UNA LIMITACIÓN IMPORTANTE.
      const detallePedidoResult = await client.query('SELECT id_ubicacion FROM Detalle_Pedidos WHERE id_formato_producto = $1 AND id_pedido = (SELECT id_pedido FROM Pedidos WHERE id_venta_asociada = $2)', [item.id_formato_producto, id]);
      const id_ubicacion = detallePedidoResult.rowCount > 0 ? detallePedidoResult.rows[0].id_ubicacion : 1; // Fallback a Bodega Principal

      const updateInventarioResult = await client.query(
        'UPDATE Inventario SET stock_actual = stock_actual + $1 WHERE id_formato_producto = $2 AND id_ubicacion = $3',
        [item.cantidad, item.id_formato_producto, id_ubicacion]
      );

      if (updateInventarioResult.rowCount === 0) {
        // Si no hay fila para actualizar, significa que el producto no está en esa ubicación, lo cual es un estado inconsistente.
        // Creamos la fila de inventario para corregir.
        await client.query('INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual) VALUES ($1, $2, $3)', [item.id_formato_producto, id_ubicacion, item.cantidad]);
      }
    }

    // 3. Eliminar los detalles de la venta
    await client.query('DELETE FROM Detalle_Ventas WHERE id_venta = $1', [id]);

    // 4. Eliminar la venta principal
    const deleteVentaResult = await client.query('DELETE FROM Ventas WHERE id_venta = $1 RETURNING *', [id]);

    if (deleteVentaResult.rowCount === 0) {
        throw new Error('Sale not found');
    }

    await client.query('COMMIT');
    res.json({ message: 'Sale deleted and inventory rolled back successfully', venta: deleteVentaResult.rows[0] });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting sale:', err);
    if (err.message === 'Sale not found') {
        return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

// POST /ventas - Crear una nueva venta, descontar de inventario y registrar costos
app.post('/ventas', async (req, res) => {
  // El body debe incluir datos de la venta y un array de 'detalles'
  const {
    id_cliente, id_punto_venta, id_tipo_pago, id_trabajador,
    neto_venta, iva_venta, total_bruto_venta, con_iva_venta,
    observacion, estado, estado_pago, con_factura, detalles
  } = req.body;
  // Cada item en 'detalles' debe ser: { id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion }

  if (!detalles || detalles.length === 0) {
    return res.status(400).json({ message: 'Sale details cannot be empty' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insertar en la tabla principal de Ventas
    const ventaResult = await client.query(
      `INSERT INTO Ventas ( 
        id_cliente, id_punto_venta, id_tipo_pago, id_trabajador, neto_venta, iva_venta, 
        total_bruto_venta, con_iva_venta, observacion, estado, estado_pago, con_factura, fecha, hora
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_DATE, CURRENT_TIME) RETURNING id_venta`,
      [
        id_cliente, id_punto_venta, id_tipo_pago, id_trabajador, neto_venta, iva_venta, 
        total_bruto_venta, con_iva_venta, observacion, estado, estado_pago, con_factura
      ]
    );
    const newVentaId = ventaResult.rows[0].id_venta;

    // 2. Iterar sobre los detalles
    for (const item of detalles) {
      // 2a. Obtener el costo del lote
      const loteResult = await client.query('SELECT costo_por_unidad FROM Lotes_Produccion WHERE id_lote = $1', [item.id_lote]);
      if (loteResult.rowCount === 0) {
        throw new Error(`Lot with id ${item.id_lote} not found.`);
      }
      const costoUnitario = loteResult.rows[0].costo_por_unidad;

      // 2b. Insertar en Detalle_Ventas
      await client.query(
        'INSERT INTO Detalle_Ventas (id_venta, id_formato_producto, cantidad, precio_unitario, id_lote, costo_unitario_en_venta) VALUES ($1, $2, $3, $4, $5, $6)',
        [newVentaId, item.id_formato_producto, item.cantidad, item.precio_unitario, item.id_lote, costoUnitario]
      );

      // 2c. Descontar del inventario
      const updateInventarioResult = await client.query(
        'UPDATE Inventario SET stock_actual = stock_actual - $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_formato_producto = $2 AND id_ubicacion = $3 AND stock_actual >= $1',
        [item.cantidad, item.id_formato_producto, item.id_ubicacion]
      );
      
      if (updateInventarioResult.rowCount === 0) {
        throw new Error(`Not enough stock for product format ${item.id_formato_producto} in location ${item.id_ubicacion}.`);
      }
    }
    
    // 3. Actualizar la fecha de última compra del cliente
    if (id_cliente) {
        await client.query('UPDATE Clientes SET fecha_ultima_compra = CURRENT_DATE WHERE id_cliente = $1', [id_cliente]);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Sale created successfully', id_venta: newVentaId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating sale:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});





app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
