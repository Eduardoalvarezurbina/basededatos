const request = require('supertest');
const { app, pool, startServer } = require('./index');

describe('Compras API', () => {
  let server;
  let testApp;
  let token;

  beforeAll(async () => {
    const { app: startedApp, server: startedServer } = await startServer();
    testApp = startedApp;
    server = startedServer;

    // Get a token for the tests
    const res = await request(testApp)
      .post('/login')
      .send({
        username: 'admin',
        password: 'admin'
      });
    token = res.body.token;
  });



      beforeEach(async () => {



        // No seeding needed here, globalSetup handles it



      });
  afterAll(async () => {
    await pool.end();
    server.close();
  });

  describe('GET /compras', () => {
    it('should return an empty array if no purchases exist', async () => {
      await pool.query('DELETE FROM Detalle_Compras');
      await pool.query('DELETE FROM Compras');
      const res = await request(testApp)
        .get('/compras')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual([]);
    });

    it('should return all purchases', async () => {
      // Insert multiple purchases
      await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase 1',
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
      await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
          neto: 2000,
          iva: 380,
          total: 2380,
          observacion: 'Test purchase 2',
          con_factura: false,
          con_iva: false,
          detalles: [
            {
              id_formato_producto: 1,
              cantidad: 20,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: 1
            }
          ]
        });

      const res = await request(testApp)
        .get('/compras')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /compras/:id', () => {
    it('should retrieve a specific purchase by ID', async () => {
      const newPurchase = await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase for GET by ID',
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

      const res = await request(testApp)
        .get(`/compras/${newPurchase.body.id_compra}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id_compra', newPurchase.body.id_compra);
      expect(res.body).toHaveProperty('observacion', 'Test purchase for GET by ID');
    });

    it('should return 404 for a non-existent purchase ID', async () => {
      const res = await request(testApp)
        .get('/compras/9999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message', 'Purchase not found');
    });
  });

  describe('PUT /compras/:id', () => {
    it('should update an existing purchase with valid data', async () => {
      const newPurchase = await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase for PUT',
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

      const res = await request(testApp)
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

      const res = await request(testApp)
        .put('/compras/9999')
        .set('Authorization', `Bearer ${token}`)
        .send(updatedData);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message', 'Purchase not found');
    });

    it('should return 400 when updating with invalid data', async () => {
      const newPurchase = await request(testApp)
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

      const res = await request(testApp)
        .put(`/compras/${newPurchase.body.id_compra}`)
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData);

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'neto debe ser un número.');
    });
  });

  describe('DELETE /compras/:id', () => {
    it('should delete an existing purchase', async () => {
      const newPurchase = await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase for DELETE',
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

      const res = await request(testApp)
        .delete(`/compras/${newPurchase.body.id_compra}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Purchase deleted and inventory rolled back successfully');
    });

    it('should return 404 when deleting a non-existent purchase', async () => {
      const res = await request(testApp)
        .delete('/compras/9999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message', 'Purchase not found');
    });
  });

  describe('POST /compras', () => {
    it('should create a new purchase', async () => {
      // You will need to insert a provider, a product, a format, a location, a payment type and a bank account for this test to pass
      const res = await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
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
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id_compra');
    });

    it('should return 400 if id_proveedor is missing', async () => {
      const res = await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
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
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'id_proveedor es requerido.');
    });

    it('should return 400 if neto is missing', async () => {
      const res = await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
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
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'neto es requerido.');
    });

    it('should return 400 if detalles is missing', async () => {
      const res = await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
          con_factura: true,
          con_iva: true,
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'detalles de compra deben ser un array.');
    });

    it('should return 400 if neto is not a number', async () => {
      const res = await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
          neto: 'invalid',
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
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
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'neto, iva y total deben ser números.');
    });

    it('should return 400 if detalles is an empty array', async () => {
      const res = await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
          con_factura: true,
          con_iva: true,
          detalles: []
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'detalles de compra no pueden estar vacíos.');
    });

    it('should return 400 if id_formato_producto in detalles is invalid', async () => {
      const res = await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
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
              id_ubicacion: 1
            }
          ]
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'id_formato_producto inválido en detalles.');
    });

    it('should return 400 if id_ubicacion in detalles is invalid', async () => {
      const res = await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: 1,
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
      const res = await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 999,
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
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
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'id_proveedor inválido.');
    });

    it('should return 400 if id_tipo_pago is invalid', async () => {
      const res = await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 999,
          id_cuenta_origen: 1,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
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
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'id_tipo_pago inválido.');
    });

    it('should create a purchase with con_iva: false', async () => {
      const res = await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
          neto: 1000,
          iva: 0,
          total: 1000,
          observacion: 'Test purchase without IVA',
          con_factura: true,
          con_iva: false,
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
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id_compra');
    });

    it('should create a purchase with multiple detalles', async () => {
      const res = await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 1,
          id_cuenta_origen: 1,
          neto: 3000,
          iva: 570,
          total: 3570,
          observacion: 'Test purchase with multiple details',
          con_factura: true,
          con_iva: true,
          detalles: [
            {
              id_formato_producto: 1,
              cantidad: 10,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: 1
            },
            {
              id_formato_producto: 1,
              cantidad: 20,
              precio_unitario: 100,
              id_lote: null,
              id_ubicacion: 1
            }
          ]
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id_compra');
    });

    it('should return 400 if id_cuenta_origen is invalid', async () => {
      const res = await request(testApp)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_tipo_pago: 1,
          id_cuenta_origen: 999,
          neto: 1000,
          iva: 190,
          total: 1190,
          observacion: 'Test purchase',
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
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'id_cuenta_origen inválido.');
    });
  });
});