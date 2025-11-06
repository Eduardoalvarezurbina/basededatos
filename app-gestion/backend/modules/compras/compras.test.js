const request = require('supertest');
const { app, pool } = require('../../index');
const bcrypt = require('bcrypt');

describe('Compras API', () => {
  let token;
  let server;

  beforeAll(async () => {
    server = app.listen(4006);
    // Create a test user and get a token
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('compras_test_password', salt);
    await pool.query("INSERT INTO Usuarios (username, password_hash, role) VALUES ('compras_test_user', $1, 'admin') ON CONFLICT (username) DO NOTHING", [hashedPassword]);
    const res = await request(app)
      .post('/login')
      .send({
        username: 'compras_test_user',
        password: 'compras_test_password',
      });
    token = res.body.token;
  });

  afterAll(async () => {
    // Clean up the database
    await pool.query("DELETE FROM Usuarios WHERE username = 'compras_test_user'");
    server.close();
    pool.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE Compras RESTART IDENTITY CASCADE');
  });

  describe('POST /compras', () => {
    it('debería crear una nueva compra', async () => {
      const res = await request(server)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_trabajador: 1,
          fecha_compra: '2025-11-06',
          total_compra: 10000,
          estado_compra: 'recibida'
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id_compra');
    });
  });

  describe('GET /compras', () => {
    it('debería obtener todas las compras', async () => {
      await request(server)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_trabajador: 1,
          fecha_compra: '2025-11-06',
          total_compra: 10000,
          estado_compra: 'recibida'
        });

      const res = await request(server)
        .get('/compras')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.length).toBe(1);
    });
  });

  describe('GET /compras/:id', () => {
    it('debería obtener una sola compra', async () => {
      const newPurchase = await request(server)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_trabajador: 1,
          fecha_compra: '2025-11-06',
          total_compra: 10000,
          estado_compra: 'recibida'
        });

      const res = await request(server)
        .get(`/compras/${newPurchase.body.id_compra}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id_compra', newPurchase.body.id_compra);
    });
  });

  describe('PUT /compras/:id', () => {
    it('debería actualizar una compra', async () => {
      const newPurchase = await request(server)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_trabajador: 1,
          fecha_compra: '2025-11-06',
          total_compra: 10000,
          estado_compra: 'recibida'
        });

      const res = await request(server)
        .put(`/compras/${newPurchase.body.id_compra}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_trabajador: 1,
          fecha_compra: '2025-11-07',
          total_compra: 15000,
          estado_compra: 'pendiente'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.total_compra).toBe("15000.00");
    });
  });

  describe('DELETE /compras/:id', () => {
    it('debería eliminar una compra', async () => {
      const newPurchase = await request(server)
        .post('/compras')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id_proveedor: 1,
          id_trabajador: 1,
          fecha_compra: '2025-11-06',
          total_compra: 10000,
          estado_compra: 'recibida'
        });

      const res = await request(server)
        .delete(`/compras/${newPurchase.body.id_compra}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toBe('Purchase was deleted');
    });
  });
});
