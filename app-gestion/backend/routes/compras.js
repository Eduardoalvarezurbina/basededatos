const express = require('express');
const createCompraController = require('../controllers/compraController');

function createCompraRoutes(pool, verifyToken, authorizeRole) {
  const router = express.Router();
  const controller = createCompraController(pool);

  // Apply middleware to all routes in this file
  router.use(verifyToken);
  router.use(authorizeRole(['admin', 'worker']));

  router.post('/', controller.createCompra);
  router.get('/', controller.getAllCompras);
  router.get('/:id', controller.getCompraById);
  router.put('/:id', controller.updateCompra);
  router.delete('/:id', controller.deleteCompra);

  return router;
}

module.exports = createCompraRoutes;