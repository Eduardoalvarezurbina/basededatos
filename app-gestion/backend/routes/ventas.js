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



// GET /ventas - Obtener un historial de todas las ventas
router.get('/', async (req, res) => {
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
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /ventas/:id - Obtener el detalle completo de una venta
router.get('/:id', async (req, res) => {
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
router.delete('/:id', authorizeRole(['admin']), async (req, res) => {
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
      const id_ubicacion = 1; // Fallback a Bodega Principal

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
    if (err.message === 'Sale not found') {
        return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

// POST /ventas - Crear una nueva venta, descontar de inventario y registrar costos
router.post('/', authorizeRole(['admin', 'trabajador']), async (req, res) => {
  const {
    id_cliente, id_punto_venta, id_tipo_pago, id_trabajador,
    neto_venta, iva_venta, total_bruto_venta, con_iva_venta,
    observacion, estado, estado_pago, con_factura, detalles
  } = req.body;

  // Basic validation for required fields
  if (id_cliente === undefined) {
    return res.status(400).json({ message: 'id_cliente es requerido.' });
  }
  if (id_punto_venta === undefined) {
    return res.status(400).json({ message: 'id_punto_venta es requerido.' });
  }
  if (id_tipo_pago === undefined) {
    return res.status(400).json({ message: 'id_tipo_pago es requerido.' });
  }
  if (id_trabajador === undefined) {
    return res.status(400).json({ message: 'id_trabajador es requerido.' });
  }
  if (neto_venta === undefined) {
    return res.status(400).json({ message: 'neto_venta es requerido.' });
  }
  if (iva_venta === undefined) {
    return res.status(400).json({ message: 'iva_venta es requerido.' });
  }
  if (total_bruto_venta === undefined) {
    return res.status(400).json({ message: 'total_bruto_venta es requerido.' });
  }
  if (con_iva_venta === undefined) {
    return res.status(400).json({ message: 'con_iva_venta es requerido.' });
  }
  if (con_factura === undefined) {
    return res.status(400).json({ message: 'con_factura es requerido.' });
  }
  if (!Array.isArray(detalles) || detalles.length === 0) {
    return res.status(400).json({ message: 'detalles de venta deben ser un array no vacío.' });
  }

  // Type validation
  if (typeof neto_venta !== 'number' || typeof iva_venta !== 'number' || typeof total_bruto_venta !== 'number') {
    return res.status(400).json({ message: 'neto_venta, iva_venta y total_bruto_venta deben ser números.' });
  }
  if (typeof con_iva_venta !== 'boolean' || typeof con_factura !== 'boolean') {
    return res.status(400).json({ message: 'con_iva_venta y con_factura deben ser booleanos.' });
  }
  if (estado !== undefined && typeof estado !== 'string') {
    return res.status(400).json({ message: 'estado debe ser una cadena de texto.' });
  }
  if (estado_pago !== undefined && typeof estado_pago !== 'string') {
    return res.status(400).json({ message: 'estado_pago debe ser una cadena de texto.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validaciones de existencia de IDs (Clientes, Puntos_Venta, Tipos_Pago, Trabajadores)
    const validationPromises = [];
    validationPromises.push(client.query('SELECT 1 FROM Clientes WHERE id_cliente = $1', [id_cliente]));
    validationPromises.push(client.query('SELECT 1 FROM Puntos_Venta WHERE id_punto_venta = $1', [id_punto_venta]));
    validationPromises.push(client.query('SELECT 1 FROM Tipos_Pago WHERE id_tipo_pago = $1', [id_tipo_pago]));
    validationPromises.push(client.query('SELECT 1 FROM Trabajadores WHERE id_trabajador = $1', [id_trabajador]));
    
    detalles.forEach(item => {
        if (item.cantidad <= 0 || item.precio_unitario < 0) {
            throw new Error('Cantidad y precio unitario en detalles deben ser números positivos.');
        }
        validationPromises.push(client.query('SELECT 1 FROM Formatos_Producto WHERE id_formato_producto = $1', [item.id_formato_producto]));
        validationPromises.push(client.query('SELECT 1 FROM Lotes_Produccion WHERE id_lote = $1', [item.id_lote]));
        validationPromises.push(client.query('SELECT 1 FROM Ubicaciones_Inventario WHERE id_ubicacion = $1', [item.id_ubicacion]));
    });

    const validationResults = await Promise.all(validationPromises);
    let validationIndex = 0;

    if (validationResults[validationIndex++].rowCount === 0) {
      return res.status(400).json({ message: 'id_cliente inválido.' });
    }
    if (validationResults[validationIndex++].rowCount === 0) {
      return res.status(400).json({ message: 'id_punto_venta inválido.' });
    }
    if (validationResults[validationIndex++].rowCount === 0) {
      return res.status(400).json({ message: 'id_tipo_pago inválido.' });
    }
    if (validationResults[validationIndex++].rowCount === 0) {
      return res.status(400).json({ message: 'id_trabajador inválido.' });
    }

    for (let i = 0; i < detalles.length; i++) {
        if (validationResults[validationIndex++].rowCount === 0) {
            return res.status(400).json({ message: `id_formato_producto inválido en detalle ${i}.` });
        }
        if (validationResults[validationIndex++].rowCount === 0) {
            return res.status(400).json({ message: `id_lote inválido en detalle ${i}.` });
        }
        if (validationResults[validationIndex++].rowCount === 0) {
            return res.status(400).json({ message: `id_ubicacion inválido en detalle ${i}.` });
        }
    }


    // 1. Insertar en la tabla principal de Ventas
    const ventaResult = await client.query(
      `INSERT INTO Ventas ( 
        id_cliente, id_punto_venta, id_tipo_pago, id_trabajador, neto_venta, iva_venta, 
        total_bruto_venta, con_iva_venta, observacion, estado, estado_pago, con_factura, fecha, hora
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_DATE, CURRENT_TIME) RETURNING id_venta`,
      [
        id_cliente, id_punto_venta, id_tipo_pago, id_trabajador, neto_venta, iva_venta, 
        total_bruto_venta, con_iva_venta, observacion, estado || 'Completada', estado_pago || 'Pagado', con_factura 
      ]
    );
    const newVentaId = ventaResult.rows[0].id_venta;

    // 2. Iterar sobre los detalles
    for (const item of detalles) {
      // 2a. Obtener el costo del lote
      const loteResult = await client.query('SELECT costo_por_unidad FROM Lotes_Produccion WHERE id_lote = $1', [item.id_lote]);
      const costoUnitario = loteResult.rows[0].costo_por_unidad;

      // 2b. Insertar en Detalle_Ventas
      await client.query(
        'INSERT INTO Detalle_Ventas (id_venta, id_formato_producto, cantidad, precio_unitario, id_lote, costo_unitario_en_venta, id_ubicacion) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [newVentaId, item.id_formato_producto, item.cantidad, item.precio_unitario, item.id_lote, costoUnitario, item.id_ubicacion]
      );

      // 2c. Descontar del inventario
      const updateInventarioResult = await client.query(
        'UPDATE Inventario SET stock_actual = stock_actual - $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_formato_producto = $2 AND id_ubicacion = $3 AND stock_actual >= $1',
        [item.cantidad, item.id_formato_producto, item.id_ubicacion]
      );
      
      if (updateInventarioResult.rowCount === 0) {
        throw new Error(`No hay suficiente stock para el formato de producto ${item.id_formato_producto} en la ubicación ${item.id_ubicacion}.`);
      }
    }
    
    // 3. Actualizar la fecha de última compra del cliente
    if (id_cliente) {
        await client.query('UPDATE Clientes SET fecha_ultima_compra = CURRENT_DATE WHERE id_cliente = $1', [id_cliente]);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Venta creada exitosamente', id_venta: newVentaId });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error interno del servidor', error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;