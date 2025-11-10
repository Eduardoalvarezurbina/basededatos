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

  // Other controller functions (getAll, getById, etc.) will go here

  return {
    createCompra,
  };
};

module.exports = createCompraController;