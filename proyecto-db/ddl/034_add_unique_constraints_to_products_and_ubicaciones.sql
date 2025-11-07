ALTER TABLE Productos ADD CONSTRAINT unique_nombre UNIQUE (nombre);
ALTER TABLE Ubicaciones_Inventario ADD CONSTRAINT unique_ubicacion_nombre UNIQUE (nombre);