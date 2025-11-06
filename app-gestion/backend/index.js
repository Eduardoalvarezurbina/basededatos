const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const productsRouter = require('./modules/products/products');
const ubicacionesRouter = require('./modules/ubicaciones/ubicaciones');
const tiposClienteRouter = require('./modules/tiposCliente/tiposCliente');
const inventarioRouter = require('./modules/inventario/inventario');
const ciudadesRouter = require('./modules/ciudades/ciudades');
const tiposPagoRouter = require('./modules/tiposPago/tiposPago');
const fuentesContactoRouter = require('./modules/fuentesContacto/fuentesContacto');
const puntosVentaRouter = require('./modules/puntosVenta/puntosVenta');
const trabajadoresRouter = require('./modules/trabajadores/trabajadores');
const regionesRouter = require('./modules/regiones/regiones');
const comunasRouter = require('./modules/comunas/comunas');
const categoriasClienteRouter = require('./modules/categoriasCliente/categoriasCliente');
const clasificacionesClienteRouter = require('./modules/clasificacionesCliente/clasificacionesCliente');
const frecuenciasCompraRouter = require('./modules/frecuenciasCompra/frecuenciasCompra');
const tiposConsumoRouter = require('./modules/tiposConsumo/tiposConsumo');
const cuentasBancariasRouter = require('./modules/cuentasBancarias/cuentasBancarias');
const clientsRouter = require('./modules/clients/clients');
const proveedoresRouter = require('./modules/proveedores/proveedores');
const comprasRouter = require('./modules/compras/compras');
const movimientosInventarioRouter = require('./modules/movimientosInventario/movimientosInventario');
const ventasRouter = require('./modules/ventas/ventas');
const pedidosRouter = require('./modules/pedidos/pedidos');
const lotesRouter = require('./modules/lotes/lotes');
const produccionRouter = require('./modules/produccion/produccion');
const reclamosRouter = require('./modules/reclamos/reclamos');
const formatosProductoRouter = require('./modules/formatosProducto/formatosProducto');
const procesosRouter = require('./modules/procesos/procesos');
const cajaRouter = require('./modules/caja/caja');
const { verifyToken } = require('./routes/authMiddleware');

const app = express();
const port = 3001;

// DB Connection
// Lee la configuración de la base de datos desde variables de entorno para que sea compatible con Docker.
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});

app.use(cors());
app.use(express.json());

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query('SELECT * FROM Usuarios WHERE username = $1', [username]);
  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id_usuario, role: user.role }, 'your_jwt_secret', { expiresIn: '1h' });

  res.json({ message: 'Login successful', token, role: user.role, id_usuario: user.id_usuario });
});



app.use('/products', productsRouter);
app.use('/ubicaciones', ubicacionesRouter);
app.use('/tipos-cliente', tiposClienteRouter);
app.use('/inventario', inventarioRouter);
app.use('/ciudades', ciudadesRouter);
app.use('/tipos-pago', tiposPagoRouter);
app.use('/fuentes-contacto', fuentesContactoRouter);
app.use('/puntos-venta', puntosVentaRouter);
app.use('/trabajadores', trabajadoresRouter);
app.use('/regiones', regionesRouter);
app.use('/comunas', comunasRouter);
app.use('/categorias-cliente', categoriasClienteRouter);
app.use('/clasificaciones-cliente', clasificacionesClienteRouter);
app.use('/frecuencias-compra', frecuenciasCompraRouter);
app.use('/tipos-consumo', tiposConsumoRouter);
app.use('/cuentas-bancarias', cuentasBancariasRouter);
app.use('/clients', clientsRouter);
app.use('/proveedores', proveedoresRouter);
app.use('/compras', comprasRouter);
app.use('/movimientos-inventario', movimientosInventarioRouter);
app.use('/ventas', ventasRouter);
app.use('/pedidos', pedidosRouter);
app.use('/lotes', lotesRouter);
app.use('/produccion', produccionRouter);
app.use('/reclamos', reclamosRouter);
app.use('/formatos-producto', formatosProductoRouter);
app.use('/procesos', procesosRouter);
app.use('/caja', cajaRouter);




























const startServer = () => {
  const server = app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
  });
  return { app, server };
};

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
  });
}

module.exports = { app, pool };
