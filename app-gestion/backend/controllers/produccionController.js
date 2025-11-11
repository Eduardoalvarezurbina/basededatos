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
                id_proceso, // Now we receive id_proceso
                id_ubicacion,
                observaciones
              } = req.body;
  
              const client = await pool.connect();
              try {
                await client.query('BEGIN');
  
                // 1. Obtener ingredientes del proceso
                const ingredientesResult = await client.query(
                  'SELECT id_formato_producto_ingrediente, cantidad_requerida FROM Detalle_Procesos WHERE id_proceso = $1',
                  [id_proceso]
                );
                const ingredientes = ingredientesResult.rows;
  
                if (ingredientes.length === 0) {
                  throw new Error(`No se encontraron ingredientes para el proceso ${id_proceso}.`);
                }
  
                // 2. Obtener productos de salida del proceso
                const productosSalidaResult = await client.query(
                  'SELECT id_formato_producto_salida, cantidad_producida FROM Detalle_Procesos_Salida WHERE id_proceso = $1',
                  [id_proceso]
                );
                const productosSalida = productosSalidaResult.rows;
  
                if (productosSalida.length === 0) {
                  throw new Error(`No se encontraron productos de salida para el proceso ${id_proceso}.`);
                }
  
                // 3. Verificar stock de todos los ingredientes y decrementar
                for (const ingrediente of ingredientes) {
                  const { id_formato_producto_ingrediente, cantidad_requerida } = ingrediente;
  
                  const stockOrigenResult = await client.query(
                    'SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2 FOR UPDATE',
                    [id_formato_producto_ingrediente, id_ubicacion]
                  );
  
                  if (stockOrigenResult.rowCount === 0 || parseFloat(stockOrigenResult.rows[0].stock_actual) < parseFloat(cantidad_requerida)) {
                    throw new Error(`Stock insuficiente para el ingrediente ${id_formato_producto_ingrediente} en la ubicación ${id_ubicacion}.`);
                  }
  
                  await client.query(
                    'UPDATE Inventario SET stock_actual = stock_actual - $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_formato_producto = $2 AND id_ubicacion = $3',
                    [cantidad_requerida, id_formato_producto_ingrediente, id_ubicacion]
                  );
  
                  // Registrar movimiento de inventario para el consumo (salida)
                  const movimientoOrigenResult = await client.query(
                    'INSERT INTO Movimientos_Inventario (fecha, tipo_movimiento, id_ubicacion_origen, observacion) VALUES (CURRENT_TIMESTAMP, \'salida\', $1, $2) RETURNING id_movimiento',
                    [id_ubicacion, `Transformación (consumo) de ingrediente ${id_formato_producto_ingrediente} en jornada ${id_produccion_diaria}: ${observaciones || ''}`]
                  );
                  const id_movimiento_origen = movimientoOrigenResult.rows[0].id_movimiento;
  
                  await client.query(
                    'INSERT INTO Detalle_Movimientos_Inventario (id_movimiento, id_formato_producto, cantidad, tipo_detalle) VALUES ($1, $2, $3, \'transformacion_consumo\')',
                    [id_movimiento_origen, id_formato_producto_ingrediente, cantidad_requerida]
                  );
                }
  
                // 4. Incrementar stock de todos los productos de salida
                for (const productoSalida of productosSalida) {
                  const { id_formato_producto_salida, cantidad_producida } = productoSalida;
  
                  const stockDestinoResult = await client.query(
                    'SELECT * FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2 FOR UPDATE',
                    [id_formato_producto_salida, id_ubicacion]
                  );
  
                  if (stockDestinoResult.rowCount > 0) {
                    await client.query(
                      'UPDATE Inventario SET stock_actual = stock_actual + $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_formato_producto = $2 AND id_ubicacion = $3',
                      [cantidad_producida, id_formato_producto_salida, id_ubicacion]
                    );
                  } else {
                    await client.query(
                      'INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual, fecha_actualizacion) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
                      [id_formato_producto_salida, id_ubicacion, cantidad_producida]
                    );
                  }
  
                  // Registrar movimiento de inventario para la producción (entrada)
                  const movimientoDestinoResult = await client.query(
                    'INSERT INTO Movimientos_Inventario (fecha, tipo_movimiento, id_ubicacion_destino, observacion) VALUES (CURRENT_TIMESTAMP, \'entrada\', $1, $2) RETURNING id_movimiento',
                    [id_ubicacion, `Transformación (producción) de producto ${id_formato_producto_salida} en jornada ${id_produccion_diaria}: ${observaciones || ''}`]
                  );
                  const id_movimiento_destino = movimientoDestinoResult.rows[0].id_movimiento;
  
                  await client.query(
                    'INSERT INTO Detalle_Movimientos_Inventario (id_movimiento, id_formato_producto, cantidad, tipo_detalle) VALUES ($1, $2, $3, \'transformacion_produccion\')',
                    [id_movimiento_destino, id_formato_producto_salida, cantidad_producida]
                  );
                }
  
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