const request = require('supertest');
const express = require('express');
const createAuthRouter = require('../../routes/auth');
const createProduccionRouter = require('../../routes/produccion');
const createAuthController = require('../../controllers/authController');
const createProduccionController = require('../../controllers/produccionController');
const bcrypt = require('bcrypt');



let app;
let token;
let mockUser;
let mockProcesoProduccion;
let mockProcesoEnvasado;
let mockFormatoProductoMP;
let mockFormatoProductoPT;
let mockUbicacion;
let mockTrabajador;

describe('Produccion API (Integration)', () => {
  beforeAll(async () => {
    const { app: initializedApp, pool: initializedPool } = require('../../app')(global.testPool);
    app = initializedApp;
    // The initializedPool is the same as global.testPool, so we don't need to reassign it.

    // Register a test user and get a token
    const hashedPassword = await bcrypt.hash('password123', 10);

    await global.testPool.query("INSERT INTO Usuarios (username, password_hash, role) VALUES ('produccion_user', $1, 'admin')", [hashedPassword]);
    const res = await request(app)
      .post('/api/auth/login') // Changed to /api/auth/login
      .send({ username: 'produccion_user', password: 'password123' });

    token = res.body.token;


    // Create mock data for production tests
    const userResult = await global.testPool.query("SELECT id_usuario FROM Usuarios WHERE username = 'produccion_user'");
    mockUser = userResult.rows[0];

    const ubicacionResult = await global.testPool.query("INSERT INTO Ubicaciones_Inventario (nombre) VALUES ('Bodega Produccion') RETURNING id_ubicacion");
    mockUbicacion = ubicacionResult.rows[0];

    const trabajadorResult = await global.testPool.query("INSERT INTO Trabajadores (nombre) VALUES ('Trabajador Produccion') RETURNING id_trabajador");
    mockTrabajador = trabajadorResult.rows[0];

    const productoMPResult = await global.testPool.query("INSERT INTO Productos (nombre, categoria) VALUES ('Materia Prima Test', 'Materia Prima') RETURNING id_producto");
    const formatoProductoMPResult = await global.testPool.query("INSERT INTO Formatos_Producto (id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida) VALUES ($1, 'KG', 10, 9, 5, 'KG') RETURNING id_formato_producto", [productoMPResult.rows[0].id_producto]);
    mockFormatoProductoMP = formatoProductoMPResult.rows[0];

    const productoPTResult = await global.testPool.query("INSERT INTO Productos (nombre, categoria) VALUES ('Producto Terminado Test', 'Producto Terminado') RETURNING id_producto");
    const formatoProductoPTResult = await global.testPool.query("INSERT INTO Formatos_Producto (id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida) VALUES ($1, 'UNIDAD', 20, 18, 10, 'UNIDAD') RETURNING id_formato_producto", [productoPTResult.rows[0].id_producto]);
    mockFormatoProductoPT = formatoProductoPTResult.rows[0];

    // Insert initial stock for MP
    await global.testPool.query("INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual) VALUES ($1, $2, 100)", [mockFormatoProductoMP.id_formato_producto, mockUbicacion.id_ubicacion]);

    // Create mock procesos
    const productoSubproductoResult = await global.testPool.query("INSERT INTO Productos (nombre, categoria) VALUES ('Subproducto Test', 'Subproducto') RETURNING id_producto");
    const formatoProductoSubproductoResult = await global.testPool.query("INSERT INTO Formatos_Producto (id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida) VALUES ($1, 'LITRO', 5, 4, 2, 'LITRO') RETURNING id_formato_producto", [productoSubproductoResult.rows[0].id_producto]);
    mockFormatoProductoSubproducto = formatoProductoSubproductoResult.rows[0];

    // Create mock procesos
    const procesoProduccionResult = await global.testPool.query(
      "INSERT INTO Procesos (nombre_proceso, tipo_proceso, observacion) VALUES ('Proceso Produccion Test', 'PRODUCCION', 'Observacion Produccion') RETURNING id_proceso"
    );
    mockProcesoProduccion = procesoProduccionResult.rows[0];
    await global.testPool.query(
      "INSERT INTO Detalle_Procesos (id_proceso, id_formato_producto_ingrediente, cantidad_requerida) VALUES ($1, $2, 10)",
      [mockProcesoProduccion.id_proceso, mockFormatoProductoMP.id_formato_producto]
    );
    await global.testPool.query(
      "INSERT INTO Detalle_Procesos_Salida (id_proceso, id_formato_producto_salida, cantidad_producida) VALUES ($1, $2, 5)",
      [mockProcesoProduccion.id_proceso, mockFormatoProductoPT.id_formato_producto]
    );

    const procesoEnvasadoResult = await global.testPool.query(
      "INSERT INTO Procesos (nombre_proceso, tipo_proceso, observacion) VALUES ('Proceso Envasado Test', 'ENVASADO', 'Observacion Envasado') RETURNING id_proceso"
    );
    mockProcesoEnvasado = procesoEnvasadoResult.rows[0];
    await global.testPool.query(
      "INSERT INTO Detalle_Procesos (id_proceso, id_formato_producto_ingrediente, cantidad_requerida) VALUES ($1, $2, 1)",
      [mockProcesoEnvasado.id_proceso, mockFormatoProductoPT.id_formato_producto] // Assuming PT is ingredient for envasado
    );
    await global.testPool.query(
      "INSERT INTO Detalle_Procesos_Salida (id_proceso, id_formato_producto_salida, cantidad_producida) VALUES ($1, $2, 1)",
      [mockProcesoEnvasado.id_proceso, mockFormatoProductoPT.id_formato_producto] // Assuming PT is output for envasado
    );

    // Create a complex process with multiple inputs and outputs
    const procesoComplejoResult = await global.testPool.query(
      "INSERT INTO Procesos (nombre_proceso, tipo_proceso, observacion) VALUES ('Proceso Complejo Test', 'COMPLEJO', 'Observacion Complejo') RETURNING id_proceso"
    );
    mockProcesoComplejo = procesoComplejoResult.rows[0];
    // Inputs
    await global.testPool.query(
      "INSERT INTO Detalle_Procesos (id_proceso, id_formato_producto_ingrediente, cantidad_requerida) VALUES ($1, $2, 20)",
      [mockProcesoComplejo.id_proceso, mockFormatoProductoMP.id_formato_producto]
    );
    // Outputs
    await global.testPool.query(
      "INSERT INTO Detalle_Procesos_Salida (id_proceso, id_formato_producto_salida, cantidad_producida) VALUES ($1, $2, 10)",
      [mockProcesoComplejo.id_proceso, mockFormatoProductoPT.id_formato_producto]
    );
    await global.testPool.query(
      "INSERT INTO Detalle_Procesos_Salida (id_proceso, id_formato_producto_salida, cantidad_producida) VALUES ($1, $2, 5)",
      [mockProcesoComplejo.id_proceso, mockFormatoProductoSubproducto.id_formato_producto]
    );
  });

  afterAll(async () => {
    // Clean up mock data in correct order to avoid foreign key violations
    await global.testPool.query('DELETE FROM Detalle_Movimientos_Inventario');
    await global.testPool.query('DELETE FROM Movimientos_Inventario');
    await global.testPool.query('DELETE FROM Produccion_Diaria');
    await global.testPool.query('DELETE FROM Detalle_Procesos');
    await global.testPool.query('DELETE FROM Detalle_Procesos_Salida'); // New cleanup
    await global.testPool.query('DELETE FROM Procesos');
    await global.testPool.query('DELETE FROM Inventario');
    await global.testPool.query('DELETE FROM Formatos_Producto WHERE id_formato_producto = $1 OR id_formato_producto = $2 OR id_formato_producto = $3', [mockFormatoProductoMP.id_formato_producto, mockFormatoProductoPT.id_formato_producto, mockFormatoProductoSubproducto.id_formato_producto]); // New cleanup
    await global.testPool.query('DELETE FROM Productos WHERE id_producto = (SELECT id_producto FROM Formatos_Producto WHERE id_formato_producto = $1) OR id_producto = (SELECT id_producto FROM Formatos_Producto WHERE id_formato_producto = $2) OR id_producto = (SELECT id_producto FROM Formatos_Producto WHERE id_formato_producto = $3)', [mockFormatoProductoMP.id_formato_producto, mockFormatoProductoPT.id_formato_producto, mockFormatoProductoSubproducto.id_formato_producto]); // New cleanup
    await global.testPool.query('DELETE FROM Ubicaciones_Inventario WHERE id_ubicacion = $1', [mockUbicacion.id_ubicacion]);
    await global.testPool.query('DELETE FROM Trabajadores WHERE id_trabajador = $1', [mockTrabajador.id_trabajador]);
    await global.testPool.query("DELETE FROM Usuarios WHERE username = 'produccion_user'");
  });

  it('POST /produccion/iniciar - should start a new production shift', async () => {
    const newShift = {
      id_proceso: mockProcesoProduccion.id_proceso,
      id_formato_producto: mockFormatoProductoPT.id_formato_producto, // Add this line
      etiqueta_inicial: 1,
      origen: 'Test',
      id_trabajador: mockTrabajador.id_trabajador,
      id_ubicacion: mockUbicacion.id_ubicacion
    };

    const res = await request(app)
      .post('/api/produccion/iniciar')
      .set('Authorization', `Bearer ${token}`)
      .send(newShift);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message', 'Jornada de producción iniciada con éxito.');
    expect(res.body).toHaveProperty('id_produccion_diaria');

    // Verify the shift was created
    const dbRes = await global.testPool.query('SELECT * FROM Produccion_Diaria WHERE id_produccion_diaria = $1', [res.body.id_produccion_diaria]);
    expect(dbRes.rows.length).toBe(1);
    expect(dbRes.rows[0].etiqueta_inicial).toBe(1);
  });

  it('POST /produccion/transformar - should transform products and update inventory for a simple process', async () => {
    // First, ensure there's enough stock of the origin product
    await global.testPool.query(
      "UPDATE Inventario SET stock_actual = 100 WHERE id_formato_producto = $1 AND id_ubicacion = $2",
      [mockFormatoProductoMP.id_formato_producto, mockUbicacion.id_ubicacion]
    );

    // Start a production shift to get an id_produccion_diaria
    const iniciarRes = await request(app)
      .post('/api/produccion/iniciar')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id_proceso: mockProcesoProduccion.id_proceso,
        id_formato_producto: mockFormatoProductoPT.id_formato_producto,
        etiqueta_inicial: 1,
        origen: 'Test Transformacion Simple',
        id_trabajador: mockTrabajador.id_trabajador,
        id_ubicacion: mockUbicacion.id_ubicacion
      });
    const id_produccion_diaria = iniciarRes.body.id_produccion_diaria;

    const transformationData = {
      id_produccion_diaria: id_produccion_diaria,
      id_proceso: mockProcesoProduccion.id_proceso, // Use id_proceso
      id_ubicacion: mockUbicacion.id_ubicacion,
      observaciones: 'Transformacion de MP a PT (simple)'
    };

    const res = await request(app)
      .post('/api/produccion/transformar')
      .set('Authorization', `Bearer ${token}`)
      .send(transformationData);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Transformación de producto registrada con éxito.');

    // Verify stock updates
    const stockMP = await global.testPool.query(
      'SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2',
      [mockFormatoProductoMP.id_formato_producto, mockUbicacion.id_ubicacion]
    );
    expect(parseFloat(stockMP.rows[0].stock_actual)).toBe(90); // 100 - 10 (from Detalle_Procesos)

    const stockPT = await global.testPool.query(
      'SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2',
      [mockFormatoProductoPT.id_formato_producto, mockUbicacion.id_ubicacion]
    );
    expect(parseFloat(stockPT.rows[0].stock_actual)).toBe(5); // 0 + 5 (from Detalle_Procesos_Salida)

    // Verify movement records
    const movimientos = await global.testPool.query(
      'SELECT tipo_movimiento, id_formato_producto, cantidad, tipo_detalle FROM Movimientos_Inventario mi JOIN Detalle_Movimientos_Inventario dmi ON mi.id_movimiento = dmi.id_movimiento WHERE mi.observacion LIKE $1 ORDER BY mi.fecha DESC',
      [`%Transformación%jornada ${id_produccion_diaria}%`]
    );

    const movimientosParsed = movimientos.rows.map(row => ({
      ...row,
      cantidad: parseFloat(row.cantidad)
    }));

    expect(movimientosParsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo_movimiento: 'entrada',
          id_formato_producto: mockFormatoProductoPT.id_formato_producto,
          cantidad: 5,
          tipo_detalle: 'transformacion_produccion'
        }),
        expect.objectContaining({
          tipo_movimiento: 'salida',
          id_formato_producto: mockFormatoProductoMP.id_formato_producto,
          cantidad: 10,
          tipo_detalle: 'transformacion_consumo'
        })
      ])
    );
  });

  it('POST /produccion/transformar - should transform products and update inventory for a complex process with multiple inputs/outputs', async () => {
    // Ensure enough stock for the complex process
    await global.testPool.query(
      "UPDATE Inventario SET stock_actual = 100 WHERE id_formato_producto = $1 AND id_ubicacion = $2",
      [mockFormatoProductoMP.id_formato_producto, mockUbicacion.id_ubicacion]
    );
    // Ensure PT stock is reset for this test
    await global.testPool.query(
      "UPDATE Inventario SET stock_actual = 0 WHERE id_formato_producto = $1 AND id_ubicacion = $2",
      [mockFormatoProductoPT.id_formato_producto, mockUbicacion.id_ubicacion]
    );
    // Ensure Subproducto stock is reset for this test
    await global.testPool.query(
      "INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual) VALUES ($1, $2, 0) ON CONFLICT (id_formato_producto, id_ubicacion) DO UPDATE SET stock_actual = 0",
      [mockFormatoProductoSubproducto.id_formato_producto, mockUbicacion.id_ubicacion]
    );


    // Start a production shift to get an id_produccion_diaria
    const iniciarRes = await request(app)
      .post('/api/produccion/iniciar')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id_proceso: mockProcesoComplejo.id_proceso,
        id_formato_producto: mockFormatoProductoPT.id_formato_producto, // Main output for shift
        etiqueta_inicial: 1,
        origen: 'Test Transformacion Compleja',
        id_trabajador: mockTrabajador.id_trabajador,
        id_ubicacion: mockUbicacion.id_ubicacion
      });
    const id_produccion_diaria = iniciarRes.body.id_produccion_diaria;

    const transformationData = {
      id_produccion_diaria: id_produccion_diaria,
      id_proceso: mockProcesoComplejo.id_proceso,
      id_ubicacion: mockUbicacion.id_ubicacion,
      observaciones: 'Transformacion compleja con multiples entradas y salidas'
    };

    const res = await request(app)
      .post('/api/produccion/transformar')
      .set('Authorization', `Bearer ${token}`)
      .send(transformationData);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Transformación de producto registrada con éxito.');

    // Verify stock updates for MP (input)
    const stockMP = await global.testPool.query(
      'SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2',
      [mockFormatoProductoMP.id_formato_producto, mockUbicacion.id_ubicacion]
    );
    expect(parseFloat(stockMP.rows[0].stock_actual)).toBe(80); // 100 - 20 (from Detalle_Procesos)

    // Verify stock updates for PT (output 1)
    const stockPT = await global.testPool.query(
      'SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2',
      [mockFormatoProductoPT.id_formato_producto, mockUbicacion.id_ubicacion]
    );
    expect(parseFloat(stockPT.rows[0].stock_actual)).toBe(10); // 0 + 10 (from Detalle_Procesos_Salida)

    // Verify stock updates for Subproducto (output 2)
    const stockSubproducto = await global.testPool.query(
      'SELECT stock_actual FROM Inventario WHERE id_formato_producto = $1 AND id_ubicacion = $2',
      [mockFormatoProductoSubproducto.id_formato_producto, mockUbicacion.id_ubicacion]
    );
    expect(parseFloat(stockSubproducto.rows[0].stock_actual)).toBe(5); // 0 + 5 (from Detalle_Procesos_Salida)

    // Verify movement records
    const movimientos = await global.testPool.query(
      'SELECT tipo_movimiento, id_formato_producto, cantidad, tipo_detalle FROM Movimientos_Inventario mi JOIN Detalle_Movimientos_Inventario dmi ON mi.id_movimiento = dmi.id_movimiento WHERE mi.observacion LIKE $1 ORDER BY mi.fecha DESC',
      [`%Transformación%jornada ${id_produccion_diaria}%`]
    );

    const movimientosParsed = movimientos.rows.map(row => ({
      ...row,
      cantidad: parseFloat(row.cantidad)
    }));

    expect(movimientosParsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo_movimiento: 'entrada',
          id_formato_producto: mockFormatoProductoPT.id_formato_producto,
          cantidad: 10,
          tipo_detalle: 'transformacion_produccion'
        }),
        expect.objectContaining({
          tipo_movimiento: 'entrada',
          id_formato_producto: mockFormatoProductoSubproducto.id_formato_producto,
          cantidad: 5,
          tipo_detalle: 'transformacion_produccion'
        }),
        expect.objectContaining({
          tipo_movimiento: 'salida',
          id_formato_producto: mockFormatoProductoMP.id_formato_producto,
          cantidad: 20,
          tipo_detalle: 'transformacion_consumo'
        })
      ])
    );
  });
});
