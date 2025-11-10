const request = require('supertest');
const { app, pool } = require('../../app')(global.testPool);

describe('Módulo de Lookups (Integración con DB)', () => {

  it('GET /api/lookups/ubicaciones debería devolver una lista de ubicaciones con estado 200', async () => {
    const response = await request(app).get('/api/lookups/ubicaciones');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('id_ubicacion');
    expect(response.body[0]).toHaveProperty('nombre');
  });

  it('GET /api/lookups/formatos-producto debería devolver una lista de formatos de producto con estado 200', async () => {
    const response = await request(app).get('/api/lookups/formatos-producto');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('id_formato_producto');
    expect(response.body[0]).toHaveProperty('formato');
    expect(response.body[0]).toHaveProperty('nombre_producto');
  });

  it('GET /api/lookups/canales-compra debería devolver una lista de canales de compra con estado 200', async () => {
    const response = await request(app).get('/api/lookups/canales-compra');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('id_canal_compra');
    expect(response.body[0]).toHaveProperty('nombre_canal');
  });

  it('GET /api/lookups/fuentes-contacto debería devolver una lista de fuentes de contacto con estado 200', async () => {
    const response = await request(app).get('/api/lookups/fuentes-contacto');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('id_fuente_contacto');
    expect(response.body[0]).toHaveProperty('nombre_fuente');
  });

  it('GET /api/lookups/tipos-cliente debería devolver una lista de tipos de cliente con estado 200', async () => {
    const response = await request(app).get('/api/lookups/tipos-cliente');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('id_tipo_cliente');
    expect(response.body[0]).toHaveProperty('nombre_tipo');
  });
});
