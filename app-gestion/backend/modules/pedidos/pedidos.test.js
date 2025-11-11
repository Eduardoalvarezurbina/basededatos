const request = require('supertest');
const express = require('express');
const createAuthRouter = require('../../routes/auth');
const createPedidoRouter = require('../../routes/pedidos');
const createAuthController = require('../../controllers/authController');
const createPedidoController = require('../../controllers/pedidoController');
const bcrypt = require('bcrypt');

let app;
let token;
let mockUser;
let mockCliente;
let mockFormatoProducto;

describe('Pedidos API (Integration)', () => {
  beforeAll(async () => {
    const { app: initializedApp, pool: initializedPool } = require('../../app')(global.testPool);
    app = initializedApp;

    // Register a test user and get a token
    const hashedPassword = await bcrypt.hash('password123', 10);
    await global.testPool.query("INSERT INTO Usuarios (username, password_hash, role) VALUES ('pedidos_user', $1, 'admin')", [hashedPassword]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'pedidos_user', password: 'password123' });
    token = res.body.token;

    // Create mock data for pedidos tests
    const userResult = await global.testPool.query("SELECT id_usuario FROM Usuarios WHERE username = 'pedidos_user'");
    mockUser = userResult.rows[0];

    const clienteResult = await global.testPool.query("INSERT INTO Clientes (nombre, telefono) VALUES ('Cliente Pedido Test', '123456789') RETURNING id_cliente");
    mockCliente = clienteResult.rows[0];

    const productoResult = await global.testPool.query("INSERT INTO Productos (nombre, categoria) VALUES ('Producto Pedido Test', 'Test') RETURNING id_producto");
    const formatoProductoResult = await global.testPool.query("INSERT INTO Formatos_Producto (id_producto, formato, precio_detalle_neto) VALUES ($1, 'UNIDAD', 100) RETURNING id_formato_producto", [productoResult.rows[0].id_producto]);
    mockFormatoProducto = formatoProductoResult.rows[0];
  });

  afterAll(async () => {
    // Clean up mock data
    await global.testPool.query('DELETE FROM Detalle_Pedidos');
    await global.testPool.query('DELETE FROM Pedidos');
    await global.testPool.query('DELETE FROM Formatos_Producto WHERE id_formato_producto = $1', [mockFormatoProducto.id_formato_producto]);
    await global.testPool.query('DELETE FROM Productos WHERE id_producto = (SELECT id_producto FROM Formatos_Producto WHERE id_formato_producto = $1)', [mockFormatoProducto.id_formato_producto]);
    await global.testPool.query('DELETE FROM Clientes WHERE id_cliente = $1', [mockCliente.id_cliente]);
    await global.testPool.query("DELETE FROM Usuarios WHERE username = 'pedidos_user'");
  });

  it('POST /pedidos - should create a new order', async () => {
    const newOrder = {
      id_cliente: mockCliente.id_cliente,
      fecha_agendamiento: '2025-12-25',
      lugar_entrega: 'Direccion Test',
      tipo_entrega: 'Delivery',
      observacion: 'Pedido de prueba',
      detalles: [
        {
          id_formato_producto: mockFormatoProducto.id_formato_producto,
          cantidad: 2,
          precio_unitario: 100
        }
      ]
    };

    const res = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${token}`)
      .send(newOrder);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message', 'Pedido creado con éxito.');
    expect(res.body).toHaveProperty('id_pedido');

    // Verify the order was created
    const dbRes = await global.testPool.query('SELECT * FROM Pedidos WHERE id_pedido = $1', [res.body.id_pedido]);
    expect(dbRes.rows.length).toBe(1);
    expect(dbRes.rows[0].lugar_entrega).toBe('Direccion Test');

    // Verify the order details were created
    const dbDetailsRes = await global.testPool.query('SELECT * FROM Detalle_Pedidos WHERE id_pedido = $1', [res.body.id_pedido]);
    expect(dbDetailsRes.rows.length).toBe(1);
    expect(dbDetailsRes.rows[0].cantidad).toBe("2.00");
    expect(dbDetailsRes.rows[0].precio_unitario).toBe("100.00");
  });

  it('GET /pedidos - should get all orders', async () => {
    // First, create an order to ensure there is data to fetch
    const newOrder = {
      id_cliente: mockCliente.id_cliente,
      fecha_agendamiento: '2025-12-26',
      lugar_entrega: 'Direccion Test 2',
      tipo_entrega: 'Retiro',
      observacion: 'Pedido de prueba para GET',
      detalles: [
        {
          id_formato_producto: mockFormatoProducto.id_formato_producto,
          cantidad: 3,
          precio_unitario: 150
        }
      ]
    };
    await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${token}`)
      .send(newOrder);

    const res = await request(app)
      .get('/api/pedidos')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const foundOrder = res.body.find(order => order.lugar_entrega === 'Direccion Test 2');
    expect(foundOrder).toBeDefined();
    expect(foundOrder.detalles[0].cantidad).toBe(3);
  });

  it('GET /pedidos/:id - should get a single order by ID', async () => {
    // First, create an order to ensure there is data to fetch
    const newOrder = {
      id_cliente: mockCliente.id_cliente,
      fecha_agendamiento: '2025-12-27',
      lugar_entrega: 'Direccion Test 3',
      tipo_entrega: 'Delivery',
      observacion: 'Pedido de prueba para GET by ID',
      detalles: [
        {
          id_formato_producto: mockFormatoProducto.id_formato_producto,
          cantidad: 4,
          precio_unitario: 200
        }
      ]
    };
    const createdOrderRes = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${token}`)
      .send(newOrder);
    const newOrderId = createdOrderRes.body.id_pedido;

    const res = await request(app)
      .get(`/api/pedidos/${newOrderId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id_pedido', newOrderId);
    expect(res.body.lugar_entrega).toBe('Direccion Test 3');
    expect(res.body.detalles[0].cantidad).toBe(4);
  });
});