const createProductFormatController = (pool) => {

  const updateProductFormat = async (req, res) => {
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
  };

  const getPriceHistory = async (req, res) => {
    const { id_formato_producto } = req.params;
    try {
      const result = await pool.query('SELECT * FROM Historial_Precios WHERE id_formato_producto = $1 ORDER BY fecha_cambio DESC', [id_formato_producto]);
      res.json(result.rows);
    } catch (err) {
      console.error('Error getting price history:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  return {
    updateProductFormat,
    getPriceHistory,
  };
};

module.exports = createProductFormatController;
