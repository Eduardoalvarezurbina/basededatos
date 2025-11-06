require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || "5432"),
  });

  try {
    // Drop all tables
    await pool.query(`
      DROP TABLE IF EXISTS Detalle_Ventas CASCADE;
      DROP TABLE IF EXISTS Detalle_Compras CASCADE;
      DROP TABLE IF EXISTS Detalle_Movimientos_Inventario CASCADE;
      DROP TABLE IF EXISTS Detalle_Procesos CASCADE;
      DROP TABLE IF EXISTS Inventario CASCADE;
      DROP TABLE IF EXISTS Movimientos_Inventario CASCADE;
      DROP TABLE IF EXISTS Ventas CASCADE;
      DROP TABLE IF EXISTS Compras CASCADE;
      DROP TABLE IF EXISTS Horarios CASCADE;
      DROP TABLE IF EXISTS Formatos_Producto CASCADE;
      DROP TABLE IF EXISTS Productos CASCADE;
      DROP TABLE IF EXISTS Procesos CASCADE;
      DROP TABLE IF EXISTS Clientes CASCADE;
      DROP TABLE IF EXISTS Proveedores CASCADE;
      DROP TABLE IF EXISTS Puntos_Venta CASCADE;
      DROP TABLE IF EXISTS Ubicaciones_Inventario CASCADE;
      DROP TABLE IF EXISTS Trabajadores CASCADE;
      DROP TABLE IF EXISTS Caja CASCADE;
      DROP TABLE IF EXISTS Cuentas_Bancarias CASCADE;
      DROP TABLE IF EXISTS Ciudades CASCADE;
      DROP TABLE IF EXISTS Tipos_Pago CASCADE;
      DROP TABLE IF EXISTS Categorias_Cliente CASCADE;
      DROP TABLE IF EXISTS Fuentes_Contacto CASCADE;
      DROP TABLE IF EXISTS Usuarios CASCADE;
      DROP TABLE IF EXISTS Pedidos CASCADE;
      DROP TABLE IF EXISTS Detalle_Pedidos CASCADE;
      DROP TABLE IF EXISTS Tipos_Cliente CASCADE;
      DROP TABLE IF EXISTS Regiones CASCADE;
      DROP TABLE IF EXISTS Comunas CASCADE;
      DROP TABLE IF EXISTS Canales_Compra CASCADE;
      DROP TABLE IF EXISTS Frecuencias_Compra CASCADE;
      DROP TABLE IF EXISTS Tipos_Consumo CASCADE;
      DROP TABLE IF EXISTS Clasificaciones_Cliente CASCADE;
      DROP TABLE IF EXISTS Reclamos CASCADE;
      DROP TABLE IF EXISTS Historial_Precios CASCADE;
      DROP TABLE IF EXISTS Lotes_Produccion CASCADE;
      DROP TABLE IF EXISTS Produccion_Diaria CASCADE;
      DROP TABLE IF EXISTS migration_history CASCADE;
    `);

    // Create migration history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Get all migration files
    const ddlPath = path.join(__dirname, '../../proyecto-db/ddl');
    const files = fs.readdirSync(ddlPath).sort();

    for (const file of files) {
      if (file.endsWith('.sql') && file !== 'postgres_schema_consolidado.sql') {
        const sql = fs.readFileSync(path.join(ddlPath, file), 'utf-8');
        await pool.query(sql);
        await pool.query('INSERT INTO migration_history (migration_name) VALUES ($1)', [file]);
        console.log(`Applied migration: ${file}`);
      }
    }

    const dmlPath = path.join(__dirname, '../../proyecto-db/dml');
    const dmlFiles = fs.readdirSync(dmlPath).sort();

    for (const file of dmlFiles) {
      if (file.endsWith('.sql')) {
        console.log(`Executing DML script: ${file}`);
        const sql = fs.readFileSync(path.join(dmlPath, file), 'utf-8');
        await pool.query(sql);
        console.log(`Applied DML script: ${file}`);
      }
    }

    console.log('Test database schema created successfully.');

  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};