-- Migration to add a unique constraint to Formatos_Producto
ALTER TABLE Formatos_Producto
ADD CONSTRAINT unique_producto_formato UNIQUE (id_producto, formato);
