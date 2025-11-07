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

describe('Módulo de Ventas (Transacciones)', () => {

  beforeEach(() => {
    mockPool.query.mockClear();
    mockClient.query.mockClear();
    mockPool.connect.mockClear();
  });

  it('GET /api/ventas debería devolver una lista de ventas con estado 200', async () => {
    const mockVentas = [
      { id_transaccion: 1, fecha_transaccion: '2023-01-01', total_neto: 100, detalles: [] },
      { id_transaccion: 2, fecha_transaccion: '2023-01-02', total_neto: 200, detalles: [] },
    ];
    mockPool.query.mockResolvedValueOnce({ rows: mockVentas });

    const response = await request(app).get('/api/ventas');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockVentas);
    expect(mockPool.query).toHaveBeenCalled();
  });

  it('GET /api/ventas/:id debería devolver una venta específica con estado 200', async () => {
    const mockVenta = { id_transaccion: 1, fecha_transaccion: '2023-01-01', total_neto: 100, detalles: [] };
    mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [mockVenta] });

    const response = await request(app).get('/api/ventas/1');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockVenta);
    expect(mockPool.query).toHaveBeenCalled();
  });

  it('GET /api/ventas/:id debería devolver 404 si la venta no existe', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

    const response = await request(app).get('/api/ventas/999');

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Sale not found');
  });

  it('POST /api/ventas debería crear una nueva venta y actualizar inventario con estado 201', async () => {
    const newVentaData = {
      fecha_transaccion: '2023-01-03',
      id_cliente: 1,
      id_punto_venta: 1,
      id_tipo_pago: 1,
      factura: 'F-001',
      observaciones: 'Venta de prueba',
      detalles: [
        { id_formato_producto: 1, cantidad: 10, precio_neto_unitario: 50, id_lote: 1 },
        { id_formato_producto: 2, cantidad: 5, precio_neto_unitario: 100, id_lote: 2 },
      ]
    };
    const createdVenta = { id_transaccion: 3, ...newVentaData, total_neto: 1000, total_iva: 190, total_bruto: 1190 };

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id_transaccion: 3 }] }) // INSERT Transacciones
      .mockResolvedValueOnce({}) // INSERT Detalle_Transacciones 1
      .mockResolvedValueOnce({}) // UPDATE Inventario 1
      .mockResolvedValueOnce({}) // INSERT Detalle_Transacciones 2
      .mockResolvedValueOnce({}) // UPDATE Inventario 2
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app).post('/api/ventas').send(newVentaData);

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({ message: 'Sale created and inventory updated successfully', id_transaccion: 3 });
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO Transacciones (fecha_transaccion, id_cliente, id_punto_venta, id_tipo_pago, total_neto, total_iva, total_bruto, factura, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id_transaccion',
      [newVentaData.fecha_transaccion, newVentaData.id_cliente, newVentaData.id_punto_venta, newVentaData.id_tipo_pago, 1000, 190, 1190, newVentaData.factura, newVentaData.observaciones]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO Detalle_Transacciones (id_transaccion, id_formato_producto, cantidad, precio_neto_unitario, iva_unitario, precio_bruto_unitario, subtotal_neto, subtotal_iva, subtotal_bruto, id_lote) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [3, 1, 10, 50, 9.5, 59.5, 500, 95, 595, 1]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE Inventario SET cantidad_disponible = cantidad_disponible - $1 WHERE id_formato_producto = $2',
      [10, 1]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'INSERT INTO Detalle_Transacciones (id_transaccion, id_formato_producto, cantidad, precio_neto_unitario, iva_unitario, precio_bruto_unitario, subtotal_neto, subtotal_iva, subtotal_bruto, id_lote) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [3, 2, 5, 100, 19, 119, 500, 95, 595, 2]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE Inventario SET cantidad_disponible = cantidad_disponible - $1 WHERE id_formato_producto = $2',
      [5, 2]
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('PUT /api/ventas/:id debería actualizar una venta y ajustar inventario con estado 200', async () => {
    const ventaId = 1;
    const oldDetalles = [
      { id_formato_producto: 1, cantidad: 10 },
      { id_formato_producto: 2, cantidad: 5 },
    ];
    const updatedVentaData = {
      fecha_transaccion: '2023-01-01',
      id_cliente: 1,
      id_punto_venta: 1,
      id_tipo_pago: 1,
      factura: 'F-001-UPD',
      observaciones: 'Venta actualizada',
      detalles: [
        { id_formato_producto: 1, cantidad: 12, precio_neto_unitario: 50, id_lote: 1 }, // Cantidad cambia de 10 a 12
        { id_formato_producto: 3, cantidad: 8, precio_neto_unitario: 75, id_lote: 3 }, // Nuevo producto
      ]
    };
    const updatedVenta = { id_transaccion: 1, ...updatedVentaData, total_neto: 1200, total_iva: 228, total_bruto: 1428 };

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: oldDetalles.length, rows: oldDetalles }) // SELECT old detalles
      .mockResolvedValueOnce({}) // UPDATE Inventario 1 (revert)
      .mockResolvedValueOnce({}) // UPDATE Inventario 2 (revert)
      .mockResolvedValueOnce({}) // DELETE Detalle_Transacciones
      .mockResolvedValueOnce({ rows: [updatedVenta] }) // UPDATE Transacciones
      .mockResolvedValueOnce({}) // INSERT Detalle_Transacciones 1 (new)
      .mockResolvedValueOnce({}) // UPDATE Inventario 1 (new)
      .mockResolvedValueOnce({}) // INSERT Detalle_Transacciones 2 (new)
      .mockResolvedValueOnce({}) // UPDATE Inventario 2 (new)
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app).put(`/api/ventas/${ventaId}`).send(updatedVentaData);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Sale updated and inventory adjusted successfully', venta: updatedVenta });
    
    const calls = mockClient.query.mock.calls;
    let callIndex = 0;

    expect(calls[callIndex++][0]).toBe('BEGIN');

    expect(calls[callIndex][0]).toBe('SELECT id_formato_producto, cantidad FROM Detalle_Transacciones WHERE id_transaccion = $1');
    expect(calls[callIndex++][1]).toEqual([`${ventaId}`]);

    expect(calls[callIndex][0]).toBe('UPDATE Inventario SET cantidad_disponible = cantidad_disponible + $1 WHERE id_formato_producto = $2');
    expect(calls[callIndex++][1]).toEqual([10, 1]);

    expect(calls[callIndex][0]).toBe('UPDATE Inventario SET cantidad_disponible = cantidad_disponible + $1 WHERE id_formato_producto = $2');
    expect(calls[callIndex++][1]).toEqual([5, 2]);

    expect(calls[callIndex][0]).toBe('DELETE FROM Detalle_Transacciones WHERE id_transaccion = $1');
    expect(calls[callIndex++][1]).toEqual([`${ventaId}`]);

    expect(calls[callIndex][0]).toBe(
      'UPDATE Transacciones SET fecha_transaccion = $1, id_cliente = $2, id_punto_venta = $3, id_tipo_pago = $4, total_neto = $5, total_iva = $6, total_bruto = $7, factura = $8, observaciones = $9 WHERE id_transaccion = $10 RETURNING *'
    );
    expect(calls[callIndex++][1]).toEqual(
      [updatedVentaData.fecha_transaccion, updatedVentaData.id_cliente, updatedVentaData.id_punto_venta, updatedVentaData.id_tipo_pago, 1200, 228, 1428, updatedVentaData.factura, updatedVentaData.observaciones, `${ventaId}`]
    );

    expect(calls[callIndex][0]).toBe(
      'INSERT INTO Detalle_Transacciones (id_transaccion, id_formato_producto, cantidad, precio_neto_unitario, iva_unitario, precio_bruto_unitario, subtotal_neto, subtotal_iva, subtotal_bruto, id_lote) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)'
    );
    expect(calls[callIndex++][1]).toEqual(
      [`${ventaId}`, 1, 12, 50, 9.5, 59.5, 600, 114, 714, 1]
    );

    expect(calls[callIndex][0]).toBe(
      'UPDATE Inventario SET cantidad_disponible = cantidad_disponible - $1 WHERE id_formato_producto = $2'
    );
    expect(calls[callIndex++][1]).toEqual(
      [12, 1]
    );

    expect(calls[callIndex][0]).toBe(
      'INSERT INTO Detalle_Transacciones (id_transaccion, id_formato_producto, cantidad, precio_neto_unitario, iva_unitario, precio_bruto_unitario, subtotal_neto, subtotal_iva, subtotal_bruto, id_lote) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)'
    );
    expect(calls[callIndex++][1]).toEqual(
      [`${ventaId}`, 3, 8, 75, 14.25, 89.25, 600, 114, 714, 3]
    );

    expect(calls[callIndex][0]).toBe(
      'UPDATE Inventario SET cantidad_disponible = cantidad_disponible - $1 WHERE id_formato_producto = $2'
    );
    expect(calls[callIndex++][1]).toEqual(
      [8, 3]
    );

    expect(calls[callIndex++][0]).toBe('COMMIT');
  });

  it('PUT /api/ventas/:id debería devolver 404 si la venta no existe', async () => {
    const ventaId = 999;
    const updatedVentaData = {
      fecha_transaccion: '2023-01-01',
      id_cliente: 1,
      id_punto_venta: 1,
      id_tipo_pago: 1,
      detalles: [{ id_formato_producto: 1, cantidad: 10, precio_neto_unitario: 50, id_lote: 1 }]
    };
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // SELECT old detalles (no encuentra)

    const response = await request(app).put(`/api/ventas/${ventaId}`).send(updatedVentaData);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Sale not found');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('DELETE /api/ventas/:id debería eliminar una venta y revertir inventario con estado 200', async () => {
    const ventaId = 1;
    const oldDetalles = [
      { id_formato_producto: 1, cantidad: 10 },
      { id_formato_producto: 2, cantidad: 5 },
    ];
    const deletedVenta = { id_transaccion: 1, fecha_transaccion: '2023-01-01' };

    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: oldDetalles.length, rows: oldDetalles }) // SELECT old detalles
      .mockResolvedValueOnce({}) // UPDATE Inventario 1 (revert)
      .mockResolvedValueOnce({}) // UPDATE Inventario 2 (revert)
      .mockResolvedValueOnce({}) // DELETE Detalle_Transacciones
      .mockResolvedValueOnce({ rowCount: 1, rows: [deletedVenta] }) // DELETE Transacciones
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app).delete(`/api/ventas/${ventaId}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: 'Sale deleted and inventory reverted successfully', venta: deletedVenta });
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT id_formato_producto, cantidad FROM Detalle_Transacciones WHERE id_transaccion = $1',
      [`${ventaId}`]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE Inventario SET cantidad_disponible = cantidad_disponible + $1 WHERE id_formato_producto = $2',
      [10, 1]
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE Inventario SET cantidad_disponible = cantidad_disponible + $1 WHERE id_formato_producto = $2',
      [5, 2]
    );
    expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM Detalle_Transacciones WHERE id_transaccion = $1', [`${ventaId}`]);
    expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM Transacciones WHERE id_transaccion = $1 RETURNING *', [`${ventaId}`]);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('DELETE /api/ventas/:id debería devolver 404 si la venta no existe', async () => {
    const ventaId = 999;
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // SELECT old detalles (no encuentra)

    const response = await request(app).delete(`/api/ventas/${ventaId}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe('Sale not found');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('Debería manejar errores de la base de datos para GET /api/ventas', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app).get('/api/ventas');

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Internal server error');
  });
});