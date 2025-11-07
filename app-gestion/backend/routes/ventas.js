const express = require('express');
const createVentaController = require('../controllers/ventaController');

function createVentaRoutes(pool) {
  const router = express.Router();
  const controller = createVentaController(pool);

  router.get('/', controller.getAllVentas);
  router.post('/', controller.createVenta);
  router.get('/:id', controller.getVentaById);
  router.put('/:id', controller.updateVenta);
  router.delete('/:id', controller.deleteVenta);

  return router;
}

module.exports = createVentaRoutes;
