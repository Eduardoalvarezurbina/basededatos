const request = require('supertest');
const { app, pool } = require('./index'); // Import the app and pool
const bcrypt = require('bcrypt');

describe('Ventas API', () => {
  let token;
  let adminToken;
  let workerToken;

  let newSale = {
    id_cliente: 1,
    id_punto_venta: 1,
    id_tipo_pago: 1,
    id_trabajador: 1,
    neto_venta: 1000,
    iva_venta: 190,
    total_bruto_venta: 1190,
    con_iva_venta: true,
    observacion: 'Test sale 1',
    estado: 'Completada',
    estado_pago: 'Pagado',
    con_factura: true,
    detalles: [
      {
        id_formato_producto: 1,
        cantidad: 1,
        precio_unitario: 1000,
        id_lote: 1,
        id_ubicacion: 1
      }
    ]
  };

  beforeAll(async () => {
    // Create a test admin user and get a token
    const salt = await bcrypt.genSalt(10);
    const hashedPasswordAdmin = await bcrypt.hash('adminpassword', salt);
    await pool.query("INSERT INTO Usuarios (username, password_hash, role) VALUES ('testadmin', $1, 'admin') ON CONFLICT (username) DO NOTHING", [hashedPasswordAdmin]);
    const resAdmin = await request(app)
      .post('/login')
      .send({
        username: 'testadmin',
        password: 'adminpassword',
      });
    adminToken = resAdmin.body.token;

    // Create a test worker user and get a token
    const hashedPasswordWorker = await bcrypt.hash('workerpassword', salt);
    await pool.query("INSERT INTO Usuarios (username, password_hash, role) VALUES ('testworker', $1, 'trabajador') ON CONFLICT (username) DO NOTHING", [hashedPasswordWorker]);
    const resWorker = await request(app)
      .post('/login')
      .send({
        username: 'testworker',
        password: 'workerpassword',
      });
    workerToken = resWorker.body.token;

    token = adminToken; // Default token for tests
  });

  afterAll(async () => {
    // Clean up the database
    await pool.query("DELETE FROM Usuarios WHERE username = 'testadmin'");
    await pool.query("DELETE FROM Usuarios WHERE username = 'testworker'");
    pool.end();
  });

  beforeEach(async () => {
    // Insert test data
    await pool.query("INSERT INTO Clientes (id_cliente, nombre, telefono, email) VALUES (1, 'Test Client', '123456789', 'client@test.com') ON CONFLICT (id_cliente) DO UPDATE SET nombre = EXCLUDED.nombre;");
    await pool.query("INSERT INTO Puntos_Venta (id_punto_venta, nombre, direccion) VALUES (1, 'Test Point of Sale', 'Test Address') ON CONFLICT (id_punto_venta) DO UPDATE SET nombre = EXCLUDED.nombre;");
    await pool.query("INSERT INTO Tipos_Pago (id_tipo_pago, nombre_tipo_pago) VALUES (1, 'Test Payment Type') ON CONFLICT (id_tipo_pago) DO UPDATE SET nombre_tipo_pago = EXCLUDED.nombre_tipo_pago;");
    await pool.query("INSERT INTO Trabajadores (id_trabajador, nombre) VALUES (1, 'Test Worker') ON CONFLICT (id_trabajador) DO UPDATE SET nombre = EXCLUDED.nombre;");
    await pool.query("INSERT INTO Productos (id_producto, nombre) VALUES (1, 'Test Product') ON CONFLICT (id_producto) DO UPDATE SET nombre = EXCLUDED.nombre;");
    await pool.query("INSERT INTO Formatos_Producto (id_formato_producto, id_producto, formato, unidad_medida) VALUES (1, 1, '1kg', 'kg') ON CONFLICT (id_formato_producto) DO UPDATE SET formato = EXCLUDED.formato;");
    await pool.query("INSERT INTO Lotes_Produccion (id_lote, codigo_lote, id_producto, fecha_produccion, fecha_vencimiento, costo_por_unidad, cantidad_inicial) VALUES (1, 'LOTETEST001', 1, '2025-01-01', '2025-12-31', 100, 100) ON CONFLICT (id_lote) DO UPDATE SET codigo_lote = EXCLUDED.codigo_lote;");
    await pool.query("INSERT INTO Ubicaciones_Inventario (id_ubicacion, nombre) VALUES (1, 'Test Location') ON CONFLICT (id_ubicacion) DO UPDATE SET nombre = EXCLUDED.nombre;");
    await pool.query("INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual) VALUES (1, 1, 100) ON CONFLICT (id_formato_producto, id_ubicacion) DO UPDATE SET stock_actual = EXCLUDED.stock_actual;");
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query("DELETE FROM Detalle_Ventas WHERE id_venta IN (SELECT id_venta FROM Ventas WHERE observacion = 'Test sale 1')");
    await pool.query("DELETE FROM Ventas WHERE observacion = 'Test sale 1'");
  });

  describe('GET /ventas', () => {
    it('should return an empty array if no sales exist', async () => {
      await pool.query('DELETE FROM Detalle_Ventas');
      await pool.query('DELETE FROM Ventas');
      const res = await request(app)
        .get('/ventas')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual([]);
    });

    it('should return all sales', async () => {
      await request(app)
        .post('/ventas')
        .set('Authorization', `Bearer ${token}`)
        .send(newSale);

      const res = await request(app)
        .get('/ventas')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('id_venta');
      expect(res.body[0]).toHaveProperty('nombre_cliente');
    });
  });

  describe('GET /ventas/:id', () => {
    it('should return a specific sale by id', async () => {
      const postRes = await request(app)
        .post('/ventas')
        .set('Authorization', `Bearer ${token}`)
        .send(newSale);

      const res = await request(app)
        .get(`/ventas/${postRes.body.id_venta}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id_venta', postRes.body.id_venta);
      expect(res.body).toHaveProperty('observacion', 'Test sale 1');
    });

    it('should return 404 for a non-existent sale', async () => {
      const res = await request(app)
        .get('/ventas/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('POST /ventas', () => {
    it('should return 400 if id_cliente is missing', async () => {
      const { id_cliente, ...sale } = newSale;
      const res = await request(app)
        .post('/ventas')
        .set('Authorization', `Bearer ${token}`)
        .send(sale);
      expect(res.statusCode).toEqual(400);
    });

    it('should return 400 if detalles is missing', async () => {
      const { detalles, ...sale } = newSale;
      const res = await request(app)
        .post('/ventas')
        .set('Authorization', `Bearer ${token}`)
        .send(sale);
      expect(res.statusCode).toEqual(400);
    });

    it('should return 400 if neto_venta is not a number', async () => {
      const sale = { ...newSale, neto_venta: 'invalid' };
      const res = await request(app)
        .post('/ventas')
        .set('Authorization', `Bearer ${token}`)
        .send(sale);
      expect(res.statusCode).toEqual(400);
    });
  });

  describe('DELETE /ventas/:id', () => {
    it('should delete a sale', async () => {
      const postRes = await request(app)
        .post('/ventas')
        .set('Authorization', `Bearer ${token}`)
        .send(newSale);

      const res = await request(app)
        .delete(`/ventas/${postRes.body.id_venta}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
    });

    it('should return 404 for a non-existent sale', async () => {
      const res = await request(app)
        .delete('/ventas/999999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
    });
  });
});
