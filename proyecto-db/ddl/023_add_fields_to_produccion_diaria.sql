-- Migration to add timestamps and defective labels tracking to daily production
ALTER TABLE Produccion_Diaria
ADD COLUMN hora_inicio TIME WITHOUT TIME ZONE,
ADD COLUMN hora_finalizacion TIME WITHOUT TIME ZONE,
ADD COLUMN etiquetas_defectuosas TEXT;
