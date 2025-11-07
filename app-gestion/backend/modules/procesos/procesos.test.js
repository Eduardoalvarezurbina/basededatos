const request = require('supertest');
const { app, pool } = require('../../app');
const bcrypt = require('bcrypt');

describe('Procesos API', () => {
  let token;
  let mockIngredient1, mockIngredient2, mockUpdatedIngredient;
  let mockProceso;

  beforeAll(async () => {
    // Create a test user and get a token
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('process_test_user', salt);
    await pool.query("INSERT INTO Usuarios (username, password_hash, role) VALUES ('process_test_user', $1, 'admin') ON CONFLICT (username) DO NOTHING", [hashedPassword]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'process_test_user',
        password: 'process_test_user',
      });
    token = res.body.token;

    // Create mock ingredients (products)
    const prod1Res = await pool.query("INSERT INTO Productos (nombre, categoria, activo) VALUES ('Test Ingredient 1', 'Test', true) ON CONFLICT (nombre) DO NOTHING RETURNING id_producto");
    mockIngredient1 = prod1Res.rows[0];
    const prod2Res = await pool.query("INSERT INTO Productos (nombre, categoria, activo) VALUES ('Test Ingredient 2', 'Test', true) ON CONFLICT (nombre) DO NOTHING RETURNING id_producto");
    mockIngredient2 = prod2Res.rows[0];
    const prod3Res = await pool.query("INSERT INTO Productos (nombre, categoria, activo) VALUES ('Updated Ingredient', 'Test', true) ON CONFLICT (nombre) DO NOTHING RETURNING id_producto");
    mockUpdatedIngredient = prod3Res.rows[0];
  });

  beforeEach(async () => {
    // Clean up before each test
    await pool.query('DELETE FROM Produccion_Diaria');
    await pool.query('DELETE FROM Detalle_Procesos');
    await pool.query('DELETE FROM Procesos');
  });

  afterAll(async () => {
    // Clean up all mock data
    await pool.query("DELETE FROM Productos WHERE nombre IN ('Test Ingredient 1', 'Test Ingredient 2', 'Updated Ingredient')");
    await pool.query("DELETE FROM Usuarios WHERE username = 'process_test_user'");
  });

  it('should create a new process with ingredients', async () => {
    const newProcess = {
      nombre_proceso: 'Test Proceso',
      descripcion: 'Test Description',
      tipo_proceso: 'PRODUCCION',
      ingredientes: [
        { id_producto: mockIngredient1.id_producto, cantidad_requerida: 2 },
        { id_producto: mockIngredient2.id_producto, cantidad_requerida: 1 }
      ]
    };
    const res = await request(app)
      .post('/api/processes')
      .set('Authorization', `Bearer ${token}`)
      .send(newProcess);
    expect(res.statusCode).toEqual(201);
    expect(res.body.nombre_proceso).toEqual('Test Proceso');
    expect(res.body.ingredientes.length).toBe(2);
    mockProceso = res.body;
  });

  it('should fetch all processes', async () => {
    const res = await request(app).get('/api/processes').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should fetch a single process by ID', async () => {
    const res = await request(app).get(`/api/processes/${mockProceso.id_proceso}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.id_proceso).toEqual(mockProceso.id_proceso);
    expect(res.body.nombre_proceso).toEqual('Test Proceso');
    expect(res.body.ingredientes.length).toBe(2);
  });

  it('should update a process and its ingredients', async () => {
    const updatedProcess = {
      nombre_proceso: 'Updated Test Proceso',
      descripcion: 'Updated Description',
      tipo_proceso: 'ENVASADO',
      ingredientes: [
        { id_producto: mockUpdatedIngredient.id_producto, cantidad_requerida: 3 }
      ]
    };
    const res = await request(app)
      .put(`/api/processes/${mockProceso.id_proceso}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatedProcess);
    expect(res.statusCode).toEqual(200);

    // Verify the update
    const getRes = await request(app).get(`/api/processes/${mockProceso.id_proceso}`).set('Authorization', `Bearer ${token}`);
    expect(getRes.body.nombre_proceso).toEqual('Updated Test Proceso');
    expect(getRes.body.tipo_proceso).toEqual('ENVASADO');
    expect(getRes.body.ingredientes.length).toBe(1);
    expect(getRes.body.ingredientes[0].cantidad_requerida).toBe(3);
  });

  it('should delete a process and its ingredients', async () => {
    const res = await request(app).delete(`/api/processes/${mockProceso.id_proceso}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);

    // Verify it's gone
    const getRes = await request(app).get(`/api/processes/${mockProceso.id_proceso}`).set('Authorization', `Bearer ${token}`);
    expect(getRes.statusCode).toEqual(404);
  });

  it('should return 409 when trying to delete a process that is in use', async () => {
    // 1. Create a process
    const newProcess = {
      nombre_proceso: 'Process in Use',
      descripcion: 'Test Description',
      tipo_proceso: 'PRODUCCION',
      ingredientes: [{ id_producto: mockIngredient1.id_producto, cantidad_requerida: 1 }]
    };
    const processRes = await request(app)
      .post('/api/processes')
      .set('Authorization', `Bearer ${token}`)
      .send(newProcess);
    const processInUse = processRes.body;

    // 2. Create a production entry that uses it
    await pool.query('INSERT INTO Produccion_Diaria (id_proceso, cantidad_producida, fecha_produccion) VALUES ($1, 10, NOW())', [processInUse.id_proceso]);

    // 3. Attempt to delete it
    const res = await request(app).delete(`/api/processes/${processInUse.id_proceso}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(409);
  });
});