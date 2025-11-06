const express = require('express');
const { Pool } = require('pg');
const router = express.Router();
const { verifyToken, authorizeRole } = require('../../routes/authMiddleware');

// DB Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});

// GET /procesos - Obtener todos los procesos con sus detalles
router.get('/', verifyToken, async (req, res) => {
  const { tipo } = req.query;

  let query = `
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
  `;

  const queryParams = [];

  if (tipo) {
    query += ' WHERE p.tipo_proceso = $1';
    queryParams.push(tipo);
  }

  query += ' ORDER BY p.nombre_proceso';

  try {
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting processes:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /procesos/:id - Obtener un proceso por ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
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
      WHERE p.id_proceso = $1
    `, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Process not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting process by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /procesos - Crear un nuevo proceso con sus detalles
router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
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

// PUT /procesos/:id - Actualizar un proceso (incluyendo detalles)
router.put('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nombre_proceso, tipo_proceso, id_formato_producto_final, observacion, ingredientes } = req.body;

  if (!nombre_proceso || !tipo_proceso || !id_formato_producto_final || !ingredientes || !Array.isArray(ingredientes) || ingredientes.length === 0) {
    return res.status(400).json({ message: 'Missing required fields for process update.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Actualizar la tabla principal
    const updateResult = await client.query(
      'UPDATE Procesos SET nombre_proceso = $1, tipo_proceso = $2, id_formato_producto_final = $3, observacion = $4 WHERE id_proceso = $5 RETURNING *',
      [nombre_proceso, tipo_proceso, id_formato_producto_final, observacion, id]
    );

    if (updateResult.rowCount === 0) {
      throw new Error('Process not found');
    }

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
    if (err.message === 'Process not found') {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /procesos/:id - Eliminar un proceso
router.delete('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
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
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this process because it is referenced by other records.', error: err.detail });
    }
    if (err.message === 'Process not found') {
      return res.status(404).json({ message: 'Process not found' });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
