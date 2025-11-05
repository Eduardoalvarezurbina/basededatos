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

// GET /formatos-producto - Obtener todos los formatos de producto
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT fp.*, p.nombre as nombre_producto
      FROM Formatos_Producto fp
      JOIN Productos p ON fp.id_producto = p.id_producto
      ORDER BY p.nombre, fp.formato
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting product formats:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /formatos-producto/:id - Obtener un formato de producto por ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT fp.*, p.nombre as nombre_producto
      FROM Formatos_Producto fp
      JOIN Productos p ON fp.id_producto = p.id_producto
      WHERE fp.id_formato_producto = $1
    `, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product format not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting product format by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /formatos-producto - Crear un nuevo formato de producto
router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Formatos_Producto (id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating product format:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /formatos-producto/:id - Actualizar un formato de producto
router.put('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida } = req.body;
  try {
    const result = await pool.query(
      'UPDATE Formatos_Producto SET id_producto = $1, formato = $2, precio_detalle_neto = $3, precio_mayorista_neto = $4, ultimo_costo_neto = $5, unidad_medida = $6 WHERE id_formato_producto = $7 RETURNING *',
      [id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product format not found' });
    }
    res.json({ message: 'Product format updated successfully', formato_producto: result.rows[0] });
  } catch (err) {
    console.error('Error updating product format:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /formatos-producto/:id - Eliminar un formato de producto
router.delete('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Formatos_Producto WHERE id_formato_producto = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product format not found' });
    }
    res.json({ message: 'Product format deleted successfully', formato_producto: result.rows[0] });
  } catch (err) {
    console.error('Error deleting product format:', err);
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this product format because it is referenced by other records.', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
