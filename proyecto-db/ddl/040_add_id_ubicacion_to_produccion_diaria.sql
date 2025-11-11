-- Migration to add id_ubicacion to Produccion_Diaria table
ALTER TABLE Produccion_Diaria
ADD COLUMN id_ubicacion INT REFERENCES Ubicaciones_Inventario(id_ubicacion);