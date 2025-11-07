const createReclamoController = (pool) => {

  const getAllReclamos = async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          r.id_reclamo,
          r.id_cliente,
          c.nombre_completo AS nombre_cliente,
          r.id_pedido,
          r.fecha_reclamo,
          r.descripcion,
          r.estado,
          r.fecha_resolucion,
          r.observaciones_resolucion
        FROM Reclamos r
        JOIN Clientes c ON r.id_cliente = c.id_cliente
        ORDER BY r.fecha_reclamo DESC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error('Error getting claims:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const getReclamoById = async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(`
        SELECT 
          r.id_reclamo,
          r.id_cliente,
          c.nombre_completo AS nombre_cliente,
          r.id_pedido,
          r.fecha_reclamo,
          r.descripcion,
          r.estado,
          r.fecha_resolucion,
          r.observaciones_resolucion
        FROM Reclamos r
        JOIN Clientes c ON r.id_cliente = c.id_cliente
        WHERE r.id_reclamo = $1
      `, [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Claim not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error getting claim by ID:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const createReclamo = async (req, res) => {
    const { id_cliente, id_pedido, fecha_reclamo, descripcion, estado, fecha_resolucion, observaciones_resolucion } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO Reclamos (id_cliente, id_pedido, fecha_reclamo, descripcion, estado, fecha_resolucion, observaciones_resolucion) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [id_cliente, id_pedido, fecha_reclamo, descripcion, estado || 'Pendiente', fecha_resolucion, observaciones_resolucion]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating claim:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  };

  const updateReclamo = async (req, res) => {
    const { id } = req.params;
    const { id_cliente, id_pedido, fecha_reclamo, descripcion, estado, fecha_resolucion, observaciones_resolucion } = req.body;
    try {
      const result = await pool.query(
        'UPDATE Reclamos SET id_cliente = $1, id_pedido = $2, fecha_reclamo = $3, descripcion = $4, estado = $5, fecha_resolucion = $6, observaciones_resolucion = $7 WHERE id_reclamo = $8 RETURNING *',
        [id_cliente, id_pedido, fecha_reclamo, descripcion, estado, fecha_resolucion, observaciones_resolucion, id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Claim not found' });
      }
      res.json({ message: 'Claim updated successfully', reclamo: result.rows[0] });
    } catch (err) {
      console.error('Error updating claim:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  };

  const deleteReclamo = async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('DELETE FROM Reclamos WHERE id_reclamo = $1 RETURNING *', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Claim not found' });
      }
      res.json({ message: 'Claim deleted successfully', reclamo: result.rows[0] });
    } catch (err) {
      console.error('Error deleting claim:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  };

  return {
    getAllReclamos,
    getReclamoById,
    createReclamo,
    updateReclamo,
    deleteReclamo,
  };
};

module.exports = createReclamoController;
