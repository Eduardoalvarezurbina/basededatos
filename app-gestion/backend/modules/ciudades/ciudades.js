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

// GET /ciudades - Obtener todas las ciudades
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Ciudades ORDER BY nombre_ciudad');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting cities:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /ciudades/:id - Obtener una ciudad por ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Ciudades WHERE id_ciudad = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'City not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting city by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /ciudades - Crear una nueva ciudad
router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { nombre_ciudad } = req.body;
  try {
    const result = await pool.query('INSERT INTO Ciudades (nombre_ciudad) VALUES ($1) RETURNING *', [nombre_ciudad]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating city:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /ciudades/:id - Actualizar una ciudad
router.put('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nombre_ciudad } = req.body;
  try {
    const result = await pool.query('UPDATE Ciudades SET nombre_ciudad = $1 WHERE id_ciudad = $2 RETURNING *', [nombre_ciudad, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'City not found' });
    }
    res.json({ message: 'City updated successfully', ciudad: result.rows[0] });
  } catch (err) {
    console.error('Error updating city:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /ciudades/:id - Eliminar una ciudad
router.delete('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Ciudades WHERE id_ciudad = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'City not found' });
    }
    res.json({ message: 'City deleted successfully', ciudad: result.rows[0] });
  } catch (err) {
    console.error('Error deleting city:', err);
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this city because it is referenced by other records.', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
