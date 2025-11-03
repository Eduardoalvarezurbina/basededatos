const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// DB Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});

// GET /comunas - Obtener todas las comunas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Comunas ORDER BY nombre_comuna');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting comunas:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /comunas/:id - Obtener una comuna por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Comunas WHERE id_comuna = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Comuna not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting comuna by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /comunas - Crear una nueva comuna
router.post('/', async (req, res) => {
  const { nombre_comuna, id_region } = req.body;
  try {
    const result = await pool.query('INSERT INTO Comunas (nombre_comuna, id_region) VALUES ($1, $2) RETURNING *', [nombre_comuna, id_region]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating comuna:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /comunas/:id - Actualizar una comuna
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre_comuna, id_region } = req.body;
  try {
    const result = await pool.query('UPDATE Comunas SET nombre_comuna = $1, id_region = $2 WHERE id_comuna = $3 RETURNING *', [nombre_comuna, id_region, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Comuna not found' });
    }
    res.json({ message: 'Comuna updated successfully', comuna: result.rows[0] });
  } catch (err) {
    console.error('Error updating comuna:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /comunas/:id - Eliminar una comuna
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Comunas WHERE id_comuna = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Comuna not found' });
    }
    res.json({ message: 'Comuna deleted successfully', comuna: result.rows[0] });
  } catch (err) {
    console.error('Error deleting comuna:', err);
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this comuna because it is referenced by other records.', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
