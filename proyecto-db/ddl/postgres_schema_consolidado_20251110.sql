-- Esquema Consolidado y Limpio para PostgreSQL
-- Versión: 1.7
-- Fecha de Generación: 2025-11-10
-- Este script representa la estructura final y autorizada de la base de datos,
-- incluyendo un modelo de precios escalable y las últimas migraciones.

-- 1. Tablas de Catálogo (Lookup Tables)
CREATE TABLE IF NOT EXISTS Regiones (
    id_region SERIAL PRIMARY KEY,
    nombre_region VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Comunas (
    id_comuna SERIAL PRIMARY KEY,
    nombre_comuna VARCHAR(100) NOT NULL UNIQUE,
    id_region INT REFERENCES Regiones(id_region)
);

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

CREATE TABLE IF NOT EXISTS Tipos_Cliente (
    id_tipo_cliente SERIAL PRIMARY KEY,
    nombre_tipo VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Frecuencias_Compra (
    id_frecuencia_compra SERIAL PRIMARY KEY,
    nombre_frecuencia VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Tipos_Consumo (
    id_tipo_consumo SERIAL PRIMARY KEY,
    nombre_tipo VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Clasificaciones_Cliente (
    id_clasificacion_cliente SERIAL PRIMARY KEY,
    nombre_clasificacion VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Tipos_Precio (
    id_tipo_precio SERIAL PRIMARY KEY,
    nombre_tipo_precio VARCHAR(50) NOT NULL UNIQUE
);

-- 2. Entidades Principales
CREATE TABLE IF NOT EXISTS Productos (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    categoria VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS Formatos_Producto (
    id_formato_producto SERIAL PRIMARY KEY,
    id_producto INT REFERENCES Productos(id_producto),
    formato VARCHAR(50) NOT NULL,
    ultimo_costo_neto DECIMAL(10, 2),
    unidad_medida VARCHAR(20),
    CONSTRAINT unique_producto_formato UNIQUE (id_producto, formato)
);

CREATE TABLE IF NOT EXISTS Precios (
    id_precio SERIAL PRIMARY KEY,
    id_formato_producto INT REFERENCES Formatos_Producto(id_formato_producto) ON DELETE CASCADE,
    id_tipo_precio INT REFERENCES Tipos_Precio(id_tipo_precio) ON DELETE CASCADE,
    precio_neto DECIMAL(10, 2) NOT NULL,
    CONSTRAINT uq_precio_producto_tipo UNIQUE (id_formato_producto, id_tipo_precio)
);

CREATE TABLE IF NOT EXISTS Lotes_Produccion (
    id_lote SERIAL PRIMARY KEY,
    codigo_lote VARCHAR(100) UNIQUE NOT NULL,
    id_producto INT REFERENCES Productos(id_producto) NOT NULL,
    fecha_produccion DATE NOT NULL,
    fecha_vencimiento DATE,
    cantidad_inicial DECIMAL(10, 2) NOT NULL,
    unidad_medida VARCHAR(20),
    costo_por_unidad DECIMAL(10, 2),
    origen VARCHAR(255)
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
    email VARCHAR(255),
    rut VARCHAR(20),
    direccion TEXT,
    id_ciudad INT REFERENCES Ciudades(id_ciudad),
    id_comuna INT REFERENCES Comunas(id_comuna),
    id_categoria_cliente INT REFERENCES Categorias_Cliente(id_categoria_cliente),
    id_fuente_contacto INT REFERENCES Fuentes_Contacto(id_fuente_contacto),
    id_cuenta_preferida INT REFERENCES Cuentas_Bancarias(id_cuenta),
    id_tipo_cliente INT REFERENCES Tipos_Cliente(id_tipo_cliente),
    id_frecuencia_compra INT REFERENCES Frecuencias_Compra(id_frecuencia_compra),
    id_tipo_consumo INT REFERENCES Tipos_Consumo(id_tipo_consumo),
    id_clasificacion_cliente INT REFERENCES Clasificaciones_Cliente(id_clasificacion_cliente),
    fecha_ultima_compra DATE,
    fecha_inicio_cliente DATE DEFAULT CURRENT_DATE,
    fecha_cumpleanos DATE,
    gasto_promedio_por_compra DECIMAL(10, 2),
    ticket_promedio_total DECIMAL(10, 2),
    preferencia_mix_berries BOOLEAN,
    preferencia_pulpas BOOLEAN,
    preferencia_envase TEXT,
    intereses_promociones TEXT,
    preferencia_alimentaria TEXT,
    epoca_compra_preferida VARCHAR(50),
    recibio_seguimiento_postventa BOOLEAN DEFAULT FALSE,
    participo_promociones BOOLEAN DEFAULT FALSE,
    tiene_deudas_pendientes BOOLEAN DEFAULT FALSE,
    suscrito_newsletter BOOLEAN DEFAULT FALSE,
    dejo_resenas BOOLEAN DEFAULT FALSE,
    nivel_satisfaccion VARCHAR(50),
    segmento_vip BOOLEAN DEFAULT FALSE,
    coordenadas_geograficas TEXT,
    etiquetas_comportamiento TEXT[]
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
    nombre VARCHAR(100) NOT NULL UNIQUE,
    tipo VARCHAR(50),
    direccion TEXT,
    id_ciudad INT REFERENCES Ciudades(id_ciudad)
);

CREATE TABLE IF NOT EXISTS Trabajadores (
    id_trabajador SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS Usuarios (
    id_usuario SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'trabajador'))
);

CREATE TABLE IF NOT EXISTS Procesos (
    id_proceso SERIAL PRIMARY KEY,
    nombre_proceso VARCHAR(255) NOT NULL,
    id_formato_producto_final INT REFERENCES Formatos_Producto(id_formato_producto),
    observacion TEXT,
    tipo_proceso VARCHAR(50) CHECK (tipo_proceso IN ('PRODUCCION', 'ENVASADO'))
);

CREATE TABLE IF NOT EXISTS Detalle_Procesos (
    id_detalle_proceso SERIAL PRIMARY KEY,
    id_proceso INT REFERENCES Procesos(id_proceso),
    id_formato_producto_ingrediente INT REFERENCES Formatos_Producto(id_formato_producto),
    cantidad_requerida DECIMAL(10, 2)
);

-- 3. Tablas Transaccionales
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
    con_factura BOOLEAN DEFAULT FALSE,
    afecta_inventario_fisico BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS Detalle_Compras (
    id_detalle_compra SERIAL PRIMARY KEY,
    id_compra INT REFERENCES Compras(id_compra),
    id_formato_producto INT REFERENCES Formatos_Producto(id_formato_producto),
    id_lote INT REFERENCES Lotes_Produccion(id_lote),
    id_ubicacion INT REFERENCES Ubicaciones_Inventario(id_ubicacion),
    cantidad DECIMAL(10, 2),
    precio_unitario DECIMAL(10, 2)
);

CREATE TABLE IF NOT EXISTS Pedidos (
    id_pedido SERIAL PRIMARY KEY,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_cliente INT REFERENCES Clientes(id_cliente),
    id_trabajador INT REFERENCES Trabajadores(id_trabajador),
    estado VARCHAR(50) DEFAULT 'pendiente',
    total DECIMAL(10, 2),
    con_factura BOOLEAN DEFAULT FALSE,
    fecha_entrega DATE,
    tipo_entrega VARCHAR(50) CHECK (tipo_entrega IN ('RETIRO', 'DELIVERY')),
    id_punto_venta_retiro INT REFERENCES Puntos_Venta(id_punto_venta),
    direccion_delivery TEXT,
    fecha_agendamiento DATE,
    lugar_entrega VARCHAR(255),
    observacion TEXT
);

CREATE TABLE IF NOT EXISTS Detalle_Pedidos (
    id_detalle_pedido SERIAL PRIMARY KEY,
    id_pedido INT REFERENCES Pedidos(id_pedido) ON DELETE CASCADE,
    id_formato_producto INT REFERENCES Formatos_Producto(id_formato_producto),
    id_lote INT REFERENCES Lotes_Produccion(id_lote),
    id_ubicacion INT REFERENCES Ubicaciones_Inventario(id_ubicacion),
    cantidad DECIMAL(10, 2),
    precio_unitario DECIMAL(10, 2)
);

CREATE TABLE IF NOT EXISTS Ventas (
    id_venta SERIAL PRIMARY KEY,
    fecha DATE,
    hora TIME,
    id_cliente INT REFERENCES Clientes(id_cliente),
    id_punto_venta INT REFERENCES Puntos_Venta(id_punto_venta),
    id_trabajador INT REFERENCES Trabajadores(id_trabajador),
    tipo_venta VARCHAR(50) CHECK (tipo_venta IN ('PRESENCIAL', 'DELIVERY')),
    neto_venta DECIMAL(10, 2),
    iva_venta DECIMAL(10, 2),
    total_bruto_venta DECIMAL(10, 2),
    con_factura BOOLEAN DEFAULT FALSE,
    observacion TEXT,
    estado VARCHAR(50),
    estado_pago VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS Pagos_Venta (
    id_pago_venta SERIAL PRIMARY KEY,
    id_venta INT REFERENCES Ventas(id_venta) ON DELETE CASCADE,
    id_tipo_pago INT REFERENCES Tipos_Pago(id_tipo_pago),
    monto DECIMAL(10, 2) NOT NULL,
    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    observacion TEXT
);
COMMENT ON TABLE Pagos_Venta IS 'Registra los múltiples pagos (parciales o totales) asociados a una única venta.';
COMMENT ON COLUMN Pagos_Venta.id_venta IS 'La venta a la que pertenece este pago.';
COMMENT ON COLUMN Pagos_Venta.id_tipo_pago IS 'El método de pago (Efectivo, Transferencia, Webpay, etc.).';
COMMENT ON COLUMN Pagos_Venta.monto IS 'El monto de este pago específico.';

CREATE TABLE IF NOT EXISTS Detalle_Ventas (
    id_detalle_venta SERIAL PRIMARY KEY,
    id_venta INT REFERENCES Ventas(id_venta),
    id_formato_producto INT REFERENCES Formatos_Producto(id_formato_producto),
    id_lote INT REFERENCES Lotes_Produccion(id_lote),
    id_ubicacion INT REFERENCES Ubicaciones_Inventario(id_ubicacion),
    cantidad DECIMAL(10, 2),
    precio_unitario DECIMAL(10, 2),
    costo_unitario_en_venta DECIMAL(10, 2)
);

CREATE TABLE IF NOT EXISTS Inventario (
    id_inventario SERIAL PRIMARY KEY,
    id_formato_producto INT REFERENCES Formatos_Producto(id_formato_producto),
    id_ubicacion INT REFERENCES Ubicaciones_Inventario(id_ubicacion),
    stock_actual DECIMAL(10, 2),
    fecha_actualizacion TIMESTAMP,
    CONSTRAINT UQ_Inventario_FormatoUbicacion UNIQUE (id_formato_producto, id_ubicacion)
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

CREATE TABLE IF NOT EXISTS Reclamos (
    id_reclamo SERIAL PRIMARY KEY,
    id_cliente INT REFERENCES Clientes(id_cliente) NOT NULL,
    id_venta INT REFERENCES Ventas(id_venta),
    fecha_reclamo TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    descripcion TEXT NOT NULL,
    estado VARCHAR(50) DEFAULT 'Abierto',
    solucion_entregada TEXT,
    fecha_resolucion TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS Historial_Precios (
    id_historial_precio SERIAL PRIMARY KEY,
    id_formato_producto INT REFERENCES Formatos_Producto(id_formato_producto) NOT NULL,
    id_tipo_precio INT REFERENCES Tipos_Precio(id_tipo_precio) NOT NULL,
    precio_neto_anterior DECIMAL(10, 2),
    precio_neto_nuevo DECIMAL(10, 2) NOT NULL,
    fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Produccion_Diaria (
    id_produccion_diaria SERIAL PRIMARY KEY,
    id_formato_producto INT REFERENCES Formatos_Producto(id_formato_producto) NOT NULL,
    id_trabajador INT REFERENCES Trabajadores(id_trabajador),
    id_proceso INT REFERENCES Procesos(id_proceso),
    id_ubicacion INT REFERENCES Ubicaciones_Inventario(id_ubicacion),
    fecha_jornada DATE NOT NULL DEFAULT CURRENT_DATE,
    etiqueta_inicial INT NOT NULL,
    etiqueta_final INT,
    cantidad_producida INT,
    costo_por_unidad DECIMAL(10, 2),
    origen VARCHAR(255),
    estado VARCHAR(50) DEFAULT 'Iniciada',
    hora_inicio TIME WITHOUT TIME ZONE,
    hora_finalizacion TIME WITHOUT TIME ZONE,
    etiquetas_defectuosas TEXT
);

CREATE TABLE IF NOT EXISTS Caja (
    id_caja SERIAL PRIMARY KEY,
    fecha DATE,
    monto_inicial DECIMAL(10, 2),
    monto_final DECIMAL(10, 2),
    estado VARCHAR(50) NOT NULL DEFAULT 'cerrada',
    hora_apertura TIME,
    hora_cierre TIME
);

CREATE TABLE IF NOT EXISTS Horarios (
    id_horario SERIAL PRIMARY KEY,
    id_trabajador INT REFERENCES Trabajadores(id_trabajador),
    fecha DATE,
    hora_ingreso TIME,
    hora_salida TIME
);

-- Fin del Esquema Consolidado
