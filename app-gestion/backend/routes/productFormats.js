const express = require('express');
const createProductFormatController = require('../controllers/productFormatController');

function createProductFormatRoutes(pool) {
  const router = express.Router();
  const controller = createProductFormatController(pool);

  router.put('/:id', controller.updateProductFormat);
  router.get('/historial-precios/:id_formato_producto', controller.getPriceHistory);

  return router;
}

module.exports = createProductFormatRoutes;
