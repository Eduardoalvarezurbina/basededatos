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

// GET /proveedores - Obtener todos los proveedores
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.nombre_ciudad as nombre_ciudad
      FROM Proveedores p
      LEFT JOIN Ciudades c ON p.id_ciudad = c.id_ciudad
      ORDER BY p.nombre
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting suppliers:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /proveedores/:id - Obtener un proveedor por ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT p.*, c.nombre_ciudad as nombre_ciudad
      FROM Proveedores p
      LEFT JOIN Ciudades c ON p.id_ciudad = c.id_ciudad
      WHERE p.id_proveedor = $1
    `, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting supplier by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /proveedores - Crear un nuevo proveedor
router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { nombre, rut, telefono, id_ciudad } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Proveedores (nombre, rut, telefono, id_ciudad) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, rut, telefono, id_ciudad]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating supplier:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /proveedores/:id - Actualizar un proveedor
router.put('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nombre, rut, telefono, id_ciudad } = req.body;
  try {
    const result = await pool.query(
      'UPDATE Proveedores SET nombre = $1, rut = $2, telefono = $3, id_ciudad = $4 WHERE id_proveedor = $5 RETURNING *',
      [nombre, rut, telefono, id_ciudad, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json({ message: 'Supplier updated successfully', proveedor: result.rows[0] });
  } catch (err) {
    console.error('Error updating supplier:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /proveedores/:id - Eliminar un proveedor
router.delete('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Proveedores WHERE id_proveedor = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json({ message: 'Supplier deleted successfully', proveedor: result.rows[0] });
  } catch (err) {
    console.error('Error deleting supplier:', err);
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this supplier because it is referenced by other records (e.g., purchases).', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
