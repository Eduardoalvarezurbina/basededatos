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
    await pool.query('DELETE FROM Proveedores WHERE id_proveedor = $1', [mockProveedor.id_proveedor]);
    // Deleting the product will cascade to formatos and lotes
    const productoId = (await pool.query('SELECT id_producto FROM Formatos_Producto WHERE id_formato_producto = $1', [mockFormatoProducto.id_formato_producto])).rows[0].id_producto;
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
  
  // Add tests for GET, GET by ID, PUT, and DELETE here
});
