ALTER TABLE Detalle_Ventas
ADD COLUMN id_ubicacion INT REFERENCES Ubicaciones_Inventario(id_ubicacion);