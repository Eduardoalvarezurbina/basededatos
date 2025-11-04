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



  afterAll(async () => {
    console.log('afterAll executed');
    await pool.end();
    server.close();
  });

  describe('GET /compras', () => {
    it('should return all purchases', async () => {
      const res = await request(testApp)
        .get('/compras')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toBeInstanceOf(Array);
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
  });
});