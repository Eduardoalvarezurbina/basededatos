const express = require('express');
const createCompraController = require('../controllers/compraController');

function createCompraRoutes(pool) {
  const router = express.Router();
  const controller = createCompraController(pool);

  router.get('/', controller.getAllCompras);
  router.get('/:id', controller.getCompraById);
  router.post('/', controller.createCompra);
  router.put('/:id', controller.updateCompra);
  router.delete('/:id', controller.deleteCompra);

  return router;
}

module.exports = createCompraRoutes;
