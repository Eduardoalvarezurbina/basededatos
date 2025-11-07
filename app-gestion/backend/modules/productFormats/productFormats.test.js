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

describe('Módulo de Formatos de Producto y Historial de Precios', () => {

  beforeEach(() => {
    mockPool.query.mockClear();
    mockClient.query.mockClear();
    mockPool.connect.mockClear();
  });

  it('PUT /api/product-formats/:id debería actualizar un formato de producto y registrar el historial de precios con estado 200', async () => {
    const id_formato_producto = 1;
    const updatedData = {
      formato: '1.5kg',
      precio_detalle_neto: 1200,
      precio_mayorista_neto: 950,
      ultimo_costo_neto: 700,
      unidad_medida: 'kg'
    };
    const oldPrices = { precio_detalle_neto: 1000, precio_mayorista_neto: 800 };
    const updatedProductFormat = { id_formato_producto, ...updatedData };

    // Mocks para la transacción
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 1, rows: [oldPrices] }) // SELECT precios anteriores
      .mockResolvedValueOnce({ rowCount: 1, rows: [updatedProductFormat] }) // UPDATE formato producto
      .mockResolvedValueOnce({ rowCount: 1 }) // INSERT historial precios
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app)
      .put(`/api/product-formats/${id_formato_producto}`)
      .send(updatedData);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Product format updated successfully');
    expect(response.body.formato_producto).toEqual(updatedProductFormat);
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT precio_detalle_neto, precio_mayorista_neto FROM Formatos_Producto WHERE id_formato_producto = $1',
      [`${id_formato_producto}`] // req.params son strings
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE Formatos_Producto SET formato = $1, precio_detalle_neto = $2, precio_mayorista_neto = $3, ultimo_costo_neto = $4, unidad_medida = $5 WHERE id_formato_producto = $6 RETURNING *',
      [updatedData.formato, updatedData.precio_detalle_neto, updatedData.precio_mayorista_neto, updatedData.ultimo_costo_neto, updatedData.unidad_medida, `${id_formato_producto}`] // req.params son strings
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO Historial_Precios (id_formato_producto, precio_detalle_neto_anterior, precio_detalle_neto_nuevo, precio_mayorista_neto_anterior, precio_mayorista_neto_nuevo) VALUES ($1, $2, $3, $4, $5)',
      [`${id_formato_producto}`, oldPrices.precio_detalle_neto, updatedData.precio_detalle_neto, oldPrices.precio_mayorista_neto, updatedData.precio_mayorista_neto] // req.params son strings
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('PUT /api/product-formats/:id debería devolver 404 si el formato de producto no existe', async () => {
    const id_formato_producto = 999;
    const updatedData = { formato: '1.5kg' };

    // Mocks para la transacción
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0 }); // SELECT precios anteriores (no encuentra)
      // No se necesita mock para ROLLBACK explícito, ya que el catch lo maneja

    const response = await request(app)
      .put(`/api/product-formats/${id_formato_producto}`)
      .send(updatedData);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Product format not found');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('PUT /api/product-formats/:id debería manejar errores de la base de datos durante la actualización', async () => {
    const id_formato_producto = 1;
    const updatedData = { formato: '1.5kg' };

    // Mocks para la transacción
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ precio_detalle_neto: 1000, precio_mayorista_neto: 800 }] }) // Precios anteriores
      .mockRejectedValueOnce(new Error('Database update error')); // Error al actualizar

    const response = await request(app)
      .put(`/api/product-formats/${id_formato_producto}`)
      .send(updatedData);

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Internal server error');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('GET /api/product-formats/historial-precios/:id_formato_producto debería devolver el historial de precios con estado 200', async () => {
    const id_formato_producto = 1;
    const mockHistory = [
      { id_historial: 1, id_formato_producto: 1, precio_detalle_neto_anterior: 900, precio_detalle_neto_nuevo: 1000, fecha_cambio: '2023-01-01' },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockHistory }); // Usa pool.query directamente

    const response = await request(app).get(`/api/product-formats/historial-precios/${id_formato_producto}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockHistory);
    expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM Historial_Precios WHERE id_formato_producto = $1 ORDER BY fecha_cambio DESC', [`${id_formato_producto}`]); // req.params son strings
  });

  it('GET /api/product-formats/historial-precios/:id_formato_producto debería devolver un array vacío si no hay historial', async () => {
    const id_formato_producto = 999;
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // Usa pool.query directamente

    const response = await request(app).get(`/api/product-formats/historial-precios/${id_formato_producto}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('GET /api/product-formats/historial-precios/:id_formato_producto debería manejar errores de la base de datos', async () => {
    const id_formato_producto = 1;
    mockPool.query.mockRejectedValueOnce(new Error('Database error')); // Usa pool.query directamente

    const response = await request(app).get(`/api/product-formats/historial-precios/${id_formato_producto}`);

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Internal server error');
  });
});
