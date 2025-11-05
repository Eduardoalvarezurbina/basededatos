const express = require('express');
const { Pool } = require('pg');

const router = express.Router();
const { authorizeRole } = require('./authMiddleware');

// DB Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});



// POST /pedidos - Agenda un pedido y descuenta el stock para reservar
router.post('/', authorizeRole(['admin', 'trabajador']), async (req, res) => {
  const { id_cliente, id_trabajador, total, fecha_entrega, detalles } = req.body;
  // 'detalles' es un array de { id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion }

  if (!detalles || detalles.length === 0) {
    return res.status(400).json({ message: 'Order details cannot be empty' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insertar en la tabla principal de Pedidos
    const pedidoResult = await client.query(
      'INSERT INTO Pedidos (id_cliente, id_trabajador, total, estado, fecha, fecha_entrega) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5) RETURNING id_pedido',
      [id_cliente, id_trabajador, total, 'Agendado', fecha_entrega]
    );
    const newPedidoId = pedidoResult.rows[0].id_pedido;

    // 2. Iterar sobre los detalles para insertarlos y descontar el inventario
    for (const item of detalles) {
      // 2a. Insertar en Detalle_Pedidos (ahora con lote y ubicacion)
      await client.query(
        'INSERT INTO Detalle_Pedidos (id_pedido, id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion) VALUES ($1, $2, $3, $4, $5, $6)',
        [newPedidoId, item.id_formato_producto, item.cantidad, item.precio_unitario, item.id_lote, item.id_ubicacion]
      );

      // 2b. Descontar del inventario
      const updateInventarioResult = await client.query(
        'UPDATE Inventario SET stock_actual = stock_actual - $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_formato_producto = $2 AND id_ubicacion = $3 AND stock_actual >= $1',
        [item.cantidad, item.id_formato_producto, item.id_ubicacion]
      );
      
      if (updateInventarioResult.rowCount === 0) {
        throw new Error(`Not enough stock for product format ${item.id_formato_producto} in location ${item.id_ubicacion}.`);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Order scheduled successfully', id_pedido: newPedidoId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error scheduling order:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

// POST /pedidos/:id/convertir-a-venta - Convierte un pedido agendado en una venta final
router.post('/:id/convertir-a-venta', authorizeRole(['admin', 'trabajador']), async (req, res) => {
    const { id } = req.params;
    const { id_punto_venta, id_tipo_pago, con_factura, neto_venta, iva_venta, total_bruto_venta, estado_pago, observacion } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Obtener datos del pedido y sus detalles
        const pedidoResult = await client.query('SELECT * FROM Pedidos WHERE id_pedido = $1 AND estado = \'Agendado\'', [id]);
        if (pedidoResult.rowCount === 0) {
            throw new Error('Order not found or already processed.');
        }
        const pedido = pedidoResult.rows[0];

        const detallesPedidoResult = await client.query('SELECT * FROM Detalle_Pedidos WHERE id_pedido = $1', [id]);
        const detallesPedido = detallesPedidoResult.rows;

        // 2. Crear el registro de Venta
        const ventaResult = await client.query(
            `INSERT INTO Ventas (id_cliente, id_punto_venta, id_tipo_pago, id_trabajador, neto_venta, iva_venta, total_bruto_venta, con_iva_venta, observacion, estado, estado_pago, con_factura, fecha, hora) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_DATE, CURRENT_TIME) RETURNING id_venta`,
            [pedido.id_cliente, id_punto_venta, id_tipo_pago, pedido.id_trabajador, neto_venta, iva_venta, total_bruto_venta, true, observacion, 'Finalizada', estado_pago, con_factura]
        );
        const newVentaId = ventaResult.rows[0].id_venta;

        // 3. Crear los detalles de la venta, ahora con la información correcta
        for (const detalle of detallesPedido) {
            const loteResult = await client.query('SELECT costo_por_unidad FROM Lotes_Produccion WHERE id_lote = $1', [detalle.id_lote]);
            if (loteResult.rowCount === 0) {
                throw new Error(`Lot with id ${detalle.id_lote} not found for product in order.`);
            }
            const costoUnitario = loteResult.rows[0].costo_por_unidad;

            await client.query(
                'INSERT INTO Detalle_Ventas (id_venta, id_formato_producto, cantidad, precio_unitario, id_lote, costo_unitario_en_venta) VALUES ($1, $2, $3, $4, $5, $6)',
                [newVentaId, detalle.id_formato_producto, detalle.cantidad, detalle.precio_unitario, detalle.id_lote, costoUnitario]
            );
        }
        
        // 4. Actualizar la fecha de última compra del cliente
        if (pedido.id_cliente) {
            await client.query('UPDATE Clientes SET fecha_ultima_compra = CURRENT_DATE WHERE id_cliente = $1', [pedido.id_cliente]);
        }

        // 5. Actualizar estado del pedido
        await client.query('UPDATE Pedidos SET estado = \'Convertido a Venta\' WHERE id_pedido = $1', [id]);

        await client.query('COMMIT');
        res.status(201).json({ message: 'Order converted to sale successfully', id_venta: newVentaId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error converting order to sale:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
        client.release();
    }
});

// GET /pedidos - Obtener todos los pedidos agendados
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id_pedido, p.fecha, p.estado, p.total, p.fecha_entrega, c.nombre as nombre_cliente
      FROM Pedidos p
      LEFT JOIN Clientes c ON p.id_cliente = c.id_cliente
      ORDER BY p.fecha DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting orders:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /pedidos/:id - Obtener un pedido específico con sus detalles
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pedidoResult = await pool.query('SELECT id_pedido, fecha, id_cliente, id_trabajador, estado, total, con_factura, fecha_entrega FROM Pedidos WHERE id_pedido = $1', [id]);
        if (pedidoResult.rowCount === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const detallesResult = await pool.query('SELECT * FROM Detalle_Pedidos WHERE id_pedido = $1', [id]);
        const pedido = pedidoResult.rows[0];
        pedido.detalles = detallesResult.rows;
        res.json(pedido);
    } catch (err) {
        console.error('Error getting order details:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT /pedidos/:id - Actualizar un pedido
router.put('/:id', authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { id_cliente, id_trabajador, total, estado, fecha_entrega } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'UPDATE Pedidos SET id_cliente = $1, id_trabajador = $2, total = $3, estado = $4, fecha_entrega = $5 WHERE id_pedido = $6 RETURNING *',
      [id_cliente, id_trabajador, total, estado, fecha_entrega, id]
    );
    if (result.rowCount === 0) {
      throw new Error('Order not found');
    }

    await client.query('COMMIT');
    res.json({ message: 'Order updated successfully', pedido: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating order:', err);
    if (err.message === 'Order not found') {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
