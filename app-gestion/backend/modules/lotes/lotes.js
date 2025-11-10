const express = require('express');
const router = express.Router();

module.exports = (pool, verifyToken, authorizeRole) => {
  // GET /lotes - Obtener todos los lotes
  router.get('/', verifyToken, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM Lotes_Produccion ORDER BY fecha_produccion DESC');
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // GET /lotes/:id - Obtener un lote por ID
  router.get('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('SELECT * FROM Lotes_Produccion WHERE id_lote = $1', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Lot not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // POST /lotes - Crear un nuevo lote
  router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
    const { codigo_lote, id_producto, fecha_produccion, fecha_vencimiento, cantidad_inicial, unidad_medida, costo_por_unidad, origen } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO Lotes_Produccion (codigo_lote, id_producto, fecha_produccion, fecha_vencimiento, cantidad_inicial, unidad_medida, costo_por_unidad, origen) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [codigo_lote, id_producto, fecha_produccion, fecha_vencimiento, cantidad_inicial, unidad_medida, costo_por_unidad, origen]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating lot:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  });

  // PUT /lotes/:id - Actualizar un lote
  router.put('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { codigo_lote, id_producto, fecha_produccion, fecha_vencimiento, cantidad_inicial, unidad_medida, costo_por_unidad, origen } = req.body;
    try {
      const result = await pool.query(
        'UPDATE Lotes_Produccion SET codigo_lote = $1, id_producto = $2, fecha_produccion = $3, fecha_vencimiento = $4, cantidad_inicial = $5, unidad_medida = $6, costo_por_unidad = $7, origen = $8 WHERE id_lote = $9 RETURNING *',
        [codigo_lote, id_producto, fecha_produccion, fecha_vencimiento, cantidad_inicial, unidad_medida, costo_por_unidad, origen, id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Lot not found' });
      }
      res.json({ message: 'Lot updated successfully', lot: result.rows[0] });
    } catch (err) {
      console.error('Error updating lot:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  });

  // DELETE /lotes/:id - Eliminar un lote
  router.delete('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
      // Opcional: Se podría verificar si el lote está en uso antes de borrar.
      const result = await pool.query('DELETE FROM Lotes_Produccion WHERE id_lote = $1 RETURNING *', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Lot not found' });
      }
      res.json({ message: 'Lot deleted successfully', lot: result.rows[0] });
    } catch (err) {
      console.error('Error deleting lot:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  });

  return router;
};