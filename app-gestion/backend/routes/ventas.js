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
  // Other routes (PUT, DELETE) will go here

  return router;
}

module.exports = createVentaRoutes;