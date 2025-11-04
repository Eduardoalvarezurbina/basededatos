const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const productsRouter = require('./routes/products');
const ubicacionesRouter = require('./routes/ubicaciones');
const tiposClienteRouter = require('./routes/tiposCliente');
const inventarioRouter = require('./routes/inventario');
const ciudadesRouter = require('./routes/ciudades');
const tiposPagoRouter = require('./routes/tiposPago');
const fuentesContactoRouter = require('./routes/fuentesContacto');
const puntosVentaRouter = require('./routes/puntosVenta');
const trabajadoresRouter = require('./routes/trabajadores');
const regionesRouter = require('./routes/regiones');
const comunasRouter = require('./routes/comunas');
const categoriasClienteRouter = require('./routes/categoriasCliente');
const clasificacionesClienteRouter = require('./routes/clasificacionesCliente');
const frecuenciasCompraRouter = require('./routes/frecuenciasCompra');
const tiposConsumoRouter = require('./routes/tiposConsumo');
const cuentasBancariasRouter = require('./routes/cuentasBancarias');
const clientsRouter = require('./routes/clients');
const proveedoresRouter = require('./routes/proveedores');
const comprasRouter = require('./routes/compras');
const movimientosInventarioRouter = require('./routes/movimientosInventario');
const ventasRouter = require('./routes/ventas');
const pedidosRouter = require('./routes/pedidos');
const lotesRouter = require('./routes/lotes');
const produccionRouter = require('./routes/produccion');
const reclamosRouter = require('./routes/reclamos');
const { verifyToken } = require('./routes/authMiddleware');

const app = express();
const port = 3001;

// DB Connection
// Lee la configuración de la base de datos desde variables de entorno para que sea compatible con Docker.
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});

app.use(cors());
app.use(express.json());

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query('SELECT * FROM Usuarios WHERE username = $1', [username]);
  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id_usuario, role: user.role }, 'your_jwt_secret', { expiresIn: '1h' });

  res.json({ message: 'Login successful', token });
});

app.use(verifyToken);

app.use('/products', productsRouter);
app.use('/ubicaciones', ubicacionesRouter);
app.use('/tipos-cliente', tiposClienteRouter);
app.use('/inventario', inventarioRouter);
app.use('/ciudades', ciudadesRouter);
app.use('/tipos-pago', tiposPagoRouter);
app.use('/fuentes-contacto', fuentesContactoRouter);
app.use('/puntos-venta', puntosVentaRouter);
app.use('/trabajadores', trabajadoresRouter);
app.use('/regiones', regionesRouter);
app.use('/comunas', comunasRouter);
app.use('/categorias-cliente', categoriasClienteRouter);
app.use('/clasificaciones-cliente', clasificacionesClienteRouter);
app.use('/frecuencias-compra', frecuenciasCompraRouter);
app.use('/tipos-consumo', tiposConsumoRouter);
app.use('/cuentas-bancarias', cuentasBancariasRouter);
app.use('/clients', clientsRouter);
app.use('/proveedores', proveedoresRouter);
app.use('/compras', comprasRouter);
app.use('/movimientos-inventario', movimientosInventarioRouter);
app.use('/ventas', ventasRouter);
app.use('/pedidos', pedidosRouter);
app.use('/lotes', lotesRouter);
app.use('/produccion', produccionRouter);
app.use('/reclamos', reclamosRouter);












// GET /formatos-producto - Obtener todos los formatos de producto
app.get('/formatos-producto', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT fp.*, p.nombre as nombre_producto
      FROM Formatos_Producto fp
      JOIN Productos p ON fp.id_producto = p.id_producto
      ORDER BY p.nombre, fp.formato
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting product formats:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /formatos-producto - Crear un nuevo formato de producto
app.post('/formatos-producto', async (req, res) => {
  const { id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Formatos_Producto (id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating product format:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// DELETE /formatos-producto/:id - Eliminar un formato de producto
app.delete('/formatos-producto/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Importante: Considerar si se debe permitir borrar formatos usados en ventas, etc.
    // Por ahora, se permite el borrado directo.
    const result = await pool.query('DELETE FROM Formatos_Producto WHERE id_formato_producto = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Product format not found' });
    }
    res.json({ message: 'Product format deleted successfully', formato: result.rows[0] });
  } catch (err) {
    console.error('Error deleting product format:', err);
    // Manejar error de FK si el formato está en uso
    if (err.code === '23503') { // foreign_key_violation
        return res.status(409).json({ message: 'Cannot delete this format because it is referenced by other records (e.g., inventory, sales).', error: err.detail });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// PUT /formatos-producto/:id - Actualizar un formato de producto y registrar cambios de precio
app.put('/formatos-producto/:id', async (req, res) => {
  const { id } = req.params;
  const { formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener los precios actuales antes de actualizar
    const preciosAnterioresResult = await client.query(
      'SELECT precio_detalle_neto, precio_mayorista_neto FROM Formatos_Producto WHERE id_formato_producto = $1',
      [id]
    );

    if (preciosAnterioresResult.rowCount === 0) {
      // Lanza un error que será capturado por el bloque catch
      throw new Error('Product format not found');
    }
    const preciosAnteriores = preciosAnterioresResult.rows[0];

    // 2. Actualizar el formato del producto
    const result = await client.query(
      'UPDATE Formatos_Producto SET formato = $1, precio_detalle_neto = $2, precio_mayorista_neto = $3, ultimo_costo_neto = $4, unidad_medida = $5 WHERE id_formato_producto = $6 RETURNING *',
      [formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida, id]
    );

    // 3. Comparar precios y si han cambiado, insertar en el historial
    const precioDetalleCambio = precio_detalle_neto !== undefined && parseFloat(precio_detalle_neto) !== parseFloat(preciosAnteriores.precio_detalle_neto);
    const precioMayoristaCambio = precio_mayorista_neto !== undefined && parseFloat(precio_mayorista_neto) !== parseFloat(preciosAnteriores.precio_mayorista_neto);

    if (precioDetalleCambio || precioMayoristaCambio) {
      await client.query(
        'INSERT INTO Historial_Precios (id_formato_producto, precio_detalle_neto_anterior, precio_detalle_neto_nuevo, precio_mayorista_neto_anterior, precio_mayorista_neto_nuevo) VALUES ($1, $2, $3, $4, $5)',
        [id, preciosAnteriores.precio_detalle_neto, precio_detalle_neto, preciosAnteriores.precio_mayorista_neto, precio_mayorista_neto]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Product format updated successfully', formato_producto: result.rows[0] });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating product format:', err);
    if (err.message === 'Product format not found') {
        return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

// GET /historial-precios/:id_formato_producto - Obtener el historial de precios de un formato de producto
app.get('/historial-precios/:id_formato_producto', async (req, res) => {
  const { id_formato_producto } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Historial_Precios WHERE id_formato_producto = $1 ORDER BY fecha_cambio DESC', [id_formato_producto]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting price history:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// --- Endpoints para Gestión de Procesos ---

// POST /procesos - Crear un nuevo proceso con sus detalles
app.post('/procesos', async (req, res) => {
  const { nombre_proceso, tipo_proceso, id_formato_producto_final, observacion, ingredientes } = req.body;

  if (!nombre_proceso || !tipo_proceso || !id_formato_producto_final || !ingredientes || !Array.isArray(ingredientes) || ingredientes.length === 0) {
    return res.status(400).json({ message: 'Missing required fields for process creation.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insertar en la tabla principal de Procesos
    const procesoResult = await client.query(
      'INSERT INTO Procesos (nombre_proceso, tipo_proceso, id_formato_producto_final, observacion) VALUES ($1, $2, $3, $4) RETURNING id_proceso',
      [nombre_proceso, tipo_proceso, id_formato_producto_final, observacion]
    );
    const newProcesoId = procesoResult.rows[0].id_proceso;

    // Insertar cada ingrediente en Detalle_Procesos
    for (const ingrediente of ingredientes) {
      await client.query(
        'INSERT INTO Detalle_Procesos (id_proceso, id_formato_producto_ingrediente, cantidad_requerida) VALUES ($1, $2, $3)',
        [newProcesoId, ingrediente.id_formato_producto_ingrediente, ingrediente.cantidad_requerida]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Process created successfully', id_proceso: newProcesoId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating process:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

// GET /procesos - Obtener todos los procesos con sus detalles
app.get('/procesos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id_proceso, p.nombre_proceso, p.tipo_proceso, p.observacion,
        fp.formato as formato_producto_final,
        prod.nombre as nombre_producto_final,
        (SELECT json_agg(json_build_object(
          'id_detalle_proceso', dp.id_detalle_proceso,
          'id_formato_producto_ingrediente', dp.id_formato_producto_ingrediente,
          'cantidad_requerida', dp.cantidad_requerida,
          'nombre_ingrediente', p_ing.nombre,
          'formato_ingrediente', fp_ing.formato
        )) FROM Detalle_Procesos dp
           JOIN Formatos_Producto fp_ing ON dp.id_formato_producto_ingrediente = fp_ing.id_formato_producto
           JOIN Productos p_ing ON fp_ing.id_producto = p_ing.id_producto
           WHERE dp.id_proceso = p.id_proceso
        ) as ingredientes
      FROM Procesos p
      JOIN Formatos_Producto fp ON p.id_formato_producto_final = fp.id_formato_producto
      JOIN Productos prod ON fp.id_producto = prod.id_producto
      ORDER BY p.nombre_proceso
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting processes:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /procesos/:id - Actualizar un proceso (incluyendo detalles)
app.put('/procesos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre_proceso, tipo_proceso, id_formato_producto_final, observacion, ingredientes } = req.body;

  if (!nombre_proceso || !tipo_proceso || !id_formato_producto_final || !ingredientes || !Array.isArray(ingredientes) || ingredientes.length === 0) {
    return res.status(400).json({ message: 'Missing required fields for process update.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Actualizar la tabla principal
    await client.query(
      'UPDATE Procesos SET nombre_proceso = $1, tipo_proceso = $2, id_formato_producto_final = $3, observacion = $4 WHERE id_proceso = $5',
      [nombre_proceso, tipo_proceso, id_formato_producto_final, observacion, id]
    );

    // 2. Borrar los detalles antiguos
    await client.query('DELETE FROM Detalle_Procesos WHERE id_proceso = $1', [id]);

    // 3. Insertar los nuevos detalles
    for (const ingrediente of ingredientes) {
      await client.query(
        'INSERT INTO Detalle_Procesos (id_proceso, id_formato_producto_ingrediente, cantidad_requerida) VALUES ($1, $2, $3)',
        [id, ingrediente.id_formato_producto_ingrediente, ingrediente.cantidad_requerida]
      );
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Process updated successfully', id_proceso: id });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating process:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /procesos/:id - Eliminar un proceso
app.delete('/procesos/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Primero eliminar los detalles para no violar la FK
    await client.query('DELETE FROM Detalle_Procesos WHERE id_proceso = $1', [id]);
    // Luego eliminar el proceso principal
    const result = await client.query('DELETE FROM Procesos WHERE id_proceso = $1 RETURNING *', [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Process not found');
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Process deleted successfully', proceso: result.rows[0] });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting process:', err);
    if (err.message === 'Process not found') {
      return res.status(404).json({ message: 'Process not found' });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    client.release();
  }
});













const startServer = () => {
  const server = app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
  });
  return { app, server };
};

if (require.main === module) {
  startServer();
}

module.exports = { app, pool, startServer };
