# Contrato de API del Frontend

Este documento describe todas las interacciones que el frontend realiza con la API del backend. Sirve como un contrato o resumen técnico de la implementación.

**Servicio Central:** `src/apiService.js`
**Autenticación:** `src/AuthContext.js`

---

## 1. Autenticación

### `LoginPage.js`
- **`POST /login`**
  - **Pide:** `{ username, password }`
  - **Recibe:** `{ message, token, role, id_usuario }`
  - **Uso:** Inicia la sesión del usuario y guarda el token, rol e ID en el `AuthContext`.

---

## 2. Módulos de Gestión

### `ProveedoresManagement.js`
- **`GET /proveedores`**
  - **Recibe:** `[ { id_proveedor, nombre, rut, telefono, nombre_ciudad } ]`
- **`POST /proveedores`**
  - **Envía:** `{ nombre, rut, telefono, id_ciudad }`

### `ClientManagement.js` y `ClienteFormModal.js`
- **`GET /clients`**
  - **Recibe:** `[ { id_cliente, nombre, telefono, email, nombre_tipo_cliente, nombre_fuente_contacto } ]`
- **`GET /clients/:id`**
  - **Recibe:** `{ id_cliente, nombre, telefono, email, direccion, id_ciudad, ... }` (Objeto completo)
- **`POST /clients`**
  - **Envía:** `{ nombre, telefono, email, direccion, id_ciudad, id_tipo_cliente, id_fuente_contacto }`
- **`PUT /clients/:id`**
  - **Envía:** Mismos campos que en POST.
- **`DELETE /clients/:id`**
  - No envía cuerpo.

### `ComprasManagement.js`
- **`GET /compras`**
  - **Recibe:** `[ { id_compra, fecha, total, nombre_proveedor, detalles: [...] } ]`
- **`POST /compras`**
  - **Envía:** `{ id_proveedor, id_tipo_pago, neto, iva, total, observacion, con_factura, con_iva, detalles: [ { id_formato_producto, cantidad, precio_unitario, id_ubicacion } ] }`
- **`DELETE /compras/:id`**
  - No envía cuerpo.
- **Llama a (para el formulario):** `GET /proveedores`, `GET /formatos-producto`, `GET /ubicaciones`, `GET /tipos-pago`.

### `PedidosManagement.js`
- **`GET /pedidos`**
  - **Recibe:** `[ { id_pedido, fecha, estado, total, fecha_entrega, nombre_cliente } ]`
- **`POST /pedidos/:id/convertir-a-venta`**
  - **Envía:** `{ id_punto_venta, id_tipo_pago, con_factura, neto_venta, iva_venta, total_bruto_venta, estado_pago, observacion }`

### `PedidoForm.js`
- **`GET /pedidos/:id`** (para modo edición)
  - **Recibe:** Objeto de pedido completo.
- **`POST /pedidos`**
  - **Envía:** `{ id_cliente, id_trabajador, total, fecha_entrega, detalles: [ { id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion } ] }`
- **`PUT /pedidos/:id`** (para modo edición)
  - **Envía:** `{ id_cliente, id_trabajador, total, estado, fecha_entrega }` (No envía los detalles).
- **Llama a (para el formulario):** `GET /clients/buscar`, `GET /formatos-producto`, `GET /ubicaciones`, `GET /lotes`, `GET /inventario/stock/:id_formato_producto/:id_ubicacion`.

### `VentasManagement.js`
- **`GET /ventas`**
  - **Recibe:** `[ { id_venta, fecha, total_bruto_venta, estado, estado_pago, nombre_cliente } ]`
- **`GET /ventas/:id`**
  - **Recibe:** Objeto de venta completo con detalles.
- **`DELETE /ventas/:id`**
  - No envía cuerpo.

### `Produccion.js` (y sus hijos)
- **`GET /produccion/iniciada`** (`FinalizarProduccion.js`)
  - **Recibe:** `[ { id_produccion_diaria, estado, nombre_producto, formato } ]`
- **`PUT /produccion/:id/finalizar`** (`FinalizarProduccion.js`)
  - **Envía:** `{ etiqueta_final, etiquetas_defectuosas }`
- **`POST /produccion/iniciar`** (`IniciarProduccion.js`)
  - **Envía:** `[ { id_proceso, etiqueta_inicial, origen, id_trabajador } ]`
- **Llama a (para el formulario):** `GET /procesos?tipo=PRODUCCION`.

### `ReclamosManagement.js`
- **`GET /reclamos`**
  - **Recibe:** `[ { id_reclamo, nombre_cliente, descripcion, estado } ]`
- **`POST /reclamos`**
  - **Envía:** `{ id_cliente, id_venta, descripcion }`
- **`PUT /reclamos/:id`**
  - **Envía:** `{ estado, solucion_entregada }`
- **Llama a (para el formulario):** `GET /clients`, `GET /ventas`.

### `ProductManagement.js`
- **`GET /products`**
  - **Recibe:** `[ { id_producto, nombre, categoria, activo } ]`
- **`POST /products`**
  - **Envía:** `{ nombre, categoria }`
- **`PUT /products/:id`**
  - **Envía:** `{ nombre, categoria, activo }`
- **`DELETE /products/:id`**
  - No envía cuerpo.

### `LotesManagement.js`
- **`GET /lotes`**
  - **Recibe:** `[ { id_lote, codigo_lote, id_producto, fecha_produccion, cantidad_inicial, costo_por_unidad } ]`

### `ProcesosManagement.js`
- **`GET /procesos`**
  - **Recibe:** `[ { id_proceso, nombre_proceso, tipo_proceso, nombre_producto_final, ingredientes: [...] } ]`
- **`POST /procesos`**
  - **Envía:** `{ nombre_proceso, tipo_proceso, id_formato_producto_final, observacion, ingredientes: [...] }`
- **`PUT /procesos/:id`**
  - **Envía:** Mismos campos que en POST.
- **`DELETE /procesos/:id`**
  - No envía cuerpo.
- **Llama a (para el formulario):** `GET /formatos-producto`.
