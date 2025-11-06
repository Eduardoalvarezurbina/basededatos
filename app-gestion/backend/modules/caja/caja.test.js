const request = require('supertest');
const { app, pool } = require('../../index');
const bcrypt = require('bcrypt');

describe('Caja API', () => {
  let token;
  let server;

  beforeAll(async () => {
    server = app.listen(4005);
    // Create a test user and get a token
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('caja_test_password', salt);
    await pool.query("INSERT INTO Usuarios (username, password_hash, role) VALUES ('caja_test_user', $1, 'admin') ON CONFLICT (username) DO NOTHING", [hashedPassword]);
    const res = await request(app)
      .post('/login')
      .send({
        username: 'caja_test_user',
        password: 'caja_test_password',
      });
    token = res.body.token;
  });

  afterAll(async () => {
    // Clean up the database
    await pool.query("DELETE FROM Usuarios WHERE username = 'caja_test_user'");
    server.close();
    pool.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE Caja RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE Ventas RESTART IDENTITY CASCADE');
  });

  describe('POST /caja/abrir', () => {
    it('debería abrir la caja con un monto inicial', async () => {
      const res = await request(server)
        .post('/caja/abrir')
        .set('Authorization', `Bearer ${token}`)
        .send({ monto_inicial: 10000 });
      expect(res.statusCode).toEqual(201);
      expect(res.body.caja).toHaveProperty('id_caja');
      expect(res.body.caja.monto_inicial).toBe("10000.00");
    });

    it('no debería abrir la caja si ya hay una abierta', async () => {
      await request(server)
        .post('/caja/abrir')
        .set('Authorization', `Bearer ${token}`)
        .send({ monto_inicial: 10000 });

      const res = await request(server)
        .post('/caja/abrir')
        .set('Authorization', `Bearer ${token}`)
        .send({ monto_inicial: 15000 });

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toBe('Ya existe una caja abierta para la fecha de hoy.');
    });
  });

  describe('POST /caja/cerrar', () => {
    it('debería cerrar la caja con el monto final correcto', async () => {
        await request(server)
            .post('/caja/abrir')
            .set('Authorization', `Bearer ${token}`)
        .send({ monto_inicial: 10000 });

      // 2. Simular una venta en efectivo
      await pool.query(
        `INSERT INTO Ventas (fecha, hora, id_cliente, id_punto_venta, id_tipo_pago, id_trabajador, neto_venta, iva_venta, total_bruto_venta, con_iva_venta, estado, estado_pago)
         VALUES (CURRENT_DATE, CURRENT_TIME, 1, 1, 1, 1, 4201.68, 798.32, 5000.00, true, 'completada', 'pagado')`
      );

      // 3. Cerrar la caja
      const res = await request(server)
        .post('/caja/cerrar')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.caja.monto_final).toBe("15000.00"); // 10000 inicial + 5000 de la venta
    });

    it('no debería cerrar la caja si no hay ninguna abierta', async () => {
        const res = await request(server)
          .post('/caja/cerrar')
          .set('Authorization', `Bearer ${token}`);
  
        expect(res.statusCode).toEqual(404);
        expect(res.body.message).toBe('No hay una caja abierta para cerrar hoy.');
      });
  });

  describe('GET /caja/estado', () => {
    it('debería devolver el estado "abierta" si la caja está abierta', async () => {
        await request(server)
            .post('/caja/abrir')
            .set('Authorization', `Bearer ${token}`)
            .send({ monto_inicial: 10000 });

        const res = await request(server)
            .get('/caja/estado')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.estado).toBe('abierta');
        expect(res.body.caja).toBeDefined();
    });

    it('debería devolver el estado "cerrada" si la caja está cerrada', async () => {
        const res = await request(server)
            .get('/caja/estado')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.estado).toBe('cerrada');
    });
  });

  describe('GET /caja/historial', () => {
    it('debería devolver el historial de cajas cerradas', async () => {
        await request(server)
            .post('/caja/abrir')
            .set('Authorization', `Bearer ${token}`)
            .send({ monto_inicial: 10000 });
        await request(server)
            .post('/caja/cerrar')
            .set('Authorization', `Bearer ${token}`);

        const res = await request(server)
            .get('/caja/historial')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
    });
  });
});
