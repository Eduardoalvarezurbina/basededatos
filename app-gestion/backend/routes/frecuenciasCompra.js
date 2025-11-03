const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// DB Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});

// GET /frecuencias-compra - Obtener todas las frecuencias de compra
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Frecuencias_Compra ORDER BY nombre_frecuencia');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting purchase frequencies:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /frecuencias-compra/:id - Obtener una frecuencia de compra por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Frecuencias_Compra WHERE id_frecuencia_compra = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Purchase frequency not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting purchase frequency by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /frecuencias-compra - Crear una nueva frecuencia de compra
router.post('/', async (req, res) => {
  const { nombre_frecuencia } = req.body;
  try {
    const result = await pool.query('INSERT INTO Frecuencias_Compra (nombre_frecuencia) VALUES ($1) RETURNING *', [nombre_frecuencia]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating purchase frequency:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /frecuencias-compra/:id - Actualizar una frecuencia de compra
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre_frecuencia } = req.body;
  try {
    const result = await pool.query('UPDATE Frecuencias_Compra SET nombre_frecuencia = $1 WHERE id_frecuencia_compra = $2 RETURNING *', [nombre_frecuencia, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Purchase frequency not found' });
    }
    res.json({ message: 'Purchase frequency updated successfully', frecuencia_compra: result.rows[0] });
  } catch (err) {
    console.error('Error updating purchase frequency:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /frecuencias-compra/:id - Eliminar una frecuencia de compra
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Frecuencias_Compra WHERE id_frecuencia_compra = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Purchase frequency not found' });
    }
    res.json({ message: 'Purchase frequency deleted successfully', frecuencia_compra: result.rows[0] });
  } catch (err) {
    console.error('Error deleting purchase frequency:', err);
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this purchase frequency because it is referenced by other records.', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
