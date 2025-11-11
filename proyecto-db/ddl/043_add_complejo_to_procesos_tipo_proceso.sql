-- Migración DDL: 043_add_complejo_to_procesos_tipo_proceso.sql
-- Propósito: Añadir 'COMPLEJO' como valor permitido en la restricción CHECK
-- de la columna tipo_proceso en la tabla Procesos.

ALTER TABLE Procesos
DROP CONSTRAINT procesos_tipo_proceso_check;

ALTER TABLE Procesos
ADD CONSTRAINT procesos_tipo_proceso_check
CHECK (tipo_proceso IN ('PRODUCCION', 'ENVASADO', 'COMPLEJO'));