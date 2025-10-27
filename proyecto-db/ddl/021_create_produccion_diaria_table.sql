-- Script de Migración 021: Crear tabla de Produccion_Diaria
-- Almacena el estado de una jornada de producción iniciada pero no finalizada, para soportar el flujo de trabajo de dos pasos.

CREATE TABLE IF NOT EXISTS Produccion_Diaria (
    id_produccion_diaria SERIAL PRIMARY KEY,
    id_formato_producto INT REFERENCES Formatos_Producto(id_formato_producto) NOT NULL,
    id_trabajador INT REFERENCES Trabajadores(id_trabajador),
    fecha_jornada DATE NOT NULL DEFAULT CURRENT_DATE,
    etiqueta_inicial INT NOT NULL,
    etiqueta_final INT, -- Se llena al finalizar la jornada
    costo_por_unidad DECIMAL(10, 2),
    origen VARCHAR(255),
    estado VARCHAR(50) DEFAULT 'Iniciada' -- Posibles estados: Iniciada, Finalizada
);

COMMENT ON TABLE Produccion_Diaria IS 'Registro de las jornadas de producción diarias, para el ingreso de etiquetas en dos pasos (inicio y fin).';

CREATE INDEX IF NOT EXISTS idx_produccion_diaria_fecha_estado ON Produccion_Diaria (fecha_jornada, estado);
