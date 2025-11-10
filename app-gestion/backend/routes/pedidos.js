const express = require('express');
const createPedidoController = require('../controllers/pedidoController');

function createPedidoRoutes(pool) {
  const router = express.Router();
  const controller = createPedidoController(pool);

  // Definiremos las rutas aquí

  return router;
}

module.exports = createPedidoRoutes;
