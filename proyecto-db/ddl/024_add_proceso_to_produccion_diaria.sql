-- Migration 024: Vincular la producción diaria a un proceso específico.
-- Esto permite que el flujo de producción (fresco a congelado) sea dinámico y basado en los procesos definidos.

-- Añadir la columna que referencia a la tabla Procesos.
ALTER TABLE Produccion_Diaria ADD COLUMN IF NOT EXISTS id_proceso INT REFERENCES Procesos(id_proceso);