const request = require('supertest');
const { app, pool } = require('../../app')(global.testPool);
const { v4: uuidv4 } = require('uuid');

describe('Ventas API (Integration)', () => {
  let token;
  let testUser;
  let mockCliente;
  let mockFormatoProducto;
  let mockUbicacion;
  let mockLote;

  beforeAll(async () => {
    // Create a test user and get a token
    const username = `ventas_user_${uuidv4().substring(0, 20)}`;
    const hashedPassword = await require('bcrypt').hash('password', 10);
    await pool.query("INSERT INTO Usuarios (username, password_hash, role) VALUES ($1, $2, 'admin')", [username, hashedPassword]);
    const loginRes = await request(app).post('/api/auth/login').send({ username, password: 'password' });
    token = loginRes.body.token;

    // Create prerequisite data
    const clienteRes = await pool.query("INSERT INTO Clientes (nombre, telefono) VALUES ($1, $2) RETURNING *", [`Cliente Venta ${uuidv4()}`, `+569${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`]);
    mockCliente = clienteRes.rows[0];

    const productoRes = await pool.query("INSERT INTO Productos (nombre) VALUES ($1) RETURNING *", [`Prod Venta ${uuidv4()}`]);
    const formatoRes = await pool.query("INSERT INTO Formatos_Producto (id_producto, formato) VALUES ($1, 'kg') RETURNING *", [productoRes.rows[0].id_producto]);
    mockFormatoProducto = formatoRes.rows[0];

    const ubicacionRes = await pool.query("INSERT INTO Ubicaciones_Inventario (nombre) VALUES ($1) RETURNING *", [`Ubi Venta ${uuidv4()}`]);
    mockUbicacion = ubicacionRes.rows[0];
    
    const loteRes = await pool.query("INSERT INTO Lotes_Produccion (id_producto, codigo_lote, fecha_produccion, cantidad_inicial) VALUES ($1, $2, CURRENT_DATE, 100) RETURNING *", [productoRes.rows[0].id_producto, `LOTE-VENTA-${uuidv4()}`]);
    mockLote = loteRes.rows[0];

    // Ensure a clean slate for inventory and add stock
    await pool.query('DELETE FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion]);
    await pool.query('INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual, fecha_actualizacion) VALUES ($1, $2, 100, CURRENT_TIMESTAMP)', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion]);
  });

  afterAll(async () => {
    // Cleanup all data
    await pool.query('DELETE FROM Usuarios WHERE username LIKE \'ventas_user_%\'');
    await pool.query('DELETE FROM Detalle_Ventas WHERE id_venta IN (SELECT id_venta FROM Ventas WHERE id_cliente = $1)', [mockCliente.id_cliente]);
    await pool.query('DELETE FROM Ventas WHERE id_cliente = $1', [mockCliente.id_cliente]);
    await pool.query('DELETE FROM Clientes WHERE id_cliente = $1', [mockCliente.id_cliente]);
    // Delete from Detalle_Movimientos_Inventario first, then Movimientos_Inventario
    await pool.query('DELETE FROM Detalle_Movimientos_Inventario WHERE id_formato_producto = $1', [mockFormatoProducto.id_formato_producto]);
    await pool.query('DELETE FROM Movimientos_Inventario WHERE id_ubicacion_origen = $1', [mockUbicacion.id_ubicacion]);
    // Deleting the product will cascade to formatos and lotes
    const productoId = (await pool.query('SELECT id_producto FROM Formatos_Producto WHERE id_formato_producto = $1', [mockFormatoProducto.id_formato_producto])).rows[0].id_producto;
    await pool.query('DELETE FROM Inventario WHERE id_formato_producto = $1', [mockFormatoProducto.id_formato_producto]);
    await pool.query('DELETE FROM Formatos_Producto WHERE id_formato_producto = $1', [mockFormatoProducto.id_formato_producto]);
    await pool.query('DELETE FROM Lotes_Produccion WHERE id_lote = $1', [mockLote.id_lote]);
    await pool.query('DELETE FROM Productos WHERE id_producto = $1', [productoId]);
    await pool.query('DELETE FROM Movimientos_Inventario WHERE id_ubicacion_origen = $1 OR id_ubicacion_destino = $1', [mockUbicacion.id_ubicacion]);
    await pool.query('DELETE FROM Ubicaciones_Inventario WHERE id_ubicacion = $1', [mockUbicacion.id_ubicacion]);
  });

  it('POST /api/ventas - should create a new sale and update inventory', async () => {
    const newVenta = {
      id_cliente: mockCliente.id_cliente,
      observacion: 'Venta de prueba',
      detalles: [
        {
          id_formato_producto: mockFormatoProducto.id_formato_producto,
          cantidad: 10,
          precio_unitario: 100,
          id_lote: mockLote.id_lote,
          id_ubicacion: mockUbicacion.id_ubicacion
        }
      ]
    };

    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send(newVenta);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id_venta');
    const ventaId = res.body.id_venta;

    // Verify inventory was updated
    const invRes = await pool.query('SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion]);
    expect(invRes.rows[0].stock_actual).toBe("90.00");

    // Cleanup
    await pool.query('DELETE FROM Detalle_Ventas WHERE id_venta = $1', [ventaId]);
    await pool.query('DELETE FROM Ventas WHERE id_venta = $1', [ventaId]);
    await pool.query('UPDATE Inventario SET stock_actual = stock_actual + 10 WHERE id_formato_producto = $1 AND id_ubicacion = $2', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion]);
  });
  
  it('GET /api/ventas - should retrieve all sales', async () => {
    // First, create a sale to ensure there's data to retrieve
    const newVenta = {
      id_cliente: mockCliente.id_cliente,
      observacion: 'Venta para GET ALL',
      detalles: [
        {
          id_formato_producto: mockFormatoProducto.id_formato_producto,
          cantidad: 5,
          precio_unitario: 120,
          id_lote: mockLote.id_lote,
          id_ubicacion: mockUbicacion.id_ubicacion
        }
      ]
    };
    const createRes = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send(newVenta);
    expect(createRes.statusCode).toBe(201);
    const createdVentaId = createRes.body.id_venta;

    const res = await request(app)
      .get('/api/ventas')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.some(venta => venta.id_venta === createdVentaId)).toBe(true);

    // Cleanup
    await pool.query('DELETE FROM Detalle_Ventas WHERE id_venta = $1', [createdVentaId]);
    await pool.query('DELETE FROM Ventas WHERE id_venta = $1', [createdVentaId]);
    await pool.query('UPDATE Inventario SET stock_actual = stock_actual + 5 WHERE id_formato_producto = $1 AND id_ubicacion = $2', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion]);
  });

  it('GET /api/ventas/:id - should retrieve a single sale by ID', async () => {
    // First, create a sale to retrieve
    const newVenta = {
      id_cliente: mockCliente.id_cliente,
      observacion: 'Venta para GET BY ID',
      detalles: [
        {
          id_formato_producto: mockFormatoProducto.id_formato_producto,
          cantidad: 2,
          precio_unitario: 150,
          id_lote: mockLote.id_lote,
          id_ubicacion: mockUbicacion.id_ubicacion
        }
      ]
    };
    const createRes = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send(newVenta);
    expect(createRes.statusCode).toBe(201);
    const createdVentaId = createRes.body.id_venta;

    const res = await request(app)
      .get(`/api/ventas/${createdVentaId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id_venta', createdVentaId);
    expect(res.body).toHaveProperty('observacion', 'Venta para GET BY ID');
    expect(res.body).toHaveProperty('detalles');
    expect(Array.isArray(res.body.detalles)).toBe(true);
    expect(res.body.detalles.length).toBeGreaterThan(0);
    expect(res.body.detalles[0]).toHaveProperty('cantidad', 2);

    // Cleanup
    await pool.query('DELETE FROM Detalle_Ventas WHERE id_venta = $1', [createdVentaId]);
    await pool.query('DELETE FROM Ventas WHERE id_venta = $1', [createdVentaId]);
    await pool.query('UPDATE Inventario SET stock_actual = stock_actual + 2 WHERE id_formato_producto = $1 AND id_ubicacion = $2', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion]);
  });
  
  it('PUT /api/ventas/:id - should update a sale', async () => {
    // First, create a sale to update
    const newVenta = {
      id_cliente: mockCliente.id_cliente,
      observacion: 'Venta original',
      detalles: [
        {
          id_formato_producto: mockFormatoProducto.id_formato_producto,
          cantidad: 5,
          precio_unitario: 100,
          id_lote: mockLote.id_lote,
          id_ubicacion: mockUbicacion.id_ubicacion
        }
      ]
    };
    const createRes = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send(newVenta);
    expect(createRes.statusCode).toBe(201);
    const createdVentaId = createRes.body.id_venta;

    const updatedVentaData = {
      observacion: 'Venta actualizada',
      // Note: For simplicity, this PUT only updates the header.
      // A full implementation might allow updating/adding/removing details,
      // which would require more complex inventory adjustments.
    };

    const res = await request(app)
      .put(`/api/ventas/${createdVentaId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatedVentaData);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Venta actualizada con éxito.');

    const fetchRes = await request(app)
      .get(`/api/ventas/${createdVentaId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(fetchRes.statusCode).toBe(200);
    expect(fetchRes.body).toHaveProperty('observacion', 'Venta actualizada');

    // Cleanup
    await pool.query('DELETE FROM Detalle_Ventas WHERE id_venta = $1', [createdVentaId]);
    await pool.query('DELETE FROM Ventas WHERE id_venta = $1', [createdVentaId]);
    // Revert inventory change from initial creation
    await pool.query('UPDATE Inventario SET stock_actual = stock_actual + 5 WHERE id_formato_producto = $1 AND id_ubicacion = $2', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion]);
  });

  it('DELETE /api/ventas/:id - should delete a sale and reverse inventory changes', async () => {
    // First, create a sale to delete
    const initialStock = (await pool.query('SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion])).rows[0].stock_actual;

    const newVenta = {
      id_cliente: mockCliente.id_cliente,
      observacion: 'Venta para DELETE',
      detalles: [
        {
          id_formato_producto: mockFormatoProducto.id_formato_producto,
          cantidad: 15,
          precio_unitario: 90,
          id_lote: mockLote.id_lote,
          id_ubicacion: mockUbicacion.id_ubicacion
        }
      ]
    };
    const createRes = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send(newVenta);
    expect(createRes.statusCode).toBe(201);
    const createdVentaId = createRes.body.id_venta;

    // Verify stock decreased
    const stockAfterSale = (await pool.query('SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion])).rows[0].stock_actual;
    expect(parseFloat(stockAfterSale)).toBe(parseFloat(initialStock) - 15);

    const res = await request(app)
      .delete(`/api/ventas/${createdVentaId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Venta eliminada con éxito y stock revertido.');

    // Verify sale is deleted
    const fetchRes = await request(app)
      .get(`/api/ventas/${createdVentaId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(fetchRes.statusCode).toBe(404);

    // Verify stock reverted
    const stockAfterDelete = (await pool.query('SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion])).rows[0].stock_actual;
    expect(parseFloat(stockAfterDelete)).toBe(parseFloat(initialStock));
  });
  
});
