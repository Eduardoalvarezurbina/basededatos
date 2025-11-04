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

// GET /tipos-consumo - Obtener todos los tipos de consumo
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Tipos_Consumo ORDER BY nombre_tipo');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting consumption types:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /tipos-consumo/:id - Obtener un tipo de consumo por ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Tipos_Consumo WHERE id_tipo_consumo = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Consumption type not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting consumption type by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /tipos-consumo - Crear un nuevo tipo de consumo
router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { nombre_tipo } = req.body;
  try {
    const result = await pool.query('INSERT INTO Tipos_Consumo (nombre_tipo) VALUES ($1) RETURNING *', [nombre_tipo]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating consumption type:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /tipos-consumo/:id - Actualizar un tipo de consumo
router.put('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nombre_tipo } = req.body;
  try {
    const result = await pool.query('UPDATE Tipos_Consumo SET nombre_tipo = $1 WHERE id_tipo_consumo = $2 RETURNING *', [nombre_tipo, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Consumption type not found' });
    }
    res.json({ message: 'Consumption type updated successfully', tipo_consumo: result.rows[0] });
  } catch (err) {
    console.error('Error updating consumption type:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /tipos-consumo/:id - Eliminar un tipo de consumo
router.delete('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Tipos_Consumo WHERE id_tipo_consumo = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Consumption type not found' });
    }
    res.json({ message: 'Consumption type deleted successfully', tipo_consumo: result.rows[0] });
  } catch (err) {
    console.error('Error deleting consumption type:', err);
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this consumption type because it is referenced by other records.', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
