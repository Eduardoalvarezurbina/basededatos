-- Agrega la columna id_ubicacion a la tabla Detalle_Compras
ALTER TABLE Detalle_Compras ADD COLUMN id_ubicacion INTEGER REFERENCES Ubicaciones_Inventario(id_ubicacion);
