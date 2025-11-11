const createProduccionController = (pool) => {
  const iniciarProduccion = async (req, res) => {
    const { id_proceso, id_formato_producto, etiqueta_inicial, origen, id_trabajador, id_ubicacion } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO Produccion_Diaria (id_proceso, id_formato_producto, etiqueta_inicial, origen, id_trabajador, id_ubicacion, fecha_jornada, hora_inicio) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, CURRENT_TIME) RETURNING id_produccion_diaria',
        [id_proceso, id_formato_producto, etiqueta_inicial, origen, id_trabajador, id_ubicacion]
      );
      res.status(201).json({ message: 'Jornada de producción iniciada con éxito.', id_produccion_diaria: result.rows[0].id_produccion_diaria });
    } catch (err) {
      console.error('Error al iniciar la jornada de producción:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    }
  };
  
  const transformarProducto = async (req, res) => {
    const {
      id_produccion_diaria,
      id_formato_producto_origen,
      cantidad_origen,
      id_formato_producto_destino,
      cantidad_destino,
      id_ubicacion,
      observaciones
    } = req.body;
  
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
  
      // 1. Validar que la jornada de producción exista y esté abierta (opcional, pero buena práctica)
      // Por ahora, asumiremos que id_produccion_diaria es válido.
  
      // 2. Verificar stock del producto origen
      const stockOrigenResult = await client.query(
        'SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2 FOR UPDATE',
        [id_formato_producto_origen, id_ubicacion]
      );
  
      if (stockOrigenResult.rowCount === 0 || stockOrigenResult.rows[0].stock_actual < cantidad_origen) {
        throw new Error(`Stock insuficiente para el producto origen ${id_formato_producto_origen} en la ubicación ${id_ubicacion}.`);
      }
  
      // 3. Decrementar stock del producto origen
      await client.query(
        'UPDATE Inventario SET stock_actual = stock_actual - $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_formato_producto = $2 AND id_ubicacion = $3',
        [cantidad_origen, id_formato_producto_origen, id_ubicacion]
      );
  
      // 4. Incrementar stock del producto destino
      // Verificar si el producto destino ya existe en el inventario de la ubicación
      const stockDestinoResult = await client.query(
        'SELECT * FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2 FOR UPDATE',
        [id_formato_producto_destino, id_ubicacion]
      );
  
      if (stockDestinoResult.rowCount > 0) {
        // Si existe, actualizar
        await client.query(
          'UPDATE Inventario SET stock_actual = stock_actual + $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_formato_producto = $2 AND id_ubicacion = $3',
          [cantidad_destino, id_formato_producto_destino, id_ubicacion]
        );
      } else {
                      // Si no existe, insertar nuevo registro de inventario
                      await client.query(
                        'INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual, fecha_actualizacion) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
                        [id_formato_producto_destino, id_ubicacion, cantidad_destino]
                      );      }
  
      // 5. Registrar movimiento de inventario para el consumo (salida)
      const movimientoOrigenResult = await client.query(
        'INSERT INTO Movimientos_Inventario (fecha, tipo_movimiento, id_ubicacion_origen, observacion) VALUES (CURRENT_TIMESTAMP, \'salida\', $1, $2) RETURNING id_movimiento',
        [id_ubicacion, `Transformación (consumo) en jornada ${id_produccion_diaria}: ${observaciones || ''}`]
      );
      const id_movimiento_origen = movimientoOrigenResult.rows[0].id_movimiento;
  
      await client.query(
        'INSERT INTO Detalle_Movimientos_Inventario (id_movimiento, id_formato_producto, cantidad, tipo_detalle) VALUES ($1, $2, $3, \'transformacion_consumo\')',
        [id_movimiento_origen, id_formato_producto_origen, cantidad_origen]
      );
  
      // 6. Registrar movimiento de inventario para la producción (entrada)
      const movimientoDestinoResult = await client.query(
        'INSERT INTO Movimientos_Inventario (fecha, tipo_movimiento, id_ubicacion_destino, observacion) VALUES (CURRENT_TIMESTAMP, \'entrada\', $1, $2) RETURNING id_movimiento',
        [id_ubicacion, `Transformación (producción) en jornada ${id_produccion_diaria}: ${observaciones || ''}`]
      );
      const id_movimiento_destino = movimientoDestinoResult.rows[0].id_movimiento;
  
      await client.query(
        'INSERT INTO Detalle_Movimientos_Inventario (id_movimiento, id_formato_producto, cantidad, tipo_detalle) VALUES ($1, $2, $3, \'transformacion_produccion\')',
        [id_movimiento_destino, id_formato_producto_destino, cantidad_destino]
      );
  
      await client.query('COMMIT');
      res.status(200).json({ message: 'Transformación de producto registrada con éxito.' });
  
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error al registrar la transformación de producto:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };
  
    return {
      iniciarProduccion,
      transformarProducto,
    };
  };
  
  module.exports = createProduccionController;