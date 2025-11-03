const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// DB Connection - This should ideally be passed or imported from a central config
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
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

module.exports = router;