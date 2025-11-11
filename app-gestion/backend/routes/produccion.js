const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRole } = require('./authMiddleware');

module.exports = (produccionController) => {
  router.post('/iniciar', verifyToken, authorizeRole(['admin', 'worker']), produccionController.iniciarProduccion);
  router.post('/transformar', verifyToken, authorizeRole(['admin', 'worker']), produccionController.transformarProducto); // New route
  // Other routes (GET, PUT, DELETE) will go here
  return router;
};