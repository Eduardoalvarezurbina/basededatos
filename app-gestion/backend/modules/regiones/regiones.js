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

// GET /regiones - Obtener todas las regiones
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Regiones ORDER BY nombre_region');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting regions:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /regiones/:id - Obtener una región por ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Regiones WHERE id_region = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Region not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting region by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /regiones - Crear una nueva región
router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { nombre_region } = req.body;
  try {
    const result = await pool.query('INSERT INTO Regiones (nombre_region) VALUES ($1) RETURNING *', [nombre_region]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating region:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /regiones/:id - Actualizar una región
router.put('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nombre_region } = req.body;
  try {
    const result = await pool.query('UPDATE Regiones SET nombre_region = $1 WHERE id_region = $2 RETURNING *', [nombre_region, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Region not found' });
    }
    res.json({ message: 'Region updated successfully', region: result.rows[0] });
  } catch (err) {
    console.error('Error updating region:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /regiones/:id - Eliminar una región
router.delete('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Regiones WHERE id_region = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Region not found' });
    }
    res.json({ message: 'Region deleted successfully', region: result.rows[0] });
  } catch (err) {
    console.error('Error deleting region:', err);
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this region because it is referenced by other records.', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
