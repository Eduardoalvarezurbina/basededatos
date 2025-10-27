-- Script de Migración 020: Eliminar la columna id_canal_compra de la tabla Clientes
-- Se determinó que es mejor registrar el canal en cada transacción (Venta/Pedido) en lugar de en el cliente.

ALTER TABLE Clientes
DROP COLUMN IF EXISTS id_canal_compra;
