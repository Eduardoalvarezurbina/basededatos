-- Migration 023: Renombrar 'Recetas' a 'Procesos' y añadir tipo de proceso.
-- Este script adapta la estructura de recetas existente al nuevo concepto de 'Procesos',
-- diferenciando entre procesos de producción (fresco a congelado) y envasado (granel a producto final).

-- Renombrar la tabla principal de Recetas a Procesos.
ALTER TABLE Recetas RENAME TO Procesos;

-- Renombrar la tabla de detalles.
ALTER TABLE Detalle_Recetas RENAME TO Detalle_Procesos;

-- Renombrar la columna de la clave primaria y la restricción.
ALTER TABLE Procesos RENAME CONSTRAINT recetas_pkey TO procesos_pkey;
ALTER TABLE Procesos RENAME COLUMN id_receta TO id_proceso;

-- Renombrar la columna de la clave foránea y la restricción en la tabla de detalles.
ALTER TABLE Detalle_Procesos RENAME COLUMN id_receta TO id_proceso;
ALTER TABLE Detalle_Procesos RENAME CONSTRAINT detalle_recetas_id_receta_fkey TO detalle_procesos_id_proceso_fkey;

-- Añadir la columna para clasificar el tipo de proceso.
-- Esto será crucial para separar la lógica y la UI entre 'Producción' y 'Envasado'.
ALTER TABLE Procesos ADD COLUMN tipo_proceso VARCHAR(50) CHECK (tipo_proceso IN ('PRODUCCION', 'ENVASADO'));
