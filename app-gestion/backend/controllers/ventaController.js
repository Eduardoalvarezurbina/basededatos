const createVentaController = (pool) => {
  
  const createVenta = async (req, res) => {
    const { id_cliente, observacion, detalles } = req.body;
    const client = await pool.connect();

    try {
      // 1. Input Validation
      if (!id_cliente || !detalles || detalles.length === 0) {
        return res.status(400).json({ message: 'Faltan datos requeridos para la venta (id_cliente, detalles).' });
      }

      for (const detalle of detalles) {
        if (!detalle.id_formato_producto || !detalle.cantidad || !detalle.precio_unitario || !detalle.id_lote || !detalle.id_ubicacion) {
          return res.status(400).json({ message: 'Cada detalle de venta debe incluir id_formato_producto, cantidad, precio_unitario, id_lote y id_ubicacion.' });
        }
        if (detalle.cantidad <= 0) {
          return res.status(400).json({ message: 'La cantidad en los detalles de venta debe ser un número positivo.' });
        }
      }

      await client.query('BEGIN');

      // 2. Insertar la venta principal
      const ventaResult = await client.query(
        'INSERT INTO Ventas (fecha, id_cliente, observacion) VALUES (CURRENT_DATE, $1, $2) RETURNING id_venta',
        [id_cliente, observacion]
      );
      const id_venta = ventaResult.rows[0].id_venta;

      // 3. Procesar detalles de la venta y actualizar inventario
      for (const detalle of detalles) {
        const { id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion } = detalle;

        // Verificar stock actual
        const inventarioResult = await client.query(
          'SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2',
          [id_formato_producto, id_ubicacion]
        );

        if (inventarioResult.rowCount === 0 || parseFloat(inventarioResult.rows[0].stock_actual) < cantidad) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: `Stock insuficiente para el producto ${id_formato_producto} en la ubicación ${id_ubicacion}.` });
        }

        // Insertar detalle de venta
        await client.query(
          'INSERT INTO Detalle_Ventas (id_venta, id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion) VALUES ($1, $2, $3, $4, $5, $6)',
          [id_venta, id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion]
        );

        // Actualizar stock en Inventario (restar)
        await client.query(
          'UPDATE Inventario SET stock_actual = stock_actual - $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_formato_producto = $2 AND id_ubicacion = $3',
          [cantidad, id_formato_producto, id_ubicacion]
        );

        // Registrar movimiento de inventario (cabecera)
        const movimientoResult = await client.query(
          'INSERT INTO Movimientos_Inventario (fecha, tipo_movimiento, id_ubicacion_origen, observacion) VALUES (CURRENT_TIMESTAMP, \'salida\', $1, $2) RETURNING id_movimiento',
          [id_ubicacion, `Venta ID: ${id_venta}`]
        );
        const id_movimiento = movimientoResult.rows[0].id_movimiento;

        // Registrar detalle del movimiento de inventario
        await client.query(
          'INSERT INTO Detalle_Movimientos_Inventario (id_movimiento, id_formato_producto, cantidad, tipo_detalle) VALUES ($1, $2, $3, \'venta\')',
          [id_movimiento, id_formato_producto, cantidad]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ message: 'Venta creada con éxito.', id_venta: id_venta });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error al crear la venta:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };

  const getAllVentas = async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          v.id_venta,
          v.fecha,
          v.observacion,
          c.nombre AS nombre_cliente,
          c.telefono AS telefono_cliente,
          json_agg(
            json_build_object(
              'id_detalle_venta', dv.id_detalle_venta,
              'id_formato_producto', dv.id_formato_producto,
              'cantidad', dv.cantidad,
              'precio_unitario', dv.precio_unitario,
              'id_lote', dv.id_lote,
              'id_ubicacion', dv.id_ubicacion,
              'nombre_producto', p.nombre,
              'formato_producto', fp.formato
            )
          ) AS detalles
        FROM Ventas v
        JOIN Clientes c ON v.id_cliente = c.id_cliente
        JOIN Detalle_Ventas dv ON v.id_venta = dv.id_venta
        JOIN Formatos_Producto fp ON dv.id_formato_producto = fp.id_formato_producto
        JOIN Productos p ON fp.id_producto = p.id_producto
        GROUP BY v.id_venta, c.nombre, c.telefono
        ORDER BY v.fecha DESC;
      `);
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error al obtener todas las ventas:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  };

  const getVentaById = async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(`
        SELECT
          v.id_venta,
          v.fecha,
          v.observacion,
          c.nombre AS nombre_cliente,
          c.telefono AS telefono_cliente,
          json_agg(
            json_build_object(
              'id_detalle_venta', dv.id_detalle_venta,
              'id_formato_producto', dv.id_formato_producto,
              'cantidad', dv.cantidad,
              'precio_unitario', dv.precio_unitario,
              'id_lote', dv.id_lote,
              'id_ubicacion', dv.id_ubicacion,
              'nombre_producto', p.nombre,
              'formato_producto', fp.formato
            )
          ) AS detalles
        FROM Ventas v
        JOIN Clientes c ON v.id_cliente = c.id_cliente
        JOIN Detalle_Ventas dv ON v.id_venta = dv.id_venta
        JOIN Formatos_Producto fp ON dv.id_formato_producto = fp.id_formato_producto
        JOIN Productos p ON fp.id_producto = p.id_producto
        WHERE v.id_venta = $1
        GROUP BY v.id_venta, c.nombre, c.telefono;
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Venta no encontrada.' });
      }
      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error('Error al obtener venta por ID:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  };

  return {
    createVenta,
    getAllVentas,
    getVentaById,
  };
};

module.exports = createVentaController;