const createClientController = (pool) => {

  const getAllClients = async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          c.*,
          tc.nombre_tipo as nombre_tipo_cliente,
          fc.nombre_fuente as nombre_fuente_contacto
        FROM Clientes c
        LEFT JOIN Tipos_Cliente tc ON c.id_tipo_cliente = tc.id_tipo_cliente
        LEFT JOIN Fuentes_Contacto fc ON c.id_fuente_contacto = fc.id_fuente_contacto
        ORDER BY c.id_cliente
      `);
      res.json(result.rows);
    } catch (err) {
      // console.error('Error getting clients:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const searchClients = async (req, res) => {
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
  };

  const createClient = async (req, res) => {
    const { nombre, telefono, id_ciudad, direccion, id_categoria_cliente, id_fuente_contacto, id_cuenta_preferida, rut, email, fecha_ultima_compra, correo, id_tipo_cliente, id_comuna, fecha_inicio_cliente, id_frecuencia_compra, gasto_promedio_por_compra, ticket_promedio_total, preferencia_mix_berries, preferencia_pulpas, id_tipo_consumo, preferencia_envase, intereses_promociones, preferencia_alimentaria, epoca_compra_preferida, recibio_seguimiento_postventa, participo_promociones, tiene_deudas_pendientes, suscrito_newsletter, dejo_resenas, nivel_satisfaccion, segmento_vip, coordenadas_geograficas, fecha_cumpleanos, id_clasificacion_cliente, etiquetas_comportamiento } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO Clientes (nombre, telefono, id_ciudad, direccion, id_categoria_cliente, id_fuente_contacto, id_cuenta_preferida, rut, email, fecha_ultima_compra, correo, id_tipo_cliente, id_comuna, fecha_inicio_cliente, id_frecuencia_compra, gasto_promedio_por_compra, ticket_promedio_total, preferencia_mix_berries, preferencia_pulpas, id_tipo_consumo, preferencia_envase, intereses_promociones, preferencia_alimentaria, epoca_compra_preferida, recibio_seguimiento_postventa, participo_promociones, tiene_deudas_pendientes, suscrito_newsletter, dejo_resenas, nivel_satisfaccion, segmento_vip, coordenadas_geograficas, fecha_cumpleanos, id_clasificacion_cliente, etiquetas_comportamiento) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35) RETURNING *',
        [nombre, telefono, id_ciudad, direccion, id_categoria_cliente, id_fuente_contacto, id_cuenta_preferida, rut, email, fecha_ultima_compra, correo, id_tipo_cliente, id_comuna, fecha_inicio_cliente, id_frecuencia_compra, gasto_promedio_por_compra, ticket_promedio_total, preferencia_mix_berries, preferencia_pulpas, id_tipo_consumo, preferencia_envase, intereses_promociones, preferencia_alimentaria, epoca_compra_preferida, recibio_seguimiento_postventa, participo_promociones, tiene_deudas_pendientes, suscrito_newsletter, dejo_resenas, nivel_satisfaccion, segmento_vip, coordenadas_geograficas, fecha_cumpleanos, id_clasificacion_cliente, etiquetas_comportamiento]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const updateClient = async (req, res) => {
    const { id } = req.params;
    const { nombre, telefono, id_ciudad, direccion, id_categoria_cliente, id_fuente_contacto, id_cuenta_preferida, rut, email, fecha_ultima_compra, correo, id_tipo_cliente, id_comuna, fecha_inicio_cliente, id_frecuencia_compra, gasto_promedio_por_compra, ticket_promedio_total, preferencia_mix_berries, preferencia_pulpas, id_tipo_consumo, preferencia_envase, intereses_promociones, preferencia_alimentaria, epoca_compra_preferida, recibio_seguimiento_postventa, participo_promociones, tiene_deudas_pendientes, suscrito_newsletter, dejo_resenas, nivel_satisfaccion, segmento_vip, coordenadas_geograficas, fecha_cumpleanos, id_clasificacion_cliente, etiquetas_comportamiento } = req.body;
    try {
      const result = await pool.query(
        'UPDATE Clientes SET nombre = $1, telefono = $2, id_ciudad = $3, direccion = $4, id_categoria_cliente = $5, id_fuente_contacto = $6, id_cuenta_preferida = $7, rut = $8, email = $9, fecha_ultima_compra = $10, correo = $11, id_tipo_cliente = $12, id_comuna = $13, fecha_inicio_cliente = $14, id_frecuencia_compra = $15, gasto_promedio_por_compra = $16, ticket_promedio_total = $17, preferencia_mix_berries = $18, preferencia_pulpas = $19, id_tipo_consumo = $20, preferencia_envase = $21, intereses_promociones = $22, preferencia_alimentaria = $23, epoca_compra_preferida = $24, recibio_seguimiento_postventa = $25, participo_promociones = $26, tiene_deudas_pendientes = $27, suscrito_newsletter = $28, dejo_resenas = $29, nivel_satisfaccion = $30, segmento_vip = $31, coordenadas_geograficas = $32, fecha_cumpleanos = $33, id_clasificacion_cliente = $34, etiquetas_comportamiento = $35 WHERE id_cliente = $36 RETURNING *',
        [nombre, telefono, id_ciudad, direccion, id_categoria_cliente, id_fuente_contacto, id_cuenta_preferida, rut, email, fecha_ultima_compra, correo, id_tipo_cliente, id_comuna, fecha_inicio_cliente, id_frecuencia_compra, gasto_promedio_por_compra, ticket_promedio_total, preferencia_mix_berries, preferencia_pulpas, id_tipo_consumo, preferencia_envase, intereses_promociones, preferencia_alimentaria, epoca_compra_preferida, recibio_seguimiento_postventa, participo_promociones, tiene_deudas_pendientes, suscrito_newsletter, dejo_resenas, nivel_satisfaccion, segmento_vip, coordenadas_geograficas, fecha_cumpleanos, id_clasificacion_cliente, etiquetas_comportamiento, id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Client not found' });
      }
      res.json({ message: 'Client updated successfully', client: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const deleteClient = async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('DELETE FROM Clientes WHERE id_cliente = $1 RETURNING *', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Client not found' });
      }
      res.json({ message: 'Client deleted successfully', client: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  return {
    getAllClients,
    searchClients,
    createClient,
    updateClient,
    deleteClient,
  };
};

module.exports = createClientController;