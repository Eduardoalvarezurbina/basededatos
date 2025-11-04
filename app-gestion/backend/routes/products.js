const express = require('express');
const { Pool } = require('pg');
const { verifyToken, authorizeRole } = require('./authMiddleware');
const router = express.Router();

// DB Connection - This should ideally be passed or imported from a central config
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});

router.use(verifyToken);

// GET /products - Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Productos ORDER BY id_producto');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting products:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /products/:id - Obtener un producto por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Productos WHERE id_producto = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting product by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /products - Crear un nuevo producto
router.post('/', authorizeRole(['admin']), async (req, res) => {
  const { nombre, categoria, unidad_medida } = req.body; // unidad_medida will be ignored after schema change
  try {
    const result = await pool.query(
      'INSERT INTO Productos (nombre, categoria) VALUES ($1, $2) RETURNING *',
      [nombre, categoria]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /products/:id - Eliminar un producto
router.delete('/:id', authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Productos WHERE id_producto = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully', product: result.rows[0] });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /products/:id - Actualizar un producto
router.put('/:id', authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nombre, categoria, activo } = req.body; // Removed unidad_medida
  try {
    const result = await pool.query(
      'UPDATE Productos SET nombre = $1, categoria = $2, activo = $3 WHERE id_producto = $4 RETURNING *',
      [nombre, categoria, activo, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product updated successfully', product: result.rows[0] });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /products/active - Obtener todos los productos activos
router.get('/active', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Productos WHERE activo = TRUE ORDER BY nombre');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting active products:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;