const request = require('supertest');
const { app, pool } = require('../../app')(global.testPool);
const { v4: uuidv4 } = require('uuid');

describe('Módulo de Clientes (Integración con DB)', () => {
  let token;
  let testUserId;

  beforeAll(async () => {
    // Create a test user and get a token
    const username = `client_user_${uuidv4()}`;
    const hashedPassword = await require('bcrypt').hash('password', 10);
    const userRes = await pool.query("INSERT INTO Usuarios (username, password_hash, role) VALUES ($1, $2, 'admin') RETURNING id_usuario", [username, hashedPassword]);
    testUserId = userRes.rows[0].id_usuario;

    const loginRes = await request(app).post('/api/auth/login').send({ username, password: 'password' });
    token = loginRes.body.token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM Usuarios WHERE id_usuario = $1', [testUserId]);
  });

  it('GET /api/clients debería devolver una lista de clientes con estado 200', async () => {
    // Setup: Insert a client to ensure there's data
    const clientRes = await pool.query("INSERT INTO Clientes (nombre, telefono) VALUES ('Cliente Listado', '111222333') RETURNING *");
    const client = clientRes.rows[0];

    const response = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body.some(c => c.id_cliente === client.id_cliente)).toBe(true);

    // Cleanup
    await pool.query('DELETE FROM Clientes WHERE id_cliente = $1', [client.id_cliente]);
  });

  it('GET /api/clients/buscar debería devolver clientes por teléfono con estado 200', async () => {
    // Setup
    const clientRes = await pool.query("INSERT INTO Clientes (nombre, telefono) VALUES ('Cliente Buscado', '987654321') RETURNING *");
    const client = clientRes.rows[0];

    // Execute
    const response = await request(app)
      .get('/api/clients/buscar?telefono=987654321')
      .set('Authorization', `Bearer ${token}`);
    
    // Assert
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0].id_cliente).toBe(client.id_cliente);

    // Cleanup
    await pool.query('DELETE FROM Clientes WHERE id_cliente = $1', [client.id_cliente]);
  });

  it('GET /api/clients/buscar debería devolver 400 si no se proporciona teléfono', async () => {
    const response = await request(app)
      .get('/api/clients/buscar')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Phone number query is required');
  });

  it('POST /api/clients debería crear un nuevo cliente con estado 201', async () => {
    const newClient = { nombre: 'Nuevo Cliente Test', telefono: `+569${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}` };
    
    const response = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send(newClient);

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id_cliente');
    expect(response.body.nombre).toBe(newClient.nombre);

    // Cleanup
    await pool.query('DELETE FROM Clientes WHERE id_cliente = $1', [response.body.id_cliente]);
  });

  it('PUT /api/clients/:id debería actualizar un cliente existente con estado 200', async () => {
    // Setup
    const clientRes = await pool.query("INSERT INTO Clientes (nombre, telefono) VALUES ('Cliente a Actualizar', '555555') RETURNING *");
    const clientToUpdate = clientRes.rows[0];

    const updatedClientData = { nombre: 'Cliente Ya Actualizado', telefono: '666666' };

    // Execute
    const response = await request(app)
      .put(`/api/clients/${clientToUpdate.id_cliente}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatedClientData);

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.body.client.id_cliente).toBe(clientToUpdate.id_cliente);
    expect(response.body.client.nombre).toBe(updatedClientData.nombre);

    // Cleanup
    await pool.query('DELETE FROM Clientes WHERE id_cliente = $1', [clientToUpdate.id_cliente]);
  });

  it('PUT /api/clients/:id debería devolver 404 si el cliente no existe', async () => {
    const response = await request(app)
      .put('/api/clients/999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'No Existe' });
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Client not found');
  });

  it('DELETE /api/clients/:id debería eliminar un cliente con estado 200', async () => {
    // Setup
    const clientRes = await pool.query("INSERT INTO Clientes (nombre, telefono) VALUES ('Cliente a Borrar', '777777') RETURNING *");
    const clientToDelete = clientRes.rows[0];

    // Execute
    const response = await request(app)
      .delete(`/api/clients/${clientToDelete.id_cliente}`)
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.body.client.id_cliente).toBe(clientToDelete.id_cliente);

    // Verify it's gone
    const verifyRes = await pool.query('SELECT * FROM Clientes WHERE id_cliente = $1', [clientToDelete.id_cliente]);
    expect(verifyRes.rowCount).toBe(0);
  });

  it('DELETE /api/clients/:id debería devolver 404 si el cliente no existe', async () => {
    const response = await request(app)
      .delete('/api/clients/999999')
      .set('Authorization', `Bearer ${token}`);
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Client not found');
  });
});
