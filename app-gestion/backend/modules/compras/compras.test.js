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

describe('Módulo de Compras', () => {

  beforeEach(() => {
    mockPool.query.mockClear();
    mockClient.query.mockClear();
    mockPool.connect.mockClear();
  });

  it('GET /api/compras debería devolver una lista de compras con estado 200', async () => {
    const mockCompras = [
      { id_compra: 1, fecha_compra: '2023-01-01', total_neto: 100, detalles: [] },
      { id_compra: 2, fecha_compra: '2023-01-02', total_neto: 200, detalles: [] },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockCompras });

    const response = await request(app).get('/api/compras');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockCompras);
    expect(mockPool.query).toHaveBeenCalled();
  });

  it('GET /api/compras/:id debería devolver una compra específica con estado 200', async () => {
    const mockCompra = { id_compra: 1, fecha_compra: '2023-01-01', total_neto: 100, detalles: [] };
    mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockCompra] });

    const response = await request(app).get('/api/compras/1');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockCompra);
    expect(mockPool.query).toHaveBeenCalled();
  });

  it('GET /api/compras/:id debería devolver 404 si la compra no existe', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

    const response = await request(app).get('/api/compras/999');

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Purchase not found');
  });

  it('POST /api/compras debería crear una nueva compra y actualizar inventario con estado 201', async () => {
    const newCompraData = {
      fecha_compra: '2023-01-03',
      id_proveedor: 1,
      estado: 'Completada',
      observaciones: 'Compra de prueba',
      detalles: [
        { id_formato_producto: 1, cantidad: 10, precio_neto_unitario: 50 },
        { id_formato_producto: 2, cantidad: 5, precio_neto_unitario: 100 },
      ]
    };
    const createdCompra = { id_compra: 3, ...newCompraData, total_neto: 1000, total_iva: 190, total_bruto: 1190 };

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id_compra: 3 }] }) // INSERT Compras
      .mockResolvedValueOnce({}) // INSERT Detalle_Compras 1
      .mockResolvedValueOnce({}) // UPDATE Inventario 1
      .mockResolvedValueOnce({}) // INSERT Detalle_Compras 2
      .mockResolvedValueOnce({}) // UPDATE Inventario 2
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app).post('/api/compras').send(newCompraData);

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({ message: 'Purchase created and inventory updated successfully', id_compra: 3 });
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO Compras (fecha_compra, id_proveedor, total_neto, total_iva, total_bruto, estado, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_compra',
      [newCompraData.fecha_compra, newCompraData.id_proveedor, 1000, 190, 1190, newCompraData.estado, newCompraData.observaciones]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO Detalle_Compras (id_compra, id_formato_producto, cantidad, precio_neto_unitario, iva_unitario, precio_bruto_unitario, subtotal_neto, subtotal_iva, subtotal_bruto) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [3, 1, 10, 50, 9.5, 59.5, 500, 95, 595]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO Inventario (id_formato_producto, cantidad_disponible) VALUES ($1, $2) ON CONFLICT (id_formato_producto) DO UPDATE SET cantidad_disponible = Inventario.cantidad_disponible + EXCLUDED.cantidad_disponible',
      [1, 10]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO Detalle_Compras (id_compra, id_formato_producto, cantidad, precio_neto_unitario, iva_unitario, precio_bruto_unitario, subtotal_neto, subtotal_iva, subtotal_bruto) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [3, 2, 5, 100, 19, 119, 500, 95, 595]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO Inventario (id_formato_producto, cantidad_disponible) VALUES ($1, $2) ON CONFLICT (id_formato_producto) DO UPDATE SET cantidad_disponible = Inventario.cantidad_disponible + EXCLUDED.cantidad_disponible',
      [2, 5]
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('PUT /api/compras/:id debería actualizar una compra y ajustar inventario con estado 200', async () => {
    const compraId = 1;
    const oldDetalles = [
      { id_formato_producto: 1, cantidad: 10 },
      { id_formato_producto: 2, cantidad: 5 },
    ];
    const updatedCompraData = {
      fecha_compra: '2023-01-01',
      id_proveedor: 1,
      estado: 'Actualizada',
      observaciones: 'Compra actualizada',
      detalles: [
        { id_formato_producto: 1, cantidad: 12, precio_neto_unitario: 50 }, // Cantidad cambia de 10 a 12
        { id_formato_producto: 3, cantidad: 8, precio_neto_unitario: 75 }, // Nuevo producto
      ]
    };
    const updatedCompra = { id_compra: 1, ...updatedCompraData, total_neto: 1200, total_iva: 228, total_bruto: 1428 };

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: oldDetalles.length, rows: oldDetalles }) // SELECT old detalles
      .mockResolvedValueOnce({}) // UPDATE Inventario 1 (revert)
      .mockResolvedValueOnce({}) // UPDATE Inventario 2 (revert)
      .mockResolvedValueOnce({}) // DELETE Detalle_Compras
      .mockResolvedValueOnce({ rows: [updatedCompra] }) // UPDATE Compras
      .mockResolvedValueOnce({}) // INSERT Detalle_Compras 1 (new)
      .mockResolvedValueOnce({}) // UPDATE Inventario 1 (new)
      .mockResolvedValueOnce({}) // INSERT Detalle_Compras 2 (new)
      .mockResolvedValueOnce({}) // UPDATE Inventario 2 (new)
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app).put(`/api/compras/${compraId}`).send(updatedCompraData);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Purchase updated and inventory adjusted successfully', compra: updatedCompra });
    
    const calls = mockClient.query.mock.calls;
    let callIndex = 0;

    expect(calls[callIndex++][0]).toBe('BEGIN');

    expect(calls[callIndex][0]).toBe('SELECT id_formato_producto, cantidad FROM Detalle_Compras WHERE id_compra = $1');
    expect(calls[callIndex++][1]).toEqual([`${compraId}`]);

    expect(calls[callIndex][0]).toBe('UPDATE Inventario SET cantidad_disponible = cantidad_disponible - $1 WHERE id_formato_producto = $2');
    expect(calls[callIndex++][1]).toEqual([10, 1]);

    expect(calls[callIndex][0]).toBe('UPDATE Inventario SET cantidad_disponible = cantidad_disponible - $1 WHERE id_formato_producto = $2');
    expect(calls[callIndex++][1]).toEqual([5, 2]);

    expect(calls[callIndex][0]).toBe('DELETE FROM Detalle_Compras WHERE id_compra = $1');
    expect(calls[callIndex++][1]).toEqual([`${compraId}`]);

    expect(calls[callIndex][0]).toBe(
      'UPDATE Compras SET fecha_compra = $1, id_proveedor = $2, total_neto = $3, total_iva = $4, total_bruto = $5, estado = $6, observaciones = $7 WHERE id_compra = $8 RETURNING *'
    );
    expect(calls[callIndex++][1]).toEqual(
      [updatedCompraData.fecha_compra, updatedCompraData.id_proveedor, 1200, 228, 1428, updatedCompraData.estado, updatedCompraData.observaciones, `${compraId}`]
    );

    expect(calls[callIndex][0]).toBe(
      'INSERT INTO Detalle_Compras (id_compra, id_formato_producto, cantidad, precio_neto_unitario, iva_unitario, precio_bruto_unitario, subtotal_neto, subtotal_iva, subtotal_bruto) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)'
    );
    expect(calls[callIndex++][1]).toEqual(
      [`${compraId}`, 1, 12, 50, 9.5, 59.5, 600, 114, 714]
    );

    expect(calls[callIndex][0]).toBe(
      'INSERT INTO Inventario (id_formato_producto, cantidad_disponible) VALUES ($1, $2) ON CONFLICT (id_formato_producto) DO UPDATE SET cantidad_disponible = Inventario.cantidad_disponible + EXCLUDED.cantidad_disponible'
    );
    expect(calls[callIndex++][1]).toEqual(
      [1, 12]
    );

    expect(calls[callIndex][0]).toBe(
      'INSERT INTO Detalle_Compras (id_compra, id_formato_producto, cantidad, precio_neto_unitario, iva_unitario, precio_bruto_unitario, subtotal_neto, subtotal_iva, subtotal_bruto) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)'
    );
    expect(calls[callIndex++][1]).toEqual(
      [`${compraId}`, 3, 8, 75, 14.25, 89.25, 600, 114, 714]
    );

    expect(calls[callIndex][0]).toBe(
      'INSERT INTO Inventario (id_formato_producto, cantidad_disponible) VALUES ($1, $2) ON CONFLICT (id_formato_producto) DO UPDATE SET cantidad_disponible = Inventario.cantidad_disponible + EXCLUDED.cantidad_disponible'
    );
    expect(calls[callIndex++][1]).toEqual(
      [3, 8]
    );

    expect(calls[callIndex++][0]).toBe('COMMIT');
  });

  it('PUT /api/compras/:id debería devolver 404 si la compra no existe', async () => {
    const compraId = 999;
    const updatedCompraData = {
      fecha_compra: '2023-01-01',
      id_proveedor: 1,
      detalles: [{ id_formato_producto: 1, cantidad: 10, precio_neto_unitario: 50 }]
    };
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // SELECT old detalles (no encuentra)

    const response = await request(app).put(`/api/compras/${compraId}`).send(updatedCompraData);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Purchase not found');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('DELETE /api/compras/:id debería eliminar una compra y revertir inventario con estado 200', async () => {
    const compraId = 1;
    const oldDetalles = [
      { id_formato_producto: 1, cantidad: 10 },
      { id_formato_producto: 2, cantidad: 5 },
    ];
    const deletedCompra = { id_compra: 1, fecha_compra: '2023-01-01' };

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: oldDetalles.length, rows: oldDetalles }) // SELECT old detalles
      .mockResolvedValueOnce({}) // UPDATE Inventario 1 (revert)
      .mockResolvedValueOnce({}) // UPDATE Inventario 2 (revert)
      .mockResolvedValueOnce({}) // DELETE Detalle_Compras
      .mockResolvedValueOnce({ rowCount: 1, rows: [deletedCompra] }) // DELETE Compras
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app).delete(`/api/compras/${compraId}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Purchase deleted and inventory reverted successfully', compra: deletedCompra });
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT id_formato_producto, cantidad FROM Detalle_Compras WHERE id_compra = $1',
      [`${compraId}`]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE Inventario SET cantidad_disponible = cantidad_disponible - $1 WHERE id_formato_producto = $2',
      [10, 1]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE Inventario SET cantidad_disponible = cantidad_disponible - $1 WHERE id_formato_producto = $2',
      [5, 2]
    );
    expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM Detalle_Compras WHERE id_compra = $1', [`${compraId}`]);
    expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM Compras WHERE id_compra = $1 RETURNING *', [`${compraId}`]);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('DELETE /api/compras/:id debería devolver 404 si la compra no existe', async () => {
    const compraId = 999;
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // SELECT old detalles (no encuentra)

    const response = await request(app).delete(`/api/compras/${compraId}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Purchase not found');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('Debería manejar errores de la base de datos para GET /api/compras', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app).get('/api/compras');

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Internal server error');
  });
});