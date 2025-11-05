const { body, param, validationResult } = require('express-validator');

const validateCompra = [
  body('id_proveedor').exists().withMessage('id_proveedor es requerido.'),
  body('id_tipo_pago').exists().withMessage('id_tipo_pago es requerido.'),
  body('id_cuenta_origen').exists().withMessage('id_cuenta_origen es requerido.'),
  body('neto').exists().withMessage('neto es requerido.').isNumeric().withMessage('neto debe ser un número.'),
  body('iva').exists().withMessage('iva es requerido.').isNumeric().withMessage('iva debe ser un número.'),
  body('total').exists().withMessage('total es requerido.').isNumeric().withMessage('total debe ser un número.'),
  body('con_factura').exists().withMessage('con_factura es requerido.').isBoolean().withMessage('con_factura debe ser un booleano.'),
  body('con_iva').exists().withMessage('con_iva es requerido.').isBoolean().withMessage('con_iva debe ser un booleano.'),
  body('detalles').exists().withMessage('detalles de compra deben ser un array.').isArray({ min: 1 }).withMessage('detalles de compra no pueden estar vacíos.'),
  body('detalles.*.id_formato_producto').exists().withMessage('id_formato_producto es requerido en detalles.'),
  body('detalles.*.cantidad').exists().withMessage('cantidad es requerida en detalles.').isNumeric().withMessage('cantidad debe ser un número.'),
  body('detalles.*.precio_unitario').exists().withMessage('precio_unitario es requerido en detalles.').isNumeric().withMessage('precio_unitario debe ser un número.'),
  body('detalles.*.id_ubicacion').exists().withMessage('id_ubicacion es requerido en detalles.'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateUpdateCompra = [
  param('id').isInt().withMessage('El ID de la compra debe ser un entero.'),
  body('id_proveedor').optional().isInt().withMessage('El ID del proveedor debe ser un entero.'),
  body('id_tipo_pago').optional().isInt().withMessage('El ID del tipo de pago debe ser un entero.'),
  body('id_cuenta_origen').optional().isInt().withMessage('El ID de la cuenta de origen debe ser un entero.'),
  body('neto').optional().isNumeric().withMessage('neto debe ser un número.'),
  body('iva').optional().isNumeric().withMessage('iva debe ser un número.'),
  body('total').optional().isNumeric().withMessage('total debe ser un número.'),
  body('con_factura').optional().isBoolean().withMessage('con_factura debe ser un booleano.'),
  body('con_iva').optional().isBoolean().withMessage('con_iva debe ser un booleano.'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = { validateCompra, validateUpdateCompra };