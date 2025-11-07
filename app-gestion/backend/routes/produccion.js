const express = require('express');
const createProduccionController = require('../controllers/produccionController');

function createProduccionRoutes(pool) {
  const router = express.Router();
  const controller = createProduccionController(pool);

  router.get('/', controller.getAllProduccion);
  router.get('/:id', controller.getProduccionById);
  router.post('/', controller.createProduccion);
  router.put('/:id', controller.updateProduccion);
  router.delete('/:id', controller.deleteProduccion);

  return router;
}

module.exports = createProduccionRoutes;
