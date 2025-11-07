require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const createProductRoutes = require('./routes/products');
const createAuthRoutes = require('./routes/auth');
const createLookupRoutes = require('./routes/lookups');
const createClientRoutes = require('./routes/clients');
const createProductFormatRoutes = require('./routes/productFormats');
const createLotRoutes = require('./routes/lots');
const createProcessRoutes = require('./routes/processes');
const createProduccionRoutes = require('./routes/produccion');
const createReclamoRoutes = require('./routes/reclamos');

const app = express();

// --- Middlewares ---
app.use(cors());
app.use(bodyParser.json());

// --- Configuración de la Base de Datos ---
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// --- Rutas de la API ---
app.use('/api/products', createProductRoutes(pool));
app.use('/api/auth', createAuthRoutes(pool));
app.use('/api/lookups', createLookupRoutes(pool));
app.use('/api/clients', createClientRoutes(pool));
app.use('/api/product-formats', createProductFormatRoutes(pool));
app.use('/api/lots', createLotRoutes(pool));
app.use('/api/processes', createProcessRoutes(pool));
app.use('/api/produccion', createProduccionRoutes(pool));
app.use('/api/reclamos', createReclamoRoutes(pool));

// TODO: Migrar las rutas restantes de index.js (login, ventas, etc.)

// Exportar la app para poder usarla en las pruebas y en server.js
module.exports = { app, pool }; // Exportar pool también puede ser útil