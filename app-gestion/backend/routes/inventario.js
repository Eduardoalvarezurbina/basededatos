const express = require('express');
const createInventarioController = require('../controllers/inventarioController');

function createInventarioRoutes(pool, verifyToken, authorizeRole) {
  const router = express.Router();
  const controller = createInventarioController(pool);

  // Apply middleware to all routes in this file
  router.use(verifyToken);
  router.use(authorizeRole(['admin', 'worker']));

  router.post('/transferir', controller.transferirInventario);

  return router;
}

module.exports = createInventarioRoutes;