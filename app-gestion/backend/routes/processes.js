const express = require('express');
const createProcessController = require('../controllers/processController');

function createProcessRoutes(pool) {
  const router = express.Router();
  const controller = createProcessController(pool);

  router.get('/', controller.getAllProcesses);
  router.post('/', controller.createProcess);
  router.put('/:id', controller.updateProcess);
  router.delete('/:id', controller.deleteProcess);

  return router;
}

module.exports = createProcessRoutes;
