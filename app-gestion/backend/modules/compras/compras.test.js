const request = require('supertest');
const { app, pool } = require('../../index'); // Import the app and pool
const bcrypt = require('bcrypt');

describe('Compras API', () => {
  let token;
  let proveedorId;
  let productoId;
  let formatoId;
  let ubicacionId;
  let tipoPagoId;
  let cuentaId;

  beforeAll(async () => {
    // Create a test user and get a token
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);
    await pool.query("INSERT INTO Usuarios (username, password_hash, role) VALUES ('testuser', $1, 'admin') ON CONFLICT (username) DO NOTHING", [hashedPassword]);
    const res = await request(app)
      .post('/login')
      .send({
        username: 'testuser',
        password: 'password',
      });
    token = res.body.token;

    // Create test data
    const proveedorRes = await pool.query("INSERT INTO Proveedores (nombre, telefono) VALUES ('Test Proveedor Compras', '123456789') RETURNING id_proveedor");
    proveedorId = proveedorRes.rows[0].id_proveedor;

    const productoRes = await pool.query("INSERT INTO Productos (nombre) VALUES ('Test Producto Compras') RETURNING id_producto");
    productoId = productoRes.rows[0].id_producto;

    const formatoRes = await pool.query("INSERT INTO Formatos_Producto (id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida) VALUES ($1, 'Test Formato Compras', 100, 90, 80, 'unidad') RETURNING id_formato_producto", [productoId]);
    formatoId = formatoRes.rows[0].id_formato_producto;

    const ubicacionRes = await pool.query("INSERT INTO Ubicaciones_Inventario (nombre) VALUES ('Test Ubicacion Compras') RETURNING id_ubicacion");
    ubicacionId = ubicacionRes.rows[0].id_ubicacion;

    const tipoPagoRes = await pool.query("INSERT INTO Tipos_Pago (nombre_tipo_pago) VALUES ('Test Tipo Pago Compras') RETURNING id_tipo_pago");
    tipoPagoId = tipoPagoRes.rows[0].id_tipo_pago;

    const cuentaRes = await pool.query("INSERT INTO Cuentas_Bancarias (nombre_banco, numero_cuenta, nombre_titular) VALUES ('Test Banco Compras', '123456789', 'Test Titular Compras') RETURNING id_cuenta");
    cuentaId = cuentaRes.rows[0].id_cuenta;
  });

  afterAll(async () => {
    // Clean up the database
    await pool.query("DELETE FROM Detalle_Ventas");
    await pool.query("DELETE FROM Detalle_Compras");
    await pool.query("DELETE FROM Compras");
    await pool.query("DELETE FROM Ventas");
    await pool.query("DELETE FROM Inventario");
    await pool.query("DELETE FROM Formatos_Producto");
    await pool.query("DELETE FROM Productos");
    await pool.query("DELETE FROM Proveedores");
    await pool.query("DELETE FROM Ubicaciones_Inventario");
    await pool.query("DELETE FROM Tipos_Pago");
    await pool.query("DELETE FROM Cuentas_Bancarias");
    await pool.query("DELETE FROM Usuarios WHERE username = 'testuser'");
    pool.end();
  });

  describe('GET /compras', () => {
    it('should return an empty array if no purchases exist', async () => {
      await pool.query('DELETE FROM Detalle_Compras');
      await pool.query('DELETE FROM Compras');
      const res = await request(app)
        .get('/compras')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual([]);
    });

    it('should return all purchases', async () => {
      // Insert multiple purchases
      await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: proveedorId,
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: cuentaId,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase 1',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: formatoId,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: ubicacionId
            }
          ]
        });
      await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: proveedorId,
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: cuentaId,
          neto: 2000,
          iva: 380,
          total: 2380,
          observacion: 'Test purchase 2',
          con_factura: false,
          con_iva: false,
          detalles: [
            {
              id_formato_producto: formatoId,
              cantidad: 20,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: ubicacionId
            }
          ]
        });

      const res = await request(app)
        .get('/compras')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /compras/:id', () => {
    it('should retrieve a specific purchase by ID', async () => {
      const newPurchase = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: proveedorId,
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: cuentaId,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase for GET by ID',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: formatoId,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: ubicacionId
            }
          ]
        });

      const res = await request(app)
        .get(`/compras/${newPurchase.body.id_compra}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id_compra', newPurchase.body.id_compra);
      expect(res.body).toHaveProperty('observacion', 'Test purchase for GET by ID');
    });

    it('should return 404 for a non-existent purchase ID', async () => {
      const res = await request(app)
        .get('/compras/9999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message', 'Purchase not found');
    });
  });

  describe('PUT /compras/:id', () => {
    it('should update an existing purchase with valid data', async () => {
      const newPurchase = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: proveedorId,
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: cuentaId,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase for PUT',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: formatoId,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: ubicacionId
            }
          ]
        });

      const updatedData = {
        id_proveedor: proveedorId,
        id_tipo_pago: tipoPagoId,
        id_cuenta_origen: cuentaId,
        neto: 1200,
        iva: 228,
        total: 1428,
        observacion: 'Updated purchase',
        con_factura: false,
        con_iva: false
      };

      const res = await request(app)
        .put(`/compras/${newPurchase.body.id_compra}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updatedData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.compra).toHaveProperty('observacion', 'Updated purchase');
      expect(res.body.compra).toHaveProperty('neto', '1200.00');
    });

    it('should return 404 when updating a non-existent purchase', async () => {
      const updatedData = {
        id_proveedor: 1,
        id_tipo_pago: 1,
        id_cuenta_origen: 1,
        neto: 1200,
        iva: 228,
        total: 1428,
        observacion: 'Updated purchase',
        con_factura: false,
        con_iva: false
      };

      const res = await request(app)
        .put('/compras/9999')
        .set('Authorization', `Bearer ${token}`)
        .send(updatedData);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message', 'Purchase not found');
    });

    it('should return 400 when updating with invalid data', async () => {
      const newPurchase = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase for invalid PUT',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: 1,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: 1
            }
          ]
        });

      const invalidData = {
        neto: 'invalid'
      };

      const res = await request(app)
        .put(`/compras/${newPurchase.body.id_compra}`)
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData);

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'neto debe ser un número.');
    });
  });

  describe('DELETE /compras/:id', () => {
    it('should delete an existing purchase', async () => {
      const newPurchase = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: proveedorId,
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: cuentaId,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase for DELETE',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: formatoId,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: ubicacionId
            }
          ]
        });

      const res = await request(app)
        .delete(`/compras/${newPurchase.body.id_compra}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Purchase deleted and inventory rolled back successfully');
    });

    it('should return 404 when deleting a non-existent purchase', async () => {
      const res = await request(app)
        .delete('/compras/9999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message', 'Purchase not found');
    });
  });

  describe('POST /compras', () => {
    it('should create a new purchase', async () => {
      // You will need to insert a provider, a product, a format, a location, a payment type and a bank account for this test to pass
      const res = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: proveedorId,
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: cuentaId,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: formatoId,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: ubicacionId
            }
          ]
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id_compra');
    });

    it('should return 400 if id_proveedor is missing', async () => {
      const res = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: cuentaId,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: formatoId,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: ubicacionId
            }
          ]
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.errors[0].msg).toBe('id_proveedor es requerido.');
    });

    it('should return 400 if neto is missing', async () => {
      const res = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: proveedorId,
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: cuentaId,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: formatoId,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: ubicacionId
            }
          ]
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.errors[0].msg).toBe('neto es requerido.');
    });

    it('should return 400 if detalles is missing', async () => {
      const res = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: proveedorId,
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: cuentaId,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
          con_factura: true,
          con_iva: true,
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.errors[0].msg).toBe('detalles de compra deben ser un array.');
    });

    it('should return 400 if neto is not a number', async () => {
      const res = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: proveedorId,
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: cuentaId,
          neto: 'invalid',
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: formatoId,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: ubicacionId
            }
          ]
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.errors[0].msg).toBe('neto debe ser un número.');
    });

    it('should return 400 if detalles is an empty array', async () => {
      const res = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: proveedorId,
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: cuentaId,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
          con_factura: true,
          con_iva: true,
          detalles: []
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.errors[0].msg).toBe('detalles de compra no pueden estar vacíos.');
    });

    it('should return 400 if id_formato_producto in detalles is invalid', async () => {
      const res = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: proveedorId,
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: cuentaId,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: 999,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: ubicacionId
            }
          ]
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'id_formato_producto inválido en detalles.');
    });

    it('should return 400 if id_ubicacion in detalles is invalid', async () => {
      const res = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: proveedorId,
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: cuentaId,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: formatoId,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: 999
            }
          ]
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'id_ubicacion inválido en detalles.');
    });

    it('should return 400 if id_proveedor is invalid', async () => {
      const res = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 999,
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: cuentaId,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: formatoId,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: ubicacionId
            }
          ]
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'id_proveedor inválido.');
    });

    it('should return 400 if id_tipo_pago is invalid', async () => {
      const res = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: proveedorId,
          id_tipo_pago: 999,
          id_cuenta_origen: cuentaId,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: formatoId,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: ubicacionId
            }
          ]
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'id_tipo_pago inválido.');
    });

    it('should create a purchase with con_iva: false', async () => {
      const res = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: proveedorId,
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: cuentaId,
          neto: 1000,
          iva: 0,
          total: 1000,
          observacion: 'Test purchase without IVA',
          con_factura: true,
          con_iva: false,
          detalles: [
            {
              id_formato_producto: formatoId,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: ubicacionId
            }
          ]
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id_compra');
    });

    it('should create a purchase with multiple detalles', async () => {
      const res = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: proveedorId,
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: cuentaId,
          neto: 3000,
          iva: 570,
          total: 3570,
          observacion: 'Test purchase with multiple details',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: formatoId,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: ubicacionId
            },
            {
              id_formato_producto: formatoId,
              cantidad: 20,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: ubicacionId
            }
          ]
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id_compra');
    });

    it('should return 400 if id_cuenta_origen is invalid', async () => {
      const res = await request(app)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: proveedorId,
          id_tipo_pago: tipoPagoId,
          id_cuenta_origen: 999,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: formatoId,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: ubicacionId
            }
          ]
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'id_cuenta_origen inválido.');
    });
  });
});