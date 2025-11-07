const request = require('supertest');

// --- Mock de la Base de Datos ---
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(() => mockClient),
  end: jest.fn(),
};
jest.mock('pg', () => {
  return { Pool: jest.fn(() => mockPool) };
});

// --- Importar la App ---
const { app } = require('../../app');

describe('Módulo de Procesos', () => {

  beforeEach(() => {
    mockPool.query.mockClear();
    mockClient.query.mockClear();
    mockPool.connect.mockClear();
  });

  it('POST /api/processes debería crear un nuevo proceso con estado 201', async () => {
    const newProcess = {
      nombre_proceso: 'Nuevo Proceso',
      tipo_proceso: 'Tipo A',
      id_formato_producto_final: 1,
      observacion: 'Obs',
      ingredientes: [
        { id_formato_producto_ingrediente: 2, cantidad_requerida: 10 },
        { id_formato_producto_ingrediente: 3, cantidad_requerida: 5 },
      ]
    };
    const createdProcess = { id_proceso: 1 };

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [createdProcess] }) // INSERT Proceso
      .mockResolvedValueOnce({}) // INSERT Ingrediente 1
      .mockResolvedValueOnce({}) // INSERT Ingrediente 2
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app).post('/api/processes').send(newProcess);

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({ message: 'Process created successfully', id_proceso: createdProcess.id_proceso });
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO Procesos (nombre_proceso, tipo_proceso, id_formato_producto_final, observacion) VALUES ($1, $2, $3, $4) RETURNING id_proceso',
      [newProcess.nombre_proceso, newProcess.tipo_proceso, newProcess.id_formato_producto_final, newProcess.observacion]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO Detalle_Procesos (id_proceso, id_formato_producto_ingrediente, cantidad_requerida) VALUES ($1, $2, $3)',
      [createdProcess.id_proceso, newProcess.ingredientes[0].id_formato_producto_ingrediente, newProcess.ingredientes[0].cantidad_requerida]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO Detalle_Procesos (id_proceso, id_formato_producto_ingrediente, cantidad_requerida) VALUES ($1, $2, $3)',
      [createdProcess.id_proceso, newProcess.ingredientes[1].id_formato_producto_ingrediente, newProcess.ingredientes[1].cantidad_requerida]
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('GET /api/processes debería devolver una lista de procesos con estado 200', async () => {
    const mockProcesses = [
      { id_proceso: 1, nombre_proceso: 'Proceso 1' },
      { id_proceso: 2, nombre_proceso: 'Proceso 2' },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockProcesses });

    const response = await request(app).get('/api/processes');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockProcesses);
    expect(mockPool.query).toHaveBeenCalled();
  });

  it('PUT /api/processes/:id debería actualizar un proceso existente con estado 200', async () => {
    const processId = 1;
    const updatedProcess = {
      nombre_proceso: 'Proceso Actualizado',
      tipo_proceso: 'Tipo B',
      id_formato_producto_final: 1,
      observacion: 'Obs Actualizada',
      ingredientes: [
        { id_formato_producto_ingrediente: 4, cantidad_requerida: 20 },
      ]
    };

    mockClient.query.mockResolvedValue({}); // Mock all client.query calls to return an empty object

    const response = await request(app).put(`/api/processes/${processId}`).send(updatedProcess);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Process updated successfully', id_proceso: `${processId}` });
    
    // Assertions for each call using mockClient.query.mock.calls
    const calls = mockClient.query.mock.calls;
    let callIndex = 0;

    expect(calls[callIndex++][0]).toBe('BEGIN');

    expect(calls[callIndex][0]).toBe(
      'UPDATE Procesos SET nombre_proceso = $1, tipo_proceso = $2, id_formato_producto_final = $3, observacion = $4 WHERE id_proceso = $5'
    );
    expect(calls[callIndex++][1]).toEqual(
      [updatedProcess.nombre_proceso, updatedProcess.tipo_proceso, updatedProcess.id_formato_producto_final, updatedProcess.observacion, `${processId}`]
    );

    expect(calls[callIndex][0]).toBe('DELETE FROM Detalle_Procesos WHERE id_proceso = $1');
    expect(calls[callIndex++][1]).toEqual([`${processId}`]);

    expect(calls[callIndex][0]).toBe(
      'INSERT INTO Detalle_Procesos (id_proceso, id_formato_producto_ingrediente, cantidad_requerida) VALUES ($1, $2, $3)'
    );
    expect(calls[callIndex++][1]).toEqual(
      [`${processId}`, updatedProcess.ingredientes[0].id_formato_producto_ingrediente, updatedProcess.ingredientes[0].cantidad_requerida]
    );

    expect(calls[callIndex++][0]).toBe('COMMIT');
  });

  it('DELETE /api/processes/:id debería eliminar un proceso con estado 200', async () => {
    const processId = 1;
    const deletedProcess = { id_proceso: processId, nombre_proceso: 'Proceso Eliminado' };

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // DELETE Detalles
      .mockResolvedValueOnce({ rowCount: 1, rows: [deletedProcess] }) // DELETE Proceso
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app).delete(`/api/processes/${processId}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Process deleted successfully', proceso: deletedProcess });
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM Detalle_Procesos WHERE id_proceso = $1', [`${processId}`]);
    expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM Procesos WHERE id_proceso = $1 RETURNING *', [`${processId}`]);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('DELETE /api/processes/:id debería devolver 404 si el proceso no existe', async () => {
    const processId = 999;

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // DELETE Detalles
      .mockResolvedValueOnce({ rowCount: 0 }); // DELETE Proceso (no encuentra)

    const response = await request(app).delete(`/api/processes/${processId}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Process not found');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('Debería manejar errores de la base de datos para GET /api/processes', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app).get('/api/processes');

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Internal server error');
  });
});
