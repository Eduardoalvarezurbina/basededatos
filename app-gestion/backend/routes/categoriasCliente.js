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

// GET /categorias-cliente - Obtener todas las categorías de cliente
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Categorias_Cliente ORDER BY nombre_categoria');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting client categories:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /categorias-cliente/:id - Obtener una categoría de cliente por ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Categorias_Cliente WHERE id_categoria_cliente = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Client category not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting client category by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /categorias-cliente - Crear una nueva categoría de cliente
router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { nombre_categoria } = req.body;
  try {
    const result = await pool.query('INSERT INTO Categorias_Cliente (nombre_categoria) VALUES ($1) RETURNING *', [nombre_categoria]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating client category:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /categorias-cliente/:id - Actualizar una categoría de cliente
router.put('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nombre_categoria } = req.body;
  try {
    const result = await pool.query('UPDATE Categorias_Cliente SET nombre_categoria = $1 WHERE id_categoria_cliente = $2 RETURNING *', [nombre_categoria, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Client category not found' });
    }
    res.json({ message: 'Client category updated successfully', categoria_cliente: result.rows[0] });
  } catch (err) {
    console.error('Error updating client category:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /categorias-cliente/:id - Eliminar una categoría de cliente
router.delete('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Categorias_Cliente WHERE id_categoria_cliente = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Client category not found' });
    }
    res.json({ message: 'Client category deleted successfully', categoria_cliente: result.rows[0] });
  } catch (err) {
    console.error('Error deleting client category:', err);
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this client category because it is referenced by other records.', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
