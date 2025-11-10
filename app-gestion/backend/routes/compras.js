const express = require('express');
const createCompraController = require('../controllers/compraController');

function createCompraRoutes(pool, verifyToken, authorizeRole) {
  const router = express.Router();
  const controller = createCompraController(pool);

  // Apply middleware to all routes in this file
  router.use(verifyToken);
  router.use(authorizeRole(['admin', 'worker']));

  router.post('/', controller.createCompra);
  // Other routes (GET, PUT, DELETE) will go here

  return router;
}

module.exports = createCompraRoutes;