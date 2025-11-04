const express = require('express');
const { Pool } = require('pg');

const router = express.Router();
const { authorizeRole } = require('./authMiddleware');

// DB Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});



async function updateInventory(client, detalles, factor) {
    for (const item of detalles) {
        const stockChange = item.cantidad * factor;
        const updateInventarioResult = await client.query(
            'UPDATE Inventario SET stock_actual = stock_actual + $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_formato_producto = $2 AND id_ubicacion = $3',
            [stockChange, item.id_formato_producto, item.id_ubicacion]
        );

        if (updateInventarioResult.rowCount === 0) {
            if (factor > 0) {
                await client.query(
                    'INSERT INTO Inventario (id_formato_producto, id_ubicacion, stock_actual, fecha_actualizacion) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
                    [item.id_formato_producto, item.id_ubicacion, stockChange]
                );
            } else {
                throw new Error(`No hay suficiente stock para el formato de producto ${item.id_formato_producto} en la ubicación ${item.id_ubicacion}.`);
            }
        }
    }
}

// GET /compras - Obtener todas las compras con sus detalles
router.get('/', async (req, res) => {
  try {
    // Esta consulta une Compras con sus detalles y el nombre del proveedor
    const result = await pool.query(`
      SELECT 
        c.id_compra, c.fecha, c.neto, c.iva, c.total, c.observacion, c.con_factura,
        p.nombre as nombre_proveedor,
        (SELECT json_agg(cd) FROM Detalle_Compras cd WHERE cd.id_compra = c.id_compra) as detalles
      FROM Compras c
      LEFT JOIN Proveedores p ON c.id_proveedor = p.id_proveedor
      ORDER BY c.fecha DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting purchases:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /compras/:id - Obtener una compra por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        c.id_compra, c.fecha, c.neto, c.iva, c.total, c.observacion, c.con_factura,
        p.nombre as nombre_proveedor,
        (SELECT json_agg(cd) FROM Detalle_Compras cd WHERE cd.id_compra = c.id_compra) as detalles
      FROM Compras c
      LEFT JOIN Proveedores p ON c.id_proveedor = p.id_proveedor
      WHERE c.id_compra = $1
    `, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting purchase by id:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /compras - Crear una nueva compra y actualizar inventario
router.post('/', authorizeRole(['admin']), async (req, res) => {
  const { id_proveedor, id_tipo_pago, id_cuenta_origen, neto, iva, total, observacion, con_factura, con_iva, detalles } = req.body;

  // Basic validation for required fields
  if (id_proveedor === undefined) {
    return res.status(400).json({ message: 'id_proveedor es requerido.' });
  }
  if (id_tipo_pago === undefined) {
    return res.status(400).json({ message: 'id_tipo_pago es requerido.' });
  }
  if (id_cuenta_origen === undefined) {
    return res.status(400).json({ message: 'id_cuenta_origen es requerido.' });
  }
  if (neto === undefined) {
    return res.status(400).json({ message: 'neto es requerido.' });
  }
  if (iva === undefined) {
    return res.status(400).json({ message: 'iva es requerido.' });
  }
  if (total === undefined) {
    return res.status(400).json({ message: 'total es requerido.' });
  }
  if (con_factura === undefined) {
    return res.status(400).json({ message: 'con_factura es requerido.' });
  }
  if (con_iva === undefined) {
    return res.status(400).json({ message: 'con_iva es requerido.' });
  }
  if (!Array.isArray(detalles)) {
    return res.status(400).json({ message: 'detalles de compra deben ser un array.' });
  }
  if (detalles.length === 0) {
    return res.status(400).json({ message: 'detalles de compra no pueden estar vacíos.' });
  }

  // Type validation
  if (typeof neto !== 'number' || typeof iva !== 'number' || typeof total !== 'number') {
    return res.status(400).json({ message: 'neto, iva y total deben ser números.' });
  }
  if (typeof con_factura !== 'boolean' || typeof con_iva !== 'boolean') {
    return res.status(400).json({ message: 'con_factura y con_iva deben ser booleanos.' });
  }


  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validaciones de existencia
    const validationPromises = [];

    validationPromises.push(client.query('SELECT 1 FROM Proveedores WHERE id_proveedor = $1', [id_proveedor]));
    validationPromises.push(client.query('SELECT 1 FROM Tipos_Pago WHERE id_tipo_pago = $1', [id_tipo_pago]));
    validationPromises.push(client.query('SELECT 1 FROM Cuentas_Bancarias WHERE id_cuenta = $1', [id_cuenta_origen]));
    detalles.forEach(item => {
        if (item.cantidad <= 0) {
            throw new Error(`La cantidad para el formato de producto ${item.id_formato_producto} debe ser un número positivo.`);
        }
        if (item.precio_unitario < 0) {
            throw new Error(`El precio unitario para el formato de producto ${item.id_formato_producto} no puede ser negativo.`);
        }
        validationPromises.push(client.query('SELECT 1 FROM Formatos_Producto WHERE id_formato_producto = $1', [item.id_formato_producto]));
        validationPromises.push(client.query('SELECT 1 FROM Ubicaciones_Inventario WHERE id_ubicacion = $1', [item.id_ubicacion]));
    });

    const validationResults = await Promise.all(validationPromises);
    if (validationResults[0].rowCount === 0) {
      return res.status(400).json({ message: 'id_proveedor inválido.' });
    }
    if (validationResults[1].rowCount === 0) {
      return res.status(400).json({ message: 'id_tipo_pago inválido.' });
    }
    if (validationResults[2].rowCount === 0) {
      return res.status(400).json({ message: 'id_cuenta_origen inválido.' });
    }

    for (let i = 3; i < validationResults.length; i += 2) {
      if (validationResults[i].rowCount === 0) {
        return res.status(400).json({ message: 'id_formato_producto inválido en detalles.' });
      }
      if (validationResults[i + 1].rowCount === 0) {
        return res.status(400).json({ message: 'id_ubicacion inválido en detalles.' });
      }
    }

    // 1. Insertar en la tabla principal de Compras
    const compraResult = await client.query(
      'INSERT INTO Compras (id_proveedor, id_tipo_pago, id_cuenta_origen, neto, iva, total, observacion, con_factura, con_iva, fecha) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE) RETURNING id_compra',
      [id_proveedor, id_tipo_pago, id_cuenta_origen, neto, iva, total, observacion, con_factura, con_iva]
    );
    const newCompraId = compraResult.rows[0].id_compra;

    // 2. Iterar sobre los detalles para insertarlos
    for (const item of detalles) {
      await client.query(
        'INSERT INTO Detalle_Compras (id_compra, id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion) VALUES ($1, $2, $3, $4, $5, $6)',
        [newCompraId, item.id_formato_producto, item.cantidad, item.precio_unitario, item.id_lote, item.id_ubicacion]
      );
    }

    // 3. Actualizar inventario
    await updateInventory(client, detalles, 1);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Purchase created successfully', id_compra: newCompraId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating purchase:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /compras/:id - Eliminar una compra y revertir el inventario
router.delete('/:id', authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener los detalles de la compra para saber qué revertir
    const detallesResult = await client.query('SELECT * FROM Detalle_Compras WHERE id_compra = $1', [id]);
    const detalles = detallesResult.rows;

    if (detalles.length === 0) {
      const compraExistResult = await client.query('SELECT 1 FROM Compras WHERE id_compra = $1', [id]);
      if (compraExistResult.rowCount === 0) {
        return res.status(404).json({ message: 'Purchase not found' });
      }
    }

    // 2. Revertir el inventario
    await updateInventory(client, detalles, -1);

    // 3. Eliminar los detalles de la compra
    await client.query('DELETE FROM Detalle_Compras WHERE id_compra = $1', [id]);

    // 4. Eliminar la compra principal
    const deleteCompraResult = await client.query('DELETE FROM Compras WHERE id_compra = $1 RETURNING *', [id]);

    if (deleteCompraResult.rowCount === 0) {
        throw new Error('Purchase not found');
    }

    await client.query('COMMIT');
    res.json({ message: 'Purchase deleted and inventory rolled back successfully', compra: deleteCompraResult.rows[0] });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting purchase:', err);
    if (err.message === 'Purchase not found') {
        return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

// PUT /compras/:id - Actualizar campos de cabecera de una compra
// NOTA: Esta implementación no permite modificar los detalles de la compra (líneas de producto)
// porque la lógica de revertir y reaplicar el inventario es compleja y propensa a errores.
// Solo se actualizan los campos de la tabla principal `Compras`.
router.put('/:id', authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { id_proveedor, id_tipo_pago, id_cuenta_origen, neto, iva, total, observacion, con_factura, con_iva } = req.body;

  // Basic validation for data types
  if (neto !== undefined && typeof neto !== 'number') {
    return res.status(400).json({ message: 'neto debe ser un número.' });
  }
  if (iva !== undefined && typeof iva !== 'number') {
    return res.status(400).json({ message: 'iva debe ser un número.' });
  }
  if (total !== undefined && typeof total !== 'number') {
    return res.status(400).json({ message: 'total debe ser un número.' });
  }
  if (con_factura !== undefined && typeof con_factura !== 'boolean') {
    return res.status(400).json({ message: 'con_factura debe ser un booleano.' });
  }
  if (con_iva !== undefined && typeof con_iva !== 'boolean') {
    return res.status(400).json({ message: 'con_iva debe ser un booleano.' });
  }

  try {
    const result = await pool.query(
      'UPDATE Compras SET id_proveedor = $1, id_tipo_pago = $2, id_cuenta_origen = $3, neto = $4, iva = $5, total = $6, observacion = $7, con_factura = $8, con_iva = $9 WHERE id_compra = $10 RETURNING *',
      [id_proveedor, id_tipo_pago, id_cuenta_origen, neto, iva, total, observacion, con_factura, con_iva, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    res.json({ message: 'Purchase header updated successfully', compra: result.rows[0] });

  } catch (err) {
    console.error('Error updating purchase:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
