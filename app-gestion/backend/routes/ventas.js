const express = require('express');
const createVentaController = require('../controllers/ventaController');

function createVentaRoutes(pool, verifyToken, authorizeRole) {
  const router = express.Router();
  const controller = createVentaController(pool);

  // Apply middleware to all routes in this file
  router.use(verifyToken);
  router.use(authorizeRole(['admin', 'worker']));

  router.post('/', controller.createVenta);
  router.get('/', controller.getAllVentas);
  router.get('/:id', controller.getVentaById);
  router.put('/:id', controller.updateVenta);
  router.delete('/:id', controller.deleteVenta);

  return router;
}

module.exports = createVentaRoutes;