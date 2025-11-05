## Avance del Proyecto

## Avance del Proyecto

### Próximos Pasos: Funcionalidades a Desarrollar

Tras un análisis detallado del backend y la base de datos, se ha definido la siguiente hoja de ruta para las próximas implementaciones, ordenada por prioridad:

1.  **[DONE] CRUD para Formatos de Producto y Procesos:**
    *   Crear endpoints dedicados para la gestión completa (crear, leer, actualizar, eliminar) de `Formatos_Producto` y `Procesos` (recetas), permitiendo a la administración configurar el sistema sin acceder a la base de datos.

2.  **Gestión de Caja:**
    *   Implementar la lógica para la apertura y cierre de caja, y el registro de movimientos de efectivo.

3.  **Gestión de Horarios de Trabajadores:**
    *   Desarrollar los endpoints para registrar y consultar las horas de entrada y salida de los trabajadores.

4.  **Historial de Precios Automático:**
    *   Implementar la lógica que guarde automáticamente los cambios de precio en la tabla `Historial_Precios`.

5.  **Gestión de Transferencias Bancarias:**
    *   Crear los endpoints para registrar y consultar transferencias entre cuentas bancarias de la empresa.

### miércoles, 5 de noviembre de 2025

- **Descripción:**
  - Se refactorizó la estructura del backend para organizar las rutas en módulos individuales, siguiendo las mejores prácticas de desarrollo.
  - Se movieron los archivos de rutas y pruebas a sus correspondientes carpetas de módulo.
  - Se actualizaron los archivos `index.js` y `jest.config.js` para reflejar la nueva estructura.
  - Se corrigieron errores en el módulo de `compras` y sus pruebas.
  - Se eliminó el archivo de prueba obsoleto `api_test.js`.

- **Descripción:**
  - Se refactorizó y se crearon pruebas para el módulo de `Ventas`.
  - Se corrigieron errores en el esquema de la base de datos de prueba.
  - Se actualizó el script `test-setup.js` para manejar las migraciones de la base de datos de forma incremental.

### martes, 4 de noviembre de 2025

- **Descripción:**
  - Se refactorizó la configuración de pruebas para el backend.
  - Se creó `app-gestion/backend/test-setup.js` para manejar el reinicio y la siembra de la base de datos de prueba.
  - Se configuró `jest.config.js` para usar `test-setup.js` como `globalSetup`.
  - Se limpió `app-gestion/backend/compras.test.js` eliminando la lógica de configuración de la base de datos de los bloques `beforeEach` y `afterAll`.
  - Se verificó que las pruebas de `compras` pasaran con la nueva configuración.
  - Se eliminaron los `console.log` de depuración.

### Estado Actual del Proyecto:

1.  **Revisar y Refactorizar Módulos Principales (Compras y Ventas):**
    *   **Compras:**
        *   [DONE] Configuración de pruebas y refactorización completada.
        *   [DONE] Suite de pruebas expandida para cubrir escenarios de creación, lectura, actualización y eliminación (CRUD), incluyendo casos límite y manejo de errores de validación.
    *   **Ventas:**
        *   [DONE] Refactorización y creación de pruebas completada.
2.  **Asegurar Rutas Restantes (products, lotes, produccion, reclamos, compras, ventas):**
    *   [TODO] Pendiente.
3.  **Pruebas Exhaustivas:**
    *   [TODO] Pendiente.
4.  **Actualizar Documentación:**
    *   [DONE] Actualización de `avance_del_proyecto.md`.



### 1. Base de Datos (PostgreSQL)

**Progreso: 99%**

-   **Completado:**
    -   Diseño y creación del esquema inicial (productos, clientes, ventas, etc.).
    -   Implementación de sistema de usuarios y roles.
    -   Mecanismo de trazabilidad a través de `Lotes_Produccion`.
    -   Tablas para gestionar el ciclo de producción (`Produccion_Diaria`, `Procesos`).
    -   Tablas para el flujo de pedidos y ventas (`Pedidos`, `Ventas`).
    -   Tablas para el flujo de compras (`Compras`, `Detalle_Compras`, `Proveedores`).
    -   Historial de precios y costos para análisis de rentabilidad.
    -   Sistema de migraciones numeradas para control de versiones.
    -   Inserción de datos de prueba (proveedores, inventario, compras, pedidos/ventas, reclamos, ciudades, puntos de venta).
    -   Adición de restricción única en `Inventario` (id_formato_producto, id_ubicacion).
    -   Adición de columna `con_factura` a la tabla `Pedidos`. (Ya mencionado)
    -   Consolidación del esquema de la base de datos en `postgres_schema_consolidado.sql`. (Ya mencionado)
    -   **Eliminación de la columna `unidad_medida` de la tabla `Productos`.**

-   **Pendiente:**
    -   Posibles ajustes para el **Módulo de Reclamos**. (Ya mencionado)

---

### 2. Backend (Node.js)

**Progreso: 95%**

-   **Completado:**
    -   Endpoints para la gestión de **Proveedores** (crear y listar).
    -   Endpoints para el historial y registro de **Compras**.
    -   Endpoints para el flujo completo de **Producción** (iniciar y finalizar jornada).
    -   Endpoints para el flujo de **Pedidos y Ventas** (agendar pedido, convertir a venta).
    -   Endpoints de utilidad (búsqueda de clientes, listas de formatos, etc.).
    -   Lógica de negocio para descuento de inventario basado en procesos.
    -   Mejora del endpoint `GET /clients` para incluir tipo de cliente y fuente de contacto.
    -   Endpoints para la **Gestión de Reclamos** (CRUD completo).
    -   Integración de la gestión de tokens y roles básicos para autenticación.
    -   Implementación de la lógica de autorización basada en roles.

-   **Pendiente:**
    -   (Ninguno en esta fase, la lógica de roles está implementada en el frontend y el backend está listo para la autorización granular)

---

### 3. Frontend (React)

**Progreso: 95%**

-   **Completado:**
    -   Interfaz para la **Gestión de Proveedores** (crear y listar).
    -   Interfaz para la **Gestión de Compras** (historial y registro).
    -   Interfaz mejorada para la **Gestión de Clientes** (CRUD completo y más detalles).
    -   Interfaz para la **Gestión de Reclamos** (CRUD completo).
    -   Estructura de navegación principal (`AdminDashboard`).
    -   Servicio centralizado para la comunicación con el backend (`apiService.js`).
    -   Interfaz para el flujo de **Producción** (`ProduccionDiaria.js`).
    -   Interfaz para **Agendar Pedidos** (`PedidoForm.js`).
    -   Interfaz para **Gestionar Pedidos** y convertirlos en ventas (`PedidosManagement.js`).
    -   Implementación del ruteo protegido con `react-router-dom`.P
    -   Implementación de la lógica para mostrar/ocultar vistas según el rol del usuario.

-   **Pendiente:**
    -   (Ninguno en esta fase, la lógica de roles está implementada)

---

### 4. Conectividad y Despliegue

**Progreso: 50%**

-   **Completado:**
    -   Conexión exitosa entre el Frontend y el Backend.
    -   Conexión exitosa entre el Backend y la Base de Datos.
    -   Entorno de desarrollo local funcional y orquestado con Docker (`docker-compose`).

-   **Pendiente:**
    -   Definir una estrategia de despliegue (ej. a un servicio en la nube).
    -   Crear pipelines de CI/CD (Integración y Despliegue Continuo) para automatizar las actualizaciones.