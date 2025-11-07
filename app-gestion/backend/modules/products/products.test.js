const request = require('supertest');

// --- Mock de la Base de Datos ---
const mockPool = {
  query: jest.fn(),
  // No necesitamos mockear connect aquí porque el controlador usa pool.query
};
jest.mock('pg', () => {
  // Mockeamos la clase Pool para que cuando app.js la instancie,
  // devuelva nuestro mockPool.
  return { Pool: jest.fn(() => mockPool) };
});

// --- Importar la App ---
// app.js ya no inicia un servidor, solo define la app.
// Esto es ideal para testing.
const { app } = require('../../app');

describe('Módulo de Productos Refactorizado (Arquitectura Limpia)', () => {

  beforeEach(() => {
    // Limpiar el mock de query antes de cada prueba
    mockPool.query.mockClear();
  });

  // No se necesita afterAll(server.close()) porque supertest
  // maneja el ciclo de vida del servidor cuando se le pasa la app.

  it('GET /api/products debería devolver una lista de productos con estado 200', async () => {
    const mockProducts = [
      { id_producto: 1, nombre: 'Manzana' },
      { id_producto: 2, nombre: 'Leche' },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockProducts });

    const response = await request(app).get('/api/products');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockProducts);
    expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM Productos ORDER BY id_producto');
  });

  it('POST /api/products debería crear un nuevo producto con estado 201', async () => {
    const newProduct = { nombre: 'Naranja', categoria: 'Fruta', unidad_medida: 'kg' };
    const createdProduct = { id_producto: 3, ...newProduct };
    mockPool.query.mockResolvedValueOnce({ rows: [createdProduct] });

    const response = await request(app).post('/api/products').send(newProduct);

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual(createdProduct);
    expect(mockPool.query).toHaveBeenCalledWith(
      'INSERT INTO Productos (nombre, categoria, unidad_medida) VALUES ($1, $2, $3) RETURNING *',
      [newProduct.nombre, newProduct.categoria, newProduct.unidad_medida]
    );
  });

  it('PUT /api/products/:id debería actualizar un producto existente con estado 200', async () => {
    const updatedProductData = { nombre: 'Leche Entera', categoria: 'Lácteo', unidad_medida: 'litro', activo: true };
    const updatedProduct = { id_producto: 2, ...updatedProductData };
    mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [updatedProduct] });

    const response = await request(app).put('/api/products/2').send(updatedProductData);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Product updated successfully', product: updatedProduct });
    expect(mockPool.query).toHaveBeenCalledWith(
      'UPDATE Productos SET nombre = $1, categoria = $2, unidad_medida = $3, activo = $4 WHERE id_producto = $5 RETURNING *',
      [updatedProductData.nombre, updatedProductData.categoria, updatedProductData.unidad_medida, updatedProductData.activo, '2']
    );
  });

  it('DELETE /api/products/:id debería eliminar un producto con estado 200', async () => {
    const deletedProduct = { id_producto: 1, nombre: 'Manzana' };
    mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [deletedProduct] });

    const response = await request(app).delete('/api/products/1');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Product deleted successfully', product: deletedProduct });
    expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM Productos WHERE id_producto = $1 RETURNING *', ['1']);
  });

  it('GET /api/products/active debería devolver solo productos activos con estado 200', async () => {
    const mockActiveProducts = [{ id_producto: 1, nombre: 'Manzana', activo: true }];
    mockPool.query.mockResolvedValueOnce({ rows: mockActiveProducts });

    const response = await request(app).get('/api/products/active');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockActiveProducts);
    expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM Productos WHERE activo = TRUE ORDER BY nombre');
  });

  it('GET /api/products/:id debería devolver 501 Not Implemented', async () => {
    const response = await request(app).get('/api/products/99');
    expect(response.statusCode).toBe(501);
    expect(response.body).toEqual({ message: 'Not Implemented' });
  });
});
