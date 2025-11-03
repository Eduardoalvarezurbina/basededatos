# Resumen del Backend (Node.js)

## Propósito General

El backend es el **cerebro y el intermediario** del sistema. No almacena datos, sino que contiene la lógica de negocio y se comunica con la base de datos para leerlos o escribirlos. Expone una API (una serie de URLs o "endpoints") que el frontend consume para mostrar información y ejecutar acciones.

## Funcionalidades Principales

*   **Gestiona Entidades:** Permite crear, leer, actualizar y borrar las entidades principales del negocio como `Productos`, `Clientes`, `Lotes`, `Reclamos`, etc.
*   **Orquesta Operaciones Complejas:** Va más allá de un simple CRUD, manejando lógica de negocio importante:
    *   **Al crear una Compra:** Automáticamente **actualiza el inventario**.
    *   **Al agendar un Pedido:** **Descuenta y reserva el stock** para evitar sobreventas.
    *   **Al convertir un Pedido en Venta:** Crea el registro de `Venta` final, transfiriendo los datos y costos.
    *   **Al actualizar un Producto:** Si el precio cambia, **registra automáticamente el cambio** en una tabla de historial.
    *   **Al finalizar una Producción:** Crea lotes en un rango y realiza la transformación de inventario (consume materia prima y crea producto terminado).

---

## Historial de Endpoints Creados

### Gestión de Lotes (`/lotes`)
- **Propósito:** Gestión completa de los lotes de producción.
- **Endpoints:**
    - `GET /lotes`: Obtiene todos los lotes.
    - `GET /lotes/:id`: Obtiene un lote específico.
    - `POST /lotes`: Crea un lote individual.
    - `PUT /lotes/:id`: Actualiza un lote.
    - `DELETE /lotes/:id`: Elimina un lote.

### Gestión de Reclamos (`/reclamos`)
- **Propósito:** Llevar un registro de la gestión post-venta.
- **Endpoints:** CRUD completo para crear, ver, actualizar y eliminar reclamos.

### Historial de Precios
- **Propósito:** Trazabilidad de los cambios de precio.
- **Endpoints:**
    - `PUT /formatos-producto/:id`: Lógica automática que crea un registro en el historial si el precio cambia.
    - `GET /historial-precios/:id_formato_producto`: Consulta el historial de un producto.

### Gestión de Compras (`/compras`)
- **Propósito:** Registrar compras a proveedores y su impacto en el inventario.
- **Endpoints:**
    - `POST /compras`: Registra una compra y actualiza el stock en la ubicación correcta.
    - `GET /compras`: Obtiene el historial de compras.
    - `GET /compras/:id`: Obtiene una compra específica por ID.
    - `PUT /compras/:id`: Actualiza campos de cabecera de una compra.
    - `DELETE /compras/:id`: Elimina una compra y revierte el inventario.

### Flujo de Pedido a Venta (`/pedidos`, `/ventas`)
- **Propósito:** Manejar el ciclo de vida completo de una venta, desde el agendamiento hasta la concreción y consulta.
- **Endpoints:**
    - `POST /pedidos`: Agenda un pedido y reserva el stock.
    - `POST /pedidos/:id/convertir-a-venta`: Transforma un pedido en una venta final.
    - `POST /ventas`: Para ventas directas que no requieren agendamiento.
    - `GET /ventas`: Obtiene un historial de todas las ventas.
    - `GET /ventas/:id`: Obtiene el detalle completo de una venta específica.

### Flujo de Producción en Dos Pasos (`/produccion`)
- **Propósito:** Reflejar el trabajo diario de producción.
- **Endpoints:**
    - `GET /produccion/iniciada`: Muestra las jornadas abiertas.
    - `POST /produccion/iniciar`: Registra el inicio de la producción y las etiquetas iniciales.
    - `PUT /produccion/:id/finalizar`: Cierra una jornada, registra etiquetas finales, crea los lotes y transforma el inventario.

### Endpoints de Utilidad (Apoyo a Formularios)
- **Propósito:** Rellenar menús desplegables en el frontend.
- **Endpoints:**
    - `GET /ubicaciones`
    - `GET /formatos-producto`
    - `GET /clientes/buscar`
    - `GET /fuentes-contacto`
    - `GET /tipos-cliente`

### Gestión de Catálogos
- **Propósito:** Administrar las tablas de apoyo del sistema (listas de opciones).
- **Endpoints:**
    - CRUD completo para `/ciudades`.
    - CRUD completo para `/tipos-pago`.
    - CRUD completo para `/fuentes-contacto`.
    - CRUD completo para `/puntos-venta`.
    - CRUD completo para `/trabajadores`.
    - CRUD completo para `/regiones`.
    - CRUD completo para `/comunas`.
    - CRUD completo para `/categorias-cliente`.
    - CRUD completo para `/clasificaciones-cliente`.
    - CRUD completo para `/frecuencias-compra`.
    - CRUD completo para `/tipos-consumo`.
    - CRUD completo para `/cuentas-bancarias`.
    - CRUD completo para `/clients`.
    - CRUD completo para `/proveedores`.
