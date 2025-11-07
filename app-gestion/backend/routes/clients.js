const express = require('express');
const createClientController = require('../controllers/clientController');

function createClientRoutes(pool) {
  const router = express.Router();
  const controller = createClientController(pool);

  router.get('/', controller.getAllClients);
  router.get('/buscar', controller.searchClients);
  router.post('/', controller.createClient);
  router.put('/:id', controller.updateClient);
  router.delete('/:id', controller.deleteClient);

  return router;
}

module.exports = createClientRoutes;
