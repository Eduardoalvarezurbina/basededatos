require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const createProductRoutes = require('./routes/products');
const createAuthRoutes = require('./routes/auth');
const createLookupRoutes = require('./routes/lookups');
const createClientRoutes = require('./routes/clients');
const createCajaRoutes = require('./routes/caja');
const createProductFormatRoutes = require('./modules/formatosProducto/formatosProducto');
const createLotRoutes = require('./modules/lotes/lotes');
const createProcessRoutes = require('./modules/procesos/procesos');
const createProduccionRoutes = require('./routes/produccion');
const createPedidoRoutes = require('./routes/pedidos');
const createCompraRoutes = require('./routes/compras');
const createVentaRoutes = require('./routes/ventas');
const { verifyToken, authorizeRole } = require('./routes/authMiddleware');

module.exports = (externalPool = null) => { // Accept an optional externalPool
  const app = express();

  // --- Middlewares ---
  app.use(cors());
  app.use(bodyParser.json());

  // --- Configuración de la Base de Datos ---
  const pool = externalPool || new Pool({ // Use externalPool if provided, otherwise create a new one
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  // --- Rutas de la API ---
  app.use('/api/products', createProductRoutes(pool));
  app.use('/api/auth', createAuthRoutes(pool));
  app.use('/api/lookups', createLookupRoutes(pool));
  app.use('/api/clients', createClientRoutes(pool));
  app.use('/api/product-formats', createProductFormatRoutes(pool, verifyToken, authorizeRole));
  app.use('/api/lots', createLotRoutes(pool, verifyToken, authorizeRole));
  app.use('/api/processes', createProcessRoutes(pool, verifyToken, authorizeRole));
  app.use('/api/compras', createCompraRoutes(pool, verifyToken, authorizeRole));
  app.use('/api/ventas', createVentaRoutes(pool, verifyToken, authorizeRole));
  // app.use('/api/produccion', createProduccionRoutes(pool));
  // app.use('/api/reclamos', createReclamoRoutes(pool));
  app.use('/api/pedidos', createPedidoRoutes(pool));
  app.use('/api/caja', createCajaRoutes(pool));

  return { app, pool }; // Return app and the pool (either external or newly created)
};