-- Script de Migración para crear tablas de apoyo para la tabla Clientes

CREATE TABLE IF NOT EXISTS Tipos_Cliente (
    id_tipo_cliente SERIAL PRIMARY KEY,
    nombre_tipo VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Regiones (
    id_region SERIAL PRIMARY KEY,
    nombre_region VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Comunas (
    id_comuna SERIAL PRIMARY KEY,
    nombre_comuna VARCHAR(100) NOT NULL UNIQUE,
    id_region INT REFERENCES Regiones(id_region)
);

CREATE TABLE IF NOT EXISTS Canales_Compra (
    id_canal_compra SERIAL PRIMARY KEY,
    nombre_canal VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Frecuencias_Compra (
    id_frecuencia_compra SERIAL PRIMARY KEY,
    nombre_frecuencia VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Tipos_Consumo (
    id_tipo_consumo SERIAL PRIMARY KEY,
    nombre_tipo VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Clasificaciones_Cliente (
    id_clasificacion_cliente SERIAL PRIMARY KEY,
    nombre_clasificacion VARCHAR(100) NOT NULL UNIQUE
);
