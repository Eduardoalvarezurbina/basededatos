const { app, pool } = require('./app');

const port = process.env.PORT || 3001;

// --- Lógica de Inicio (ej. crear usuario admin) ---
const initializeAdminUser = async () => {
  // No ejecutar la inicialización en entorno de prueba
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT * FROM Usuarios WHERE username = $1', ['admin']);
    if (res.rows.length === 0) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin', 10);
      await client.query('INSERT INTO Usuarios (username, password_hash, role) VALUES ($1, $2, $3)', ['admin', hashedPassword, 'admin']);
      console.log('Usuario admin creado con éxito.');
    }
    client.release();
  } catch (error) {
    console.error('Error al verificar/crear usuario admin:', error);
  }
};

// --- Iniciar Servidor ---
app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
  initializeAdminUser();
});
