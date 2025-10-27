-- Migration 024: Vincular la producción diaria a un proceso específico.
-- Esto permite que el flujo de producción (fresco a congelado) sea dinámico y basado en los procesos definidos.

-- Renombrar la tabla principal de Recetas a Procesos (si no se ha hecho).
ALTER TABLE IF EXISTS Recetas RENAME TO Procesos;

-- Renombrar la tabla de detalles (si no se ha hecho).
ALTER TABLE IF EXISTS Detalle_Recetas RENAME TO Detalle_Procesos;

-- Añadir la columna para clasificar el tipo de proceso (si no se ha hecho).
ALTER TABLE Procesos ADD COLUMN IF NOT EXISTS tipo_proceso VARCHAR(50) CHECK (tipo_proceso IN ('PRODUCCION', 'ENVASADO'));

-- Añadir la columna que referencia a la tabla Procesos.
ALTER TABLE Produccion_Diaria ADD COLUMN IF NOT EXISTS id_proceso INT REFERENCES Procesos(id_proceso);