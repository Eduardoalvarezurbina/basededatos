-- Migración DDL: 042_alter_procesos_for_multiple_outputs.sql
-- Propósito: Modificar la tabla Procesos para soportar múltiples productos de salida
-- y crear la tabla Detalle_Procesos_Salida.

-- Paso 1: Crear la nueva tabla Detalle_Procesos_Salida
CREATE TABLE IF NOT EXISTS Detalle_Procesos_Salida (
    id_detalle_proceso_salida SERIAL PRIMARY KEY,
    id_proceso INT NOT NULL REFERENCES Procesos(id_proceso) ON DELETE CASCADE,
    id_formato_producto_salida INT NOT NULL REFERENCES Formatos_Producto(id_formato_producto),
    cantidad_producida DECIMAL(10, 2) NOT NULL,
    UNIQUE (id_proceso, id_formato_producto_salida)
);

-- Paso 2: Eliminar la columna id_formato_producto_final de la tabla Procesos
-- Primero, verificar si la columna existe antes de intentar eliminarla
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'procesos' AND column_name = 'id_formato_producto_final') THEN
                ALTER TABLE Procesos DROP COLUMN id_formato_producto_final;
            END IF;
END $$;

-- Paso 3: Eliminar la restricción UNIQUE si existe en Procesos para nombre_proceso
-- Esto es para asegurar que no haya conflictos si se añade una nueva restricción UNIQUE en el futuro
-- o si se permite que procesos tengan el mismo nombre pero diferentes salidas.
-- Se asume que la unicidad del proceso se define por su ID.
-- No se elimina la restricción UNIQUE si no existe.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'procesos_nombre_proceso_key' AND conrelid = 'procesos'::regclass) THEN
                ALTER TABLE Procesos DROP CONSTRAINT procesos_nombre_proceso_key;
            END IF;
END $$;