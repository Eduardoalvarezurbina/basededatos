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

describe('Módulo de Producción Diaria', () => {

  beforeEach(() => {
    mockPool.query.mockClear();
    mockClient.query.mockClear();
    mockPool.connect.mockClear();
  });

  it('GET /api/produccion debería devolver una lista de registros de producción con estado 200', async () => {
    const mockProduccion = [
      { id_produccion_diaria: 1, fecha_produccion: '2023-01-01', cantidad_producida: 100 },
      { id_produccion_diaria: 2, fecha_produccion: '2023-01-02', cantidad_producida: 150 },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockProduccion });

    const response = await request(app).get('/api/produccion');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockProduccion);
    expect(mockPool.query).toHaveBeenCalled();
  });

  it('GET /api/produccion/:id debería devolver un registro de producción específico con estado 200', async () => {
    const mockProduccion = { id_produccion_diaria: 1, fecha_produccion: '2023-01-01', cantidad_producida: 100 };
    mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockProduccion] });

    const response = await request(app).get('/api/produccion/1');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockProduccion);
    expect(mockPool.query).toHaveBeenCalled();
  });

  it('GET /api/produccion/:id debería devolver 404 si el registro de producción no existe', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

    const response = await request(app).get('/api/produccion/999');

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Daily production record not found');
  });

  it('POST /api/produccion debería crear un nuevo registro de producción y actualizar inventario con estado 201', async () => {
    const newProduccionData = {
      fecha_produccion: '2023-01-03',
      cantidad_producida: 200,
      id_formato_producto: 1,
      id_proceso: 1,
      observaciones: 'Lote de prueba',
      estado: 'Completado'
    };
    const createdProduccion = { id_produccion_diaria: 3, ...newProduccionData };

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [createdProduccion] }) // INSERT Produccion_Diaria
      .mockResolvedValueOnce({}) // INSERT/UPDATE Inventario
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app).post('/api/produccion').send(newProduccionData);

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({ message: 'Daily production record created and inventory updated successfully', produccion: createdProduccion });
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO Produccion_Diaria (fecha_produccion, cantidad_producida, id_formato_producto, id_proceso, observaciones, estado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [newProduccionData.fecha_produccion, newProduccionData.cantidad_producida, newProduccionData.id_formato_producto, newProduccionData.id_proceso, newProduccionData.observaciones, newProduccionData.estado]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO Inventario (id_formato_producto, cantidad_disponible) VALUES ($1, $2) ON CONFLICT (id_formato_producto) DO UPDATE SET cantidad_disponible = Inventario.cantidad_disponible + EXCLUDED.cantidad_disponible',
      [newProduccionData.id_formato_producto, newProduccionData.cantidad_producida]
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('PUT /api/produccion/:id debería actualizar un registro de producción y ajustar inventario con estado 200', async () => {
    const produccionId = 1;
    const oldProduccion = { id_produccion_diaria: 1, cantidad_producida: 100, id_formato_producto: 1 };
    const updatedProduccionData = {
      fecha_produccion: '2023-01-01',
      cantidad_producida: 120, // Aumenta en 20
      id_formato_producto: 1,
      id_proceso: 1,
      observaciones: 'Actualizado',
      estado: 'Finalizado'
    };
    const updatedProduccion = { id_produccion_diaria: 1, ...updatedProduccionData };

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 1, rows: [oldProduccion] }) // SELECT old produccion
      .mockResolvedValueOnce({ rows: [updatedProduccion] }) // UPDATE Produccion_Diaria
      .mockResolvedValueOnce({}) // UPDATE Inventario
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app).put(`/api/produccion/${produccionId}`).send(updatedProduccionData);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Daily production record updated and inventory adjusted successfully', produccion: updatedProduccion });
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT cantidad_producida, id_formato_producto FROM Produccion_Diaria WHERE id_produccion_diaria = $1',
      [`${produccionId}`]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE Produccion_Diaria SET fecha_produccion = $1, cantidad_producida = $2, id_formato_producto = $3, id_proceso = $4, observaciones = $5, estado = $6 WHERE id_produccion_diaria = $7 RETURNING *',
      [updatedProduccionData.fecha_produccion, updatedProduccionData.cantidad_producida, updatedProduccionData.id_formato_producto, updatedProduccionData.id_proceso, updatedProduccionData.observaciones, updatedProduccionData.estado, `${produccionId}`]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO Inventario (id_formato_producto, cantidad_disponible) VALUES ($1, $2) ON CONFLICT (id_formato_producto) DO UPDATE SET cantidad_disponible = Inventario.cantidad_disponible + EXCLUDED.cantidad_disponible',
      [updatedProduccionData.id_formato_producto, 20] // 120 - 100 = 20
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('PUT /api/produccion/:id debería devolver 404 si el registro de producción no existe', async () => {
    const produccionId = 999;
    const updatedProduccionData = { // Send valid data to avoid 400 error
      fecha_produccion: '2023-01-01',
      cantidad_producida: 120,
      id_formato_producto: 1,
    };
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0 }); // SELECT old produccion (no encuentra)

    const response = await request(app).put(`/api/produccion/${produccionId}`).send(updatedProduccionData);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Daily production record not found');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('DELETE /api/produccion/:id debería eliminar un registro de producción y revertir inventario con estado 200', async () => {
    const produccionId = 1;
    const oldProduccion = { id_produccion_diaria: 1, cantidad_producida: 100, id_formato_producto: 1 };
    const deletedProduccion = { id_produccion_diaria: 1, fecha_produccion: '2023-01-01' };

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 1, rows: [oldProduccion] }) // SELECT old produccion
      .mockResolvedValueOnce({ rowCount: 1, rows: [deletedProduccion] }) // DELETE Produccion_Diaria
      .mockResolvedValueOnce({}) // UPDATE Inventario
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app).delete(`/api/produccion/${produccionId}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Daily production record deleted and inventory reverted successfully', produccion: deletedProduccion });
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT cantidad_producida, id_formato_producto FROM Produccion_Diaria WHERE id_produccion_diaria = $1',
      [`${produccionId}`]
    );
    expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM Produccion_Diaria WHERE id_produccion_diaria = $1 RETURNING *', [`${produccionId}`]);
    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE Inventario SET cantidad_disponible = cantidad_disponible - $1 WHERE id_formato_producto = $2',
      [oldProduccion.cantidad_producida, oldProduccion.id_formato_producto]
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('DELETE /api/produccion/:id debería devolver 404 si el registro de producción no existe', async () => {
    const produccionId = 999;
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0 }); // SELECT old produccion (no encuentra)

    const response = await request(app).delete(`/api/produccion/${produccionId}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Daily production record not found');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('Debería manejar errores de la base de datos para GET /api/produccion', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app).get('/api/produccion');

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Internal server error');
  });
});