-- Script de Migración 015: Añadir costo a Detalle_Ventas
-- Permite el cálculo de utilidades por venta al "congelar" el costo del producto en el momento de la transacción.

ALTER TABLE Detalle_Ventas
ADD COLUMN IF NOT EXISTS costo_unitario_en_venta DECIMAL(10, 2);

COMMENT ON COLUMN Detalle_Ventas.costo_unitario_en_venta IS 'El costo del producto en el momento exacto de la venta, para cálculo de utilidad.';
