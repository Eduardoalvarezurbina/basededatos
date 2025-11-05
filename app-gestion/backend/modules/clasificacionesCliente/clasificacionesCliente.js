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

// GET /clasificaciones-cliente - Obtener todas las clasificaciones de cliente
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Clasificaciones_Cliente ORDER BY nombre_clasificacion');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting client classifications:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /clasificaciones-cliente/:id - Obtener una clasificación de cliente por ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Clasificaciones_Cliente WHERE id_clasificacion_cliente = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Client classification not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting client classification by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /clasificaciones-cliente - Crear una nueva clasificación de cliente
router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { nombre_clasificacion } = req.body;
  try {
    const result = await pool.query('INSERT INTO Clasificaciones_Cliente (nombre_clasificacion) VALUES ($1) RETURNING *', [nombre_clasificacion]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating client classification:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /clasificaciones-cliente/:id - Actualizar una clasificación de cliente
router.put('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nombre_clasificacion } = req.body;
  try {
    const result = await pool.query('UPDATE Clasificaciones_Cliente SET nombre_clasificacion = $1 WHERE id_clasificacion_cliente = $2 RETURNING *', [nombre_clasificacion, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Client classification not found' });
    }
    res.json({ message: 'Client classification updated successfully', clasificacion_cliente: result.rows[0] });
  } catch (err) {
    console.error('Error updating client classification:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /clasificaciones-cliente/:id - Eliminar una clasificación de cliente
router.delete('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Clasificaciones_Cliente WHERE id_clasificacion_cliente = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Client classification not found' });
    }
    res.json({ message: 'Client classification deleted successfully', clasificacion_cliente: result.rows[0] });
  } catch (err) {
    console.error('Error deleting client classification:', err);
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this client classification because it is referenced by other records.', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
