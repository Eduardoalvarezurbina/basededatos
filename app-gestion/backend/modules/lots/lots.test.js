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

describe('Módulo de Lotes de Producción', () => {

  beforeEach(() => {
    mockPool.query.mockClear();
  });

  it('GET /api/lots debería devolver una lista de lotes con estado 200', async () => {
    const mockLots = [
      { id_lote: 1, codigo_lote: 'LOTE-001' },
      { id_lote: 2, codigo_lote: 'LOTE-002' },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockLots });

    const response = await request(app).get('/api/lots');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockLots);
    expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM Lotes_Produccion ORDER BY fecha_produccion DESC');
  });

  it('GET /api/lots/:id debería devolver un lote específico con estado 200', async () => {
    const mockLot = { id_lote: 1, codigo_lote: 'LOTE-001' };
    mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockLot] });

    const response = await request(app).get('/api/lots/1');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockLot);
    expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM Lotes_Produccion WHERE id_lote = $1', ['1']);
  });

  it('GET /api/lots/:id debería devolver 404 si el lote no existe', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

    const response = await request(app).get('/api/lots/999');

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Lot not found');
  });

  it('POST /api/lots debería crear un nuevo lote con estado 201', async () => {
    const newLot = { codigo_lote: 'LOTE-003', id_producto: 1, fecha_produccion: '2023-01-01', cantidad_inicial: 100 };
    const createdLot = { id_lote: 3, ...newLot };
    mockPool.query.mockResolvedValueOnce({ rows: [createdLot] });

    const response = await request(app).post('/api/lots').send(newLot);

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual(createdLot);
    expect(mockPool.query).toHaveBeenCalledWith(
      'INSERT INTO Lotes_Produccion (codigo_lote, id_producto, fecha_produccion, fecha_vencimiento, cantidad_inicial, unidad_medida, costo_por_unidad, origen) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [newLot.codigo_lote, newLot.id_producto, newLot.fecha_produccion, undefined, newLot.cantidad_inicial, undefined, undefined, undefined]
    );
  });

  it('PUT /api/lots/:id debería actualizar un lote existente con estado 200', async () => {
    const updatedLotData = { codigo_lote: 'LOTE-001-MOD', id_producto: 1, fecha_produccion: '2023-01-01', cantidad_inicial: 150 };
    const updatedLot = { id_lote: 1, ...updatedLotData };
    mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [updatedLot] });

    const response = await request(app).put('/api/lots/1').send(updatedLotData);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Lot updated successfully', lot: updatedLot });
    expect(mockPool.query).toHaveBeenCalledWith(
      'UPDATE Lotes_Produccion SET codigo_lote = $1, id_producto = $2, fecha_produccion = $3, fecha_vencimiento = $4, cantidad_inicial = $5, unidad_medida = $6, costo_por_unidad = $7, origen = $8 WHERE id_lote = $9 RETURNING *',
      [updatedLotData.codigo_lote, updatedLotData.id_producto, updatedLotData.fecha_produccion, undefined, updatedLotData.cantidad_inicial, undefined, undefined, undefined, '1']
    );
  });

  it('PUT /api/lots/:id debería devolver 404 si el lote no existe', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

    const response = await request(app).put('/api/lots/999').send({ codigo_lote: 'NO-EXISTE' });

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Lot not found');
  });

  it('DELETE /api/lots/:id debería eliminar un lote con estado 200', async () => {
    const deletedLot = { id_lote: 1, codigo_lote: 'LOTE-ELIMINADO' };
    mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [deletedLot] });

    const response = await request(app).delete('/api/lots/1');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Lot deleted successfully', lot: deletedLot });
    expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM Lotes_Produccion WHERE id_lote = $1 RETURNING *', ['1']);
  });

  it('DELETE /api/lots/:id debería devolver 404 si el lote no existe', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

    const response = await request(app).delete('/api/lots/999');

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Lot not found');
  });

  it('Debería manejar errores de la base de datos para GET /api/lots', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app).get('/api/lots');

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Internal server error');
  });
});
