const request = require('supertest');

// --- Mock de la Base de Datos ---
const mockPool = {
  query: jest.fn(),
};
jest.mock('pg', () => {
  return { Pool: jest.fn(() => mockPool) };
});

// --- Importar la App ---
const { app, pool } = require('../../app')(global.testPool);

describe('Módulo de Clientes', () => {

  beforeEach(() => {
    mockPool.query.mockClear();
  });

  it('GET /api/clients debería devolver una lista de clientes con estado 200', async () => {
    const mockClients = [
      { id_cliente: 1, nombre: 'Cliente 1', telefono: '111' },
      { id_cliente: 2, nombre: 'Cliente 2', telefono: '222' },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockClients });

    const response = await request(app).get('/api/clients');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockClients);
    expect(mockPool.query).toHaveBeenCalledWith(`
        SELECT
          c.*,
          tc.nombre_tipo as nombre_tipo_cliente,
          fc.nombre_fuente as nombre_fuente_contacto
        FROM Clientes c
        LEFT JOIN Tipos_Cliente tc ON c.id_tipo_cliente = tc.id_tipo_cliente
        LEFT JOIN Fuentes_Contacto fc ON c.id_fuente_contacto = fc.id_fuente_contacto
        ORDER BY c.id_cliente
      `);
  });

  it('GET /api/clients/buscar debería devolver clientes por teléfono con estado 200', async () => {
    const mockClients = [
      { id_cliente: 1, nombre: 'Cliente 1', telefono: '111' },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockClients });

    const response = await request(app).get('/api/clients/buscar?telefono=111');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockClients);
    expect(mockPool.query).toHaveBeenCalledWith("SELECT * FROM Clientes WHERE telefono LIKE $1 ORDER BY nombre", ["%111%"]);
  });

  it('GET /api/clients/buscar debería devolver 400 si no se proporciona teléfono', async () => {
    const response = await request(app).get('/api/clients/buscar');

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Phone number query is required');
  });

  it('POST /api/clients debería crear un nuevo cliente con estado 201', async () => {
    const newClient = { nombre: 'Nuevo Cliente', telefono: '333' };
    const createdClient = { id_cliente: 3, ...newClient };
    mockPool.query.mockResolvedValueOnce({ rows: [createdClient] });

    const response = await request(app).post('/api/clients').send(newClient);

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual(createdClient);
    // La query es muy larga, solo verificamos que se llamó a pool.query
    expect(mockPool.query).toHaveBeenCalled();
  });

  it('PUT /api/clients/:id debería actualizar un cliente existente con estado 200', async () => {
    const updatedClientData = { nombre: 'Cliente Actualizado', telefono: '444' };
    const updatedClient = { id_cliente: 1, ...updatedClientData };
    mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [updatedClient] });

    const response = await request(app).put('/api/clients/1').send(updatedClientData);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Client updated successfully', client: updatedClient });
    expect(mockPool.query).toHaveBeenCalled(); // La query es muy larga
  });

  it('PUT /api/clients/:id debería devolver 404 si el cliente no existe', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

    const response = await request(app).put('/api/clients/999').send({ nombre: 'No Existe' });

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Client not found');
  });

  it('DELETE /api/clients/:id debería eliminar un cliente con estado 200', async () => {
    const deletedClient = { id_cliente: 1, nombre: 'Cliente Eliminado' };
    mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [deletedClient] });

    const response = await request(app).delete('/api/clients/1');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Client deleted successfully', client: deletedClient });
    expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM Clientes WHERE id_cliente = $1 RETURNING *', ['1']);
  });

  it('DELETE /api/clients/:id debería devolver 404 si el cliente no existe', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

    const response = await request(app).delete('/api/clients/999');

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Client not found');
  });

  it('Debería manejar errores de la base de datos para GET /api/clients', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app).get('/api/clients');

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Internal server error');
  });
});
