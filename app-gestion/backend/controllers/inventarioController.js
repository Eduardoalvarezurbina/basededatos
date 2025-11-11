const createInventarioController = (pool) => {

  const transferirInventario = async (req, res) => {
    const {
      id_formato_producto,
      cantidad,
      id_ubicacion_origen,
      id_ubicacion_destino,
      id_trabajador,
      observaciones
    } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Validar que las ubicaciones sean diferentes
      if (id_ubicacion_origen === id_ubicacion_destino) {
        throw new Error('La ubicación de origen y destino no pueden ser la misma.');
      }

      // 2. Verificar stock en la ubicación de origen
      const stockOrigenResult = await client.query(
        'SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2 FOR UPDATE',
        [id_formato_producto, id_ubicacion_origen]
      );

      if (stockOrigenResult.rowCount === 0 || parseFloat(stockOrigenResult.rows[0].stock_actual) < cantidad) {
        throw new Error(`Stock insuficiente para el producto ${id_formato_producto} en la ubicación de origen ${id_ubicacion_origen}.`);
      }

      // 3. Decrementar stock en la ubicación de origen
      await client.query(
        'UPDATE Inventario SET stock_actual = stock_actual - $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_formato_producto = $2 AND id_ubicacion = $3',
        [cantidad, id_formato_producto, id_ubicacion_origen]
      );

      // 4. Incrementar stock en la ubicación de destino
      const stockDestinoResult = await client.query(
        'SELECT * FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2 FOR UPDATE',
        [id_formato_producto, id_ubicacion_destino]
      );

      if (stockDestinoResult.rowCount > 0) {
        // Si existe, actualizar
        await client.query(
          'UPDATE Inventario SET stock_actual = stock_actual + $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_formato_producto = $2 AND id_ubicacion = $3',
          [cantidad, id_formato_producto, id_ubicacion_destino]
        );
      } else {
        // Si no existe, insertar nuevo registro de inventario
        await client.query(
          'INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual, fecha_actualizacion) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
          [id_formato_producto, id_ubicacion_destino, cantidad]
        );
      }

      // 5. Registrar movimiento de inventario (salida de origen)
      const movimientoOrigenResult = await client.query(
        'INSERT INTO Movimientos_Inventario (fecha, tipo_movimiento, id_ubicacion_origen, id_ubicacion_destino, observacion) VALUES (CURRENT_TIMESTAMP, \'transferencia_salida\', $1, $2, $3) RETURNING id_movimiento',
        [id_ubicacion_origen, id_ubicacion_destino, `Transferencia de ${cantidad} unidades de ${id_formato_producto} de ${id_ubicacion_origen} a ${id_ubicacion_destino}. ${observaciones || ''}`]
      );
      const id_movimiento_origen = movimientoOrigenResult.rows[0].id_movimiento;

      await client.query(
        'INSERT INTO Detalle_Movimientos_Inventario (id_movimiento, id_formato_producto, cantidad, tipo_detalle) VALUES ($1, $2, $3, \'transferencia_salida\')',
        [id_movimiento_origen, id_formato_producto, cantidad]
      );

      // 6. Registrar movimiento de inventario (entrada en destino)
      const movimientoDestinoResult = await client.query(
        'INSERT INTO Movimientos_Inventario (fecha, tipo_movimiento, id_ubicacion_origen, id_ubicacion_destino, observacion) VALUES (CURRENT_TIMESTAMP, \'transferencia_entrada\', $1, $2, $3) RETURNING id_movimiento',
        [id_ubicacion_origen, id_ubicacion_destino, `Transferencia de ${cantidad} unidades de ${id_formato_producto} de ${id_ubicacion_origen} a ${id_ubicacion_destino}. ${observaciones || ''}`]
      );
      const id_movimiento_destino = movimientoDestinoResult.rows[0].id_movimiento;

      await client.query(
        'INSERT INTO Detalle_Movimientos_Inventario (id_movimiento, id_formato_producto, cantidad, tipo_detalle) VALUES ($1, $2, $3, \'transferencia_entrada\')',
        [id_movimiento_destino, id_formato_producto, cantidad]
      );

      await client.query('COMMIT');
      res.status(200).json({ message: 'Transferencia de inventario registrada con éxito.' });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error al transferir inventario:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };

  return {
    transferirInventario,
  };
};

module.exports = createInventarioController;