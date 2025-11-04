const express = require('express');
const { Pool } = require('pg');
const router = express.Router();
const { verifyToken, authorizeRole } = require('./authMiddleware');

// DB Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});

// GET /ubicaciones - Obtener todas
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Ubicaciones_Inventario ORDER BY nombre');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting locations:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /ubicaciones/:id - Obtener una por ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Ubicaciones_Inventario WHERE id_ubicacion = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Location not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting location by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /ubicaciones - Crear una nueva
router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { nombre, tipo, direccion, id_ciudad } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Ubicaciones_Inventario (nombre, tipo, direccion, id_ciudad) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, tipo, direccion, id_ciudad]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating location:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /ubicaciones/:id - Actualizar una
router.put('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo, direccion, id_ciudad } = req.body;
  try {
    const result = await pool.query(
      'UPDATE Ubicaciones_Inventario SET nombre = $1, tipo = $2, direccion = $3, id_ciudad = $4 WHERE id_ubicacion = $5 RETURNING *',
      [nombre, tipo, direccion, id_ciudad, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Location not found' });
    }
    res.json({ message: 'Location updated successfully', ubicacion: result.rows[0] });
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /ubicaciones/:id - Eliminar una
router.delete('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Ubicaciones_Inventario WHERE id_ubicacion = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Location not found' });
    }
    res.json({ message: 'Location deleted successfully', ubicacion: result.rows[0] });
  } catch (err) {
    console.error('Error deleting location:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } 
});

module.exports = router;