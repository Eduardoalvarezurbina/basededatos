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

// Endpoint para abrir la caja
router.post('/abrir', verifyToken, authorizeRole(['admin', 'cajero']), async (req, res) => {
  const { monto_inicial } = req.body;
  const fecha = new Date().toISOString().slice(0, 10); // Fecha actual en formato YYYY-MM-DD
  const hora = new Date().toLocaleTimeString('it-IT'); // Hora actual en formato HH:MM:SS

  if (monto_inicial === undefined || monto_inicial < 0) {
    return res.status(400).json({ message: 'El monto inicial es requerido y debe ser un número positivo.' });
  }

  try {
    // Verificar si ya hay una caja abierta para hoy
    const cajaAbierta = await pool.query('SELECT * FROM Caja WHERE fecha = $1 AND monto_final IS NULL', [fecha]);
    if (cajaAbierta.rows.length > 0) {
      return res.status(409).json({ message: 'Ya existe una caja abierta para la fecha de hoy.' });
    }

    const result = await pool.query(
      'INSERT INTO Caja (fecha, monto_inicial, hora) VALUES ($1, $2, $3) RETURNING *',
      [fecha, monto_inicial, hora]
    );
    res.status(201).json({ message: 'Caja abierta exitosamente.', caja: result.rows[0] });
  } catch (err) {
    console.error('Error al abrir la caja:', err);
    res.status(500).json({ message: 'Error interno del servidor', error: err.message });
  }
});

// Endpoint para cerrar la caja
router.post('/cerrar', verifyToken, authorizeRole(['admin', 'cajero']), async (req, res) => {
  const fecha = new Date().toISOString().slice(0, 10);

  try {
    // Encontrar la caja abierta de hoy
    const cajaAbiertaResult = await pool.query('SELECT * FROM Caja WHERE fecha = $1 AND monto_final IS NULL', [fecha]);
    if (cajaAbiertaResult.rows.length === 0) {
      return res.status(404).json({ message: 'No hay una caja abierta para cerrar hoy.' });
    }
    const cajaAbierta = cajaAbiertaResult.rows[0];
    const montoInicial = parseFloat(cajaAbierta.monto_inicial);
    const horaApertura = cajaAbierta.hora;

    // Calcular el total de ventas en efectivo desde que se abrió la caja
    // Asumimos que id_tipo_pago = 1 es 'Efectivo'
    const ventasEfectivoResult = await pool.query(
      'SELECT SUM(total_bruto_venta) as total_efectivo FROM Ventas WHERE fecha = $1 AND id_tipo_pago = 1 AND hora >= $2',
      [fecha, horaApertura]
    );
    const totalEfectivo = parseFloat(ventasEfectivoResult.rows[0].total_efectivo || 0);

    const montoFinal = montoInicial + totalEfectivo;

    // Actualizar la caja con el monto final
    const result = await pool.query(
      'UPDATE Caja SET monto_final = $1 WHERE id_caja = $2 RETURNING *',
      [montoFinal, cajaAbierta.id_caja]
    );

    res.json({ message: 'Caja cerrada exitosamente.', caja: result.rows[0] });
  } catch (err) {
    console.error('Error al cerrar la caja:', err);
    res.status(500).json({ message: 'Error interno del servidor', error: err.message });
  }
});

// Endpoint para obtener el estado de la caja
router.get('/estado', verifyToken, async (req, res) => {
    const fecha = new Date().toISOString().slice(0, 10);
    try {
        const result = await pool.query('SELECT * FROM Caja WHERE fecha = $1 ORDER BY id_caja DESC LIMIT 1', [fecha]);
        if (result.rows.length === 0) {
            return res.json({ estado: 'cerrada', message: 'No se ha abierto caja hoy.' });
        }

        const caja = result.rows[0];
        if (caja.monto_final === null) {
            res.json({ estado: 'abierta', caja });
        } else {
            res.json({ estado: 'cerrada', caja });
        }
    } catch (err) {
        console.error('Error al obtener el estado de la caja:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Endpoint para obtener el historial de cierres de caja
router.get('/historial', verifyToken, authorizeRole(['admin']), async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM Caja WHERE monto_final IS NOT NULL ORDER BY fecha DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener el historial de caja:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});


module.exports = router;
