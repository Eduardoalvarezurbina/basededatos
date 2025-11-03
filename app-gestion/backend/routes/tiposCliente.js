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

// GET /tipos-cliente - Obtener todos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Tipos_Cliente ORDER BY nombre_tipo');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting client types:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /tipos-cliente/:id - Obtener uno por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Tipos_Cliente WHERE id_tipo_cliente = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Client type not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting client type by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /tipos-cliente - Crear uno nuevo
router.post('/', async (req, res) => {
  const { nombre_tipo } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Tipos_Cliente (nombre_tipo) VALUES ($1) RETURNING *',
      [nombre_tipo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating client type:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /tipos-cliente/:id - Actualizar uno
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre_tipo } = req.body;
  try {
    const result = await pool.query(
      'UPDATE Tipos_Cliente SET nombre_tipo = $1 WHERE id_tipo_cliente = $2 RETURNING *',
      [nombre_tipo, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Client type not found' });
    }
    res.json({ message: 'Client type updated successfully', tipo_cliente: result.rows[0] });
  } catch (err) {
    console.error('Error updating client type:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /tipos-cliente/:id - Eliminar uno
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Tipos_Cliente WHERE id_tipo_cliente = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Client type not found' });
    }
    res.json({ message: 'Client type deleted successfully', tipo_cliente: result.rows[0] });
  } catch (err) {
    console.error('Error deleting client type:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;