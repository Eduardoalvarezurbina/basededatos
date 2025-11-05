const request = require('supertest');
const { app, pool } = require('../../index'); // Import the actual app and pool
const bcrypt = require('bcrypt');

describe('Formatos_Producto API', () => {
  let token;
  let mockProduct;
  let mockFormat;
  let mockUbicacion;

  beforeAll(async () => {
    // 1. Create a test user and get a token
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('testpassword', salt);
    await pool.query("INSERT INTO Usuarios (username, password_hash, role) VALUES ('formato_test_user', $1, 'admin') ON CONFLICT (username) DO NOTHING", [hashedPassword]);
    const res = await request(app)
      .post('/login')
      .send({
        username: 'formato_test_user',
        password: 'testpassword',
      });
    token = res.body.token;

    // 2. Create mock product and location
    const productRes = await pool.query("INSERT INTO Productos (nombre, categoria, activo) VALUES ('Test Product for Formato', 'Test Category', true) RETURNING id_producto");
    mockProduct = productRes.rows[0];
    const ubicacionRes = await pool.query("INSERT INTO Ubicaciones_Inventario (nombre, tipo) VALUES ('Test Location for Formato', 'Test') RETURNING id_ubicacion");
    mockUbicacion = ubicacionRes.rows[0];
  });

  afterAll(async () => {
    // Clean up all mock data
    await pool.query('DELETE FROM Formatos_Producto WHERE id_producto = $1', [mockProduct.id_producto]);
    await pool.query('DELETE FROM Productos WHERE id_producto = $1', [mockProduct.id_producto]);
    await pool.query('DELETE FROM Ubicaciones_Inventario WHERE id_ubicacion = $1', [mockUbicacion.id_ubicacion]);
    await pool.query("DELETE FROM Usuarios WHERE username = 'formato_test_user'");
    await pool.end();
  });

  // Test POST
  it('should create a new product format', async () => {
    const newFormat = {
      id_producto: mockProduct.id_producto,
      formato: '1kg',
      precio_detalle_neto: 1000,
      precio_mayorista_neto: 900,
      ultimo_costo_neto: 500,
      unidad_medida: 'kg'
    };
    const res = await request(app)
      .post('/formatos-producto')
      .set('Authorization', `Bearer ${token}`)
      .send(newFormat);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id_formato_producto');
    mockFormat = res.body; // Save for later tests
  });

  // Test GET all
  it('should fetch all product formats', async () => {
    const res = await request(app).get('/formatos-producto').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  // Test GET by ID
  it('should fetch a single product format by ID', async () => {
    const res = await request(app).get(`/formatos-producto/${mockFormat.id_formato_producto}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.id_formato_producto).toEqual(mockFormat.id_formato_producto);
    expect(res.body.formato).toEqual('1kg');
  });

  // Test PUT
  it('should update a product format', async () => {
    const updatedFormat = {
      ...mockFormat,
      formato: '1.1kg',
      precio_detalle_neto: 1100
    };
    const res = await request(app)
      .put(`/formatos-producto/${mockFormat.id_formato_producto}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatedFormat);

    expect(res.statusCode).toEqual(200);
    expect(res.body.formato_producto.formato).toEqual('1.1kg');
    expect(res.body.formato_producto.precio_detalle_neto).toBe("1100.00");
  });

  // Test DELETE
  it('should delete a product format', async () => {
    const res = await request(app).delete(`/formatos-producto/${mockFormat.id_formato_producto}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toContain('deleted successfully');

    // Verify it's gone
    const getRes = await request(app).get(`/formatos-producto/${mockFormat.id_formato_producto}`).set('Authorization', `Bearer ${token}`);
    expect(getRes.statusCode).toEqual(404);
  });

  // Test DELETE conflict
  it('should return 409 when trying to delete a format that is in use', async () => {
    // 1. Create a new format
    const newFormatData = {
        id_producto: mockProduct.id_producto,
        formato: '500g',
        precio_detalle_neto: 600,
        precio_mayorista_neto: 550,
        ultimo_costo_neto: 300,
        unidad_medida: 'g'
    };
    const formatRes = await pool.query('INSERT INTO Formatos_Producto (id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', Object.values(newFormatData));
    const formatInUse = formatRes.rows[0];

    // 2. Create an inventory entry that uses it
    await pool.query('INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual) VALUES ($1, $2, 10)', [formatInUse.id_formato_producto, mockUbicacion.id_ubicacion]);

    // 3. Attempt to delete it
    const res = await request(app).delete(`/formatos-producto/${formatInUse.id_formato_producto}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(409);
    expect(res.body.message).toContain('referenced by other records');

    // 4. Cleanup
    await pool.query('DELETE FROM Inventario WHERE id_formato_producto = $1', [formatInUse.id_formato_producto]);
  });
});
