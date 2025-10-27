-- Script de Migración 017: Añadir campo de factura a Compras y Ventas
-- Permite diferenciar transacciones con factura para fines contables y de IVA.

ALTER TABLE Compras
ADD COLUMN IF NOT EXISTS con_factura BOOLEAN DEFAULT FALSE;

ALTER TABLE Ventas
ADD COLUMN IF NOT EXISTS con_factura BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN Compras.con_factura IS 'Indica si la compra fue realizada con una factura oficial.';
COMMENT ON COLUMN Ventas.con_factura IS 'Indica si la venta fue realizada con una factura oficial.';
