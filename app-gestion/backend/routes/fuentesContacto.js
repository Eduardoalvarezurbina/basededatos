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

// GET /fuentes-contacto - Obtener todas las fuentes de contacto
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Fuentes_Contacto ORDER BY nombre_fuente');
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting contact sources:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /fuentes-contacto/:id - Obtener una fuente de contacto por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Fuentes_Contacto WHERE id_fuente_contacto = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Contact source not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting contact source by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /fuentes-contacto - Crear una nueva fuente de contacto
router.post('/', async (req, res) => {
  const { nombre_fuente } = req.body;
  try {
    const result = await pool.query('INSERT INTO Fuentes_Contacto (nombre_fuente) VALUES ($1) RETURNING *', [nombre_fuente]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating contact source:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /fuentes-contacto/:id - Actualizar una fuente de contacto
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre_fuente } = req.body;
  try {
    const result = await pool.query('UPDATE Fuentes_Contacto SET nombre_fuente = $1 WHERE id_fuente_contacto = $2 RETURNING *', [nombre_fuente, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Contact source not found' });
    }
    res.json({ message: 'Contact source updated successfully', fuente_contacto: result.rows[0] });
  } catch (err) {
    console.error('Error updating contact source:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /fuentes-contacto/:id - Eliminar una fuente de contacto
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Fuentes_Contacto WHERE id_fuente_contacto = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Contact source not found' });
    }
    res.json({ message: 'Contact source deleted successfully', fuente_contacto: result.rows[0] });
  } catch (err) {
    console.error('Error deleting contact source:', err);
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this contact source because it is referenced by other records.', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
