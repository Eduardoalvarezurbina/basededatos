const request = require('supertest');

// --- Mock de la Base de Datos ---
const mockPool = {
  query: jest.fn(),
};
jest.mock('pg', () => {
  return { Pool: jest.fn(() => mockPool) };
});

// --- Importar la App ---
const { app } = require('../../app');

describe('Módulo de Reclamos', () => {

  beforeEach(() => {
    mockPool.query.mockClear();
  });

  it('GET /api/reclamos debería devolver una lista de reclamos con estado 200', async () => {
    const mockReclamos = [
      { id_reclamo: 1, descripcion: 'Producto dañado' },
      { id_reclamo: 2, descripcion: 'Entrega tardía' },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockReclamos });

    const response = await request(app).get('/api/reclamos');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockReclamos);
    expect(mockPool.query).toHaveBeenCalled();
  });

  it('GET /api/reclamos/:id debería devolver un reclamo específico con estado 200', async () => {
    const mockReclamo = { id_reclamo: 1, descripcion: 'Producto dañado' };
    mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockReclamo] });

    const response = await request(app).get('/api/reclamos/1');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockReclamo);
    expect(mockPool.query).toHaveBeenCalled();
  });

  it('GET /api/reclamos/:id debería devolver 404 si el reclamo no existe', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

    const response = await request(app).get('/api/reclamos/999');

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Claim not found');
  });

  it('POST /api/reclamos debería crear un nuevo reclamo con estado 201', async () => {
    const newReclamo = { id_cliente: 1, id_pedido: 1, fecha_reclamo: '2023-01-01', descripcion: 'Nuevo reclamo' };
    const createdReclamo = { id_reclamo: 3, ...newReclamo };
    mockPool.query.mockResolvedValueOnce({ rows: [createdReclamo] });

    const response = await request(app).post('/api/reclamos').send(newReclamo);

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual(createdReclamo);
    expect(mockPool.query).toHaveBeenCalledWith(
      'INSERT INTO Reclamos (id_cliente, id_pedido, fecha_reclamo, descripcion, estado, fecha_resolucion, observaciones_resolucion) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [newReclamo.id_cliente, newReclamo.id_pedido, newReclamo.fecha_reclamo, newReclamo.descripcion, 'Pendiente', undefined, undefined]
    );
  });

  it('PUT /api/reclamos/:id debería actualizar un reclamo existente con estado 200', async () => {
    const updatedReclamoData = { id_cliente: 1, id_pedido: 1, fecha_reclamo: '2023-01-01', descripcion: 'Reclamo actualizado', estado: 'Resuelto' };
    const updatedReclamo = { id_reclamo: 1, ...updatedReclamoData };
    mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [updatedReclamo] });

    const response = await request(app).put('/api/reclamos/1').send(updatedReclamoData);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Claim updated successfully', reclamo: updatedReclamo });
    expect(mockPool.query).toHaveBeenCalledWith(
      'UPDATE Reclamos SET id_cliente = $1, id_pedido = $2, fecha_reclamo = $3, descripcion = $4, estado = $5, fecha_resolucion = $6, observaciones_resolucion = $7 WHERE id_reclamo = $8 RETURNING *',
      [updatedReclamoData.id_cliente, updatedReclamoData.id_pedido, updatedReclamoData.fecha_reclamo, updatedReclamoData.descripcion, updatedReclamoData.estado, undefined, undefined, '1']
    );
  });

  it('PUT /api/reclamos/:id debería devolver 404 si el reclamo no existe', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

    const response = await request(app).put('/api/reclamos/999').send({ descripcion: 'No existe' });

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Claim not found');
  });

  it('DELETE /api/reclamos/:id debería eliminar un reclamo con estado 200', async () => {
    const deletedReclamo = { id_reclamo: 1, descripcion: 'Reclamo eliminado' };
    mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [deletedReclamo] });

    const response = await request(app).delete('/api/reclamos/1');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Claim deleted successfully', reclamo: deletedReclamo });
    expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM Reclamos WHERE id_reclamo = $1 RETURNING *', ['1']);
  });

  it('DELETE /api/reclamos/:id debería devolver 404 si el reclamo no existe', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

    const response = await request(app).delete('/api/reclamos/999');

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Claim not found');
  });

  it('Debería manejar errores de la base de datos para GET /api/reclamos', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app).get('/api/reclamos');

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Internal server error');
  });
});
