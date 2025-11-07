const createVentaController = (pool) => {

  const getAllVentas = async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          t.id_transaccion,
          t.fecha_transaccion,
          t.id_cliente,
          c.nombre_completo AS nombre_cliente,
          t.id_punto_venta,
          pv.nombre_punto_venta,
          t.id_tipo_pago,
          tp.nombre_tipo_pago,
          t.total_neto,
          t.total_iva,
          t.total_bruto,
          t.factura,
          t.observaciones,
          json_agg(json_build_object(
            'id_detalle_transaccion', dt.id_detalle_transaccion,
            'id_formato_producto', dt.id_formato_producto,
            'formato_producto', fp.formato,
            'nombre_producto', p.nombre,
            'cantidad', dt.cantidad,
            'precio_neto_unitario', dt.precio_neto_unitario,
            'iva_unitario', dt.iva_unitario,
            'precio_bruto_unitario', dt.precio_bruto_unitario,
            'subtotal_neto', dt.subtotal_neto,
            'subtotal_iva', dt.subtotal_iva,
            'subtotal_bruto', dt.subtotal_bruto,
            'id_lote', dt.id_lote,
            'codigo_lote', lp.codigo_lote
          )) AS detalles
        FROM Transacciones t
        JOIN Clientes c ON t.id_cliente = c.id_cliente
        JOIN Puntos_Venta pv ON t.id_punto_venta = pv.id_punto_venta
        JOIN Tipos_Pago tp ON t.id_tipo_pago = tp.id_tipo_pago
        LEFT JOIN Detalle_Transacciones dt ON t.id_transaccion = dt.id_transaccion
        LEFT JOIN Formatos_Producto fp ON dt.id_formato_producto = fp.id_formato_producto
        LEFT JOIN Productos p ON fp.id_producto = p.id_producto
        LEFT JOIN Lotes_Produccion lp ON dt.id_lote = lp.id_lote
        GROUP BY t.id_transaccion, c.nombre_completo, pv.nombre_punto_venta, tp.nombre_tipo_pago
        ORDER BY t.fecha_transaccion DESC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error('Error getting sales:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const getVentaById = async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(`
        SELECT 
          t.id_transaccion,
          t.fecha_transaccion,
          t.id_cliente,
          c.nombre_completo AS nombre_cliente,
          t.id_punto_venta,
          pv.nombre_punto_venta,
          t.id_tipo_pago,
          tp.nombre_tipo_pago,
          t.total_neto,
          t.total_iva,
          t.total_bruto,
          t.factura,
          t.observaciones,
          json_agg(json_build_object(
            'id_detalle_transaccion', dt.id_detalle_transaccion,
            'id_formato_producto', dt.id_formato_producto,
            'formato_producto', fp.formato,
            'nombre_producto', p.nombre,
            'cantidad', dt.cantidad,
            'precio_neto_unitario', dt.precio_neto_unitario,
            'iva_unitario', dt.iva_unitario,
            'precio_bruto_unitario', dt.precio_bruto_unitario,
            'subtotal_neto', dt.subtotal_neto,
            'subtotal_iva', dt.subtotal_iva,
            'subtotal_bruto', dt.subtotal_bruto,
            'id_lote', dt.id_lote,
            'codigo_lote', lp.codigo_lote
          )) AS detalles
        FROM Transacciones t
        JOIN Clientes c ON t.id_cliente = c.id_cliente
        JOIN Puntos_Venta pv ON t.id_punto_venta = pv.id_punto_venta
        JOIN Tipos_Pago tp ON t.id_tipo_pago = tp.id_tipo_pago
        LEFT JOIN Detalle_Transacciones dt ON t.id_transaccion = dt.id_transaccion
        LEFT JOIN Formatos_Producto fp ON dt.id_formato_producto = fp.id_formato_producto
        LEFT JOIN Productos p ON fp.id_producto = p.id_producto
        LEFT JOIN Lotes_Produccion lp ON dt.id_lote = lp.id_lote
        WHERE t.id_transaccion = $1
        GROUP BY t.id_transaccion, c.nombre_completo, pv.nombre_punto_venta, tp.nombre_tipo_pago
      `, [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Sale not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error getting sale by ID:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const createVenta = async (req, res) => {
    const { fecha_transaccion, id_cliente, id_punto_venta, id_tipo_pago, factura, observaciones, detalles } = req.body;

    if (!fecha_transaccion || !id_cliente || !id_punto_venta || !id_tipo_pago || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ message: 'Missing required fields: fecha_transaccion, id_cliente, id_punto_venta, id_tipo_pago, detalles' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let total_neto = 0;
      let total_iva = 0;
      let total_bruto = 0;

      // Calcular totales y preparar detalles
      const processedDetalles = [];
      for (const detalle of detalles) {
        const precio_neto_unitario = detalle.precio_neto_unitario;
        const cantidad = detalle.cantidad;
        const iva_unitario = precio_neto_unitario * 0.19; // Asumiendo 19% de IVA
        const precio_bruto_unitario = precio_neto_unitario + iva_unitario;

        const subtotal_neto = precio_neto_unitario * cantidad;
        const subtotal_iva = iva_unitario * cantidad;
        const subtotal_bruto = precio_bruto_unitario * cantidad;

        total_neto += subtotal_neto;
        total_iva += subtotal_iva;
        total_bruto += subtotal_bruto;

        processedDetalles.push({
          ...detalle,
          precio_neto_unitario,
          iva_unitario,
          precio_bruto_unitario,
          subtotal_neto,
          subtotal_iva,
          subtotal_bruto,
        });
      }

      // Insertar en la tabla principal de Transacciones
      const transaccionResult = await client.query(
        'INSERT INTO Transacciones (fecha_transaccion, id_cliente, id_punto_venta, id_tipo_pago, total_neto, total_iva, total_bruto, factura, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id_transaccion',
        [fecha_transaccion, id_cliente, id_punto_venta, id_tipo_pago, total_neto, total_iva, total_bruto, factura, observaciones]
      );
      const newTransaccionId = transaccionResult.rows[0].id_transaccion;

      // Insertar cada detalle y actualizar inventario
      for (const detalle of processedDetalles) {
        await client.query(
          'INSERT INTO Detalle_Transacciones (id_transaccion, id_formato_producto, cantidad, precio_neto_unitario, iva_unitario, precio_bruto_unitario, subtotal_neto, subtotal_iva, subtotal_bruto, id_lote) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [newTransaccionId, detalle.id_formato_producto, detalle.cantidad, detalle.precio_neto_unitario, detalle.iva_unitario, detalle.precio_bruto_unitario, detalle.subtotal_neto, detalle.subtotal_iva, detalle.subtotal_bruto, detalle.id_lote]
        );

        // Actualizar inventario
        await client.query(
          'UPDATE Inventario SET cantidad_disponible = cantidad_disponible - $1 WHERE id_formato_producto = $2',
          [detalle.cantidad, detalle.id_formato_producto]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ message: 'Sale created and inventory updated successfully', id_transaccion: newTransaccionId });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error creating sale and updating inventory:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };

  const updateVenta = async (req, res) => {
    const { id } = req.params;
    const { fecha_transaccion, id_cliente, id_punto_venta, id_tipo_pago, factura, observaciones, detalles } = req.body;

    if (!fecha_transaccion || !id_cliente || !id_punto_venta || !id_tipo_pago || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ message: 'Missing required fields: fecha_transaccion, id_cliente, id_punto_venta, id_tipo_pago, detalles' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Obtener detalles de la venta antigua para revertir el inventario
      const oldDetallesResult = await client.query('SELECT id_formato_producto, cantidad FROM Detalle_Transacciones WHERE id_transaccion = $1', [id]);
      if (oldDetallesResult.rowCount === 0) {
        throw new Error('Sale not found');
      }
      const oldDetalles = oldDetallesResult.rows;

      // Revertir inventario antiguo
      for (const oldDetalle of oldDetalles) {
        await client.query(
          'UPDATE Inventario SET cantidad_disponible = cantidad_disponible + $1 WHERE id_formato_producto = $2',
          [oldDetalle.cantidad, oldDetalle.id_formato_producto]
        );
      }

      // 2. Eliminar detalles de venta antiguos
      await client.query('DELETE FROM Detalle_Transacciones WHERE id_transaccion = $1', [id]);

      let total_neto = 0;
      let total_iva = 0;
      let total_bruto = 0;

      // Calcular nuevos totales y preparar detalles
      const processedDetalles = [];
      for (const detalle of detalles) {
        const precio_neto_unitario = detalle.precio_neto_unitario;
        const cantidad = detalle.cantidad;
        const iva_unitario = precio_neto_unitario * 0.19; // Asumiendo 19% de IVA
        const precio_bruto_unitario = precio_neto_unitario + iva_unitario;

        const subtotal_neto = precio_neto_unitario * cantidad;
        const subtotal_iva = iva_unitario * cantidad;
        const subtotal_bruto = precio_bruto_unitario * cantidad;

        total_neto += subtotal_neto;
        total_iva += subtotal_iva;
        total_bruto += subtotal_bruto;

        processedDetalles.push({
          ...detalle,
          precio_neto_unitario,
          iva_unitario,
          precio_bruto_unitario,
          subtotal_neto,
          subtotal_iva,
          subtotal_bruto,
        });
      }

      // 3. Actualizar la tabla principal de Transacciones
      const updateResult = await client.query(
        'UPDATE Transacciones SET fecha_transaccion = $1, id_cliente = $2, id_punto_venta = $3, id_tipo_pago = $4, total_neto = $5, total_iva = $6, total_bruto = $7, factura = $8, observaciones = $9 WHERE id_transaccion = $10 RETURNING *',
        [fecha_transaccion, id_cliente, id_punto_venta, id_tipo_pago, total_neto, total_iva, total_bruto, factura, observaciones, id]
      );
      const updatedVenta = updateResult.rows[0];

      // 4. Insertar nuevos detalles y actualizar inventario
      for (const detalle of processedDetalles) {
        await client.query(
          'INSERT INTO Detalle_Transacciones (id_transaccion, id_formato_producto, cantidad, precio_neto_unitario, iva_unitario, precio_bruto_unitario, subtotal_neto, subtotal_iva, subtotal_bruto, id_lote) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [id, detalle.id_formato_producto, detalle.cantidad, detalle.precio_neto_unitario, detalle.iva_unitario, detalle.precio_bruto_unitario, detalle.subtotal_neto, detalle.subtotal_iva, detalle.subtotal_bruto, detalle.id_lote]
        );

        // Actualizar inventario
        await client.query(
          'UPDATE Inventario SET cantidad_disponible = cantidad_disponible - $1 WHERE id_formato_producto = $2',
          [detalle.cantidad, detalle.id_formato_producto]
        );
      }

      await client.query('COMMIT');
      res.status(200).json({ message: 'Sale updated and inventory adjusted successfully', venta: updatedVenta });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error updating sale and adjusting inventory:', err);
      if (err.message === 'Sale not found') {
        return res.status(404).json({ message: err.message });
      }
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };

  const deleteVenta = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Obtener detalles de la venta para revertir el inventario
      const oldDetallesResult = await client.query('SELECT id_formato_producto, cantidad FROM Detalle_Transacciones WHERE id_transaccion = $1', [id]);
      if (oldDetallesResult.rowCount === 0) {
        throw new Error('Sale not found');
      }
      const oldDetalles = oldDetallesResult.rows;

      // Revertir inventario
      for (const oldDetalle of oldDetalles) {
        await client.query(
          'UPDATE Inventario SET cantidad_disponible = cantidad_disponible + $1 WHERE id_formato_producto = $2',
          [oldDetalle.cantidad, oldDetalle.id_formato_producto]
        );
      }

      // 2. Eliminar detalles de venta
      await client.query('DELETE FROM Detalle_Transacciones WHERE id_transaccion = $1', [id]);

      // 3. Eliminar la venta principal
      const deleteResult = await client.query('DELETE FROM Transacciones WHERE id_transaccion = $1 RETURNING *', [id]);
      const deletedVenta = deleteResult.rows[0];

      await client.query('COMMIT');
      res.status(200).json({ message: 'Sale deleted and inventory reverted successfully', venta: deletedVenta });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error deleting sale and reverting inventory:', err);
      if (err.message === 'Sale not found') {
        return res.status(404).json({ message: err.message });
      }
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };

  return {
    getAllVentas,
    getVentaById,
    createVenta,
    updateVenta,
    deleteVenta,
  };
};

module.exports = createVentaController;
