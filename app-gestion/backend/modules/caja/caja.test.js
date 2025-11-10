const request = require('supertest');
const { app, pool } = require('../../app')(global.testPool);
const { v4: uuidv4 } = require('uuid');

describe('Caja API (Integración con DB)', () => {
  let token;
  let testUserId;

  beforeAll(async () => {
    // Create a test user and get a token
    const username = `caja_user_${uuidv4()}`;
    const hashedPassword = await require('bcrypt').hash('password', 10);
    const userRes = await pool.query("INSERT INTO Usuarios (username, password_hash, role) VALUES ($1, $2, 'admin') RETURNING id_usuario", [username, hashedPassword]);
    testUserId = userRes.rows[0].id_usuario;

    const loginRes = await request(app).post('/api/auth/login').send({ username, password: 'password' });
    token = loginRes.body.token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM Usuarios WHERE id_usuario = $1', [testUserId]);
  });

  // Helper to clean up caja entries for the current date
  const cleanUpCaja = async () => {
    const fecha = new Date().toISOString().slice(0, 10);
    await pool.query('DELETE FROM Caja WHERE fecha = $1', [fecha]);
  };

  beforeEach(async () => {
    await cleanUpCaja();
  });

  afterEach(async () => {
    await cleanUpCaja();
  });

  describe('POST /api/caja/abrir', () => {
    it('debería abrir la caja con un monto inicial', async () => {
      const res = await request(app)
        .post('/api/caja/abrir')
        .set('Authorization', `Bearer ${token}`)
        .send({ monto_inicial: 10000 });

      expect(res.statusCode).toEqual(201);
      expect(res.body.caja).toHaveProperty('id_caja');
      expect(res.body.caja.monto_inicial).toBe('10000.00');
      expect(res.body.caja.estado).toBe('abierta');
      expect(res.body.caja).toHaveProperty('hora_apertura');
    });

    it('no debería abrir la caja si ya hay una abierta', async () => {
      // Abrir una caja primero
      await request(app)
        .post('/api/caja/abrir')
        .set('Authorization', `Bearer ${token}`)
        .send({ monto_inicial: 5000 });

      // Intentar abrir otra
      const res = await request(app)
        .post('/api/caja/abrir')
        .set('Authorization', `Bearer ${token}`)
        .send({ monto_inicial: 15000 });

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toBe('Ya existe una caja abierta para la fecha de hoy.');
    });
  });

  describe('POST /api/caja/cerrar', () => {
    it('debería cerrar la caja con el monto final correcto', async () => {
      // Abrir caja
      await request(app)
        .post('/api/caja/abrir')
        .set('Authorization', `Bearer ${token}`)
        .send({ monto_inicial: 10000 });

      // Simular una venta en efectivo (asumiendo id_tipo_pago = 1 para efectivo)
      // Nota: Esto requiere que la tabla Ventas exista y que el id_tipo_pago sea 1 para efectivo
      // Para una prueba más robusta, se debería mockear o insertar una venta real.
      // Por ahora, asumimos que no hay ventas para simplificar el cálculo.
      // Si hay ventas, el monto final será monto_inicial + total_ventas_efectivo.
      // Para esta prueba, el monto final esperado es solo el monto_inicial si no hay ventas.

      const res = await request(app)
        .post('/api/caja/cerrar')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.caja).toHaveProperty('id_caja');
      expect(res.body.caja.estado).toBe('cerrada');
      expect(res.body.caja).toHaveProperty('hora_cierre');
      // Expect monto_final to be equal to monto_inicial if no sales are simulated
      expect(parseFloat(res.body.caja.monto_final)).toBe(10000); 
    });

    it('no debería cerrar la caja si no hay ninguna abierta', async () => {
      const res = await request(app)
        .post('/api/caja/cerrar')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toBe('No hay una caja abierta para cerrar hoy.');
    });
  });

  describe('GET /api/caja/estado', () => {
    it('debería devolver el estado "abierta" si la caja está abierta', async () => {
      await request(app)
        .post('/api/caja/abrir')
        .set('Authorization', `Bearer ${token}`)
        .send({ monto_inicial: 1000 });

      const res = await request(app)
        .get('/api/caja/estado')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.estado).toBe('abierta');
      expect(res.body.caja).toHaveProperty('id_caja');
      expect(res.body.caja).toHaveProperty('hora_apertura');
    });

    it('debería devolver el estado "cerrada" si la caja está cerrada', async () => {
      const res = await request(app)
        .get('/api/caja/estado')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.estado).toBe('cerrada');
      expect(res.body).not.toHaveProperty('caja'); // No debe haber objeto caja si está cerrada
    });
  });

  describe('GET /api/caja/historial', () => {
    it('debería devolver el historial de cajas cerradas', async () => {
      // Abrir y cerrar una caja para tener historial
      await request(app)
        .post('/api/caja/abrir')
        .set('Authorization', `Bearer ${token}`)
        .send({ monto_inicial: 2000 });
      await request(app)
        .post('/api/caja/cerrar')
        .set('Authorization', `Bearer ${token}`);

      const res = await request(app)
        .get('/api/caja/historial')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].estado).toBe('cerrada');
      expect(res.body[0]).toHaveProperty('hora_apertura');
      expect(res.body[0]).toHaveProperty('hora_cierre');
    });
  });
});