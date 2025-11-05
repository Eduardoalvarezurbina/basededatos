const express = require('express');
const { Pool } = require('pg');
const router = express.Router();
const { verifyToken, authorizeRole } = require('../../routes/authMiddleware');

// DB Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});

// GET /clients - Obtener todos los clientes con información adicional
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.*,
        tc.nombre_tipo as nombre_tipo_cliente,
        fc.nombre_fuente as nombre_fuente_contacto,
        cc.nombre_categoria as nombre_categoria_cliente,
        clc.nombre_clasificacion as nombre_clasificacion_cliente,
        frec.nombre_frecuencia as nombre_frecuencia_compra,
        tcon.nombre_tipo as nombre_tipo_consumo
      FROM Clientes c
      LEFT JOIN Tipos_Cliente tc ON c.id_tipo_cliente = tc.id_tipo_cliente
      LEFT JOIN Fuentes_Contacto fc ON c.id_fuente_contacto = fc.id_fuente_contacto
      LEFT JOIN Categorias_Cliente cc ON c.id_categoria_cliente = cc.id_categoria_cliente
      LEFT JOIN Clasificaciones_Cliente clc ON c.id_clasificacion_cliente = clc.id_clasificacion_cliente
      LEFT JOIN Frecuencias_Compra frec ON c.id_frecuencia_compra = frec.id_frecuencia_compra
      LEFT JOIN Tipos_Consumo tcon ON c.id_tipo_consumo = tcon.id_tipo_consumo
      ORDER BY c.id_cliente
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting clients:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /clients/:id - Obtener un cliente por ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT
        c.*,
        tc.nombre_tipo as nombre_tipo_cliente,
        fc.nombre_fuente as nombre_fuente_contacto,
        cc.nombre_categoria as nombre_categoria_cliente,
        clc.nombre_clasificacion as nombre_clasificacion_cliente,
        frec.nombre_frecuencia as nombre_frecuencia_compra,
        tcon.nombre_tipo as nombre_tipo_consumo
      FROM Clientes c
      LEFT JOIN Tipos_Cliente tc ON c.id_tipo_cliente = tc.id_tipo_cliente
      LEFT JOIN Fuentes_Contacto fc ON c.id_fuente_contacto = fc.id_fuente_contacto
      LEFT JOIN Categorias_Cliente cc ON c.id_categoria_cliente = cc.id_categoria_cliente
      LEFT JOIN Clasificaciones_Cliente clc ON c.id_clasificacion_cliente = clc.id_clasificacion_cliente
      LEFT JOIN Frecuencias_Compra frec ON c.id_frecuencia_compra = frec.id_frecuencia_compra
      LEFT JOIN Tipos_Consumo tcon ON c.id_tipo_consumo = tcon.id_tipo_consumo
      WHERE c.id_cliente = $1
    `, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting client by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /clientes/buscar - Buscar clientes por teléfono
router.get('/buscar', verifyToken, async (req, res) => {
  const { telefono } = req.query;
  if (!telefono) {
    return res.status(400).json({ message: 'Phone number query is required' });
  }
  try {
    const result = await pool.query(
      "SELECT * FROM Clientes WHERE telefono LIKE $1 ORDER BY nombre",
      [`%${telefono}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error searching clients:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /clients - Crear un nuevo cliente
router.post('/', verifyToken, authorizeRole(['admin']), async (req, res) => {
    const {
      nombre, telefono, id_ciudad, direccion, id_categoria_cliente, id_fuente_contacto,
      id_cuenta_preferida, rut, email, correo, id_tipo_cliente, id_comuna,
      fecha_inicio_cliente, id_frecuencia_compra, gasto_promedio_por_compra,
      ticket_promedio_total, preferencia_mix_berries, preferencia_pulpas, id_tipo_consumo,
      preferencia_envase, intereses_promociones, preferencia_alimentaria, epoca_compra_preferida,
      recibio_seguimiento_postventa, participo_promociones, tiene_deudas_pendientes,
      suscrito_newsletter, dejo_resenas, nivel_satisfaccion, segmento_vip,
      coordenadas_geograficas, fecha_cumpleanos, id_clasificacion_cliente, etiquetas_comportamiento
    } = req.body;
  
    try {
      const result = await pool.query(
        `INSERT INTO Clientes (
          nombre, telefono, id_ciudad, direccion, id_categoria_cliente, id_fuente_contacto,
          id_cuenta_preferida, rut, email, correo, id_tipo_cliente, id_comuna,
          fecha_inicio_cliente, id_frecuencia_compra, gasto_promedio_por_compra,
          ticket_promedio_total, preferencia_mix_berries, preferencia_pulpas, id_tipo_consumo,
          preferencia_envase, intereses_promociones, preferencia_alimentaria, epoca_compra_preferida,
          recibio_seguimiento_postventa, participo_promociones, tiene_deudas_pendientes,
          suscrito_newsletter, dejo_resenas, nivel_satisfaccion, segmento_vip,
          coordenadas_geograficas, fecha_cumpleanos, id_clasificacion_cliente, etiquetas_comportamiento
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
        ) RETURNING *`,
        [
          nombre, telefono, id_ciudad, direccion, id_categoria_cliente, id_fuente_contacto,
          id_cuenta_preferida, rut, email, correo, id_tipo_cliente, id_comuna,
          fecha_inicio_cliente, id_frecuencia_compra, gasto_promedio_por_compra,
          ticket_promedio_total, preferencia_mix_berries, preferencia_pulpas, id_tipo_consumo,
          preferencia_envase, intereses_promociones, preferencia_alimentaria, epoca_compra_preferida,
          recibio_seguimiento_postventa, participo_promociones, tiene_deudas_pendientes,
          suscrito_newsletter, dejo_resenas, nivel_satisfaccion, segmento_vip,
          coordenadas_geograficas, fecha_cumpleanos, id_clasificacion_cliente, etiquetas_comportamiento
        ]
      );    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating client:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /clients/:id - Actualizar un cliente
router.put('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { 
    nombre, telefono, id_ciudad, direccion, id_categoria_cliente, id_fuente_contacto, 
    id_cuenta_preferida, rut, email, correo, id_tipo_cliente, id_comuna, 
    fecha_inicio_cliente, id_frecuencia_compra, gasto_promedio_por_compra, 
    ticket_promedio_total, preferencia_mix_berries, preferencia_pulpas, id_tipo_consumo, 
    preferencia_envase, intereses_promociones, preferencia_alimentaria, epoca_compra_preferida, 
    recibio_seguimiento_postventa, participo_promociones, tiene_deudas_pendientes, 
    suscrito_newsletter, dejo_resenas, nivel_satisfaccion, segmento_vip, 
    coordenadas_geograficas, fecha_cumpleanos, id_clasificacion_cliente, etiquetas_comportamiento 
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE Clientes SET 
        nombre = $1, telefono = $2, id_ciudad = $3, direccion = $4, id_categoria_cliente = $5, 
        id_fuente_contacto = $6, id_cuenta_preferida = $7, rut = $8, email = $9, correo = $10, 
        id_tipo_cliente = $11, id_comuna = $12, fecha_inicio_cliente = $13, 
        id_frecuencia_compra = $14, gasto_promedio_por_compra = $15, ticket_promedio_total = $16, 
        preferencia_mix_berries = $17, preferencia_pulpas = $18, id_tipo_consumo = $19, 
        preferencia_envase = $20, intereses_promociones = $21, preferencia_alimentaria = $22, 
        epoca_compra_preferida = $23, recibio_seguimiento_postventa = $24, participo_promociones = $25, 
        tiene_deudas_pendientes = $26, suscrito_newsletter = $27, dejo_resenas = $28, 
        nivel_satisfaccion = $29, segmento_vip = $30, coordenadas_geograficas = $31, 
        fecha_cumpleanos = $32, id_clasificacion_cliente = $33, etiquetas_comportamiento = $34 
      WHERE id_cliente = $35 RETURNING *`,
      [
        nombre, telefono, id_ciudad, direccion, id_categoria_cliente, id_fuente_contacto,
        id_cuenta_preferida, rut, email, correo, id_tipo_cliente, id_comuna,
        fecha_inicio_cliente, id_frecuencia_compra, gasto_promedio_por_compra,
        ticket_promedio_total, preferencia_mix_berries, preferencia_pulpas, id_tipo_consumo,
        preferencia_envase, intereses_promociones, preferencia_alimentaria, epoca_compra_preferida,
        recibio_seguimiento_postventa, participo_promociones, tiene_deudas_pendientes,
        suscrito_newsletter, dejo_resenas, nivel_satisfaccion, segmento_vip,
        coordenadas_geograficas, fecha_cumpleanos, id_clasificacion_cliente, etiquetas_comportamiento,
        id
      ]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json({ message: 'Client updated successfully', client: result.rows[0] });
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /clients/:id - Eliminar un cliente
router.delete('/:id', verifyToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Clientes WHERE id_cliente = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json({ message: 'Client deleted successfully', client: result.rows[0] });
  } catch (err) {
    console.error('Error deleting client:', err);
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this client because it is referenced by other records (e.g., orders, sales).', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
