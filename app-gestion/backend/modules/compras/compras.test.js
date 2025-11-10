const request = require('supertest');
const { app, pool } = require('../../app')(global.testPool);
const { v4: uuidv4 } = require('uuid');

describe('Compras API (Integration)', () => {
  let token;
  let testUser;
  let mockProveedor;
  let mockFormatoProducto;
  let mockUbicacion;
  let mockLote;

  beforeAll(async () => {
    // Create a test user and get a token
    const username = `compras_user_${uuidv4().substring(0, 20)}`;
    const hashedPassword = await require('bcrypt').hash('password', 10);
    await pool.query("INSERT INTO Usuarios (username, password_hash, role) VALUES ($1, $2, 'admin')", [username, hashedPassword]);
    const loginRes = await request(app).post('/api/auth/login').send({ username, password: 'password' });
    token = loginRes.body.token;

    // Create prerequisite data
    const proveedorRes = await pool.query("INSERT INTO Proveedores (nombre) VALUES ($1) RETURNING *", [`Prov Compra ${uuidv4()}`]);
    mockProveedor = proveedorRes.rows[0];

    const productoRes = await pool.query("INSERT INTO Productos (nombre) VALUES ($1) RETURNING *", [`Prod Compra ${uuidv4()}`]);
    const formatoRes = await pool.query("INSERT INTO Formatos_Producto (id_producto, formato) VALUES ($1, 'kg') RETURNING *", [productoRes.rows[0].id_producto]);
    mockFormatoProducto = formatoRes.rows[0];

    const ubicacionRes = await pool.query("INSERT INTO Ubicaciones_Inventario (nombre) VALUES ($1) RETURNING *", [`Ubi Compra ${uuidv4()}`]);
    mockUbicacion = ubicacionRes.rows[0];
    
    const loteRes = await pool.query("INSERT INTO Lotes_Produccion (id_producto, codigo_lote, fecha_produccion, cantidad_inicial) VALUES ($1, $2, CURRENT_DATE, 100) RETURNING *", [productoRes.rows[0].id_producto, `LOTE-COMPRA-${uuidv4()}`]);
    mockLote = loteRes.rows[0];

    // Ensure a clean slate for inventory
    await pool.query('DELETE FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion]);
  });

  afterAll(async () => {
    // Cleanup all data
    await pool.query('DELETE FROM Usuarios WHERE username LIKE \'compras_user_%\'');
    await pool.query('DELETE FROM Detalle_Compras WHERE id_compra IN (SELECT id_compra FROM Compras WHERE id_proveedor = $1)', [mockProveedor.id_proveedor]);
    await pool.query('DELETE FROM Compras WHERE id_proveedor = $1', [mockProveedor.id_proveedor]);
    await pool.query('DELETE FROM Proveedores WHERE id_proveedor = $1', [mockProveedor.id_proveedor]);
    // Deleting the product will cascade to formatos and lotes
    const productoId = (await pool.query('SELECT id_producto FROM Formatos_Producto WHERE id_formato_producto = $1', [mockFormatoProducto.id_formato_producto])).rows[0].id_producto;
    await pool.query('DELETE FROM Inventario WHERE id_formato_producto = $1', [mockFormatoProducto.id_formato_producto]);
    await pool.query('DELETE FROM Formatos_Producto WHERE id_formato_producto = $1', [mockFormatoProducto.id_formato_producto]);
    await pool.query('DELETE FROM Lotes_Produccion WHERE id_lote = $1', [mockLote.id_lote]);
    await pool.query('DELETE FROM Productos WHERE id_producto = $1', [productoId]);
    await pool.query('DELETE FROM Ubicaciones_Inventario WHERE id_ubicacion = $1', [mockUbicacion.id_ubicacion]);
  });

  it('POST /api/compras - should create a new purchase and update inventory', async () => {
    const newCompra = {
      id_proveedor: mockProveedor.id_proveedor,
      observacion: 'Compra de prueba',
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
      .post('/api/compras')
      .set('Authorization', `Bearer ${token}`)
      .send(newCompra);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id_compra');
    const compraId = res.body.id_compra;

    // Verify inventory was updated
    const invRes = await pool.query('SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion]);
    expect(invRes.rows[0].stock_actual).toBe("10.00");

    // Cleanup
    await pool.query('DELETE FROM Detalle_Compras WHERE id_compra = $1', [compraId]);
    await pool.query('DELETE FROM Compras WHERE id_compra = $1', [compraId]);
    await pool.query('UPDATE Inventario SET stock_actual = stock_actual - 10 WHERE id_formato_producto = $1 AND id_ubicacion = $2', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion]);
  });
  
  it('GET /api/compras - should retrieve all purchases', async () => {
    // First, create a purchase to ensure there's data to retrieve
    const newCompra = {
      id_proveedor: mockProveedor.id_proveedor,
      observacion: 'Compra para GET ALL',
      detalles: [
        {
          id_formato_producto: mockFormatoProducto.id_formato_producto,
          cantidad: 5,
          precio_unitario: 80,
          id_lote: mockLote.id_lote,
          id_ubicacion: mockUbicacion.id_ubicacion
        }
      ]
    };
    const createRes = await request(app)
      .post('/api/compras')
      .set('Authorization', `Bearer ${token}`)
      .send(newCompra);
    expect(createRes.statusCode).toBe(201);
    const createdCompraId = createRes.body.id_compra;

    const res = await request(app)
      .get('/api/compras')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.some(compra => compra.id_compra === createdCompraId)).toBe(true);

    // Cleanup
    await pool.query('DELETE FROM Detalle_Compras WHERE id_compra = $1', [createdCompraId]);
    await pool.query('DELETE FROM Compras WHERE id_compra = $1', [createdCompraId]);
    await pool.query('UPDATE Inventario SET stock_actual = stock_actual - 5 WHERE id_formato_producto = $1 AND id_ubicacion = $2', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion]);
  });

  it('GET /api/compras/:id - should retrieve a single purchase by ID', async () => {
    // First, create a purchase to retrieve
    const newCompra = {
      id_proveedor: mockProveedor.id_proveedor,
      observacion: 'Compra para GET BY ID',
      detalles: [
        {
          id_formato_producto: mockFormatoProducto.id_formato_producto,
          cantidad: 2,
          precio_unitario: 110,
          id_lote: mockLote.id_lote,
          id_ubicacion: mockUbicacion.id_ubicacion
        }
      ]
    };
    const createRes = await request(app)
      .post('/api/compras')
      .set('Authorization', `Bearer ${token}`)
      .send(newCompra);
    expect(createRes.statusCode).toBe(201);
    const createdCompraId = createRes.body.id_compra;

    const res = await request(app)
      .get(`/api/compras/${createdCompraId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id_compra', createdCompraId);
    expect(res.body).toHaveProperty('observacion', 'Compra para GET BY ID');
    expect(res.body).toHaveProperty('detalles');
    expect(Array.isArray(res.body.detalles)).toBe(true);
    expect(res.body.detalles.length).toBeGreaterThan(0);
    expect(res.body.detalles[0]).toHaveProperty('cantidad', 2); // DB returns as number

    // Cleanup
    await pool.query('DELETE FROM Detalle_Compras WHERE id_compra = $1', [createdCompraId]);
    await pool.query('DELETE FROM Compras WHERE id_compra = $1', [createdCompraId]);
    await pool.query('UPDATE Inventario SET stock_actual = stock_actual - 2 WHERE id_formato_producto = $1 AND id_ubicacion = $2', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion]);
  });
  
  // Add tests for GET, GET by ID, PUT, and DELETE here
  it('PUT /api/compras/:id - should update an existing purchase', async () => {
    // Create a purchase to update
    const newCompra = {
      id_proveedor: mockProveedor.id_proveedor,
      observacion: 'Compra para actualizar',
      detalles: [
        {
          id_formato_producto: mockFormatoProducto.id_formato_producto,
          cantidad: 3,
          precio_unitario: 90,
          id_lote: mockLote.id_lote,
          id_ubicacion: mockUbicacion.id_ubicacion
        }
      ]
    };
    const createRes = await request(app)
      .post('/api/compras')
      .set('Authorization', `Bearer ${token}`)
      .send(newCompra);
    expect(createRes.statusCode).toBe(201);
    const createdCompraId = createRes.body.id_compra;

    const updatedCompra = {
      id_proveedor: mockProveedor.id_proveedor,
      observacion: 'Compra actualizada',
      detalles: [
        {
          id_formato_producto: mockFormatoProducto.id_formato_producto,
          cantidad: 5, // Changed quantity
          precio_unitario: 95, // Changed price
          id_lote: mockLote.id_lote,
          id_ubicacion: mockUbicacion.id_ubicacion
        }
      ]
    };

    const res = await request(app)
      .put(`/api/compras/${createdCompraId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatedCompra);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Compra actualizada con éxito.');

    // Verify the update
    const getRes = await request(app)
      .get(`/api/compras/${createdCompraId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body).toHaveProperty('observacion', 'Compra actualizada');
    expect(getRes.body.detalles[0]).toHaveProperty('cantidad', 5);
    expect(getRes.body.detalles[0]).toHaveProperty('precio_unitario', 95);

    // Cleanup
    await pool.query('DELETE FROM Detalle_Compras WHERE id_compra = $1', [createdCompraId]);
    await pool.query('DELETE FROM Compras WHERE id_compra = $1', [createdCompraId]);
    // Adjust inventory back to original state before the test
    await pool.query('UPDATE Inventario SET stock_actual = stock_actual - 5 WHERE id_formato_producto = $1 AND id_ubicacion = $2', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion]);
  });

  it('DELETE /api/compras/:id - should delete a purchase', async () => {
    // Create a purchase to delete
    const newCompra = {
      id_proveedor: mockProveedor.id_proveedor,
      observacion: 'Compra para eliminar',
      detalles: [
        {
          id_formato_producto: mockFormatoProducto.id_formato_producto,
          cantidad: 1,
          precio_unitario: 100,
          id_lote: mockLote.id_lote,
          id_ubicacion: mockUbicacion.id_ubicacion
        }
      ]
    };
    const createRes = await request(app)
      .post('/api/compras')
      .set('Authorization', `Bearer ${token}`)
      .send(newCompra);
    expect(createRes.statusCode).toBe(201);
    const createdCompraId = createRes.body.id_compra;

    const res = await request(app)
      .delete(`/api/compras/${createdCompraId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Compra eliminada con éxito.');

    // Verify deletion
    const getRes = await request(app)
      .get(`/api/compras/${createdCompraId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.statusCode).toBe(404);

    // Cleanup (inventory should be adjusted by the delete endpoint)
    // No need to manually delete from Compras or Detalle_Compras here as the endpoint should handle it.
    // Just ensure inventory is correct.
    await pool.query('UPDATE Inventario SET stock_actual = stock_actual + 1 WHERE id_formato_producto = $1 AND id_ubicacion = $2', [mockFormatoProducto.id_formato_producto, mockUbicacion.id_ubicacion]);
  });
});
