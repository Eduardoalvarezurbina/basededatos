# Resumen de Endpoints del Backend

Este documento lista todos los endpoints disponibles en el backend de la aplicación, sus métodos HTTP y una breve descripción de su funcionalidad.

---

## Autenticación

*   **POST /login**
    *   **Descripción:** Autentica a un usuario y devuelve un token (o rol en este caso).
    *   **Body:** `{ username, password }`
    *   **Respuesta:** `{ message: 'Login successful', role: user.role }` o `{ message: 'Invalid credentials' }`
    *   **Test Status:** **OK** - Tested with Postman using `username: "admin", password: "admin"`. Returns `200 OK` with `{ message: 'Login successful', role: 'admin' }`.

---

## Productos

*   **GET /products**
    *   **Descripción:** Obtiene todos los productos.
    *   **Respuesta:** `Array` de objetos `Producto`.
    *   **Test Status:** **OK** - Tested with Postman. Returns `200 OK` with a list of 23 products.

*   **POST /products**
    *   **Descripción:** Crea un nuevo producto.
    *   **Body:** `{ nombre, categoria, unidad_medida }`
    *   **Respuesta:** Objeto `Producto` creado.
    *   **Test Status:** **OK** - Tested with Postman. Returns `201 Created` with the new product object.

*   **DELETE /products/:id**
    *   **Descripción:** Elimina un producto por su ID.
    *   **Parámetros:** `id` (ID del producto).
    *   **Respuesta:** `{ message: 'Product deleted successfully', product: deletedProduct }`
    *   **Test Status:** **OK** - Tested with Postman using `id = 24`. Returns `200 OK` with the deleted product object.

*   **PUT /products/:id**
    *   **Descripción:** Actualiza un producto existente por su ID.
    *   **Parámetros:** `id` (ID del producto).
    *   **Body:** `{ nombre, categoria, unidad_medida, activo }`
    *   **Respuesta:** `{ message: 'Product updated successfully', product: updatedProduct }`
    *   **Test Status:** **OK** - Tested with Postman using `id = 1` and updating `nombre` to "Frambuesa Premium". Returns `200 OK` with the updated product object.

*   **GET /products/active**
    *   **Descripción:** Obtiene todos los productos activos.
    *   **Respuesta:** `Array` de objetos `Producto` activos.
    *   **Test Status:** **OK** - Tested with Postman. Returns `200 OK` with a list of active products.

---

## Utilidades para Formularios

*   **GET /ubicaciones**
    *   **Descripción:** Obtiene todas las ubicaciones de inventario.
    *   **Respuesta:** `Array` de objetos `Ubicacion_Inventario`.
    *   **Test Status:** **OK** - Tested with Postman. Returns `200 OK` with a list of locations.
    *   **Test Status:** **OK** - Tested with Postman. Returns `200 OK` with a list of locations, including "Punto Conce Centro".

*   **GET /tipos-cliente**
    *   **Descripción:** Obtiene todos los tipos de cliente.
    *   **Respuesta:** `Array` de objetos `Tipo_Cliente`.

*   **GET /inventario/stock/:id_formato_producto/:id_ubicacion**
    *   **Descripción:** Obtiene el stock actual de un formato de producto en una ubicación específica.
    *   **Parámetros:** `id_formato_producto`, `id_ubicacion`.
    *   **Respuesta:** `{ stock_actual: number }` o `404` si no se encuentra stock.

*   **GET /formatos-producto**
    *   **Descripción:** Obtiene todos los formatos de producto con el nombre del producto asociado.
    *   **Respuesta:** `Array` de objetos `Formato_Producto` con `nombre_producto`.

*   **GET /canales-compra**
    *   **Descripción:** Obtiene todos los canales de compra.
    *   **Respuesta:** `Array` de objetos `Canal_Compra`.

*   **GET /fuentes-contacto**
    *   **Descripción:** Obtiene todas las fuentes de contacto.
    *   **Respuesta:** `Array` de objetos `Fuente_Contacto`.

---

## Formatos de Producto y Historial de Precios

*   **PUT /formatos-producto/:id**
    *   **Descripción:** Actualiza un formato de producto y registra los cambios de precio en el historial.
    *   **Parámetros:** `id` (ID del formato de producto).
    *   **Body:** `{ formato, precio_detalle_neto, precio_mayorista_neto, ultimo_costo_neto, unidad_medida }`
    *   **Respuesta:** `{ message: 'Product format updated successfully', formato_producto: updatedFormato }`

*   **GET /historial-precios/:id_formato_producto**
    *   **Descripción:** Obtiene el historial de precios de un formato de producto.
    *   **Parámetros:** `id_formato_producto`.
    *   **Respuesta:** `Array` de objetos `Historial_Precio`.

---

## Lotes de Producción

*   **GET /lotes**
    *   **Descripción:** Obtiene todos los lotes de producción.
    *   **Respuesta:** `Array` de objetos `Lote_Produccion`.

*   **GET /lotes/:id**
    *   **Descripción:** Obtiene un lote de producción específico por su ID.
    *   **Parámetros:** `id` (ID del lote).
    *   **Respuesta:** Objeto `Lote_Produccion`.

*   **POST /lotes**
    *   **Descripción:** Crea un nuevo lote de producción.
    *   **Body:** `{ codigo_lote, id_producto, fecha_produccion, fecha_vencimiento, cantidad_inicial, unidad_medida, costo_por_unidad, origen }`
    *   **Respuesta:** Objeto `Lote_Produccion` creado.

*   **PUT /lotes/:id**
    *   **Descripción:** Actualiza un lote de producción existente por su ID.
    *   **Parámetros:** `id` (ID del lote).
    *   **Body:** `{ codigo_lote, id_producto, fecha_produccion, fecha_vencimiento, cantidad_inicial, unidad_medida, costo_por_unidad, origen }`
    *   **Respuesta:** `{ message: 'Lot updated successfully', lot: updatedLot }`

*   **DELETE /lotes/:id**
    *   **Descripción:** Elimina un lote de producción por su ID.
    *   **Parámetros:** `id` (ID del lote).
    *   **Respuesta:** `{ message: 'Lot deleted successfully', lot: deletedLot }`

---

## Gestión de Procesos

*   **POST /procesos**
    *   **Descripción:** Crea un nuevo proceso con sus detalles (ingredientes).
    *   **Body:** `{ nombre_proceso, tipo_proceso, id_formato_producto_final, observacion, ingredientes: [{ id_formato_producto_ingrediente, cantidad_requerida }] }`
    *   **Respuesta:** `{ message: 'Process created successfully', id_proceso: newProcesoId }`

*   **GET /procesos**
    *   **Descripción:** Obtiene todos los procesos con sus detalles.
    *   **Query Params:** `tipo` (opcional, para filtrar por tipo de proceso: 'PRODUCCION' o 'ENVASADO').
    *   **Respuesta:** `Array` de objetos `Proceso` con `ingredientes`.

*   **PUT /procesos/:id**
    *   **Descripción:** Actualiza un proceso existente (incluyendo sus detalles).
    *   **Parámetros:** `id` (ID del proceso).
    *   **Body:** `{ nombre_proceso, tipo_proceso, id_formato_producto_final, observacion, ingredientes: [{ id_formato_producto_ingrediente, cantidad_requerida }] }`
    *   **Respuesta:** `{ message: 'Process updated successfully', id_proceso: id }`

*   **DELETE /procesos/:id**
    *   **Descripción:** Elimina un proceso por su ID.
    *   **Parámetros:** `id` (ID del proceso).
    *   **Respuesta:** `{ message: 'Process deleted successfully', proceso: deletedProceso }`

---

## Producción Diaria

*   **GET /produccion/iniciada**
    *   **Descripción:** Obtiene las jornadas de producción que aún no han finalizado.
    *   **Respuesta:** `Array` de objetos `Produccion_Diaria`.

*   **POST /produccion/iniciar**
    *   **Descripción:** Guarda el inicio de una o más jornadas de producción.
    *   **Body:** `Array` de `{ id_proceso, etiqueta_inicial, origen, id_trabajador }`
    *   **Respuesta:** `{ message: 'Production shifts started successfully', jornadas: createdJornadas }`

*   **PUT /produccion/:id/finalizar**
    *   **Descripción:** Finaliza una jornada de producción, crea los lotes y mueve el inventario.
    *   **Parámetros:** `id` (ID de la jornada de producción).
    *   **Body:** `{ etiqueta_final, etiquetas_defectuosas }`
    *   **Respuesta:** `{ message: 'Production shift finalized. X lots created successfully.' }`

---

## Reclamos

*   **GET /reclamos**
    *   **Descripción:** Obtiene todos los reclamos con el nombre del cliente asociado.
    *   **Respuesta:** `Array` de objetos `Reclamo` con `nombre_cliente`.

*   **POST /reclamos**
    *   **Descripción:** Crea un nuevo reclamo.
    *   **Body:** `{ id_cliente, id_venta, descripcion }`
    *   **Respuesta:** Objeto `Reclamo` creado.

*   **PUT /reclamos/:id**
    *   **Descripción:** Actualiza un reclamo existente (ej. cambiar estado, añadir solución).
    *   **Parámetros:** `id` (ID del reclamo).
    *   **Body:** `{ estado, solucion_entregada }`
    *   **Respuesta:** `{ message: 'Claim updated successfully', claim: updatedClaim }`

*   **DELETE /reclamos/:id**
    *   **Descripción:** Elimina un reclamo por su ID.
    *   **Parámetros:** `id` (ID del reclamo).
    *   **Respuesta:** `{ message: 'Claim deleted successfully', claim: deletedClaim }`

---

## Pedidos

*   **POST /pedidos**
    *   **Descripción:** Agenda un pedido, descuenta el stock para reservar.
    *   **Body:** `{ id_cliente, id_trabajador, total, fecha_entrega, detalles: [{ id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion }] }`
    *   **Respuesta:** `{ message: 'Order scheduled successfully', id_pedido: newPedidoId }`

*   **POST /pedidos/:id/convertir-a-venta**
    *   **Descripción:** Convierte un pedido agendado en una venta final.
    *   **Parámetros:** `id` (ID del pedido).
    *   **Body:** `{ id_punto_venta, id_tipo_pago, con_factura, neto_venta, iva_venta, total_bruto_venta, estado_pago, observacion }`
    *   **Respuesta:** `{ message: 'Order converted to sale successfully', id_venta: newVentaId }`

*   **GET /pedidos**
    *   **Descripción:** Obtiene todos los pedidos agendados con el nombre del cliente y fecha de entrega.
    *   **Respuesta:** `Array` de objetos `Pedido` con `nombre_cliente` y `fecha_entrega`.

*   **GET /pedidos/:id**
    *   **Descripción:** Obtiene un pedido específico con sus detalles.
    *   **Parámetros:** `id` (ID del pedido).
    *   **Respuesta:** Objeto `Pedido` con `detalles`.

*   **PUT /pedidos/:id**
    *   **Descripción:** Actualiza un pedido existente.
    *   **Parámetros:** `id` (ID del pedido).
    *   **Body:** `{ id_cliente, id_trabajador, total, estado, fecha_entrega }`
    *   **Respuesta:** `{ message: 'Order updated successfully', pedido: updatedPedido }`

---

## Compras

*   **GET /compras**
    *   **Descripción:** Obtiene todas las compras con sus detalles y el nombre del proveedor.
    *   **Respuesta:** `Array` de objetos `Compra` con `detalles` y `nombre_proveedor`.

*   **POST /compras**
    *   **Descripción:** Crea una nueva compra y actualiza el inventario.
    *   **Body:** `{ id_proveedor, id_tipo_pago, id_cuenta_origen, neto, iva, total, observacion, con_factura, con_iva, detalles: [{ id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion }] }`
    *   **Respuesta:** `{ message: 'Purchase created successfully', id_compra: newCompraId }`

---

## Ventas

*   **POST /ventas**
    *   **Descripción:** Crea una nueva venta, descuenta del inventario y registra costos.
    *   **Body:** `{ id_cliente, id_punto_venta, id_tipo_pago, id_trabajador, neto_venta, iva_venta, total_bruto_venta, con_iva_venta, observacion, estado, estado_pago, con_factura, detalles: [{ id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion }] }`
    *   **Respuesta:** `{ message: 'Sale created successfully', id_venta: newVentaId }`

---

## Clientes

*   **GET /clients**
    *   **Descripción:** Obtiene todos los clientes con su tipo y fuente de contacto.
    *   **Respuesta:** `Array` de objetos `Cliente` con `nombre_tipo_cliente` y `nombre_fuente_contacto`.

*   **GET /clientes/buscar**
    *   **Descripción:** Busca clientes por número de teléfono.
    *   **Query Params:** `telefono`.
    *   **Respuesta:** `Array` de objetos `Cliente`.

*   **POST /clients**
    *   **Descripción:** Crea un nuevo cliente.
    *   **Body:** `{ nombre, telefono, id_ciudad, direccion, ... (todos los campos de cliente) }`
    *   **Respuesta:** Objeto `Cliente` creado.

*   **PUT /clients/:id**
    *   **Descripción:** Actualiza un cliente existente por su ID.
    *   **Parámetros:** `id` (ID del cliente).
    *   **Body:** `{ nombre, telefono, id_ciudad, direccion, ... (todos los campos de cliente) }`
    *   **Respuesta:** `{ message: 'Client updated successfully', client: updatedClient }`

*   **DELETE /clients/:id**
    *   **Descripción:** Elimina un cliente por su ID.
    *   **Parámetros:** `id` (ID del cliente).
    *   **Respuesta:** `{ message: 'Client deleted successfully', client: deletedClient }`

---

## Proveedores

*   **GET /proveedores**
    *   **Descripción:** Obtiene todos los proveedores.
    *   **Respuesta:** `Array` de objetos `Proveedor`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **GET /proveedores/:id**
    *   **Descripción:** Obtiene un proveedor específico por su ID.
    *   **Parámetros:** `id` (ID del proveedor).
    *   **Respuesta:** Objeto `Proveedor`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **POST /proveedores**
    *   **Descripción:** Crea un nuevo proveedor.
    *   **Body:** `{ nombre, rut, telefono }`
    *   **Respuesta:** Objeto `Proveedor` creado.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **PUT /proveedores/:id**
    *   **Descripción:** Actualiza un proveedor existente por su ID.
    *   **Parámetros:** `id` (ID del proveedor).
    *   **Body:** `{ nombre, rut, telefono }`
    *   **Respuesta:** `{ message: 'Supplier updated successfully', proveedor: updatedProveedor }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **DELETE /proveedores/:id**
    *   **Descripción:** Elimina un proveedor por su ID.
    *   **Parámetros:** `id` (ID del proveedor).
    *   **Respuesta:** `{ message: 'Supplier deleted successfully', proveedor: deletedProveedor }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.
