const createCompraController = (pool) => {
  
  const createCompra = async (req, res) => {
    const { id_proveedor, observacion, detalles } = req.body;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Insertar la compra principal
      const compraResult = await client.query(
        'INSERT INTO Compras (fecha, id_proveedor, observacion) VALUES (CURRENT_DATE, $1, $2) RETURNING id_compra, fecha',
        [id_proveedor, observacion]
      );
      const id_compra = compraResult.rows[0].id_compra;

      // 2. Insertar detalles de la compra y actualizar inventario
      for (const detalle of detalles) {
        const { id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion } = detalle;

        // Insertar detalle de compra
        await client.query(
          'INSERT INTO Detalle_Compras (id_compra, id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion) VALUES ($1, $2, $3, $4, $5, $6)',
          [id_compra, id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion]
        );

        // Actualizar o insertar en Inventario
        const inventarioResult = await client.query(
          'SELECT id_inventario, stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2',
          [id_formato_producto, id_ubicacion]
        );

        if (inventarioResult.rowCount > 0) {
          // Actualizar stock existente
          const newStock = parseFloat(inventarioResult.rows[0].stock_actual) + parseFloat(cantidad);
          await client.query(
            'UPDATE Inventario SET stock_actual = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_inventario = $2',
            [newStock, inventarioResult.rows[0].id_inventario]
          );
        } else {
          // Insertar nuevo registro de inventario
          await client.query(
            'INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual, fecha_actualizacion) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
            [id_formato_producto, id_ubicacion, cantidad]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json({ message: 'Compra creada con éxito.', id_compra: id_compra });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error al crear la compra:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };

  const getAllCompras = async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          c.id_compra,
          c.fecha,
          c.observacion,
          p.nombre AS nombre_proveedor,
          json_agg(
            json_build_object(
              'id_detalle_compra', dc.id_detalle_compra,
              'id_formato_producto', dc.id_formato_producto,
              'cantidad', dc.cantidad,
              'precio_unitario', dc.precio_unitario,
              'id_lote', dc.id_lote,
              'id_ubicacion', dc.id_ubicacion,
              'nombre_producto', prod.nombre,
              'formato_producto', fp.formato
            )
          ) AS detalles
        FROM Compras c
        JOIN Proveedores p ON c.id_proveedor = p.id_proveedor
        JOIN Detalle_Compras dc ON c.id_compra = dc.id_compra
        JOIN Formatos_Producto fp ON dc.id_formato_producto = fp.id_formato_producto
        JOIN Productos prod ON fp.id_producto = prod.id_producto
        GROUP BY c.id_compra, p.nombre
        ORDER BY c.fecha DESC;
      `);
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error al obtener todas las compras:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  };

  const getCompraById = async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(`
        SELECT
          c.id_compra,
          c.fecha,
          c.observacion,
          p.nombre AS nombre_proveedor,
          json_agg(
            json_build_object(
              'id_detalle_compra', dc.id_detalle_compra,
              'id_formato_producto', dc.id_formato_producto,
              'cantidad', dc.cantidad,
              'precio_unitario', dc.precio_unitario,
              'id_lote', dc.id_lote,
              'id_ubicacion', dc.id_ubicacion,
              'nombre_producto', prod.nombre,
              'formato_producto', fp.formato
            )
          ) AS detalles
        FROM Compras c
        JOIN Proveedores p ON c.id_proveedor = p.id_proveedor
        JOIN Detalle_Compras dc ON c.id_compra = dc.id_compra
        JOIN Formatos_Producto fp ON dc.id_formato_producto = fp.id_formato_producto
        JOIN Productos prod ON fp.id_producto = prod.id_producto
        WHERE c.id_compra = $1
        GROUP BY c.id_compra, p.nombre;
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Compra no encontrada.' });
      }
      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error('Error al obtener compra por ID:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  };

  const updateCompra = async (req, res) => {
    const { id } = req.params;
    const { id_proveedor, observacion, detalles } = req.body;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Obtener detalles de la compra existente para ajustar el inventario
      const oldCompraDetailsResult = await client.query(
        'SELECT id_formato_producto, cantidad, id_ubicacion FROM Detalle_Compras WHERE id_compra = $1',
        [id]
      );

      // Revertir el inventario con los detalles antiguos
      for (const oldDetalle of oldCompraDetailsResult.rows) {
        await client.query(
          'UPDATE Inventario SET stock_actual = stock_actual - $1 WHERE id_formato_producto = $2 AND id_ubicacion = $3',
          [oldDetalle.cantidad, oldDetalle.id_formato_producto, oldDetalle.id_ubicacion]
        );
      }

      // 2. Eliminar detalles de compra antiguos
      await client.query('DELETE FROM Detalle_Compras WHERE id_compra = $1', [id]);

      // 3. Actualizar la compra principal
      const compraResult = await client.query(
        'UPDATE Compras SET id_proveedor = $1, observacion = $2 WHERE id_compra = $3 RETURNING id_compra',
        [id_proveedor, observacion, id]
      );

      if (compraResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Compra no encontrada para actualizar.' });
      }

      // 4. Insertar nuevos detalles de la compra y actualizar inventario
      for (const detalle of detalles) {
        const { id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion } = detalle;

        await client.query(
          'INSERT INTO Detalle_Compras (id_compra, id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion]
        );

        // Actualizar o insertar en Inventario
        const inventarioResult = await client.query(
          'SELECT id_inventario, stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2',
          [id_formato_producto, id_ubicacion]
        );

        if (inventarioResult.rowCount > 0) {
          const newStock = parseFloat(inventarioResult.rows[0].stock_actual) + parseFloat(cantidad);
          await client.query(
            'UPDATE Inventario SET stock_actual = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_inventario = $2',
            [newStock, inventarioResult.rows[0].id_inventario]
          );
        } else {
          await client.query(
            'INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual, fecha_actualizacion) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
            [id_formato_producto, id_ubicacion, cantidad]
          );
        }
      }

      await client.query('COMMIT');
      res.status(200).json({ message: 'Compra actualizada con éxito.' });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error al actualizar la compra:', err);
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
      const compraDetailsResult = await client.query(
        'SELECT id_formato_producto, cantidad, id_ubicacion FROM Detalle_Compras WHERE id_compra = $1',
        [id]
      );

      if (compraDetailsResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Compra no encontrada para eliminar.' });
      }

      // Revertir el inventario
      for (const detalle of compraDetailsResult.rows) {
        await client.query(
          'UPDATE Inventario SET stock_actual = stock_actual - $1 WHERE id_formato_producto = $2 AND id_ubicacion = $3',
          [detalle.cantidad, detalle.id_formato_producto, detalle.id_ubicacion]
        );
      }

      // 2. Eliminar detalles de la compra
      await client.query('DELETE FROM Detalle_Compras WHERE id_compra = $1', [id]);

      // 3. Eliminar la compra principal
      await client.query('DELETE FROM Compras WHERE id_compra = $1', [id]);

      await client.query('COMMIT');
      res.status(200).json({ message: 'Compra eliminada con éxito.' });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error al eliminar la compra:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };

  return {
    createCompra,
    getAllCompras,
    getCompraById,
    updateCompra,
    deleteCompra,
  };
};

module.exports = createCompraController;