const createAuthController = (pool, bcrypt, jwt) => {

  const login = async (req, res) => {
    const { username, password } = req.body;

    try {
      const result = await pool.query('SELECT * FROM Usuarios WHERE username = $1', [username]);
      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id_usuario, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.json({ message: 'Login successful', token, role: user.role, id_usuario: user.id_usuario });
    } catch (err) {
      // console.error('Login error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  return {
    login,
  };
};

module.exports = createAuthController;