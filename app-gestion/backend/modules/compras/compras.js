const express = require('express');
const router = express.Router();
const pool = require('../../index');
const { verifyToken, authorizeRole } = require('../../routes/authMiddleware');

// Get all purchases
router.get('/', verifyToken, authorizeRole(['admin', 'cajero']), async (req, res) => {
  try {
    const allPurchases = await pool.query('SELECT * FROM Compras');
    res.json(allPurchases.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get a single purchase
router.get('/:id', verifyToken, authorizeRole(['admin', 'cajero']), async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await pool.query('SELECT * FROM Compras WHERE id_compra = $1', [id]);
    res.json(purchase.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Create a purchase
router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id_proveedor, id_trabajador, fecha_compra, total_compra, estado_compra } = req.body;
    const newPurchase = await pool.query(
      'INSERT INTO Compras (id_proveedor, id_trabajador, fecha_compra, total_compra, estado_compra) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id_proveedor, id_trabajador, fecha_compra, total_compra, estado_compra]
    );
    res.json(newPurchase.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update a purchase
router.put('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { id_proveedor, id_trabajador, fecha_compra, total_compra, estado_compra } = req.body;
    const updatePurchase = await pool.query(
      'UPDATE Compras SET id_proveedor = $1, id_trabajador = $2, fecha_compra = $3, total_compra = $4, estado_compra = $5 WHERE id_compra = $6 RETURNING *',
      [id_proveedor, id_trabajador, fecha_compra, total_compra, estado_compra, id]
    );
    res.json(updatePurchase.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete a purchase
router.delete('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM Compras WHERE id_compra = $1', [id]);
    res.json('Purchase was deleted');
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;