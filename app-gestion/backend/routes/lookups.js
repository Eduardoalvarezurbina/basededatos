const express = require('express');
const createLookupController = require('../controllers/lookupController');

function createLookupRoutes(pool) {
  const router = express.Router();
  const controller = createLookupController(pool);

  router.get('/ubicaciones', controller.getUbicaciones);
  router.get('/formatos-producto', controller.getFormatosProducto);
  router.get('/canales-compra', controller.getCanalesCompra);
  router.get('/fuentes-contacto', controller.getFuentesContacto);
  router.get('/tipos-cliente', controller.getTiposCliente);

  return router;
}

module.exports = createLookupRoutes;
