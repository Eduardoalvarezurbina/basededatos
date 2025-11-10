const request = require('supertest');
const { app, pool } = require('../../app')(global.testPool);
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

describe('Formatos_Producto API', () => {
  let token;
  let testUser;

  // Setup user and get token once for all tests
  beforeAll(async () => {
    const username = `testuser_${uuidv4()}`;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('testpassword', salt);
    const userRes = await pool.query(
      "INSERT INTO Usuarios (username, password_hash, role) VALUES ($1, $2, 'admin') RETURNING id_usuario, username",
      [username, hashedPassword]
    );
    testUser = userRes.rows[0];

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: testUser.username,
        password: 'testpassword',
      });
    token = res.body.token;
    expect(token).toBeDefined();
  });

  // Clean up the user after all tests are done
  afterAll(async () => {
    await pool.query('DELETE FROM Usuarios WHERE id_usuario = $1', [testUser.id_usuario]);
  });

  let mockProduct;
  let mockFormat;
  let mockUbicacion;

  // Create fresh data before each test
  beforeEach(async () => {
    // Create mock product
    const productRes = await pool.query("INSERT INTO Productos (nombre, categoria, activo) VALUES ($1, 'Test Category', true) RETURNING *", [`Test Product ${uuidv4()}`]);
    mockProduct = productRes.rows[0];

    // Create mock location
    const ubicacionRes = await pool.query("INSERT INTO Ubicaciones_Inventario (nombre, tipo) VALUES ($1, 'Test') RETURNING *", [`Test Location ${uuidv4()}`]);
    mockUbicacion = ubicacionRes.rows[0];

    // Create a mock format to be used in GET/PUT/DELETE tests
    const formatData = {
      id_producto: mockProduct.id_producto,
      formato: '1kg',
      precio_detalle_neto: 1000,
      precio_mayorista_neto: 900,
      ultimo_costo_neto: 500,
      unidad_medida: 'kg'
    };
    const formatRes = await pool.query('INSERT INTO Formatos_Producto (id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', Object.values(formatData));
    mockFormat = formatRes.rows[0];
  });

  // Clean up data after each test
  afterEach(async () => {
    // Clean up in reverse order of creation to avoid foreign key violations
    await pool.query('DELETE FROM Inventario WHERE id_formato_producto = $1', [mockFormat.id_formato_producto]);
    await pool.query('DELETE FROM Formatos_Producto WHERE id_producto = $1', [mockProduct.id_producto]);
    await pool.query('DELETE FROM Productos WHERE id_producto = $1', [mockProduct.id_producto]);
    await pool.query('DELETE FROM Ubicaciones_Inventario WHERE id_ubicacion = $1', [mockUbicacion.id_ubicacion]);
  });


  // Test POST
  it('should create a new product format', async () => {
    const newFormat = {
      id_producto: mockProduct.id_producto,
      formato: '2kg', // Use a different format to avoid conflicts if needed
      precio_detalle_neto: 2000,
      precio_mayorista_neto: 1800,
      ultimo_costo_neto: 1000,
      unidad_medida: 'kg'
    };
    const res = await request(app)
      .post('/api/product-formats')
      .set('Authorization', `Bearer ${token}`)
      .send(newFormat);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id_formato_producto');
    
    // Cleanup the newly created format specifically for this test
    await pool.query('DELETE FROM Formatos_Producto WHERE id_formato_producto = $1', [res.body.id_formato_producto]);
  });

  // Test GET all
  it('should fetch all product formats', async () => {
    const res = await request(app).get('/api/product-formats').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Check if the format created in beforeEach is present
    const found = res.body.some(f => f.id_formato_producto === mockFormat.id_formato_producto);
    expect(found).toBe(true);
  });

  // Test GET by ID
  it('should fetch a single product format by ID', async () => {
    const res = await request(app).get(`/api/product-formats/${mockFormat.id_formato_producto}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.id_formato_producto).toEqual(mockFormat.id_formato_producto);
    expect(res.body.formato).toEqual('1kg');
  });

  // Test PUT
  it('should update a product format', async () => {
    const updatedFormatData = {
      formato: '1.1kg',
      precio_detalle_neto: 1100
    };
    const res = await request(app)
      .put(`/api/product-formats/${mockFormat.id_formato_producto}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatedFormatData);

    expect(res.statusCode).toEqual(200);
    expect(res.body.formato_producto.formato).toEqual('1.1kg');
    expect(res.body.formato_producto.precio_detalle_neto).toBe("1100.00");
  });

  // Test DELETE
  it('should delete a product format', async () => {
    const res = await request(app).delete(`/api/product-formats/${mockFormat.id_formato_producto}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toContain('deleted successfully');

    // Verify it's gone
    const getRes = await request(app).get(`/api/product-formats/${mockFormat.id_formato_producto}`).set('Authorization', `Bearer ${token}`);
    expect(getRes.statusCode).toEqual(404);
  });

  // Test DELETE conflict
  it('should return 409 when trying to delete a format that is in use', async () => {
    // The mockFormat is already created in beforeEach
    // 1. Create an inventory entry that uses it
    await pool.query('INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual) VALUES ($1, $2, 10)', [mockFormat.id_formato_producto, mockUbicacion.id_ubicacion]);

    // 2. Attempt to delete it
    const res = await request(app).delete(`/api/product-formats/${mockFormat.id_formato_producto}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(409);
    expect(res.body.message).toContain('referenced by other records');
  });
});