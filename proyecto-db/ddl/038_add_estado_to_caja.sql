-- Migración DDL: Añade la columna 'estado' a la tabla Caja.
ALTER TABLE Caja ADD COLUMN estado VARCHAR(50) DEFAULT 'cerrada' NOT NULL;