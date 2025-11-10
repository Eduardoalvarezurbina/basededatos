-- Script de Migración para añadir la columna 'activo' a la tabla Productos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='activo') THEN
        ALTER TABLE Productos
        ADD COLUMN activo BOOLEAN DEFAULT TRUE;
    END IF;
END
$$;