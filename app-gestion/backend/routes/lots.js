const express = require('express');
const createLotController = require('../controllers/lotController');

function createLotRoutes(pool) {
  const router = express.Router();
  const controller = createLotController(pool);

  router.get('/', controller.getAllLots);
  router.post('/', controller.createLot);
  router.get('/:id', controller.getLotById);
  router.put('/:id', controller.updateLot);
  router.delete('/:id', controller.deleteLot);

  return router;
}

module.exports = createLotRoutes;
