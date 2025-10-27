-- Script de Migración para añadir la columna 'activo' a la tabla Productos
ALTER TABLE Productos
ADD COLUMN activo BOOLEAN DEFAULT TRUE;
