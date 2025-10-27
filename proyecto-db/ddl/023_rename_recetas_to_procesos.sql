-- Migration 023: Renombrar 'Recetas' a 'Procesos' y añadir tipo de proceso.
-- Este script adapta la estructura de recetas existente al nuevo concepto de 'Procesos',
-- diferenciando entre procesos de producción (fresco a congelado) y envasado (granel a producto final).

-- Renombrar la tabla principal de Recetas a Procesos.
ALTER TABLE Recetas RENAME TO Procesos;

-- Renombrar la tabla de detalles.
ALTER TABLE Detalle_Recetas RENAME TO Detalle_Procesos;

-- Añadir la columna para clasificar el tipo de proceso.
-- Esto será crucial para separar la lógica y la UI entre 'Producción' y 'Envasado'.
ALTER TABLE Procesos ADD COLUMN tipo_proceso VARCHAR(50) CHECK (tipo_proceso IN ('PRODUCCION', 'ENVASADO'));
