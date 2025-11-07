// Este archivo contiene la lógica de negocio para el módulo de productos.
// Recibe la conexión a la base de datos (pool) para poder ejecutar las consultas.

const createProductController = (pool) => {
  
  const getAllProducts = async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM Productos ORDER BY id_producto');
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const createProduct = async (req, res) => {
    const { nombre, categoria, unidad_medida } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO Productos (nombre, categoria, unidad_medida) VALUES ($1, $2, $3) RETURNING *',
        [nombre, categoria, unidad_medida]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query('DELETE FROM Productos WHERE id_producto = $1 RETURNING *', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json({ message: 'Product deleted successfully', product: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { nombre, categoria, unidad_medida, activo } = req.body;
    try {
      const result = await pool.query(
        'UPDATE Productos SET nombre = $1, categoria = $2, unidad_medida = $3, activo = $4 WHERE id_producto = $5 RETURNING *',
        [nombre, categoria, unidad_medida, activo, id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json({ message: 'Product updated successfully', product: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  const getActiveProducts = async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM Productos WHERE activo = TRUE ORDER BY nombre');
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  return {
    getAllProducts,
    createProduct,
    deleteProduct,
    updateProduct,
    getActiveProducts,
  };
};

module.exports = createProductController;
