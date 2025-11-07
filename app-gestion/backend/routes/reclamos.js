const express = require('express');
const createReclamoController = require('../controllers/reclamoController');

function createReclamoRoutes(pool) {
  const router = express.Router();
  const controller = createReclamoController(pool);

  router.get('/', controller.getAllReclamos);
  router.post('/', controller.createReclamo);
  router.get('/:id', controller.getReclamoById);
  router.put('/:id', controller.updateReclamo);
  router.delete('/:id', controller.deleteReclamo);

  return router;
}

module.exports = createReclamoRoutes;
