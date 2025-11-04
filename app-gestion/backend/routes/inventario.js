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

// GET /inventario/stock/:id_formato_producto/:id_ubicacion - Obtener el stock actual de un formato de producto en una ubicación específica
router.get('/stock/:id_formato_producto/:id_ubicacion', verifyToken, async (req, res) => {
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
router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
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

module.exports = router;