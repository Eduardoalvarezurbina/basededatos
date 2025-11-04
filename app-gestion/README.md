# Resumen y Arquitectura - App Gestión

Este documento es el punto central de información del proyecto. Describe la arquitectura general, el estado de progreso actual y el historial de cambios detallado.

---

## 1. Resumen del Sistema

#### La Base de Datos (PostgreSQL)

Es el **almacén central** de la información. Guarda de forma estructurada los datos sobre clientes, productos, inventario, ventas, compras, etc.

#### El Backend (Node.js)

Es el **cerebro** del sistema. Contiene la lógica de negocio (ej: descontar stock al vender) y expone una API (un conjunto de URLs) para que el frontend pueda interactuar con los datos sin acceder directamente a la base de datos.

---

## 2. Hoja de Ruta y Progreso Actual

Este es el estado actual del desarrollo, basado en la hoja de ruta que definimos.

### **Fase 1: Cimientos y Navegación**

**ESTADO: COMPLETADA**

*   **Paso 1.1: Estructura de Navegación:**
    *   **ESTADO:** HECHO.
    *   **CONTEXTO:** Se refactorizó el `AdminDashboard` para que funcione como un contenedor principal con un menú de navegación superior.

*   **Paso 1.2: Central de API:**
    *   **ESTADO:** HECHO.
    *   **CONTEXTO:** Se creó el archivo `src/apiService.js` para centralizar las llamadas al backend, haciendo el código más limpio y fácil de mantener.

### **Fase 2: Construcción de Módulos**

**ESTADO: EN PROGRESO**

*   **Paso 2.1: Módulo de Lotes y Producción:**
    *   **ESTADO:** HECHO.
    *   **CONTEXTO:** Se implementó el flujo de producción en dos pasos (iniciar y finalizar jornada) tanto en el backend como en el frontend (`ProduccionDiaria.js`).

*   **Paso 2.2: Módulo de Compras:**
    *   **ESTADO:** HECHO.
    *   **CONTEXTO:** Se implementó la gestión de proveedores (creación y listado) y la interfaz para el registro de nuevas compras, incluyendo la selección de proveedor, productos, cantidades y cálculo automático de totales. También se añadió la visualización del historial de compras.

*   **Paso 2.3: Módulo de Pedidos y Ventas:**
    *   **ESTADO:** HECHO.
    *   **CONTEXTO:** Se completó el flujo de pedidos. Existe un formulario para **Agendar un nuevo Pedido** (`PedidoForm.js`) y una vista de gestión (`PedidosManagement.js`) que lista los pedidos agendados y permite **convertirlos en una Venta** final.

*   **Paso 2.4: Módulo de Clientes:**
    *   **ESTADO:** PENDIENTE.
    *   **CONTEXTO:** Falta mejorar la vista de clientes para mostrar toda su información y permitir la edición.

*   **Paso 2.5: Módulo de Reclamos:**
    *   **ESTADO:** HECHO.
    *   **CONTEXTO:** Se implementó la gestión completa de reclamos, incluyendo la visualización del historial, registro de nuevos reclamos asociados a clientes y ventas, y la capacidad de actualizar su estado y solución.

### **Fase 3: Autenticación y Vistas por Rol**

**ESTADO: PENDIENTE**

*   **Paso 3.1: Ruteo Protegido:**
    *   **ESTADO:** HECHO.
    *   **CONTEXTO:** Se implementó `react-router-dom` para gestionar las rutas de la aplicación, incluyendo rutas públicas y protegidas. Se estableció un `AuthContext` para manejar el estado de autenticación global y un componente `PrivateRoute` para restringir el acceso a rutas específicas.

*   **Paso 3.2: Vistas por Rol:**
    *   **ESTADO:** PENDIENTE.
    *   **CONTEXTO:** Se debe implementar la lógica para mostrar/ocultar vistas según el rol del usuario.

---

## 3. Historial de Cambios Detallado

### Implementación de Autenticación y Autorización en Rutas del Backend
- **Propósito:** Asegurar las rutas del API para que solo usuarios autenticados y autorizados puedan acceder a los recursos. Se busca proteger la información sensible y las operaciones críticas.
- **Acciones:**
    1.  Se creó un middleware de autenticación (`authMiddleware.js`) que verifica la validez de un token JWT (`verifyToken`) y autoriza el acceso basado en roles (`authorizeRole`).
    2.  Se aplicó el middleware `verifyToken` a todas las rutas GET de las entidades de datos maestros para asegurar que solo usuarios autenticados puedan leer la información.
    3.  Se aplicó el middleware `verifyToken` junto con `authorizeRole(['admin'])` a todas las rutas POST, PUT y DELETE para restringir la creación, actualización y eliminación de datos solo a los administradores.
    4.  Se securizaron las siguientes rutas: `ubicaciones`, `tipos-cliente`, `inventario`, `ciudades`, `tipos-pago`, `fuentes-contacto`, `puntos-venta`, `trabajadores`, `regiones`, `comunas`, `categorias-cliente`, `clasificaciones-cliente`, `frecuencias-compra`, `tipos-consumo`, `cuentas-bancarias`, `clients` y `proveedores`.
- **Estado Actual:** Completado. Todas las rutas de datos maestros del backend están protegidas.

### Depuración del Backend y Detección de Problema de Entorno Docker
- **Propósito:** Verificar y completar el CRUD de las APIs del backend, lo que llevó a descubrir un problema fundamental con la configuración de Docker.
- **Acciones:**
    1.  Se creó un script de prueba (`api_test.js`) para validar los endpoints de datos maestros.
    2.  Las pruebas iniciales fallaron, revelando errores en el código: columnas incorrectas en la tabla `Proveedores` (`email`, `direccion`), falta de rutas `GET /:id` en `Productos`, `Ubicaciones` y `Tipos de Cliente`, y un bug de `client.release()` que causaba caídas del servidor.
    3.  Se aplicaron múltiples correcciones al código del backend para solucionar estos errores a nivel de archivo.
    4.  A pesar de las correcciones y de reiniciar el contenedor, los errores persistían idénticos, indicando que los cambios no se estaban aplicando.
    5.  **Diagnóstico Final:** Se utilizó `docker inspect` y se descubrió que el contenedor se estaba ejecutando sin un **volumen de Docker** que sincronizara el código fuente del host con el del contenedor.
    6.  **Estado Actual:** Pendiente de corregir el archivo `docker-compose.yml` en el directorio `trabajo/` para añadir el volumen necesario y permitir que los cambios en el código se reflejen en tiempo real en el contenedor.

### Backend: Completitud del CRUD para Datos Maestros
- **Propósito:** Asegurar que todas las entidades de datos maestros (no transaccionales) tuvieran una API completa para Crear, Leer, Actualizar y Borrar (CRUD), facilitando la administración y la corrección de datos.
- **Acciones:**
    1.  **Verificación:** Se auditó el backend y se confirmó que las entidades `Clientes`, `Ubicaciones`, `Tipos de Cliente` y `Productos` ya contaban con un CRUD completo.
    2.  **Proveedores:** Se añadieron los endpoints `PUT /proveedores/:id` y `DELETE /proveedores/:id` que faltaban en el archivo `index.js`.
    3.  **Formatos de Producto:** Se añadieron los endpoints `GET /formatos-producto`, `POST /formatos-producto` y `DELETE /formatos-producto/:id` en `index.js` para completar su CRUD.

### Base de Datos: Adición de Restricciones y Columnas
- **Propósito:** Mejorar la integridad de los datos y la funcionalidad de los pedidos.
- **Acciones:**
    1.  Se añadió una restricción única a la tabla `Inventario` en las columnas `id_formato_producto` y `id_ubicacion` (Migración 025).
    2.  Se añadió la columna `con_factura` (BOOLEAN DEFAULT FALSE) a la tabla `Pedidos` (Migración 026).

### Backend: Creación Masiva de Lotes por Rango
- **Propósito:** Reflejar el proceso de producción real, donde un trabajador registra un rango de etiquetas.
- **Creación:** Se añadió un endpoint `POST /lotes/rango` (posteriormente reemplazado).

### Funcionalidad: Flujo de Producción en Dos Pasos
- **Propósito:** Implementar el flujo de trabajo real de los operarios, que registran las etiquetas iniciales al comenzar el día y las finales al terminar, incluyendo el manejo de costos y defectos.
- **Componentes y Lógica:**
    1.  **Base de Datos:** Se creó la tabla `Produccion_Diaria` y posteriormente se le añadieron campos para registrar la `hora_inicio`, `hora_finalizacion` y `etiquetas_defectuosas`.
    2.  **Backend:** Se implementaron los endpoints `POST /produccion/iniciar` y `PUT /produccion/:id/finalizar`. La lógica de finalización es robusta:
        *   Al iniciar la jornada, el **costo del lote se registra con valor 0** para ser actualizado posteriormente por Finanzas, manteniendo los roles separados.
        *   Registra la **hora de inicio y fin** para control de turnos.
        *   Permite registrar **etiquetas defectuosas** (separadas por comas) para excluirlas de la creación de lotes válidos.
    3.  **Frontend:** Se creó el componente `ProduccionDiaria.js` con dos modos de operación:
        *   **Iniciar Jornada:** Un formulario para registrar el producto y la etiqueta inicial.
        *   **Finalizar Jornada:** Una tabla que muestra las jornadas abiertas y permite ingresar la etiqueta final y las etiquetas defectuosas antes de procesar.

### Refactorización: De Recetas a Procesos
- **Propósito:** Adaptar la estructura de la base de datos para soportar los dos flujos de trabajo diferenciados ('Producción' y 'Envasado') y usar una terminología más clara.
- **Acciones (Migración 023):**
    1.  Se renombró la tabla `Recetas` a `Procesos`.
    2.  Se renombró la tabla `Detalle_Recetas` a `Detalle_Procesos`.
    3.  Se añadió la columna `tipo_proceso` a la tabla `Procesos` para poder clasificar cada uno como 'PRODUCCION' o 'ENVASADO'.

### Refactorización: Flujo de Producción Basado en Procesos
- **Propósito:** Implementar la lógica de transformación de inventario basada en los nuevos Procesos, haciendo el sistema más flexible y fiel a la realidad de la operación.
- **Acciones:**
    1.  **Base de Datos (Migración 024):** Se añadió la columna `id_proceso` a la tabla `Produccion_Diaria` para vincular cada jornada a un proceso específico.
    2.  **Backend:** Se modificaron los endpoints `iniciarProduccion` y `finalizarProduccion`. Ahora, al finalizar una jornada, el sistema consulta el Proceso asociado, descuenta los ingredientes y suma el producto final al inventario de forma automática.

### Refactorización: Simplificación del Modelo de Cliente
- **Propósito:** Alinear el sistema a la lógica de que el canal de compra se registra por transacción.
- **Acciones:**
    1.  Se eliminó la columna `id_canal_compra` de la tabla `Clientes`.
    2.  Se eliminó el endpoint `GET /canales-compra`.
    3.  Se eliminó el campo del formulario de creación de clientes.

### Frontend: Formulario para Agendar Pedidos (con Búsqueda y Creación)
- **Propósito:** Proveer una interfaz rápida para agendar pedidos.
- **Creación:**
    1.  Se implementó la búsqueda de clientes por teléfono con el endpoint `GET /clientes/buscar`.
    2.  Se implementó un formulario modal (`ClienteFormModal.js`) para la creación de clientes, con campos opcionales.

### Backend: Endpoints de Utilidad
- **Propósito:** Rellenar menús desplegables en el frontend.
- **Creación:** Se añadieron endpoints como `GET /ubicaciones`, `GET /formatos-producto`, `GET /tipos-cliente`, etc.

### Backend: Filtrado de Procesos por Tipo
- **Propósito:** Permitir que el frontend obtenga solo los procesos relevantes para cada tipo de operación (Producción o Envasado).
- **Acciones:**
    1.  Se modificó el endpoint `GET /procesos` para que acepte un parámetro de consulta `tipo` (ej. `/procesos?tipo=PRODUCCION`).
    2.  Si se proporciona el parámetro `tipo`, la consulta SQL filtra los resultados por la columna `tipo_proceso` de la tabla `Procesos`.

### Módulo de Compras: Gestión de Proveedores y Registro de Compras
- **Propósito:** Permitir el registro y seguimiento de las compras de insumos y productos, así como la gestión de proveedores.
- **Componentes y Lógica:**
    1.  **Backend:**
        *   Se añadieron endpoints `GET /proveedores` y `POST /proveedores` para la gestión de proveedores.
        *   Se implementaron endpoints `GET /compras` y `POST /compras` para listar y registrar compras, incluyendo la actualización automática del inventario.
    2.  **Frontend:**
        *   Se creó el componente `ProveedoresManagement.js` para listar y crear proveedores.
        *   Se creó el componente `ComprasManagement.js` para visualizar el historial de compras y registrar nuevas, con selección de proveedor, productos, cantidades y cálculo de totales.
        *   Se actualizaron `apiService.js` con las funciones `getProveedores`, `createProveedor`, `getCompras` y `createCompra`.
        *   Se integraron ambos componentes en el `AdminDashboard.js` para su navegación.

### Módulo de Reclamos: Gestión Completa
- **Propósito:** Permitir el registro, seguimiento y resolución de reclamos de clientes, asociándolos a clientes y ventas específicas.
- **Componentes y Lógica:**
    1.  **Backend:**
        *   Endpoints `GET /reclamos`, `POST /reclamos`, `PUT /reclamos/:id`, `DELETE /reclamos/:id` ya existentes y utilizados.
        *   El endpoint `GET /reclamos` se asegura de incluir el nombre del cliente asociado.
    2.  **Frontend:**
        *   Se creó el componente `ReclamosManagement.js` para visualizar el historial de reclamos, registrar nuevos, y actualizar su estado y solución.
        *   Se actualizó `apiService.js` con las funciones `getReclamos`, `createReclamo`, `updateReclamo` y `deleteReclamo`.
        *   Se integró el componente `ReclamosManagement.js` en el `AdminDashboard.js` para su navegación.

### Fase 3: Autenticación y Ruteo Protegido
- **Propósito:** Implementar un sistema de autenticación y gestión de rutas para asegurar el acceso a las diferentes secciones de la aplicación.
- **Componentes y Lógica:**
    1.  **Frontend:**
        *   Se instaló `react-router-dom` para la gestión de rutas.
        *   Se creó `AuthContext.js` para manejar el estado de autenticación global (usuario, rol, token).
        *   Se creó `PrivateRoute.js` para proteger rutas, redirigiendo a la página de login si el usuario no está autenticado o no tiene el rol requerido.
        *   Se refactorizó `LoginPage.js` para usar `AuthContext` y `useNavigate` para redirigir tras el login.
        *   Se refactorizó `App.js` para configurar `react-router-dom`, envolver la aplicación con `AuthProvider` y definir las rutas públicas y protegidas.
        *   Se refactorizó `AdminDashboard.js` para usar `Link` y `Outlet` de `react-router-dom` para la navegación y renderizado de sub-rutas.
        *   Se refactorizó `WorkerDashboard.js` para usar `apiService.js` y `AuthContext`.
    2.  **Backend:**
        *   El endpoint `/login` se encarga de la autenticación y devuelve el rol del usuario.
        *   `apiService.js` se actualizó para manejar la obtención de ventas (`getVentas`).

(Y así sucesivamente con el resto de funcionalidades...)