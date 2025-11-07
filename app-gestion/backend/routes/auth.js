const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const createAuthController = require('../controllers/authController');

function createAuthRoutes(pool) {
  const router = express.Router();
  // Pasamos las dependencias necesarias al controlador
  const controller = createAuthController(pool, bcrypt, jwt);

  router.post('/login', controller.login);

  return router;
}

module.exports = createAuthRoutes;
