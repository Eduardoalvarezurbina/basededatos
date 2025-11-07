const createCajaController = (pool) => {

  const abrirCaja = async (req, res) => {
    const { monto_inicial } = req.body;
    const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verificar si ya hay una caja abierta para hoy
      const cajaAbiertaResult = await client.query(
        "SELECT * FROM Caja WHERE fecha_apertura = $1 AND estado = 'abierta'",
        [fecha]
      );

      if (cajaAbiertaResult.rowCount > 0) {
        throw new Error('Ya existe una caja abierta para la fecha de hoy.');
      }

      // Insertar la nueva caja
      const result = await client.query(
        'INSERT INTO Caja (fecha_apertura, hora_apertura, monto_inicial, estado) VALUES ($1, CURRENT_TIME, $2, \'abierta\') RETURNING *',
        [fecha, monto_inicial]
      );

      await client.query('COMMIT');
      res.status(201).json({ message: 'Caja abierta con éxito.', caja: result.rows[0] });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error al abrir la caja:', err);
      if (err.message.includes('Ya existe una caja abierta')) {
        return res.status(409).json({ message: err.message });
      }
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };

  const cerrarCaja = async (req, res) => {
    const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Encontrar la caja abierta de hoy
      const cajaResult = await client.query(
        "SELECT * FROM Caja WHERE fecha_apertura = $1 AND estado = 'abierta' FOR UPDATE",
        [fecha]
      );

      if (cajaResult.rowCount === 0) {
        throw new Error('No hay una caja abierta para cerrar hoy.');
      }
      const caja = cajaResult.rows[0];

      // 2. Calcular el total de ventas en efectivo desde la apertura de la caja
      const ventasResult = await client.query(
        `SELECT COALESCE(SUM(total_bruto_venta), 0) as total_efectivo 
         FROM Ventas 
         WHERE fecha = $1 AND hora >= $2 AND id_tipo_pago = 1`, // Asumiendo que 1 es 'Efectivo'
        [caja.fecha_apertura, caja.hora_apertura]
      );
      const totalVentasEfectivo = parseFloat(ventasResult.rows[0].total_efectivo);

      // 3. Calcular el monto final y actualizar la caja
      const montoFinal = parseFloat(caja.monto_inicial) + totalVentasEfectivo;
      const updateResult = await client.query(
        "UPDATE Caja SET fecha_cierre = $1, hora_cierre = CURRENT_TIME, monto_final = $2, estado = 'cerrada' WHERE id_caja = $3 RETURNING *",
        [fecha, montoFinal, caja.id_caja]
      );

      await client.query('COMMIT');
      res.status(200).json({ message: 'Caja cerrada con éxito.', caja: updateResult.rows[0] });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error al cerrar la caja:', err);
      if (err.message.includes('No hay una caja abierta')) {
        return res.status(404).json({ message: err.message });
      }
      res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
      client.release();
    }
  };

  const getEstadoCaja = async (req, res) => {
    const fecha = new Date().toISOString().slice(0, 10);
    try {
      const result = await pool.query(
        "SELECT * FROM Caja WHERE fecha_apertura = $1 AND estado = 'abierta' ORDER BY hora_apertura DESC LIMIT 1",
        [fecha]
      );

      if (result.rowCount > 0) {
        res.json({ estado: 'abierta', caja: result.rows[0] });
      } else {
        res.json({ estado: 'cerrada' });
      }
    } catch (err) {
      console.error('Error al obtener estado de la caja:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const getHistorialCaja = async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM Caja WHERE estado = 'cerrada' ORDER BY fecha_cierre DESC, hora_cierre DESC"
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Error al obtener historial de caja:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  return {
    abrirCaja,
    cerrarCaja,
    getEstadoCaja,
    getHistorialCaja,
  };
};

module.exports = createCajaController;
