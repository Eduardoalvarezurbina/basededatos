const express = require('express');
const createCajaController = require('../controllers/cajaController');

function createCajaRoutes(pool) {
  const router = express.Router();
  const controller = createCajaController(pool);

  router.post('/abrir', controller.abrirCaja);
  router.post('/cerrar', controller.cerrarCaja);
  router.get('/estado', controller.getEstadoCaja);
  router.get('/historial', controller.getHistorialCaja);

  return router;
}

module.exports = createCajaRoutes;
