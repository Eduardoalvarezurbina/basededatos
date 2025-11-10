const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// --- Mock de la Base de Datos ---
const mockPool = {
  query: jest.fn(),
};
jest.mock('pg', () => {
  return { Pool: jest.fn(() => mockPool) };
});

// --- Configuración de Variables de Entorno para Pruebas ---
process.env.JWT_SECRET = 'test_secret';

// --- Importar la App ---
const { app, pool } = require('../../app')(global.testPool);

describe('Módulo de Autenticación', () => {

  beforeEach(() => {
    mockPool.query.mockClear();
  });

  it('POST /api/auth/login debería iniciar sesión con éxito con credenciales correctas', async () => {
    const username = 'admin';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    const mockUser = {
      id_usuario: 1,
      username: username,
      password_hash: hashedPassword,
      role: 'admin',
    };

    // Simular que la base de datos encuentra al usuario
    mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ username, password });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.role).toBe('admin');
    expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM Usuarios WHERE username = $1', [username]);
    
    // Verificar el token
    const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(mockUser.id_usuario);
    expect(decoded.role).toBe(mockUser.role);
  });

  it('POST /api/auth/login debería fallar con credenciales incorrectas (contraseña errónea)', async () => {
    const username = 'admin';
    const password = 'password123';
    const wrongPassword = 'wrongpassword';
    const hashedPassword = await bcrypt.hash(password, 10);
    const mockUser = {
      id_usuario: 1,
      username: username,
      password_hash: hashedPassword,
      role: 'admin',
    };

    mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ username, password: wrongPassword });

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe('Invalid credentials');
  });

  it('POST /api/auth/login debería fallar si el usuario no existe', async () => {
    const username = 'nonexistentuser';
    const password = 'password123';

    // Simular que la base de datos no encuentra al usuario
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ username, password });

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toBe('Invalid credentials');
  });

  it('POST /api/auth/login debería manejar errores de la base de datos', async () => {
    const username = 'admin';
    const password = 'password123';

    // Simular un error en la base de datos
    mockPool.query.mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app)
      .post('/api/auth/login')
      .send({ username, password });

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Internal server error');
  });
});