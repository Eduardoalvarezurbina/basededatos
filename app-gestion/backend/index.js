const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { verifyToken } = require('./routes/authMiddleware');

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

const app = express();
const port = 3001;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors());
app.use(express.json());

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(`SELECT * FROM Usuarios WHERE username = $1`, [username]);
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



// app.use(verifyToken);

app.use('/products', verifyToken, productsRouter);
app.use('/ubicaciones', verifyToken, ubicacionesRouter);
app.use('/tipos-cliente', verifyToken, tiposClienteRouter);
app.use('/inventario', verifyToken, inventarioRouter);
app.use('/ciudades', verifyToken, ciudadesRouter);
app.use('/tipos-pago', verifyToken, tiposPagoRouter);
app.use('/fuentes-contacto', verifyToken, fuentesContactoRouter);
app.use('/puntos-venta', verifyToken, puntosVentaRouter);
app.use('/trabajadores', verifyToken, trabajadoresRouter);
app.use('/regiones', verifyToken, regionesRouter);
app.use('/comunas', verifyToken, comunasRouter);
app.use('/categorias-cliente', verifyToken, categoriasClienteRouter);
app.use('/clasificaciones-cliente', verifyToken, clasificacionesClienteRouter);
app.use('/frecuencias-compra', verifyToken, frecuenciasCompraRouter);
app.use('/tipos-consumo', verifyToken, tiposConsumoRouter);
app.use('/cuentas-bancarias', verifyToken, cuentasBancariasRouter);
app.use('/clients', verifyToken, clientsRouter);
app.use('/proveedores', verifyToken, proveedoresRouter);
app.use('/compras', verifyToken, comprasRouter);
app.use('/movimientos-inventario', verifyToken, movimientosInventarioRouter);
app.use('/ventas', verifyToken, ventasRouter);
app.use('/pedidos', verifyToken, pedidosRouter);
app.use('/lotes', verifyToken, lotesRouter);
app.use('/produccion', verifyToken, produccionRouter);
app.use('/reclamos', verifyToken, reclamosRouter);
app.use('/formatos-producto', verifyToken, formatosProductoRouter);
app.use('/procesos', verifyToken, procesosRouter);
app.use('/caja', verifyToken, cajaRouter);
app.use('/compras', comprasRouter);




























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
