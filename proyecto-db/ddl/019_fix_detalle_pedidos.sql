-- Script de Migración 019: Corregir y mejorar Detalle_Pedidos
-- 1. Cambia la referencia de id_producto a id_formato_producto para ser más específico.
-- 2. Añade la referencia al lote y la ubicación para permitir la reserva de stock y trazabilidad.

-- Se elimina la columna anterior para evitar conflictos y se añade la correcta.
ALTER TABLE Detalle_Pedidos
DROP COLUMN IF EXISTS id_producto;

ALTER TABLE Detalle_Pedidos
ADD COLUMN IF NOT EXISTS id_formato_producto INT REFERENCES Formatos_Producto(id_formato_producto),
ADD COLUMN IF NOT EXISTS id_lote INT REFERENCES Lotes_Produccion(id_lote),
ADD COLUMN IF NOT EXISTS id_ubicacion INT REFERENCES Ubicaciones_Inventario(id_ubicacion);

COMMENT ON COLUMN Detalle_Pedidos.id_formato_producto IS 'Formato específico del producto que se está pidiendo.';
COMMENT ON COLUMN Detalle_Pedidos.id_lote IS 'Lote específico del cual se reserva el producto.';
COMMENT ON COLUMN Detalle_Pedidos.id_ubicacion IS 'Ubicación específica de la cual se reserva el stock.';
