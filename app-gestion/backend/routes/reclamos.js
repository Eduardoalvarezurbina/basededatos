const express = require('express');
const { Pool } = require('pg');
const { verifyToken, authorizeRole } = require('./authMiddleware');
const router = express.Router();


// DB Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});



// GET /reclamos - Obtener todos los reclamos
router.get('/', async (req, res) => {
  try {
    // Unir con la tabla de clientes para obtener el nombre del cliente
    const result = await pool.query(`
      SELECT r.*, c.nombre as nombre_cliente 
      FROM Reclamos r
      LEFT JOIN Clientes c ON r.id_cliente = c.id_cliente
      ORDER BY fecha_reclamo DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting claims:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /reclamos - Crear un nuevo reclamo
router.post('/', authorizeRole(['admin', 'trabajador']), async (req, res) => {
  const { id_cliente, id_venta, descripcion } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Reclamos (id_cliente, id_venta, descripcion) VALUES ($1, $2, $3) RETURNING *',
      [id_cliente, id_venta, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating claim:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /reclamos/:id - Actualizar un reclamo (ej. cambiar estado)
router.put('/:id', authorizeRole(['admin', 'trabajador']), async (req, res) => {
  const { id } = req.params;
  const { estado, solucion_entregada } = req.body;
  
  let updateQuery = 'UPDATE Reclamos SET ';
  const queryParams = [];
  let paramIndex = 1;

  if (estado !== undefined) {
    updateQuery += `estado = $${paramIndex++}, `;
    queryParams.push(estado);
  }
  if (solucion_entregada !== undefined) {
    updateQuery += `solucion_entregada = $${paramIndex++}, `;
    queryParams.push(solucion_entregada);
  }

  if (estado === 'Resuelto' || estado === 'Cerrado') {
      updateQuery += `fecha_resolucion = CURRENT_TIMESTAMP, `;
  }

  updateQuery = updateQuery.slice(0, -2);
  updateQuery += ` WHERE id_reclamo = $${paramIndex} RETURNING *`;
  queryParams.push(id);

  if (queryParams.length <= 1) {
      return res.status(400).json({ message: 'No fields to update provided' });
  }

  try {
    const result = await pool.query(updateQuery, queryParams);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Claim not found' });
    }
    res.json({ message: 'Claim updated successfully', claim: result.rows[0] });
  } catch (err) {
    console.error('Error updating claim:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /reclamos/:id - Eliminar un reclamo
router.delete('/:id', authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Reclamos WHERE id_reclamo = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Claim not found' });
    }
    res.json({ message: 'Claim deleted successfully', claim: result.rows[0] });
  } catch (err) {
    console.error('Error deleting claim:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;