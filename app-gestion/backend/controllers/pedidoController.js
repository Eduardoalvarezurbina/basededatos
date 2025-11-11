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

  return {
    createPedido,
  };
};

module.exports = createPedidoController;
