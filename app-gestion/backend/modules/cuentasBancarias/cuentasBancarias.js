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

// GET /cuentas-bancarias - Obtener todas las cuentas bancarias
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Cuentas_Bancarias ORDER BY nombre_banco, numero_cuenta');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting bank accounts:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /cuentas-bancarias/:id - Obtener una cuenta bancaria por ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Cuentas_Bancarias WHERE id_cuenta = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Bank account not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting bank account by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /cuentas-bancarias - Crear una nueva cuenta bancaria
router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { nombre_banco, tipo_cuenta, numero_cuenta, rut_titular, nombre_titular, email_titular } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Cuentas_Bancarias (nombre_banco, tipo_cuenta, numero_cuenta, rut_titular, nombre_titular, email_titular) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nombre_banco, tipo_cuenta, numero_cuenta, rut_titular, nombre_titular, email_titular]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating bank account:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /cuentas-bancarias/:id - Actualizar una cuenta bancaria
router.put('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nombre_banco, tipo_cuenta, numero_cuenta, rut_titular, nombre_titular, email_titular } = req.body;
  try {
    const result = await pool.query(
      'UPDATE Cuentas_Bancarias SET nombre_banco = $1, tipo_cuenta = $2, numero_cuenta = $3, rut_titular = $4, nombre_titular = $5, email_titular = $6 WHERE id_cuenta = $7 RETURNING *',
      [nombre_banco, tipo_cuenta, numero_cuenta, rut_titular, nombre_titular, email_titular, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Bank account not found' });
    }
    res.json({ message: 'Bank account updated successfully', cuenta_bancaria: result.rows[0] });
  } catch (err) {
    console.error('Error updating bank account:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /cuentas-bancarias/:id - Eliminar una cuenta bancaria
router.delete('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Cuentas_Bancarias WHERE id_cuenta = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Bank account not found' });
    }
    res.json({ message: 'Bank account deleted successfully', cuenta_bancaria: result.rows[0] });
  } catch (err) {
    console.error('Error deleting bank account:', err);
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this bank account because it is referenced by other records.', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
