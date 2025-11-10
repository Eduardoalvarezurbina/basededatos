const createLookupController = (pool) => {

  const getUbicaciones = async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM Ubicaciones_Inventario ORDER BY nombre');
      res.json(result.rows);
    } catch (err) {
      // console.error('Error getting locations:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const getFormatosProducto = async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT fp.id_formato_producto, fp.formato, fp.precio_detalle_neto, fp.precio_mayorista_neto, p.nombre as nombre_producto
        FROM Formatos_Producto fp
        JOIN Productos p ON fp.id_producto = p.id_producto
        WHERE p.activo = TRUE
        ORDER BY p.nombre, fp.formato
      `);
      res.json(result.rows);
    } catch (err) {
      console.error('Error getting product formats:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const getCanalesCompra = async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM Canales_Compra ORDER BY nombre_canal');
      res.json(result.rows);
    } catch (err) {
      console.error('Error getting purchase channels:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const getFuentesContacto = async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM Fuentes_Contacto ORDER BY nombre_fuente');
      res.json(result.rows);
    } catch (err) {
      console.error('Error getting contact sources:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const getTiposCliente = async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM Tipos_Cliente ORDER BY nombre_tipo');
      res.json(result.rows);
    } catch (err) {
      console.error('Error getting client types:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  return {
    getUbicaciones,
    getFormatosProducto,
    getCanalesCompra,
    getFuentesContacto,
    getTiposCliente,
  };
};

module.exports = createLookupController;