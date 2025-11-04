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



// POST /movimientos-inventario - Crear un nuevo movimiento de inventario (transferencia)
router.post('/', authorizeRole(['admin']), async (req, res) => {
  const { id_ubicacion_origen, id_ubicacion_destino, observacion, detalles } = req.body;
  // detalles es un array de { id_formato_producto, cantidad }

  if (!id_ubicacion_origen || !id_ubicacion_destino || !detalles || detalles.length === 0) {
    return res.status(400).json({ message: 'Origin, destination, and details are required' });
  }

  if (id_ubicacion_origen === id_ubicacion_destino) {
    return res.status(400).json({ message: 'Origin and destination cannot be the same' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Crear el registro del movimiento principal
    const movimientoResult = await client.query(
      'INSERT INTO Movimientos_Inventario (fecha, tipo_movimiento, id_ubicacion_origen, id_ubicacion_destino, observacion) VALUES (CURRENT_DATE, $1, $2, $3, $4) RETURNING id_movimiento',
      ['Transferencia', id_ubicacion_origen, id_ubicacion_destino, observacion]
    );
    const newMovimientoId = movimientoResult.rows[0].id_movimiento;

    // 2. Iterar sobre los detalles
    for (const item of detalles) {
      // 2a. Insertar en Detalle_Movimientos_Inventario
      await client.query(
        'INSERT INTO Detalle_Movimientos_Inventario (id_movimiento, id_formato_producto, cantidad) VALUES ($1, $2, $3)',
        [newMovimientoId, item.id_formato_producto, item.cantidad]
      );

      // 2b. Descontar stock del origen
      const origenUpdateResult = await client.query(
        'UPDATE Inventario SET stock_actual = stock_actual - $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_formato_producto = $2 AND id_ubicacion = $3 AND stock_actual >= $1',
        [item.cantidad, item.id_formato_producto, id_ubicacion_origen]
      );

      if (origenUpdateResult.rowCount === 0) {
        throw new Error(`Not enough stock for product format ${item.id_formato_producto} in origin location ${id_ubicacion_origen}.`);
      }

      // 2c. Aumentar stock en el destino
      const destinoUpdateResult = await client.query(
        'UPDATE Inventario SET stock_actual = stock_actual + $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_formato_producto = $2 AND id_ubicacion = $3',
        [item.cantidad, item.id_formato_producto, id_ubicacion_destino]
      );

      if (destinoUpdateResult.rowCount === 0) {
        // Si no existe el registro en la ubicación de destino, lo creamos
        await client.query(
          'INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual, fecha_actualizacion) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
          [item.id_formato_producto, id_ubicacion_destino, item.cantidad]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Inventory movement created successfully', id_movimiento: newMovimientoId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating inventory movement:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

// GET /movimientos-inventario - Obtener todos los movimientos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.id_movimiento, m.fecha, m.tipo_movimiento, m.observacion,
        uo.nombre as nombre_origen,
        ud.nombre as nombre_destino,
        (SELECT json_agg(json_build_object(
          'id_formato_producto', d.id_formato_producto,
          'cantidad', d.cantidad,
          'nombre_producto', p.nombre,
          'formato', fp.formato
        )) FROM Detalle_Movimientos_Inventario d
          JOIN Formatos_Producto fp ON d.id_formato_producto = fp.id_formato_producto
          JOIN Productos p ON fp.id_producto = p.id_producto
          WHERE d.id_movimiento = m.id_movimiento
        ) as detalles
      FROM Movimientos_Inventario m
      LEFT JOIN Ubicaciones_Inventario uo ON m.id_ubicacion_origen = uo.id_ubicacion
      LEFT JOIN Ubicaciones_Inventario ud ON m.id_ubicacion_destino = ud.id_ubicacion
      ORDER BY m.fecha DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting inventory movements:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /movimientos-inventario/:id - Obtener un movimiento por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        m.id_movimiento, m.fecha, m.tipo_movimiento, m.observacion,
        uo.nombre as nombre_origen,
        ud.nombre as nombre_destino,
        (SELECT json_agg(json_build_object(
          'id_formato_producto', d.id_formato_producto,
          'cantidad', d.cantidad,
          'nombre_producto', p.nombre,
          'formato', fp.formato
        )) FROM Detalle_Movimientos_Inventario d
          JOIN Formatos_Producto fp ON d.id_formato_producto = fp.id_formato_producto
          JOIN Productos p ON fp.id_producto = p.id_producto
          WHERE d.id_movimiento = m.id_movimiento
        ) as detalles
      FROM Movimientos_Inventario m
      LEFT JOIN Ubicaciones_Inventario uo ON m.id_ubicacion_origen = uo.id_ubicacion
      LEFT JOIN Ubicaciones_Inventario ud ON m.id_ubicacion_destino = ud.id_ubicacion
      WHERE m.id_movimiento = $1
    `, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Inventory movement not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting inventory movement by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id', authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener los detalles del movimiento para saber qué revertir
    const detallesResult = await client.query('SELECT * FROM Detalle_Movimientos_Inventario WHERE id_movimiento = $1', [id]);
    const detalles = detallesResult.rows;

    const movimientoResult = await client.query('SELECT * FROM Movimientos_Inventario WHERE id_movimiento = $1', [id]);
    if (movimientoResult.rowCount === 0) {
      throw new Error('Inventory movement not found');
    }
    const { id_ubicacion_origen, id_ubicacion_destino } = movimientoResult.rows[0];

    // 2. Revertir el inventario por cada detalle
    for (const item of detalles) {
      // Sumar stock al origen
      const origenUpdateResult = await client.query(
        'UPDATE Inventario SET stock_actual = stock_actual + $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_formato_producto = $2 AND id_ubicacion = $3',
        [item.cantidad, item.id_formato_producto, id_ubicacion_origen]
      );
      if (origenUpdateResult.rowCount === 0) {
        // Si no existe el registro en la ubicación de origen, lo creamos
        await client.query(
          'INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual, fecha_actualizacion) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
          [item.id_formato_producto, id_ubicacion_origen, item.cantidad]
        );
      }

      // Restar stock del destino
      const destinoUpdateResult = await client.query(
        'UPDATE Inventario SET stock_actual = stock_actual - $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_formato_producto = $2 AND id_ubicacion = $3 AND stock_actual >= $1',
        [item.cantidad, item.id_formato_producto, id_ubicacion_destino]
      );

      if (destinoUpdateResult.rowCount === 0) {
        throw new Error(`Not enough stock to roll back for product format ${item.id_formato_producto} in destination location ${id_ubicacion_destino}. Data might be inconsistent.`);
      }
    }

    // 3. Eliminar los detalles del movimiento
    await client.query('DELETE FROM Detalle_Movimientos_Inventario WHERE id_movimiento = $1', [id]);

    // 4. Eliminar el movimiento principal
    await client.query('DELETE FROM Movimientos_Inventario WHERE id_movimiento = $1', [id]);

    await client.query('COMMIT');
    res.json({ message: 'Inventory movement deleted and stock rolled back successfully' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting inventory movement:', err);
    if (err.message.includes('not found')) {
        return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
