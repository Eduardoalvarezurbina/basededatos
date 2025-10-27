# Avance del Proyecto: App Gestión

Este documento resume el estado de desarrollo del proyecto, dividido en sus componentes principales.

---

### 1. Base de Datos (PostgreSQL)

**Progreso: 90%**

-   **Completado:**
    -   Diseño y creación del esquema inicial (productos, clientes, ventas, etc.).
    -   Implementación de sistema de usuarios y roles.
    -   Mecanismo de trazabilidad a través de `Lotes_Produccion`.
    -   Tablas para gestionar el ciclo de producción (`Produccion_Diaria`, `Procesos`).
    -   Tablas para el flujo de pedidos y ventas (`Pedidos`, `Ventas`).
    -   Tablas para el flujo de compras (`Compras`, `Detalle_Compras`, `Proveedores`).
    -   Historial de precios y costos para análisis de rentabilidad.
    -   Sistema de migraciones numeradas para control de versiones.

-   **Pendiente:**
    -   Posibles ajustes para el **Módulo de Reclamos**.

---

### 2. Backend (Node.js)

**Progreso: 60%**

-   **Completado:**
    -   Endpoints para la gestión de **Proveedores** (crear y listar).
    -   Endpoints para el historial y registro de **Compras**.
    -   Endpoints para el flujo completo de **Producción** (iniciar y finalizar jornada).
    -   Endpoints para el flujo de **Pedidos y Ventas** (agendar pedido, convertir a venta).
    -   Endpoints de utilidad (búsqueda de clientes, listas de formatos, etc.).
    -   Lógica de negocio para descuento de inventario basado en procesos.

-   **Pendiente:**
    -   Desarrollar los endpoints para el **Módulo de Reclamos**.
    -   Implementar la autenticación de usuarios (login) y gestión de tokens.
    -   Implementar la lógica de autorización basada en roles.

---

### 3. Frontend (React)

**Progreso: 60%**

-   **Completado:**
    -   Interfaz para la **Gestión de Proveedores** (crear y listar).
    -   Interfaz para la **Gestión de Compras** (historial y registro).
    -   Estructura de navegación principal (`AdminDashboard`).
    -   Servicio centralizado para la comunicación con el backend (`apiService.js`).
    -   Interfaz para el flujo de **Producción** (`ProduccionDiaria.js`).
    -   Interfaz para **Agendar Pedidos** (`PedidoForm.js`).
    -   Interfaz para **Gestionar Pedidos** y convertirlos en ventas (`PedidosManagement.js`).

-   **Pendiente:**
    -   Crear la interfaz para el **Módulo de Reclamos**.
    -   Mejorar la vista de **Gestión de Clientes**.
    -   Implementar el ruteo protegido (`react-router-dom`).
    -   Implementar la lógica para mostrar/ocultar vistas según el rol del usuario.

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
