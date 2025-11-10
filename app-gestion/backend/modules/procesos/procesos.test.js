const request = require('supertest');
const { app, pool } = require('../../app')(global.testPool);
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

describe('Procesos API', () => {
  let token;
  let mockFormato1, mockFormato2, mockFormatoFinal;

  // Setup read-only data once for all tests
  beforeAll(async () => {
    // 1. Create user and get token
    const username = `process_user_${uuidv4()}`;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('testpassword', salt);
    await pool.query("INSERT INTO Usuarios (username, password_hash, role) VALUES ($1, $2, 'admin')", [username, hashedPassword]);
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username, password: 'testpassword' });
    token = loginRes.body.token;

    // 2. Create shared product formats to be used as ingredients/results
    const [prod1Res, prod2Res, prodFinalRes] = await Promise.all([
        pool.query("INSERT INTO Productos (nombre, categoria, activo) VALUES ($1, 'Test', true) RETURNING id_producto", [`Ing 1 ${uuidv4()}`]),
        pool.query("INSERT INTO Productos (nombre, categoria, activo) VALUES ($1, 'Test', true) RETURNING id_producto", [`Ing 2 ${uuidv4()}`]),
        pool.query("INSERT INTO Productos (nombre, categoria, activo) VALUES ($1, 'Test', true) RETURNING id_producto", [`Final ${uuidv4()}`])
    ]);

    const [formato1Res, formato2Res, formatoFinalRes] = await Promise.all([
        pool.query("INSERT INTO Formatos_Producto (id_producto, formato) VALUES ($1, 'kg') RETURNING id_formato_producto", [prod1Res.rows[0].id_producto]),
        pool.query("INSERT INTO Formatos_Producto (id_producto, formato) VALUES ($1, 'kg') RETURNING id_formato_producto", [prod2Res.rows[0].id_producto]),
        pool.query("INSERT INTO Formatos_Producto (id_producto, formato) VALUES ($1, 'kg') RETURNING id_formato_producto", [prodFinalRes.rows[0].id_producto])
    ]);
    
    mockFormato1 = formato1Res.rows[0];
    mockFormato2 = formato2Res.rows[0];
    mockFormatoFinal = formatoFinalRes.rows[0];
  });

  afterAll(async () => {
    // Clean up all shared mock data
    await pool.query('DELETE FROM Usuarios WHERE username LIKE \'process_user_%\'');
    // The products and formats will be deleted by the CASCADE on Productos table
    await pool.query("DELETE FROM Formatos_Producto WHERE id_formato_producto IN ($1, $2, $3)", [mockFormato1.id_formato_producto, mockFormato2.id_formato_producto, mockFormatoFinal.id_formato_producto]);
    await pool.query("DELETE FROM Productos WHERE nombre LIKE 'Ing 1 %' OR nombre LIKE 'Ing 2 %' OR nombre LIKE 'Final %'");
  });

  it('should create a new process with ingredients', async () => {
    const newProcess = {
      nombre_proceso: 'Test Proceso Create',
      tipo_proceso: 'PRODUCCION',
      id_formato_producto_final: mockFormatoFinal.id_formato_producto,
      observacion: 'Test Observation',
      ingredientes: [
        { id_formato_producto_ingrediente: mockFormato1.id_formato_producto, cantidad_requerida: 2 },
        { id_formato_producto_ingrediente: mockFormato2.id_formato_producto, cantidad_requerida: 1 }
      ]
    };
    const res = await request(app)
      .post('/api/processes')
      .set('Authorization', `Bearer ${token}`)
      .send(newProcess);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id_proceso');

    // Cleanup
    await pool.query('DELETE FROM Detalle_Procesos WHERE id_proceso = $1', [res.body.id_proceso]);
    await pool.query('DELETE FROM Procesos WHERE id_proceso = $1', [res.body.id_proceso]);
  });

  it('should fetch all processes', async () => {
    // No setup needed, just check if it returns an array
    const res = await request(app).get('/api/processes').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should fetch a single process by ID', async () => {
    // Setup
    const procesoRes = await pool.query("INSERT INTO Procesos (nombre_proceso, tipo_proceso, id_formato_producto_final) VALUES ('Test GET', 'PRODUCCION', $1) RETURNING *", [mockFormatoFinal.id_formato_producto]);
    const tempProceso = procesoRes.rows[0];
    await pool.query("INSERT INTO Detalle_Procesos (id_proceso, id_formato_producto_ingrediente, cantidad_requerida) VALUES ($1, $2, 5)", [tempProceso.id_proceso, mockFormato1.id_formato_producto]);

    // Execute
    const res = await request(app).get(`/api/processes/${tempProceso.id_proceso}`).set('Authorization', `Bearer ${token}`);
    
    // Assert
    expect(res.statusCode).toEqual(200);
    expect(res.body.id_proceso).toEqual(tempProceso.id_proceso);
    expect(res.body.nombre_proceso).toEqual('Test GET');
    expect(res.body.ingredientes.length).toBe(1);

    // Cleanup
    await pool.query('DELETE FROM Detalle_Procesos WHERE id_proceso = $1', [tempProceso.id_proceso]);
    await pool.query('DELETE FROM Procesos WHERE id_proceso = $1', [tempProceso.id_proceso]);
  });

  it('should update a process and its ingredients', async () => {
    // Setup
    const procesoRes = await pool.query("INSERT INTO Procesos (nombre_proceso, tipo_proceso, id_formato_producto_final) VALUES ('Test PUT', 'PRODUCCION', $1) RETURNING *", [mockFormatoFinal.id_formato_producto]);
    const tempProceso = procesoRes.rows[0];
    
    const updatedProcess = {
      nombre_proceso: 'Updated Test Proceso',
      tipo_proceso: 'ENVASADO',
      id_formato_producto_final: mockFormatoFinal.id_formato_producto,
      observacion: 'Updated Observation',
      ingredientes: [{ id_formato_producto_ingrediente: mockFormato1.id_formato_producto, cantidad_requerida: 3 }]
    };

    // Execute
    const res = await request(app)
      .put(`/api/processes/${tempProceso.id_proceso}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatedProcess);
    expect(res.statusCode).toEqual(200);

    // Verify & Assert
    const getRes = await request(app).get(`/api/processes/${tempProceso.id_proceso}`).set('Authorization', `Bearer ${token}`);
    expect(getRes.body.nombre_proceso).toEqual('Updated Test Proceso');
    expect(getRes.body.ingredientes.length).toBe(1);
    expect(Number(getRes.body.ingredientes[0].cantidad_requerida)).toBe(3);

    // Cleanup
    await pool.query('DELETE FROM Detalle_Procesos WHERE id_proceso = $1', [tempProceso.id_proceso]);
    await pool.query('DELETE FROM Procesos WHERE id_proceso = $1', [tempProceso.id_proceso]);
  });

  it('should delete a process and its ingredients', async () => {
    // Setup
    const procesoRes = await pool.query("INSERT INTO Procesos (nombre_proceso, tipo_proceso, id_formato_producto_final) VALUES ('Test DELETE', 'PRODUCCION', $1) RETURNING *", [mockFormatoFinal.id_formato_producto]);
    const tempProceso = procesoRes.rows[0];

    // Execute
    const res = await request(app).delete(`/api/processes/${tempProceso.id_proceso}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);

    // Verify & Assert
    const getRes = await request(app).get(`/api/processes/${tempProceso.id_proceso}`).set('Authorization', `Bearer ${token}`);
    expect(getRes.statusCode).toEqual(404);
  });

  it('should return 409 when trying to delete a process that is in use', async () => {
    // Setup
    const procesoRes = await pool.query("INSERT INTO Procesos (nombre_proceso, tipo_proceso, id_formato_producto_final) VALUES ('Test CONFLICT', 'PRODUCCION', $1) RETURNING *", [mockFormatoFinal.id_formato_producto]);
    const tempProceso = procesoRes.rows[0];
    const prodDiariaRes = await pool.query('INSERT INTO Produccion_Diaria (id_proceso, id_formato_producto, cantidad_producida, fecha_jornada, etiqueta_inicial) VALUES ($1, $2, 10, NOW(), 1) RETURNING id_produccion_diaria', [tempProceso.id_proceso, mockFormatoFinal.id_formato_producto]);
    const tempProdDiaria = prodDiariaRes.rows[0];

    // Execute
    const res = await request(app).delete(`/api/processes/${tempProceso.id_proceso}`).set('Authorization', `Bearer ${token}`);
    
    // Assert
    expect(res.statusCode).toEqual(409);

    // Cleanup
    await pool.query('DELETE FROM Produccion_Diaria WHERE id_produccion_diaria = $1', [tempProdDiaria.id_produccion_diaria]);
    await pool.query('DELETE FROM Procesos WHERE id_proceso = $1', [tempProceso.id_proceso]);
  });
});