const createProduccionController = (pool) => {

  const getAllProduccion = async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          pd.id_produccion_diaria,
          pd.fecha_produccion,
          pd.cantidad_producida,
          pd.id_formato_producto,
          fp.formato AS nombre_formato_producto,
          p.nombre AS nombre_producto,
          pd.id_proceso,
          pr.nombre_proceso,
          pd.observaciones,
          pd.estado
        FROM Produccion_Diaria pd
        JOIN Formatos_Producto fp ON pd.id_formato_producto = fp.id_formato_producto
        JOIN Productos p ON fp.id_producto = p.id_producto
        LEFT JOIN Procesos pr ON pd.id_proceso = pr.id_proceso
        ORDER BY pd.fecha_produccion DESC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error('Error getting daily production:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const getProduccionById = async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(`
        SELECT 
          pd.id_produccion_diaria,
          pd.fecha_produccion,
          pd.cantidad_producida,
          pd.id_formato_producto,
          fp.formato AS nombre_formato_producto,
          p.nombre AS nombre_producto,
          pd.id_proceso,
          pr.nombre_proceso,
          pd.observaciones,
          pd.estado
        FROM Produccion_Diaria pd
        JOIN Formatos_Producto fp ON pd.id_formato_producto = fp.id_formato_producto
        JOIN Productos p ON fp.id_producto = p.id_producto
        LEFT JOIN Procesos pr ON pd.id_proceso = pr.id_proceso
        WHERE pd.id_produccion_diaria = $1
      `, [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Daily production record not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error getting daily production by ID:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const createProduccion = async (req, res) => {
    const { fecha_produccion, cantidad_producida, id_formato_producto, id_proceso, observaciones, estado } = req.body;

    if (!fecha_produccion || !cantidad_producida || !id_formato_producto) {
      return res.status(400).json({ message: 'Missing required fields: fecha_produccion, cantidad_producida, id_formato_producto' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insertar el registro de producción diaria
      const result = await client.query(
        'INSERT INTO Produccion_Diaria (fecha_produccion, cantidad_producida, id_formato_producto, id_proceso, observaciones, estado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [fecha_produccion, cantidad_producida, id_formato_producto, id_proceso, observaciones, estado || 'Pendiente']
      );
      const newProduccion = result.rows[0];

      // Actualizar el inventario
      await client.query(
        'INSERT INTO Inventario (id_formato_producto, cantidad_disponible) VALUES ($1, $2) ON CONFLICT (id_formato_producto) DO UPDATE SET cantidad_disponible = Inventario.cantidad_disponible + EXCLUDED.cantidad_disponible',
        [id_formato_producto, cantidad_producida]
      );

      await client.query('COMMIT');
      res.status(201).json({ message: 'Daily production record created and inventory updated successfully', produccion: newProduccion });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error creating daily production record and updating inventory:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };

  const updateProduccion = async (req, res) => {
    const { id } = req.params;
    const { fecha_produccion, cantidad_producida, id_formato_producto, id_proceso, observaciones, estado } = req.body;

    if (!fecha_produccion || !cantidad_producida || !id_formato_producto) {
      return res.status(400).json({ message: 'Missing required fields: fecha_produccion, cantidad_producida, id_formato_producto' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Obtener la cantidad producida anterior para ajustar el inventario
      const oldProduccionResult = await client.query('SELECT cantidad_producida, id_formato_producto FROM Produccion_Diaria WHERE id_produccion_diaria = $1', [id]);
      if (oldProduccionResult.rowCount === 0) {
        throw new Error('Daily production record not found');
      }
      const oldProduccion = oldProduccionResult.rows[0];
      const cantidadDiferencia = cantidad_producida - oldProduccion.cantidad_producida;

      // Actualizar el registro de producción diaria
      const updateResult = await client.query(
        'UPDATE Produccion_Diaria SET fecha_produccion = $1, cantidad_producida = $2, id_formato_producto = $3, id_proceso = $4, observaciones = $5, estado = $6 WHERE id_produccion_diaria = $7 RETURNING *',
        [fecha_produccion, cantidad_producida, id_formato_producto, id_proceso, observaciones, estado, id]
      );
      const updatedProduccion = updateResult.rows[0];

      // Ajustar el inventario
      await client.query(
        'INSERT INTO Inventario (id_formato_producto, cantidad_disponible) VALUES ($1, $2) ON CONFLICT (id_formato_producto) DO UPDATE SET cantidad_disponible = Inventario.cantidad_disponible + EXCLUDED.cantidad_disponible',
        [id_formato_producto, cantidadDiferencia]
      );

      await client.query('COMMIT');
      res.status(200).json({ message: 'Daily production record updated and inventory adjusted successfully', produccion: updatedProduccion });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error updating daily production record and adjusting inventory:', err);
      if (err.message === 'Daily production record not found') {
        return res.status(404).json({ message: err.message });
      }
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };

  const deleteProduccion = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Obtener la cantidad producida para revertir el inventario
      const oldProduccionResult = await client.query('SELECT cantidad_producida, id_formato_producto FROM Produccion_Diaria WHERE id_produccion_diaria = $1', [id]);
      if (oldProduccionResult.rowCount === 0) {
        throw new Error('Daily production record not found');
      }
      const oldProduccion = oldProduccionResult.rows[0];

      // Eliminar el registro de producción diaria
      const deleteResult = await client.query('DELETE FROM Produccion_Diaria WHERE id_produccion_diaria = $1 RETURNING *', [id]);
      const deletedProduccion = deleteResult.rows[0];

      // Revertir el inventario
      await client.query(
        'UPDATE Inventario SET cantidad_disponible = cantidad_disponible - $1 WHERE id_formato_producto = $2',
        [oldProduccion.cantidad_producida, oldProduccion.id_formato_producto]
      );

      await client.query('COMMIT');
      res.status(200).json({ message: 'Daily production record deleted and inventory reverted successfully', produccion: deletedProduccion });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error deleting daily production record and reverting inventory:', err);
      if (err.message === 'Daily production record not found') {
        return res.status(404).json({ message: err.message });
      }
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };

  return {
    getAllProduccion,
    getProduccionById,
    createProduccion,
    updateProduccion,
    deleteProduccion,
  };
};

module.exports = createProduccionController;
