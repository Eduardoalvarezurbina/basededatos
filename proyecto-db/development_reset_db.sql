-- SCRIPT DE DESARROLLO: NO USAR EN PRODUCCIÓN
-- Este script elimina todas las tablas para empezar de cero.
-- Ejecutar solo si se necesita un reinicio completo de la base de datos local.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END
$$;

