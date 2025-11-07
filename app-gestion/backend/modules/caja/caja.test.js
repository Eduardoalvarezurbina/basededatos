const request = require('supertest');
const { app } = require('../../app');
const { Pool } = require('pg'); // Import Pool from the mocked 'pg' module

jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(() => mockClient),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mockPool) };
});

describe('Caja API', () => {
  let pool;
  let client;

  beforeAll(() => {
    pool = new Pool(); // Get the mocked pool instance
    client = pool.connect(); // Get the mocked client instance
  });

  beforeEach(() => {
    pool.query.mockClear();
    client.query.mockClear();
    pool.connect.mockClear();
  });

  describe('POST /api/caja/abrir', () => {
    it('debería abrir la caja con un monto inicial', async () => {
      const mockCaja = { id_caja: 1, monto_inicial: '10000.00' };
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 0 }) // No hay caja abierta
        .mockResolvedValueOnce({ rows: [mockCaja] }) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .post('/api/caja/abrir')
        .send({ monto_inicial: 10000 });

      expect(res.statusCode).toEqual(201);
      expect(res.body.caja).toEqual(mockCaja);
    });

    it('no debería abrir la caja si ya hay una abierta', async () => {
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1 }) // Ya hay una caja abierta
        .mockResolvedValueOnce({}); // ROLLBACK

      const res = await request(app)
        .post('/api/caja/abrir')
        .send({ monto_inicial: 15000 });

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toBe('Ya existe una caja abierta para la fecha de hoy.');
    });
  });

  describe('POST /api/caja/cerrar', () => {
    it('debería cerrar la caja con el monto final correcto', async () => {
      const mockCajaAbierta = { id_caja: 1, monto_inicial: '10000.00', fecha_apertura: '2023-01-01', hora_apertura: '10:00:00' };
      const mockVentas = { total_efectivo: '5000.00' };
      const mockCajaCerrada = { id_caja: 1, monto_final: '15000.00' };

      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [mockCajaAbierta] }) // Encontrar caja abierta
        .mockResolvedValueOnce({ rows: [mockVentas] }) // Calcular ventas
        .mockResolvedValueOnce({ rows: [mockCajaCerrada] }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app).post('/api/caja/cerrar');

      expect(res.statusCode).toEqual(200);
      expect(res.body.caja).toEqual(mockCajaCerrada);
    });

    it('no debería cerrar la caja si no hay ninguna abierta', async () => {
      client.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 0 }) // No hay caja abierta
        .mockResolvedValueOnce({}); // ROLLBACK

      const res = await request(app).post('/api/caja/cerrar');

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toBe('No hay una caja abierta para cerrar hoy.');
    });
  });

  describe('GET /api/caja/estado', () => {
    it('debería devolver el estado "abierta" si la caja está abierta', async () => {
      const mockCaja = { id_caja: 1, estado: 'abierta' };
      pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockCaja] });

      const res = await request(app).get('/api/caja/estado');

      expect(res.statusCode).toEqual(200);
      expect(res.body.estado).toBe('abierta');
      expect(res.body.caja).toEqual(mockCaja);
    });

    it('debería devolver el estado "cerrada" si la caja está cerrada', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 0 });

      const res = await request(app).get('/api/caja/estado');

      expect(res.statusCode).toEqual(200);
      expect(res.body.estado).toBe('cerrada');
    });
  });

  describe('GET /api/caja/historial', () => {
    it('debería devolver el historial de cajas cerradas', async () => {
      const mockHistorial = [{ id_caja: 1, estado: 'cerrada' }];
      pool.query.mockResolvedValueOnce({ rows: mockHistorial });

      const res = await request(app).get('/api/caja/historial');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockHistorial);
    });
  });
});