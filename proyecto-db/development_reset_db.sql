-- SCRIPT DE DESARROLLO: NO USAR EN PRODUCCIÓN
-- Este script elimina todas las tablas para empezar de cero.
-- Ejecutar solo si se necesita un reinicio completo de la base de datos local.

-- Eliminar tablas en orden inverso de dependencia
DROP TABLE IF EXISTS Detalle_Recetas;
DROP TABLE IF EXISTS Recetas;
DROP TABLE IF EXISTS Detalle_Movimientos_Inventario;
DROP TABLE IF EXISTS Inventario;
DROP TABLE IF EXISTS Detalle_Ventas;
DROP TABLE IF EXISTS Detalle_Compras;
DROP TABLE IF EXISTS Transferencias_Bancarias;
DROP TABLE IF EXISTS Movimientos_Inventario;
DROP TABLE IF EXISTS Ventas;
DROP TABLE IF EXISTS Compras;
DROP TABLE IF EXISTS Horarios;
DROP TABLE IF EXISTS Formatos_Producto;
DROP TABLE IF EXISTS Productos;
DROP TABLE IF EXISTS Clientes;
DROP TABLE IF EXISTS Proveedores;
DROP TABLE IF EXISTS Puntos_Venta;
DROP TABLE IF EXISTS Ubicaciones_Inventario;
DROP TABLE IF EXISTS Trabajadores;
DROP TABLE IF EXISTS Caja;
DROP TABLE IF EXISTS Cuentas_Bancarias;
DROP TABLE IF EXISTS Ciudades;
DROP TABLE IF EXISTS Tipos_Pago;
DROP TABLE IF EXISTS Categorias_Cliente;
DROP TABLE IF EXISTS Fuentes_Contacto;
