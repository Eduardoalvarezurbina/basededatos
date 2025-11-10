const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// --- Configuración de Variables de Entorno para Pruebas ---
process.env.JWT_SECRET = 'test_secret';

// --- Importar la App ---
const { app, pool } = require('../../app')(global.testPool);

describe('Módulo de Autenticación (Integración con DB)', () => {
  let testUsername;
  let testPassword = 'password123';
  let testUserId;

  beforeAll(async () => {
    testUsername = `auth_user_${uuidv4().substring(0, 20)}`;
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const res = await pool.query(
      'INSERT INTO Usuarios (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id_usuario',
      [testUsername, hashedPassword, 'admin']
    );
    testUserId = res.rows[0].id_usuario;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM Usuarios WHERE id_usuario = $1', [testUserId]);
  });

  it('POST /api/auth/login debería iniciar sesión con éxito con credenciales correctas', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: testUsername, password: testPassword });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.role).toBe('admin');
    
    const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(testUserId);
    expect(decoded.role).toBe('admin');
  });

  it('POST /api/auth/login debería fallar con credenciales incorrectas (contraseña errónea)', async () => {
    const wrongPassword = 'wrongpassword';

    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: testUsername, password: wrongPassword });

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe('Invalid credentials');
  });

  it('POST /api/auth/login debería fallar si el usuario no existe', async () => {
    const nonexistentUsername = `nonexistent_${uuidv4()}`;
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: nonexistentUsername, password: testPassword });

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe('Invalid credentials');
  });
});