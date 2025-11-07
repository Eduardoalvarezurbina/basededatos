const express = require('express');
const createProductController = require('../controllers/productController');

// Esta función crea y configura el enrutador para los productos.
// Recibe la conexión a la base de datos (pool) y la pasa al controlador.
function createProductRoutes(pool) {
  const router = express.Router();
  const controller = createProductController(pool);

  router.get('/', controller.getAllProducts);
  router.post('/', controller.createProduct);
  router.get('/active', controller.getActiveProducts); // Es mejor poner esta ruta antes de la de /:id
  router.get('/:id', (req, res) => { 
    // TODO: Implementar getProductById en el controlador
    res.status(501).json({ message: 'Not Implemented' });
  });
  router.put('/:id', controller.updateProduct);
  router.delete('/:id', controller.deleteProduct);

  return router;
}

module.exports = createProductRoutes;