const express = require('express');
const createPedidoController = require('../controllers/pedidoController');

function createPedidoRoutes(pool, verifyToken, authorizeRole) {
  const router = express.Router();
  const controller = createPedidoController(pool);

  // Apply middleware to all routes in this file
  router.use(verifyToken);
  router.use(authorizeRole(['admin', 'worker']));

            router.post('/', controller.createPedido);
            router.get('/', controller.getAllPedidos);
                      router.get('/:id', controller.getPedidoById);
                      router.put('/:id', controller.updatePedido);
                      router.delete('/:id', controller.deletePedido);
            
                      return router;
                    }module.exports = createPedidoRoutes;
