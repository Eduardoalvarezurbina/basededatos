-- Migración DDL: Añade las columnas 'hora_apertura' y 'hora_cierre' a la tabla Caja y elimina la columna 'hora'.

-- Eliminar la columna 'hora' si existe
ALTER TABLE Caja DROP COLUMN IF EXISTS hora;

-- Añadir las nuevas columnas
ALTER TABLE Caja ADD COLUMN hora_apertura TIME;
ALTER TABLE Caja ADD COLUMN hora_cierre TIME;