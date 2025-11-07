-- Script de reinicio completo y siembra de datos para desarrollo
-- ADVERTENCIA: Esto eliminará y recreará toda la base de datos.

-- 1. Eliminar todas las tablas existentes (DDL)
\i /docker-entrypoint-initdb.d/proyecto-db/development_reset_db.sql

-- 2. Recrear el esquema de la base de datos (DDL)
-- Asegúrate de que estos scripts estén en el orden correcto de dependencia
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/001_initial_schema.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/005_create_users_table.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/008_add_activo_to_productos.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/009_create_orders_tables.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/012_create_lookup_tables_for_clientes.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/013_alter_clientes_table.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/014_create_reclamos_table.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/015_add_costo_to_detalle_ventas.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/016_create_historial_precios_table.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/017_add_factura_to_transacciones.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/018_create_lotes_and_add_to_details.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/019_fix_detalle_pedidos.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/020_remove_canal_from_clientes.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/021_rename_recetas_to_procesos.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/022_create_produccion_diaria_table.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/023_add_fields_to_produccion_diaria.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/024_add_proceso_to_produccion_diaria.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/025_add_unique_constraint_to_inventario.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/026_add_con_factura_to_pedidos.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/027_add_fecha_entrega_to_pedidos.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/028_drop_unidad_medida_from_productos.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/030_add_id_ubicacion_to_detalle_ventas.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/031_rename_nombre_receta_to_nombre_proceso.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/032_rename_id_detalle_receta_to_id_detalle_proceso.sql
\i /docker-entrypoint-initdb.d/proyecto-db/ddl/033_add_hora_to_caja.sql

-- 3. Insertar datos iniciales (DML)
-- Asegúrate de que estos scripts estén en el orden correcto de dependencia
\i /docker-entrypoint-initdb.d/proyecto-db/dml/002_insert_initial_data.sql
\i /docker-entrypoint-initdb.d/proyecto-db/dml/003_insert_products.sql
\i /docker-entrypoint-initdb.d/proyecto-db/dml/004_insert_people_final.sql
\i /docker-entrypoint-initdb.d/proyecto-db/dml/006_insert_admin_user.sql
\i /docker-entrypoint-initdb.d/proyecto-db/dml/010_insert_worker_user.sql
\i /docker-entrypoint-initdb.d/proyecto-db/dml/011_insert_trinidad_worker_user.sql
\i /docker-entrypoint-initdb.d/proyecto-db/dml/019_insert_new_cities.sql
\i /docker-entrypoint-initdb.d/proyecto-db/dml/019_insert_test_puntos_venta.sql
\i /docker-entrypoint-initdb.d/proyecto-db/dml/019_insert_test_suppliers.sql
\i /docker-entrypoint-initdb.d/proyecto-db/dml/020_insert_test_ubicaciones.sql
\i /docker-entrypoint-initdb.d/proyecto-db/dml/021_insert_test_inventory.sql
\i /docker-entrypoint-initdb.d/proyecto-db/dml/022_insert_test_purchases.sql
\i /docker-entrypoint-initdb.d/proyecto-db/dml/023_insert_test_orders_sales.sql
\i /docker-entrypoint-initdb.d/proyecto-db/dml/024_insert_test_claims.sql
\i /docker-entrypoint-initdb.d/proyecto-db/dml/025_update_admin_password.sql
\i /docker-entrypoint-initdb.d/proyecto-db/dml/026_update_admin_password_to_admin.sql
