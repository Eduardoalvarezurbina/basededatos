const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const { verifyToken, authorizeRole } = require('./authMiddleware');

// DB Connection - This should ideally be passed or imported from a central config
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});



// GET /inventario - Obtener todo el inventario
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        i.id_inventario,
        p.nombre as nombre_producto,
        fp.formato as formato_producto,
        u.nombre as nombre_ubicacion,
        i.stock_actual,
        i.fecha_actualizacion
      FROM Inventario i
      JOIN Formatos_Producto fp ON i.id_formato_producto = fp.id_formato_producto
      JOIN Productos p ON fp.id_producto = p.id_producto
      JOIN Ubicaciones u ON i.id_ubicacion = u.id_ubicacion
      ORDER BY p.nombre, fp.formato, u.nombre
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting inventory:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /inventario/stock/:id_formato_producto/:id_ubicacion - Obtener el stock actual de un formato de producto en una ubicación específica
router.get('/stock/:id_formato_producto/:id_ubicacion', async (req, res) => {
  const { id_formato_producto, id_ubicacion } = req.params;
  try {
    const result = await pool.query(
      'SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2',
      [id_formato_producto, id_ubicacion]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Stock not found for this product format and location' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting stock:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /inventario - (For testing purposes) Manually insert or update stock
router.post('/', authorizeRole(['admin']), async (req, res) => {
  const { id_formato_producto, id_ubicacion, stock_actual } = req.body;

  if (id_formato_producto === undefined || id_ubicacion === undefined || stock_actual === undefined) {
    return res.status(400).json({ message: 'Missing required fields: id_formato_producto, id_ubicacion, stock_actual' });
  }

  try {
    // Use an UPSERT to either insert a new row or update the stock if the combination already exists.
    const query = `
      INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual, fecha_actualizacion)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (id_formato_producto, id_ubicacion)
      DO UPDATE SET stock_actual = Inventario.stock_actual + $3, fecha_actualizacion = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const result = await pool.query(query, [id_formato_producto, id_ubicacion, stock_actual]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error upserting inventory:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

router.put('/:id', authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { stock_actual } = req.body;

  if (stock_actual === undefined) {
    return res.status(400).json({ message: 'Missing required field: stock_actual' });
  }

  try {
    const result = await pool.query(
      'UPDATE Inventario SET stock_actual = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_inventario = $2 RETURNING *',
      [stock_actual, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Inventory entry not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating inventory:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

router.delete('/:id', authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Inventario WHERE id_inventario = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Inventory entry not found' });
    }
    res.json({ message: 'Inventory entry deleted successfully' });
  } catch (err) {
    console.error('Error deleting inventory:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;