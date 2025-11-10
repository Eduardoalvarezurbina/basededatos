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

describe('Módulo de Lookups', () => {

  beforeEach(() => {
    mockPool.query.mockClear();
  });

  it('GET /api/lookups/ubicaciones debería devolver una lista de ubicaciones con estado 200', async () => {
    const mockUbicaciones = [
      { id_ubicacion: 1, nombre: 'Bodega Central' },
      { id_ubicacion: 2, nombre: 'Tienda Principal' },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockUbicaciones });

    const response = await request(app).get('/api/lookups/ubicaciones');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockUbicaciones);
    expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM Ubicaciones_Inventario ORDER BY nombre');
  });

  it('GET /api/lookups/formatos-producto debería devolver una lista de formatos de producto con estado 200', async () => {
    const mockFormatos = [
      { id_formato_producto: 1, formato: '1kg', precio_detalle_neto: 1000, precio_mayorista_neto: 800, nombre_producto: 'Manzana' },
      { id_formato_producto: 2, formato: '500ml', precio_detalle_neto: 500, precio_mayorista_neto: 400, nombre_producto: 'Leche' },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockFormatos });

    const response = await request(app).get('/api/lookups/formatos-producto');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockFormatos);
    expect(mockPool.query).toHaveBeenCalledWith(`
        SELECT fp.id_formato_producto, fp.formato, fp.precio_detalle_neto, fp.precio_mayorista_neto, p.nombre as nombre_producto
        FROM Formatos_Producto fp
        JOIN Productos p ON fp.id_producto = p.id_producto
        WHERE p.activo = TRUE
        ORDER BY p.nombre, fp.formato
      `);
  });

  it('GET /api/lookups/canales-compra debería devolver una lista de canales de compra con estado 200', async () => {
    const mockCanales = [
      { id_canal: 1, nombre_canal: 'Online' },
      { id_canal: 2, nombre_canal: 'Tienda Física' },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockCanales });

    const response = await request(app).get('/api/lookups/canales-compra');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockCanales);
    expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM Canales_Compra ORDER BY nombre_canal');
  });

  it('GET /api/lookups/fuentes-contacto debería devolver una lista de fuentes de contacto con estado 200', async () => {
    const mockFuentes = [
      { id_fuente: 1, nombre_fuente: 'Red Social' },
      { id_fuente: 2, nombre_fuente: 'Referido' },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockFuentes });

    const response = await request(app).get('/api/lookups/fuentes-contacto');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockFuentes);
    expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM Fuentes_Contacto ORDER BY nombre_fuente');
  });

  it('GET /api/lookups/tipos-cliente debería devolver una lista de tipos de cliente con estado 200', async () => {
    const mockTipos = [
      { id_tipo: 1, nombre_tipo: 'Mayorista' },
      { id_tipo: 2, nombre_tipo: 'Minorista' },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockTipos });

    const response = await request(app).get('/api/lookups/tipos-cliente');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockTipos);
    expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM Tipos_Cliente ORDER BY nombre_tipo');
  });

  it('Debería manejar errores de la base de datos para /ubicaciones', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app).get('/api/lookups/ubicaciones');

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Internal server error');
  });
});
