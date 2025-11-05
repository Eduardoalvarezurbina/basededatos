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

// GET /tipos-pago - Obtener todos los tipos de pago
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Tipos_Pago ORDER BY nombre_tipo_pago');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting payment types:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /tipos-pago/:id - Obtener un tipo de pago por ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Tipos_Pago WHERE id_tipo_pago = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Payment type not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting payment type by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /tipos-pago - Crear un nuevo tipo de pago
router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { nombre_tipo_pago } = req.body;
  try {
    const result = await pool.query('INSERT INTO Tipos_Pago (nombre_tipo_pago) VALUES ($1) RETURNING *', [nombre_tipo_pago]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating payment type:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /tipos-pago/:id - Actualizar un tipo de pago
router.put('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nombre_tipo_pago } = req.body;
  try {
    const result = await pool.query('UPDATE Tipos_Pago SET nombre_tipo_pago = $1 WHERE id_tipo_pago = $2 RETURNING *', [nombre_tipo_pago, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Payment type not found' });
    }
    res.json({ message: 'Payment type updated successfully', tipo_pago: result.rows[0] });
  } catch (err) {
    console.error('Error updating payment type:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /tipos-pago/:id - Eliminar un tipo de pago
router.delete('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Tipos_Pago WHERE id_tipo_pago = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Payment type not found' });
    }
    res.json({ message: 'Payment type deleted successfully', tipo_pago: result.rows[0] });
  } catch (err) {
    console.error('Error deleting payment type:', err);
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this payment type because it is referenced by other records.', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
