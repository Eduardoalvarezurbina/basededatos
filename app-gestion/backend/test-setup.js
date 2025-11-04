require('dotenv/config');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
});

const setupTestDB = async () => {
  const resetDbSql = `
    DROP TABLE IF EXISTS Detalle_Ventas CASCADE;
    DROP TABLE IF EXISTS Detalle_Compras CASCADE;
    DROP TABLE IF EXISTS Detalle_Movimientos_Inventario CASCADE;
    DROP TABLE IF EXISTS Detalle_Recetas CASCADE;
    DROP TABLE IF EXISTS Inventario CASCADE;
    DROP TABLE IF EXISTS Movimientos_Inventario CASCADE;
    DROP TABLE IF EXISTS Ventas CASCADE;
    DROP TABLE IF EXISTS Compras CASCADE;
    DROP TABLE IF EXISTS Horarios CASCADE;
    DROP TABLE IF EXISTS Formatos_Producto CASCADE;
    DROP TABLE IF EXISTS Productos CASCADE;
    DROP TABLE IF EXISTS Recetas CASCADE;
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
  `;

  const initialSchemaSql = `
    CREATE TABLE IF NOT EXISTS Ciudades (
        id_ciudad SERIAL PRIMARY KEY,
        nombre_ciudad VARCHAR(100) NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS Tipos_Pago (
        id_tipo_pago SERIAL PRIMARY KEY,
        nombre_tipo_pago VARCHAR(50) NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS Categorias_Cliente (
        id_categoria_cliente SERIAL PRIMARY KEY,
        nombre_categoria VARCHAR(100) NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS Fuentes_Contacto (
        id_fuente_contacto SERIAL PRIMARY KEY,
        nombre_fuente VARCHAR(100) NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS Productos (
        id_producto SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        categoria VARCHAR(50),
        unidad_medida VARCHAR(20)
    );
    CREATE TABLE IF NOT EXISTS Formatos_Producto (
        id_formato_producto SERIAL PRIMARY KEY,
        id_producto INT REFERENCES Productos(id_producto),
        formato VARCHAR(50) NOT NULL,
        precio_detalle_neto DECIMAL(10, 2),
        precio_mayorista_neto DECIMAL(10, 2),
        ultimo_costo_neto DECIMAL(10, 2),
        unidad_medida VARCHAR(20)
    );
    CREATE TABLE IF NOT EXISTS Cuentas_Bancarias (
        id_cuenta SERIAL PRIMARY KEY,
        nombre_banco VARCHAR(100) NOT NULL,
        tipo_cuenta VARCHAR(50),
        numero_cuenta VARCHAR(50) NOT NULL,
        rut_titular VARCHAR(20),
        nombre_titular VARCHAR(255),
        email_titular VARCHAR(255)
    );
    CREATE TABLE IF NOT EXISTS Clientes (
        id_cliente SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        telefono VARCHAR(50),
        id_ciudad INT REFERENCES Ciudades(id_ciudad),
        direccion TEXT,
        id_categoria_cliente INT REFERENCES Categorias_Cliente(id_categoria_cliente),
        id_fuente_contacto INT REFERENCES Fuentes_Contacto(id_fuente_contacto),
        id_cuenta_preferida INT REFERENCES Cuentas_Bancarias(id_cuenta),
        rut VARCHAR(20),
        email VARCHAR(255),
        fecha_ultima_compra DATE
    );
    CREATE TABLE IF NOT EXISTS Proveedores (
        id_proveedor SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        rut VARCHAR(20),
        telefono VARCHAR(50),
        id_ciudad INT REFERENCES Ciudades(id_ciudad)
    );
    CREATE TABLE IF NOT EXISTS Puntos_Venta (
        id_punto_venta SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        tipo VARCHAR(50),
        direccion TEXT,
        id_ciudad INT REFERENCES Ciudades(id_ciudad)
    );
    CREATE TABLE IF NOT EXISTS Ubicaciones_Inventario (
        id_ubicacion SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        tipo VARCHAR(50),
        direccion TEXT,
        id_ciudad INT REFERENCES Ciudades(id_ciudad)
    );
    CREATE TABLE IF NOT EXISTS Trabajadores (
        id_trabajador SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL
    );
    CREATE TABLE IF NOT EXISTS Horarios (
        id_horario SERIAL PRIMARY KEY,
        id_trabajador INT REFERENCES Trabajadores(id_trabajador),
        fecha DATE,
        hora_ingreso TIME,
        hora_salida TIME
    );
    CREATE TABLE IF NOT EXISTS Caja (
        id_caja SERIAL PRIMARY KEY,
        fecha DATE,
        monto_inicial DECIMAL(10, 2),
        monto_final DECIMAL(10, 2)
    );
    CREATE TABLE IF NOT EXISTS Recetas (
        id_receta SERIAL PRIMARY KEY,
        nombre_receta VARCHAR(255) NOT NULL,
        id_formato_producto_final INT REFERENCES Formatos_Producto(id_formato_producto),
        observacion TEXT
    );
    CREATE TABLE IF NOT EXISTS Detalle_Recetas (
        id_detalle_receta SERIAL PRIMARY KEY,
        id_receta INT REFERENCES Recetas(id_receta),
        id_formato_producto_ingrediente INT REFERENCES Formatos_Producto(id_formato_producto),
        cantidad_requerida DECIMAL(10, 2)
    );
    CREATE TABLE IF NOT EXISTS Compras (
        id_compra SERIAL PRIMARY KEY,
        fecha DATE,
        id_proveedor INT REFERENCES Proveedores(id_proveedor),
        id_tipo_pago INT REFERENCES Tipos_Pago(id_tipo_pago),
        id_cuenta_origen INT REFERENCES Cuentas_Bancarias(id_cuenta),
        neto DECIMAL(10, 2),
        iva DECIMAL(10, 2),
        total DECIMAL(10, 2),
        observacion TEXT,
        con_iva BOOLEAN,
        con_factura BOOLEAN
    );
    CREATE TABLE IF NOT EXISTS Ventas (
        id_venta SERIAL PRIMARY KEY,
        fecha DATE,
        hora TIME,
        id_cliente INT REFERENCES Clientes(id_cliente),
        id_punto_venta INT REFERENCES Puntos_Venta(id_punto_venta),
        id_tipo_pago INT REFERENCES Tipos_Pago(id_tipo_pago),
        id_trabajador INT REFERENCES Trabajadores(id_trabajador),
        neto_venta DECIMAL(10, 2),
        iva_venta DECIMAL(10, 2),
        total_bruto_venta DECIMAL(10, 2),
        con_iva_venta BOOLEAN,
        observacion TEXT,
        estado VARCHAR(50),
        estado_pago VARCHAR(50)
    );
    CREATE TABLE IF NOT EXISTS Detalle_Compras (
        id_detalle_compra SERIAL PRIMARY KEY,
        id_compra INT REFERENCES Compras(id_compra),
        id_formato_producto INT REFERENCES Formatos_Producto(id_formato_producto),
        cantidad DECIMAL(10, 2),
        precio_unitario DECIMAL(10, 2),
        id_lote INT,
        id_ubicacion INT
    );
    CREATE TABLE IF NOT EXISTS Detalle_Ventas (
        id_detalle_venta SERIAL PRIMARY KEY,
        id_venta INT REFERENCES Ventas(id_venta),
        id_formato_producto INT REFERENCES Formatos_Producto(id_formato_producto),
        cantidad DECIMAL(10, 2),
        precio_unitario DECIMAL(10, 2)
    );
    CREATE TABLE IF NOT EXISTS Inventario (
        id_inventario SERIAL PRIMARY KEY,
        id_formato_producto INT REFERENCES Formatos_Producto(id_formato_producto),
        id_ubicacion INT REFERENCES Ubicaciones_Inventario(id_ubicacion),
        stock_actual DECIMAL(10, 2),
        fecha_actualizacion TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS Movimientos_Inventario (
        id_movimiento SERIAL PRIMARY KEY,
        fecha DATE,
        tipo_movimiento VARCHAR(50) NOT NULL,
        id_ubicacion_origen INT REFERENCES Ubicaciones_Inventario(id_ubicacion),
        id_ubicacion_destino INT REFERENCES Ubicaciones_Inventario(id_ubicacion),
        observacion TEXT
    );
    CREATE TABLE IF NOT EXISTS Detalle_Movimientos_Inventario (
        id_detalle_movimiento SERIAL PRIMARY KEY,
        id_movimiento INT REFERENCES Movimientos_Inventario(id_movimiento),
        id_formato_producto INT REFERENCES Formatos_Producto(id_formato_producto),
        cantidad DECIMAL(10, 2),
        tipo_detalle VARCHAR(50)
    );
    CREATE TABLE IF NOT EXISTS Transferencias_Bancarias (
        id_transferencia SERIAL PRIMARY KEY,
        fecha DATE,
        id_cuenta_origen INT REFERENCES Cuentas_Bancarias(id_cuenta),
        id_cuenta_destino INT REFERENCES Cuentas_Bancarias(id_cuenta),
        monto DECIMAL(10, 2),
        id_cliente INT REFERENCES Clientes(id_cliente),
        id_proveedor INT REFERENCES Proveedores(id_proveedor),
        observacion TEXT
    );
  `;

  const createUsersTableSql = `
    CREATE TABLE IF NOT EXISTS Usuarios (
        id_usuario SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'trabajador'))
    );
  `;

  const insertAdminUserSql = `INSERT INTO Usuarios (username, password_hash, role) VALUES ('admin', '$2b$10$r/bcdB.IUgCKd/ROkQsJw.WVyuPdZwHreGD5s/JNPx8jsfmIwsDXK', 'admin');`;

  await pool.query(resetDbSql);
  await pool.query(initialSchemaSql);
  await pool.query(createUsersTableSql);
  await pool.query(insertAdminUserSql);

  // Insert test data
  await pool.query(`INSERT INTO Ciudades (nombre_ciudad) VALUES ('Test City')`);
  await pool.query(`INSERT INTO Productos (nombre, categoria, unidad_medida) VALUES ('Test Product', 'Test Category', 'kg')`);
  await pool.query(`INSERT INTO Formatos_Producto (id_producto, formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida) VALUES (1, 'Test Format', 100, 90, 80, 'kg')`);
  await pool.query(`INSERT INTO Proveedores (nombre, rut, telefono, id_ciudad) VALUES ('Test Supplier', '12345678-9', '123456789', 1)`);
  await pool.query(`INSERT INTO Tipos_Pago (nombre_tipo_pago) VALUES ('Test Payment Type')`);
  await pool.query(`INSERT INTO Cuentas_Bancarias (nombre_banco, tipo_cuenta, numero_cuenta, rut_titular, nombre_titular, email_titular) VALUES ('Test Bank', 'Test Account Type', '123456789', '12345678-9', 'Test Holder', 'test@holder.com')`);
  await pool.query(`INSERT INTO Ubicaciones_Inventario (nombre, tipo, direccion, id_ciudad) VALUES ('Test Location', 'Test Type', 'Test Address', 1)`);

  await pool.end();
};

if (require.main === module) {
  setupTestDB();
}

module.exports = setupTestDB;
