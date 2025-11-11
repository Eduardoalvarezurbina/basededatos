const request = require('supertest');
const express = require('express');
const createAuthRouter = require('../../routes/auth');
const createInventarioRouter = require('../../routes/inventario');
const createAuthController = require('../../controllers/authController');
const createInventarioController = require('../../controllers/inventarioController');
const bcrypt = require('bcrypt');

let app;
let token;
let mockUser;
let mockFormatoProducto;
let mockUbicacionOrigen;
let mockUbicacionDestino;
let mockTrabajador;

describe('Inventario API (Integration)', () => {
  beforeAll(async () => {
    const { app: initializedApp, pool: initializedPool } = require('../../app')(global.testPool);
    app = initializedApp;

    // Register a test user and get a token
    const hashedPassword = await bcrypt.hash('password123', 10);
    await global.testPool.query("INSERT INTO Usuarios (username, password_hash, role) VALUES ('inventario_user', $1, 'admin')", [hashedPassword]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'inventario_user', password: 'password123' });
    token = res.body.token;

    // Create mock data for inventario tests
    const userResult = await global.testPool.query("SELECT id_usuario FROM Usuarios WHERE username = 'inventario_user'");
    mockUser = userResult.rows[0];

    const productoResult = await global.testPool.query("INSERT INTO Productos (nombre, categoria) VALUES ('Producto Inventario Test', 'Test') RETURNING id_producto");
    const formatoProductoResult = await global.testPool.query("INSERT INTO Formatos_Producto (id_producto, formato, precio_detalle_neto) VALUES ($1, 'UNIDAD', 100) RETURNING id_formato_producto", [productoResult.rows[0].id_producto]);
    mockFormatoProducto = formatoProductoResult.rows[0];

    const ubicacionOrigenResult = await global.testPool.query("INSERT INTO Ubicaciones_Inventario (nombre) VALUES ('Bodega Origen Test') RETURNING id_ubicacion");
    mockUbicacionOrigen = ubicacionOrigenResult.rows[0];

    const ubicacionDestinoResult = await global.testPool.query("INSERT INTO Ubicaciones_Inventario (nombre) VALUES ('Bodega Destino Test') RETURNING id_ubicacion");
    mockUbicacionDestino = ubicacionDestinoResult.rows[0];

    const trabajadorResult = await global.testPool.query("INSERT INTO Trabajadores (nombre) VALUES ('Trabajador Inventario') RETURNING id_trabajador");
    mockTrabajador = trabajadorResult.rows[0];

    // Insert initial stock for the product in the origin location
    await global.testPool.query("INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual) VALUES ($1, $2, 100)", [mockFormatoProducto.id_formato_producto, mockUbicacionOrigen.id_ubicacion]);
  });

  afterAll(async () => {
    // Clean up mock data
    await global.testPool.query('DELETE FROM Detalle_Movimientos_Inventario');
    await global.testPool.query('DELETE FROM Movimientos_Inventario');
    await global.testPool.query('DELETE FROM Inventario');
    await global.testPool.query('DELETE FROM Formatos_Producto WHERE id_formato_producto = $1', [mockFormatoProducto.id_formato_producto]);
    await global.testPool.query('DELETE FROM Productos WHERE id_producto = (SELECT id_producto FROM Formatos_Producto WHERE id_formato_producto = $1)', [mockFormatoProducto.id_formato_producto]);
    await global.testPool.query('DELETE FROM Ubicaciones_Inventario WHERE id_ubicacion = $1 OR id_ubicacion = $2', [mockUbicacionOrigen.id_ubicacion, mockUbicacionDestino.id_ubicacion]);
    await global.testPool.query('DELETE FROM Trabajadores WHERE id_trabajador = $1', [mockTrabajador.id_trabajador]);
    await global.testPool.query("DELETE FROM Usuarios WHERE username = 'inventario_user'");
  });

  it('POST /inventario/transferir - should transfer inventory between locations', async () => {
    const transferData = {
      id_formato_producto: mockFormatoProducto.id_formato_producto,
      cantidad: 25,
      id_ubicacion_origen: mockUbicacionOrigen.id_ubicacion,
      id_ubicacion_destino: mockUbicacionDestino.id_ubicacion,
      id_trabajador: mockTrabajador.id_trabajador,
      observaciones: 'Transferencia de prueba'
    };

    const res = await request(app)
      .post('/api/inventario/transferir')
      .set('Authorization', `Bearer ${token}`)
      .send(transferData);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Transferencia de inventario registrada con éxito.');

    // Verify stock updates
    const stockOrigen = await global.testPool.query(
      'SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2',
      [mockFormatoProducto.id_formato_producto, mockUbicacionOrigen.id_ubicacion]
    );
    expect(parseFloat(stockOrigen.rows[0].stock_actual)).toBe(75); // 100 - 25

    const stockDestino = await global.testPool.query(
      'SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2',
      [mockFormatoProducto.id_formato_producto, mockUbicacionDestino.id_ubicacion]
    );
    expect(parseFloat(stockDestino.rows[0].stock_actual)).toBe(25); // 0 + 25

    // Verify movement records
    const movimientos = await global.testPool.query(
      'SELECT tipo_movimiento, id_formato_producto, cantidad, tipo_detalle FROM Movimientos_Inventario mi JOIN Detalle_Movimientos_Inventario dmi ON mi.id_movimiento = dmi.id_movimiento WHERE mi.observacion LIKE $1 ORDER BY mi.fecha DESC',
      [`%Transferencia de 25 unidades%`]
    );

    expect(movimientos.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo_movimiento: 'transferencia_entrada',
          id_formato_producto: mockFormatoProducto.id_formato_producto,
          cantidad: "25.00",
          tipo_detalle: 'transferencia_entrada'
        }),
        expect.objectContaining({
          tipo_movimiento: 'transferencia_salida',
          id_formato_producto: mockFormatoProducto.id_formato_producto,
          cantidad: "25.00",
          tipo_detalle: 'transferencia_salida'
        })
      ])
    );
  });
});