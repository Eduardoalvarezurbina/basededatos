const createCompraController = (pool) => {

  const getAllCompras = async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          c.id_compra,
          c.fecha_compra,
          c.id_proveedor,
          p.nombre_proveedor,
          c.total_neto,
          c.total_iva,
          c.total_bruto,
          c.estado,
          c.observaciones,
          json_agg(json_build_object(
            'id_detalle_compra', dc.id_detalle_compra,
            'id_formato_producto', dc.id_formato_producto,
            'formato_producto', fp.formato,
            'nombre_producto', prod.nombre,
            'cantidad', dc.cantidad,
            'precio_neto_unitario', dc.precio_neto_unitario,
            'iva_unitario', dc.iva_unitario,
            'precio_bruto_unitario', dc.precio_bruto_unitario,
            'subtotal_neto', dc.subtotal_neto,
            'subtotal_iva', dc.subtotal_iva,
            'subtotal_bruto', dc.subtotal_bruto
          )) AS detalles
        FROM Compras c
        JOIN Proveedores p ON c.id_proveedor = p.id_proveedor
        LEFT JOIN Detalle_Compras dc ON c.id_compra = dc.id_compra
        LEFT JOIN Formatos_Producto fp ON dc.id_formato_producto = fp.id_formato_producto
        LEFT JOIN Productos prod ON fp.id_producto = prod.id_producto
        GROUP BY c.id_compra, p.nombre_proveedor
        ORDER BY c.fecha_compra DESC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error('Error getting purchases:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const getCompraById = async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(`
        SELECT 
          c.id_compra,
          c.fecha_compra,
          c.id_proveedor,
          p.nombre_proveedor,
          c.total_neto,
          c.total_iva,
          c.total_bruto,
          c.estado,
          c.observaciones,
          json_agg(json_build_object(
            'id_detalle_compra', dc.id_detalle_compra,
            'id_formato_producto', dc.id_formato_producto,
            'formato_producto', fp.formato,
            'nombre_producto', prod.nombre,
            'cantidad', dc.cantidad,
            'precio_neto_unitario', dc.precio_neto_unitario,
            'iva_unitario', dc.iva_unitario,
            'precio_bruto_unitario', dc.precio_bruto_unitario,
            'subtotal_neto', dc.subtotal_neto,
            'subtotal_iva', dc.subtotal_iva,
            'subtotal_bruto', dc.subtotal_bruto
          )) AS detalles
        FROM Compras c
        JOIN Proveedores p ON c.id_proveedor = p.id_proveedor
        LEFT JOIN Detalle_Compras dc ON c.id_compra = dc.id_compra
        LEFT JOIN Formatos_Producto fp ON dc.id_formato_producto = fp.id_formato_producto
        LEFT JOIN Productos prod ON fp.id_producto = prod.id_producto
        WHERE c.id_compra = $1
        GROUP BY c.id_compra, p.nombre_proveedor
      `, [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Purchase not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error getting purchase by ID:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const createCompra = async (req, res) => {
    const { fecha_compra, id_proveedor, estado, observaciones, detalles } = req.body;

    if (!fecha_compra || !id_proveedor || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ message: 'Missing required fields: fecha_compra, id_proveedor, detalles' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let total_neto = 0;
      let total_iva = 0;
      let total_bruto = 0;

      // Calcular totales y preparar detalles
      const processedDetalles = detalles.map(detalle => {
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

        return {
          ...detalle,
          precio_neto_unitario,
          iva_unitario,
          precio_bruto_unitario,
          subtotal_neto,
          subtotal_iva,
          subtotal_bruto,
        };
      });

      // Insertar en la tabla principal de Compras
      const compraResult = await client.query(
        'INSERT INTO Compras (fecha_compra, id_proveedor, total_neto, total_iva, total_bruto, estado, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_compra',
        [fecha_compra, id_proveedor, total_neto, total_iva, total_bruto, estado || 'Completada', observaciones]
      );
      const newCompraId = compraResult.rows[0].id_compra;

      // Insertar cada detalle y actualizar inventario
      for (const detalle of processedDetalles) {
        await client.query(
          'INSERT INTO Detalle_Compras (id_compra, id_formato_producto, cantidad, precio_neto_unitario, iva_unitario, precio_bruto_unitario, subtotal_neto, subtotal_iva, subtotal_bruto) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [newCompraId, detalle.id_formato_producto, detalle.cantidad, detalle.precio_neto_unitario, detalle.iva_unitario, detalle.precio_bruto_unitario, detalle.subtotal_neto, detalle.subtotal_iva, detalle.subtotal_bruto]
        );

        // Actualizar inventario
        await client.query(
          'INSERT INTO Inventario (id_formato_producto, cantidad_disponible) VALUES ($1, $2) ON CONFLICT (id_formato_producto) DO UPDATE SET cantidad_disponible = Inventario.cantidad_disponible + EXCLUDED.cantidad_disponible',
          [detalle.id_formato_producto, detalle.cantidad]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ message: 'Purchase created and inventory updated successfully', id_compra: newCompraId });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error creating purchase and updating inventory:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };

  const updateCompra = async (req, res) => {
    const { id } = req.params;
    const { fecha_compra, id_proveedor, estado, observaciones, detalles } = req.body;

    if (!fecha_compra || !id_proveedor || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ message: 'Missing required fields: fecha_compra, id_proveedor, detalles' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Obtener detalles de la compra antigua para revertir el inventario
      const oldDetallesResult = await client.query('SELECT id_formato_producto, cantidad FROM Detalle_Compras WHERE id_compra = $1', [id]);
      if (oldDetallesResult.rowCount === 0) {
        throw new Error('Purchase not found');
      }
      const oldDetalles = oldDetallesResult.rows;

      // Revertir inventario antiguo
      for (const oldDetalle of oldDetalles) {
        await client.query(
          'UPDATE Inventario SET cantidad_disponible = cantidad_disponible - $1 WHERE id_formato_producto = $2',
          [oldDetalle.cantidad, oldDetalle.id_formato_producto]
        );
      }

      // 2. Eliminar detalles de compra antiguos
      await client.query('DELETE FROM Detalle_Compras WHERE id_compra = $1', [id]);

      let total_neto = 0;
      let total_iva = 0;
      let total_bruto = 0;

      // Calcular nuevos totales y preparar detalles
      const processedDetalles = detalles.map(detalle => {
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

        return {
          ...detalle,
          precio_neto_unitario,
          iva_unitario,
          precio_bruto_unitario,
          subtotal_neto,
          subtotal_iva,
          subtotal_bruto,
        };
      });

      // 3. Actualizar la tabla principal de Compras
      const updateResult = await client.query(
        'UPDATE Compras SET fecha_compra = $1, id_proveedor = $2, total_neto = $3, total_iva = $4, total_bruto = $5, estado = $6, observaciones = $7 WHERE id_compra = $8 RETURNING *',
        [fecha_compra, id_proveedor, total_neto, total_iva, total_bruto, estado, observaciones, id]
      );
      const updatedCompra = updateResult.rows[0];

      // 4. Insertar nuevos detalles y actualizar inventario
      for (const detalle of processedDetalles) {
        await client.query(
          'INSERT INTO Detalle_Compras (id_compra, id_formato_producto, cantidad, precio_neto_unitario, iva_unitario, precio_bruto_unitario, subtotal_neto, subtotal_iva, subtotal_bruto) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [id, detalle.id_formato_producto, detalle.cantidad, detalle.precio_neto_unitario, detalle.iva_unitario, detalle.precio_bruto_unitario, detalle.subtotal_neto, detalle.subtotal_iva, detalle.subtotal_bruto]
        );

        // Actualizar inventario
        await client.query(
          'INSERT INTO Inventario (id_formato_producto, cantidad_disponible) VALUES ($1, $2) ON CONFLICT (id_formato_producto) DO UPDATE SET cantidad_disponible = Inventario.cantidad_disponible + EXCLUDED.cantidad_disponible',
          [detalle.id_formato_producto, detalle.cantidad]
        );
      }

      await client.query('COMMIT');
      res.status(200).json({ message: 'Purchase updated and inventory adjusted successfully', compra: updatedCompra });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error updating purchase and adjusting inventory:', err);
      if (err.message === 'Purchase not found') {
        return res.status(404).json({ message: err.message });
      }
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };

  const deleteCompra = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Obtener detalles de la compra para revertir el inventario
      const oldDetallesResult = await client.query('SELECT id_formato_producto, cantidad FROM Detalle_Compras WHERE id_compra = $1', [id]);
      if (oldDetallesResult.rowCount === 0) {
        throw new Error('Purchase not found');
      }
      const oldDetalles = oldDetallesResult.rows;

      // Revertir inventario
      for (const oldDetalle of oldDetalles) {
        await client.query(
          'UPDATE Inventario SET cantidad_disponible = cantidad_disponible - $1 WHERE id_formato_producto = $2',
          [oldDetalle.cantidad, oldDetalle.id_formato_producto]
        );
      }

      // 2. Eliminar detalles de compra
      await client.query('DELETE FROM Detalle_Compras WHERE id_compra = $1', [id]);

      // 3. Eliminar la compra principal
      const deleteResult = await client.query('DELETE FROM Compras WHERE id_compra = $1 RETURNING *', [id]);
      const deletedCompra = deleteResult.rows[0];

      await client.query('COMMIT');
      res.status(200).json({ message: 'Purchase deleted and inventory reverted successfully', compra: deletedCompra });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error deleting purchase and reverting inventory:', err);
      if (err.message === 'Purchase not found') {
        return res.status(404).json({ message: err.message });
      }
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };

  return {
    getAllCompras,
    getCompraById,
    createCompra,
    updateCompra,
    deleteCompra,
  };
};

module.exports = createCompraController;
