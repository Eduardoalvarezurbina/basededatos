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

// GET /puntos-venta - Obtener todos los puntos de venta
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Puntos_Venta ORDER BY nombre');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting sale points:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /puntos-venta/:id - Obtener un punto de venta por ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Puntos_Venta WHERE id_punto_venta = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Sale point not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting sale point by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /puntos-venta - Crear un nuevo punto de venta
router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { nombre, tipo, direccion, id_ciudad } = req.body;
  try {
    const result = await pool.query('INSERT INTO Puntos_Venta (nombre, tipo, direccion, id_ciudad) VALUES ($1, $2, $3, $4) RETURNING *', [nombre, tipo, direccion, id_ciudad]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating sale point:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /puntos-venta/:id - Actualizar un punto de venta
router.put('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo, direccion, id_ciudad } = req.body;
  try {
    const result = await pool.query('UPDATE Puntos_Venta SET nombre = $1, tipo = $2, direccion = $3, id_ciudad = $4 WHERE id_punto_venta = $5 RETURNING *', [nombre, tipo, direccion, id_ciudad, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Sale point not found' });
    }
    res.json({ message: 'Sale point updated successfully', punto_venta: result.rows[0] });
  } catch (err) {
    console.error('Error updating sale point:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /puntos-venta/:id - Eliminar un punto de venta
router.delete('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Puntos_Venta WHERE id_punto_venta = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Sale point not found' });
    }
    res.json({ message: 'Sale point deleted successfully', punto_venta: result.rows[0] });
  } catch (err) {
    console.error('Error deleting sale point:', err);
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this sale point because it is referenced by other records.', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
