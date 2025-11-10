-- Migration to add cantidad_producida to Produccion_Diaria
ALTER TABLE Produccion_Diaria
ADD COLUMN cantidad_producida INT;
