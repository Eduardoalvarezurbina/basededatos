-- Script de Migración Inicial (DDL) para PostgreSQL
-- Crea toda la estructura de tablas para el proyecto.

-- Tablas de Lookup (Catálogos)
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

-- Tablas Principales (Entidades)
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

-- Tablas para Recetas
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

-- Tablas Transaccionales
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
    con_iva BOOLEAN
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
    precio_unitario DECIMAL(10, 2)
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