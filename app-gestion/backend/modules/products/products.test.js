const request = require('supertest');
const { app, pool } = require('../../app')(global.testPool); // Use the real pool from the test setup

describe('Módulo de Productos (Integración con DB)', () => {

  // No beforeEach needed if tests are fully self-contained.

  afterAll(() => {
    // The test setup script handles pool closing if necessary.
  });

  it('GET /api/products debería devolver una lista de productos con estado 200', async () => {
    // The DML scripts already populate products, so we can just test the endpoint
    const response = await request(app).get('/api/products');

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    // Check that we have more products than the ones we might create in other tests
    expect(response.body.length).toBeGreaterThan(5); 
  });

  it('POST /api/products debería crear un nuevo producto con estado 201', async () => {
    const newProduct = { nombre: 'Test Naranja', categoria: 'Fruta Test', activo: true };
    
    const response = await request(app).post('/api/products').send(newProduct);

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id_producto');
    expect(response.body.nombre).toBe(newProduct.nombre);

    // Cleanup
    await pool.query('DELETE FROM Productos WHERE id_producto = $1', [response.body.id_producto]);
  });

  it('PUT /api/products/:id debería actualizar un producto existente con estado 200', async () => {
    // Setup: create a product to update
    const productRes = await pool.query("INSERT INTO Productos (nombre, categoria, activo) VALUES ('Producto a Actualizar', 'Test', true) RETURNING *");
    const productToUpdate = productRes.rows[0];

    const updatedProductData = { nombre: 'Producto Ya Actualizado', categoria: 'Lácteo Test', activo: false };

    const response = await request(app).put(`/api/products/${productToUpdate.id_producto}`).send(updatedProductData);

    expect(response.statusCode).toBe(200);
    expect(response.body.product.id_producto).toBe(productToUpdate.id_producto);
    expect(response.body.product.nombre).toBe(updatedProductData.nombre);
    expect(response.body.product.activo).toBe(false);

    // Cleanup
    await pool.query('DELETE FROM Productos WHERE id_producto = $1', [productToUpdate.id_producto]);
  });

  it('DELETE /api/products/:id debería eliminar un producto con estado 200', async () => {
    // Setup: create a product to delete
    const productRes = await pool.query("INSERT INTO Productos (nombre, categoria, activo) VALUES ('Producto a Borrar', 'Test', true) RETURNING *");
    const productToDelete = productRes.rows[0];

    const response = await request(app).delete(`/api/products/${productToDelete.id_producto}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.product.id_producto).toBe(productToDelete.id_producto);

    // Verify it's gone
    const verifyRes = await pool.query('SELECT * FROM Productos WHERE id_producto = $1', [productToDelete.id_producto]);
    expect(verifyRes.rowCount).toBe(0);
  });

  it('GET /api/products/active debería devolver solo productos activos con estado 200', async () => {
    // Setup: ensure we have a known active and inactive product
    const activeRes = await pool.query("INSERT INTO Productos (nombre, categoria, activo) VALUES ('Producto Activo Test', 'Test', true) RETURNING *");
    const inactiveRes = await pool.query("INSERT INTO Productos (nombre, categoria, activo) VALUES ('Producto Inactivo Test', 'Test', false) RETURNING *");
    const activeProduct = activeRes.rows[0];
    const inactiveProduct = inactiveRes.rows[0];

    const response = await request(app).get('/api/products/active');

    expect(response.statusCode).toBe(200);
    
    // Check that the active product is in the list
    expect(response.body.some(p => p.id_producto === activeProduct.id_producto)).toBe(true);
    // Check that the inactive product is NOT in the list
    expect(response.body.some(p => p.id_producto === inactiveProduct.id_producto)).toBe(false);

    // Cleanup
    await pool.query('DELETE FROM Productos WHERE id_producto = ANY($1::int[])', [[activeProduct.id_producto, inactiveProduct.id_producto]]);
  });

  it('GET /api/products/:id debería devolver 501 Not Implemented', async () => {
    const response = await request(app).get('/api/products/9999'); // Use an ID that won't exist
    expect(response.statusCode).toBe(501);
    expect(response.body).toEqual({ message: 'Not Implemented' });
  });
});
