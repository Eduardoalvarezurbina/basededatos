const createPedidoController = (pool) => {

  const createPedido = async (req, res) => {
    const {
      id_cliente,
      fecha_agendamiento,
      lugar_entrega,
      tipo_entrega,
      observacion,
      detalles
    } = req.body;

    const client = await pool.connect();
    try {
      // 1. Input Validation
      if (!id_cliente || !fecha_agendamiento || !detalles || detalles.length === 0) {
        return res.status(400).json({ message: 'Faltan datos requeridos para el pedido (id_cliente, fecha_agendamiento, detalles).' });
      }

      for (const detalle of detalles) {
        if (!detalle.id_formato_producto || !detalle.cantidad || !detalle.precio_unitario) {
          return res.status(400).json({ message: 'Cada detalle de pedido debe incluir id_formato_producto, cantidad y precio_unitario.' });
        }
        if (detalle.cantidad <= 0) {
          return res.status(400).json({ message: 'La cantidad en los detalles de pedido debe ser un número positivo.' });
        }
      }

      await client.query('BEGIN');

                                  // 2. Insertar el pedido principal

                                  const pedidoResult = await client.query(

                                    'INSERT INTO Pedidos (id_cliente, fecha, fecha_agendamiento, lugar_entrega, tipo_entrega, observacion, estado) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, \'pendiente\') RETURNING id_pedido',

                                    [id_cliente, fecha_agendamiento, lugar_entrega, tipo_entrega, observacion]

                                  );      const id_pedido = pedidoResult.rows[0].id_pedido;

      // 3. Procesar detalles del pedido
      for (const detalle of detalles) {
        const { id_formato_producto, cantidad, precio_unitario } = detalle;
        await client.query(
          'INSERT INTO Detalle_Pedidos (id_pedido, id_formato_producto, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)',
          [id_pedido, id_formato_producto, cantidad, precio_unitario]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ message: 'Pedido creado con éxito.', id_pedido: id_pedido });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error al crear el pedido:', err);
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };

            const getAllPedidos = async (req, res) => {
              try {
                const result = await pool.query(`
                  SELECT
                    p.id_pedido,
                    p.fecha,
                    p.fecha_agendamiento,
                    p.lugar_entrega,
                    p.tipo_entrega,
                    p.observacion,
                    p.estado,
                    c.nombre AS nombre_cliente,
                    c.telefono AS telefono_cliente,
                    json_agg(
                      json_build_object(
                        'id_detalle_pedido', dp.id_detalle_pedido,
                        'id_formato_producto', dp.id_formato_producto,
                        'cantidad', dp.cantidad,
                        'precio_unitario', dp.precio_unitario,
                        'nombre_producto', prod.nombre,
                        'formato_producto', fp.formato
                      )
                    ) AS detalles
                  FROM Pedidos p
                  JOIN Clientes c ON p.id_cliente = c.id_cliente
                  JOIN Detalle_Pedidos dp ON p.id_pedido = dp.id_pedido
                  JOIN Formatos_Producto fp ON dp.id_formato_producto = fp.id_formato_producto
                  JOIN Productos prod ON fp.id_producto = prod.id_producto
                  GROUP BY p.id_pedido, c.nombre, c.telefono
                  ORDER BY p.fecha_agendamiento DESC;
                `);
                res.status(200).json(result.rows);
              } catch (err) {
                console.error('Error al obtener todos los pedidos:', err);
                res.status(500).json({ message: 'Internal server error', error: err.message });
              }
            };
  
            const getPedidoById = async (req, res) => {
              const { id } = req.params;
              try {
                const result = await pool.query(`
                  SELECT
                    p.id_pedido,
                    p.fecha,
                    p.fecha_agendamiento,
                    p.lugar_entrega,
                    p.tipo_entrega,
                    p.observacion,
                    p.estado,
                    c.nombre AS nombre_cliente,
                    c.telefono AS telefono_cliente,
                    json_agg(
                      json_build_object(
                        'id_detalle_pedido', dp.id_detalle_pedido,
                        'id_formato_producto', dp.id_formato_producto,
                        'cantidad', dp.cantidad,
                        'precio_unitario', dp.precio_unitario,
                        'nombre_producto', prod.nombre,
                        'formato_producto', fp.formato
                      )
                    ) AS detalles
                  FROM Pedidos p
                  JOIN Clientes c ON p.id_cliente = c.id_cliente
                  JOIN Detalle_Pedidos dp ON p.id_pedido = dp.id_pedido
                  JOIN Formatos_Producto fp ON dp.id_formato_producto = fp.id_formato_producto
                  JOIN Productos prod ON fp.id_producto = prod.id_producto
                  WHERE p.id_pedido = $1
                  GROUP BY p.id_pedido, c.nombre, c.telefono;
                `, [id]);
  
                if (result.rows.length === 0) {
                  return res.status(404).json({ message: 'Pedido no encontrado.' });
                }
                res.status(200).json(result.rows[0]);
              } catch (err) {
                console.error('Error al obtener pedido por ID:', err);
                res.status(500).json({ message: 'Internal server error', error: err.message });
              }
            };
  
            return {
              createPedido,
              getAllPedidos,
              getPedidoById,
            };
          };
module.exports = createPedidoController;
