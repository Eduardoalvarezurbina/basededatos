const express = require('express');
const { Pool } = require('pg');
const router = express.Router();
const { verifyToken, authorizeRole } = require('./authMiddleware');

// DB Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});

// GET /trabajadores - Obtener todos los trabajadores
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Trabajadores ORDER BY nombre');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting workers:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /trabajadores/:id - Obtener un trabajador por ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Trabajadores WHERE id_trabajador = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting worker by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /trabajadores - Crear un nuevo trabajador
router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { nombre } = req.body;
  try {
    const result = await pool.query('INSERT INTO Trabajadores (nombre) VALUES ($1) RETURNING *', [nombre]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating worker:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /trabajadores/:id - Actualizar un trabajador
router.put('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  try {
    const result = await pool.query('UPDATE Trabajadores SET nombre = $1 WHERE id_trabajador = $2 RETURNING *', [nombre, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    res.json({ message: 'Worker updated successfully', trabajador: result.rows[0] });
  } catch (err) {
    console.error('Error updating worker:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /trabajadores/:id - Eliminar un trabajador
router.delete('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Trabajadores WHERE id_trabajador = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    res.json({ message: 'Worker deleted successfully', trabajador: result.rows[0] });
  } catch (err) {
    console.error('Error deleting worker:', err);
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this worker because they are referenced by other records.', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
