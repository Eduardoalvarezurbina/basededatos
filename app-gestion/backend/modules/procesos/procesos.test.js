const request = require('supertest');
const { app, pool } = require('../../index');
const bcrypt = require('bcrypt');

describe('Procesos API', () => {
  let token;
  let mockProductoFinal, mockIngrediente1, mockIngrediente2;
  let mockFormatoFinal, mockFormatoIng1, mockFormatoIng2;
  let mockProceso;

  beforeAll(async () => {
    // 1. Create user and get token
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('proceso_test_password', salt);
    await pool.query("INSERT INTO Usuarios (username, password_hash, role) VALUES ('proceso_test_user', $1, 'admin') ON CONFLICT (username) DO NOTHING", [hashedPassword]);
    const res = await request(app).post('/login').send({ username: 'proceso_test_user', password: 'proceso_test_password' });
    token = res.body.token;

    // 2. Create mock products and formats
    const prodFinalRes = await pool.query("INSERT INTO Productos (nombre) VALUES ('Producto Final Test') RETURNING *");
    mockProductoFinal = prodFinalRes.rows[0];
    const prodIng1Res = await pool.query("INSERT INTO Productos (nombre) VALUES ('Ingrediente 1 Test') RETURNING *");
    mockIngrediente1 = prodIng1Res.rows[0];
    const prodIng2Res = await pool.query("INSERT INTO Productos (nombre) VALUES ('Ingrediente 2 Test') RETURNING *");
    mockIngrediente2 = prodIng2Res.rows[0];

    const formatoFinalRes = await pool.query('INSERT INTO Formatos_Producto (id_producto, formato) VALUES ($1, $2) RETURNING *', [mockProductoFinal.id_producto, '1kg']);
    mockFormatoFinal = formatoFinalRes.rows[0];
    const formatoIng1Res = await pool.query('INSERT INTO Formatos_Producto (id_producto, formato) VALUES ($1, $2) RETURNING *', [mockIngrediente1.id_producto, '500g']);
    mockFormatoIng1 = formatoIng1Res.rows[0];
    const formatoIng2Res = await pool.query('INSERT INTO Formatos_Producto (id_producto, formato) VALUES ($1, $2) RETURNING *', [mockIngrediente2.id_producto, '250g']);
    mockFormatoIng2 = formatoIng2Res.rows[0];
  });

  afterAll(async () => {
    // Clean up all mock data
    await pool.query('DELETE FROM Produccion_Diaria');
    await pool.query('DELETE FROM Detalle_Procesos');
    await pool.query('DELETE FROM Procesos');
    await pool.query('DELETE FROM Formatos_Producto');
    await pool.query('DELETE FROM Productos');
    await pool.query("DELETE FROM Usuarios WHERE username = 'proceso_test_user'");
    await pool.query('DELETE FROM Trabajadores');
    await pool.end();
  });

  it('should create a new process with ingredients', async () => {
    const newProceso = {
      nombre_proceso: 'Test Proceso',
      tipo_proceso: 'PRODUCCION',
      id_formato_producto_final: mockFormatoFinal.id_formato_producto,
      observacion: 'Test observation',
      ingredientes: [
        { id_formato_producto_ingrediente: mockFormatoIng1.id_formato_producto, cantidad_requerida: 2 },
        { id_formato_producto_ingrediente: mockFormatoIng2.id_formato_producto, cantidad_requerida: 1 }
      ]
    };

    const res = await request(app)
      .post('/procesos')
      .set('Authorization', `Bearer ${token}`)
      .send(newProceso);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id_proceso');
    mockProceso = { id_proceso: res.body.id_proceso };
  });

  it('should fetch all processes', async () => {
    const res = await request(app).get('/procesos').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find(p => p.id_proceso === mockProceso.id_proceso);
    expect(found).toBeDefined();
    expect(found.ingredientes.length).toBe(2);
  });

  it('should fetch a single process by ID', async () => {
    const res = await request(app).get(`/procesos/${mockProceso.id_proceso}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.id_proceso).toEqual(mockProceso.id_proceso);
    expect(res.body.nombre_proceso).toEqual('Test Proceso');
    expect(res.body.ingredientes.length).toBe(2);
  });

  it('should update a process and its ingredients', async () => {
    const updatedProceso = {
      nombre_proceso: 'Updated Test Proceso',
      tipo_proceso: 'ENVASADO',
      id_formato_producto_final: mockFormatoFinal.id_formato_producto,
      observacion: 'Updated observation',
      ingredientes: [
        { id_formato_producto_ingrediente: mockFormatoIng1.id_formato_producto, cantidad_requerida: 3 }
      ]
    };

    const res = await request(app)
      .put(`/procesos/${mockProceso.id_proceso}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updatedProceso);

    expect(res.statusCode).toEqual(200);

    // Verify the update
    const getRes = await request(app).get(`/procesos/${mockProceso.id_proceso}`).set('Authorization', `Bearer ${token}`);
    expect(getRes.body.nombre_proceso).toEqual('Updated Test Proceso');
    expect(getRes.body.tipo_proceso).toEqual('ENVASADO');
    expect(getRes.body.ingredientes.length).toBe(1);
    expect(getRes.body.ingredientes[0].cantidad_requerida).toBe(3);
  });

  it('should delete a process and its ingredients', async () => {
    const res = await request(app).delete(`/procesos/${mockProceso.id_proceso}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toContain('deleted successfully');

    // Verify it's gone
    const getRes = await request(app).get(`/procesos/${mockProceso.id_proceso}`).set('Authorization', `Bearer ${token}`);
    expect(getRes.statusCode).toEqual(404);
  });

  it('should return 409 when trying to delete a process that is in use', async () => {
    // 1. Create a new process
    const newProcesoData = {
        nombre_proceso: 'In-Use Proceso',
        tipo_proceso: 'PRODUCCION',
        id_formato_producto_final: mockFormatoFinal.id_formato_producto,
        observacion: 'In-use observation',
        ingredientes: [{ id_formato_producto_ingrediente: mockFormatoIng1.id_formato_producto, cantidad_requerida: 1 }]
    };
    const procesoRes = await request(app).post('/procesos').set('Authorization', `Bearer ${token}`).send(newProcesoData);
    const procesoInUse = procesoRes.body;

    // 2. Create a production entry that uses it
    const trabajadorRes = await pool.query("INSERT INTO Trabajadores (nombre) VALUES ('Test Worker') RETURNING id_trabajador");
    const mockTrabajador = trabajadorRes.rows[0];
    await pool.query('INSERT INTO Produccion_Diaria (id_proceso, id_trabajador, etiqueta_inicial, id_formato_producto) VALUES ($1, $2, 1, $3)', [procesoInUse.id_proceso, mockTrabajador.id_trabajador, mockFormatoFinal.id_formato_producto]);

    // 3. Attempt to delete it
    const res = await request(app).delete(`/procesos/${procesoInUse.id_proceso}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(409);
    expect(res.body.message).toContain('referenced by other records');

    // 4. Cleanup
    await pool.query('DELETE FROM Produccion_Diaria WHERE id_proceso = $1', [procesoInUse.id_proceso]);
    await pool.query('DELETE FROM Detalle_Procesos WHERE id_proceso = $1', [procesoInUse.id_proceso]);
    await pool.query('DELETE FROM Procesos WHERE id_proceso = $1', [procesoInUse.id_proceso]);
    await pool.query('DELETE FROM Trabajadores WHERE id_trabajador = $1', [mockTrabajador.id_trabajador]);
  });
});
