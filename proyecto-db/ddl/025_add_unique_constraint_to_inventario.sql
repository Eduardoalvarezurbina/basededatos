ALTER TABLE Inventario
ADD CONSTRAINT UQ_Inventario_FormatoUbicacion UNIQUE (id_formato_producto, id_ubicacion);