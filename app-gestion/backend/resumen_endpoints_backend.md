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
    *   **Test Status:** **OK** - Tested with `compras.test.js`.

*   **GET /compras/:id**
    *   **Descripción:** Obtiene una compra específica por su ID, incluyendo sus detalles.
    *   **Parámetros:** `id` (ID de la compra).
    *   **Respuesta:** Objeto `Compra` con `detalles` y `nombre_proveedor`.
    *   **Test Status:** **OK** - Tested with `compras.test.js`.

*   **POST /compras**
    *   **Descripción:** Crea una nueva compra y actualiza el inventario.
    *   **Body:** `{ id_proveedor, observacion, detalles: [{ id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion }] }`
    *   **Respuesta:** `{ message: 'Compra creada con éxito.', id_compra: newCompraId }`
    *   **Test Status:** **OK** - Tested with `compras.test.js`, including inventory impact.

*   **PUT /compras/:id**
    *   **Descripción:** Actualiza una compra existente, incluyendo sus detalles y ajustando el inventario.
    *   **Parámetros:** `id` (ID de la compra).
    *   **Body:** `{ id_proveedor, observacion, detalles: [{ id_formato_producto, cantidad, precio_unitario, id_lote, id_ubicacion }] }`
    *   **Respuesta:** `{ message: 'Compra actualizada con éxito.' }`
    *   **Test Status:** **OK** - Tested with `compras.test.js`.

*   **DELETE /compras/:id**
    *   **Descripción:** Elimina una compra por su ID, incluyendo sus detalles y revirtiendo los cambios de inventario asociados.
    *   **Parámetros:** `id` (ID de la compra).
    *   **Respuesta:** `{ message: 'Compra eliminada con éxito.' }`
    *   **Test Status:** **OK** - Tested with `compras.test.js`.

---

## Ventas

*   **POST /ventas**
    *   **Descripción:** Crea una nueva venta. El backend calcula los totales (neto, iva, bruto), descuenta del inventario y registra los costos.
    *   **Body:** `{ fecha_transaccion, id_cliente, id_punto_venta, id_tipo_pago, factura, observaciones, detalles: [{ id_formato_producto, cantidad, precio_neto_unitario, id_lote }] }`
    *   **Respuesta (201 Created):** `{ message: 'Venta creada exitosamente', id_venta: newVentaId }`
    *   **Test Status:** PENDIENTE.

*   **GET /ventas**
    *   **Descripción:** Obtiene un historial de todas las ventas con información detallada.
    *   **Respuesta:** `Array` de objetos `Venta`. Cada objeto incluye `id_transaccion`, `fecha_transaccion`, `nombre_cliente`, `total_bruto` y un array de `detalles` con `nombre_producto`, `cantidad` y `precio_neto_unitario`.
    *   **Test Status:** PENDIENTE.

*   **GET /ventas/:id**
    *   **Descripción:** Obtiene el detalle completo de una venta específica.
    *   **Parámetros:** `id` (ID de la venta).
    *   **Respuesta:** Objeto `Venta` con `id_transaccion`, `fecha_transaccion`, `nombre_cliente`, `total_bruto` y un array de `detalles` con `nombre_producto`, `cantidad` y `precio_neto_unitario`.
    *   **Test Status:** PENDIENTE.

*   **PUT /ventas/:id**
    *   **Descripción:** Actualiza una venta existente. Esta operación es un reemplazo completo: revierte el inventario de los productos originales, elimina los detalles antiguos, inserta los nuevos detalles y descuenta el nuevo inventario.
    *   **Parámetros:** `id` (ID de la venta).
    *   **Body:** `{ fecha_transaccion, id_cliente, id_punto_venta, id_tipo_pago, factura, observaciones, detalles: [{ id_formato_producto, cantidad, precio_neto_unitario, id_lote }] }`
    *   **Respuesta (200 OK):** `{ message: 'Venta actualizada y inventario ajustado exitosamente', venta: updatedVenta }`
    *   **Test Status:** PENDIENTE.

*   **DELETE /ventas/:id**
    *   **Descripción:** Anula una venta y revierte el impacto en el inventario.
    *   **Parámetros:** `id` (ID de la venta).
    *   **Respuesta (200 OK):** `{ message: 'Venta eliminada e inventario revertido exitosamente', venta: deletedVenta }`
    *   **Test Status:** PENDIENTE.

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

---

## Ciudades

*   **GET /ciudades**
    *   **Descripción:** Obtiene todas las ciudades.
    *   **Respuesta:** `Array` de objetos `Ciudad`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **GET /ciudades/:id**
    *   **Descripción:** Obtiene una ciudad por su ID.
    *   **Parámetros:** `id` (ID de la ciudad).
    *   **Respuesta:** Objeto `Ciudad`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **POST /ciudades**
    *   **Descripción:** Crea una nueva ciudad.
    *   **Body:** `{ nombre_ciudad }`
    *   **Respuesta:** Objeto `Ciudad` creado.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **PUT /ciudades/:id**
    *   **Descripción:** Actualiza una ciudad existente.
    *   **Parámetros:** `id` (ID de la ciudad).
    *   **Body:** `{ nombre_ciudad }`
    *   **Respuesta:** `{ message: 'City updated successfully', ciudad: updatedCiudad }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **DELETE /ciudades/:id**
    *   **Descripción:** Elimina una ciudad.
    *   **Parámetros:** `id` (ID de la ciudad).
    *   **Respuesta:** `{ message: 'City deleted successfully', ciudad: deletedCiudad }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

---

## Tipos de Pago

*   **GET /tipos-pago**
    *   **Descripción:** Obtiene todos los tipos de pago.
    *   **Respuesta:** `Array` de objetos `Tipo_Pago`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **GET /tipos-pago/:id**
    *   **Descripción:** Obtiene un tipo de pago por su ID.
    *   **Parámetros:** `id` (ID del tipo de pago).
    *   **Respuesta:** Objeto `Tipo_Pago`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **POST /tipos-pago**
    *   **Descripción:** Crea un nuevo tipo de pago.
    *   **Body:** `{ nombre_tipo_pago }`
    *   **Respuesta:** Objeto `Tipo_Pago` creado.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **PUT /tipos-pago/:id**
    *   **Descripción:** Actualiza un tipo de pago existente.
    *   **Parámetros:** `id` (ID del tipo de pago).
    *   **Body:** `{ nombre_tipo_pago }`
    *   **Respuesta:** `{ message: 'Payment type updated successfully', tipo_pago: updatedTipoPago }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **DELETE /tipos-pago/:id**
    *   **Descripción:** Elimina un tipo de pago.
    *   **Parámetros:** `id` (ID del tipo de pago).
    *   **Respuesta:** `{ message: 'Payment type deleted successfully', tipo_pago: deletedTipoPago }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

---

## Fuentes de Contacto

*   **GET /fuentes-contacto**
    *   **Descripción:** Obtiene todas las fuentes de contacto.
    *   **Respuesta:** `Array` de objetos `Fuente_Contacto`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **GET /fuentes-contacto/:id**
    *   **Descripción:** Obtiene una fuente de contacto por su ID.
    *   **Parámetros:** `id` (ID de la fuente de contacto).
    *   **Respuesta:** Objeto `Fuente_Contacto`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **POST /fuentes-contacto**
    *   **Descripción:** Crea una nueva fuente de contacto.
    *   **Body:** `{ nombre_fuente }`
    *   **Respuesta:** Objeto `Fuente_Contacto` creado.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **PUT /fuentes-contacto/:id**
    *   **Descripción:** Actualiza una fuente de contacto existente.
    *   **Parámetros:** `id` (ID de la fuente de contacto).
    *   **Body:** `{ nombre_fuente }`
    *   **Respuesta:** `{ message: 'Contact source updated successfully', fuente_contacto: updatedFuenteContacto }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **DELETE /fuentes-contacto/:id**
    *   **Descripción:** Elimina una fuente de contacto.
    *   **Parámetros:** `id` (ID de la fuente de contacto).
    *   **Respuesta:** `{ message: 'Contact source deleted successfully', fuente_contacto: deletedFuenteContacto }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

---

## Puntos de Venta

*   **GET /puntos-venta**
    *   **Descripción:** Obtiene todos los puntos de venta.
    *   **Respuesta:** `Array` de objetos `Punto_Venta`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **GET /puntos-venta/:id**
    *   **Descripción:** Obtiene un punto de venta por su ID.
    *   **Parámetros:** `id` (ID del punto de venta).
    *   **Respuesta:** Objeto `Punto_Venta`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **POST /puntos-venta**
    *   **Descripción:** Crea un nuevo punto de venta.
    *   **Body:** `{ nombre, tipo, direccion, id_ciudad }`
    *   **Respuesta:** Objeto `Punto_Venta` creado.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **PUT /puntos-venta/:id**
    *   **Descripción:** Actualiza un punto de venta existente.
    *   **Parámetros:** `id` (ID del punto de venta).
    *   **Body:** `{ nombre, tipo, direccion, id_ciudad }`
    *   **Respuesta:** `{ message: 'Sale point updated successfully', punto_venta: updatedPuntoVenta }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **DELETE /puntos-venta/:id**
    *   **Descripción:** Elimina un punto de venta.
    *   **Parámetros:** `id` (ID del punto de venta).
    *   **Respuesta:** `{ message: 'Sale point deleted successfully', punto_venta: deletedPuntoVenta }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

---

## Trabajadores

*   **GET /trabajadores**
    *   **Descripción:** Obtiene todos los trabajadores.
    *   **Respuesta:** `Array` de objetos `Trabajador`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **GET /trabajadores/:id**
    *   **Descripción:** Obtiene un trabajador por su ID.
    *   **Parámetros:** `id` (ID del trabajador).
    *   **Respuesta:** Objeto `Trabajador`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **POST /trabajadores**
    *   **Descripción:** Crea un nuevo trabajador.
    *   **Body:** `{ nombre }`
    *   **Respuesta:** Objeto `Trabajador` creado.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **PUT /trabajadores/:id**
    *   **Descripción:** Actualiza un trabajador existente.
    *   **Parámetros:** `id` (ID del trabajador).
    *   **Body:** `{ nombre }`
    *   **Respuesta:** `{ message: 'Worker updated successfully', trabajador: updatedTrabajador }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **DELETE /trabajadores/:id**
    *   **Descripción:** Elimina un trabajador.
    *   **Parámetros:** `id` (ID del trabajador).
    *   **Respuesta:** `{ message: 'Worker deleted successfully', trabajador: deletedTrabajador }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

---

## Regiones

*   **GET /regiones**
    *   **Descripción:** Obtiene todas las regiones.
    *   **Respuesta:** `Array` de objetos `Region`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **GET /regiones/:id**
    *   **Descripción:** Obtiene una región por su ID.
    *   **Parámetros:** `id` (ID de la región).
    *   **Respuesta:** Objeto `Region`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **POST /regiones**
    *   **Descripción:** Crea una nueva región.
    *   **Body:** `{ nombre_region }`
    *   **Respuesta:** Objeto `Region` creado.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **PUT /regiones/:id**
    *   **Descripción:** Actualiza una región existente.
    *   **Parámetros:** `id` (ID de la región).
    *   **Body:** `{ nombre_region }`
    *   **Respuesta:** `{ message: 'Region updated successfully', region: updatedRegion }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **DELETE /regiones/:id**
    *   **Descripción:** Elimina una región.
    *   **Parámetros:** `id` (ID de la región).
    *   **Respuesta:** `{ message: 'Region deleted successfully', region: deletedRegion }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

---

## Comunas

*   **GET /comunas**
    *   **Descripción:** Obtiene todas las comunas.
    *   **Respuesta:** `Array` de objetos `Comuna`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **GET /comunas/:id**
    *   **Descripción:** Obtiene una comuna por su ID.
    *   **Parámetros:** `id` (ID de la comuna).
    *   **Respuesta:** Objeto `Comuna`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **POST /comunas**
    *   **Descripción:** Crea una nueva comuna.
    *   **Body:** `{ nombre_comuna, id_region }`
    *   **Respuesta:** Objeto `Comuna` creado.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **PUT /comunas/:id**
    *   **Descripción:** Actualiza una comuna existente.
    *   **Parámetros:** `id` (ID de la comuna).
    *   **Body:** `{ nombre_comuna, id_region }`
    *   **Respuesta:** `{ message: 'Comuna updated successfully', comuna: updatedComuna }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **DELETE /comunas/:id**
    *   **Descripción:** Elimina una comuna.
    *   **Parámetros:** `id` (ID de la comuna).
    *   **Respuesta:** `{ message: 'Comuna deleted successfully', comuna: deletedComuna }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

---

## Categorias de Cliente

*   **GET /categorias-cliente**
    *   **Descripción:** Obtiene todas las categorías de cliente.
    *   **Respuesta:** `Array` de objetos `Categoria_Cliente`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **GET /categorias-cliente/:id**
    *   **Descripción:** Obtiene una categoría de cliente por su ID.
    *   **Parámetros:** `id` (ID de la categoría de cliente).
    *   **Respuesta:** Objeto `Categoria_Cliente`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **POST /categorias-cliente**
    *   **Descripción:** Crea una nueva categoría de cliente.
    *   **Body:** `{ nombre_categoria }`
    *   **Respuesta:** Objeto `Categoria_Cliente` creado.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **PUT /categorias-cliente/:id**
    *   **Descripción:** Actualiza una categoría de cliente existente.
    *   **Parámetros:** `id` (ID de la categoría de cliente).
    *   **Body:** `{ nombre_categoria }`
    *   **Respuesta:** `{ message: 'Client category updated successfully', categoria_cliente: updatedCategoriaCliente }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **DELETE /categorias-cliente/:id**
    *   **Descripción:** Elimina una categoría de cliente.
    *   **Parámetros:** `id` (ID de la categoría de cliente).
    *   **Respuesta:** `{ message: 'Client category deleted successfully', categoria_cliente: deletedCategoriaCliente }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

---

## Clasificaciones de Cliente

*   **GET /clasificaciones-cliente**
    *   **Descripción:** Obtiene todas las clasificaciones de cliente.
    *   **Respuesta:** `Array` de objetos `Clasificacion_Cliente`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **GET /clasificaciones-cliente/:id**
    *   **Descripción:** Obtiene una clasificación de cliente por su ID.
    *   **Parámetros:** `id` (ID de la clasificación de cliente).
    *   **Respuesta:** Objeto `Clasificacion_Cliente`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **POST /clasificaciones-cliente**
    *   **Descripción:** Crea una nueva clasificación de cliente.
    *   **Body:** `{ nombre_clasificacion }`
    *   **Respuesta:** Objeto `Clasificacion_Cliente` creado.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **PUT /clasificaciones-cliente/:id**
    *   **Descripción:** Actualiza una clasificación de cliente existente.
    *   **Parámetros:** `id` (ID de la clasificación de cliente).
    *   **Body:** `{ nombre_clasificacion }`
    *   **Respuesta:** `{ message: 'Client classification updated successfully', clasificacion_cliente: updatedClasificacionCliente }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **DELETE /clasificaciones-cliente/:id**
    *   **Descripción:** Elimina una clasificación de cliente.
    *   **Parámetros:** `id` (ID de la clasificación de cliente).
    *   **Respuesta:** `{ message: 'Client classification deleted successfully', clasificacion_cliente: deletedClasificacionCliente }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

---

## Frecuencias de Compra

*   **GET /frecuencias-compra**
    *   **Descripción:** Obtiene todas las frecuencias de compra.
    *   **Respuesta:** `Array` de objetos `Frecuencia_Compra`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **GET /frecuencias-compra/:id**
    *   **Descripción:** Obtiene una frecuencia de compra por su ID.
    *   **Parámetros:** `id` (ID de la frecuencia de compra).
    *   **Respuesta:** Objeto `Frecuencia_Compra`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **POST /frecuencias-compra**
    *   **Descripción:** Crea una nueva frecuencia de compra.
    *   **Body:** `{ nombre_frecuencia }`
    *   **Respuesta:** Objeto `Frecuencia_Compra` creado.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **PUT /frecuencias-compra/:id**
    *   **Descripción:** Actualiza una frecuencia de compra existente.
    *   **Parámetros:** `id` (ID de la frecuencia de compra).
    *   **Body:** `{ nombre_frecuencia }`
    *   **Respuesta:** `{ message: 'Purchase frequency updated successfully', frecuencia_compra: updatedFrecuenciaCompra }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **DELETE /frecuencias-compra/:id**
    *   **Descripción:** Elimina una frecuencia de compra.
    *   **Parámetros:** `id` (ID de la frecuencia de compra).
    *   **Respuesta:** `{ message: 'Purchase frequency deleted successfully', frecuencia_compra: deletedFrecuenciaCompra }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

---

## Tipos de Consumo

*   **GET /tipos-consumo**
    *   **Descripción:** Obtiene todos los tipos de consumo.
    *   **Respuesta:** `Array` de objetos `Tipo_Consumo`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **GET /tipos-consumo/:id**
    *   **Descripción:** Obtiene un tipo de consumo por su ID.
    *   **Parámetros:** `id` (ID del tipo de consumo).
    *   **Respuesta:** Objeto `Tipo_Consumo`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **POST /tipos-consumo**
    *   **Descripción:** Crea un nuevo tipo de consumo.
    *   **Body:** `{ nombre_tipo }`
    *   **Respuesta:** Objeto `Tipo_Consumo` creado.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **PUT /tipos-consumo/:id**
    *   **Descripción:** Actualiza un tipo de consumo existente.
    *   **Parámetros:** `id` (ID del tipo de consumo).
    *   **Body:** `{ nombre_tipo }`
    *   **Respuesta:** `{ message: 'Consumption type updated successfully', tipo_consumo: updatedTipoConsumo }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **DELETE /tipos-consumo/:id**
    *   **Descripción:** Elimina un tipo de consumo.
    *   **Parámetros:** `id` (ID del tipo de consumo).
    *   **Respuesta:** `{ message: 'Consumption type deleted successfully', tipo_consumo: deletedTipoConsumo }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

---

## Cuentas Bancarias

*   **GET /cuentas-bancarias**
    *   **Descripción:** Obtiene todas las cuentas bancarias.
    *   **Respuesta:** `Array` de objetos `Cuenta_Bancaria`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **GET /cuentas-bancarias/:id**
    *   **Descripción:** Obtiene una cuenta bancaria por su ID.
    *   **Parámetros:** `id` (ID de la cuenta bancaria).
    *   **Respuesta:** Objeto `Cuenta_Bancaria`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **POST /cuentas-bancarias**
    *   **Descripción:** Crea una nueva cuenta bancaria.
    *   **Body:** `{ nombre_banco, tipo_cuenta, numero_cuenta, rut_titular, nombre_titular, email_titular }`
    *   **Respuesta:** Objeto `Cuenta_Bancaria` creado.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **PUT /cuentas-bancarias/:id**
    *   **Descripción:** Actualiza una cuenta bancaria existente.
    *   **Parámetros:** `id` (ID de la cuenta bancaria).
    *   **Body:** `{ nombre_banco, tipo_cuenta, numero_cuenta, rut_titular, nombre_titular, email_titular }`
    *   **Respuesta:** `{ message: 'Bank account updated successfully', cuenta_bancaria: updatedCuentaBancaria }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **DELETE /cuentas-bancarias/:id**
    *   **Descripción:** Elimina una cuenta bancaria.
    *   **Parámetros:** `id` (ID de la cuenta bancaria).
    *   **Respuesta:** `{ message: 'Bank account deleted successfully', cuenta_bancaria: deletedCuentaBancaria }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

---

## Proveedores

*   **GET /proveedores**
    *   **Descripción:** Obtiene todos los proveedores, incluyendo el nombre de la ciudad.
    *   **Respuesta:** `Array` de objetos `Proveedor` con `nombre_ciudad`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **GET /proveedores/:id**
    *   **Descripción:** Obtiene un proveedor por su ID, incluyendo el nombre de la ciudad.
    *   **Parámetros:** `id` (ID del proveedor).
    *   **Respuesta:** Objeto `Proveedor` con `nombre_ciudad`.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **POST /proveedores**
    *   **Descripción:** Crea un nuevo proveedor.
    *   **Body:** `{ nombre, rut, telefono, id_ciudad }`
    *   **Respuesta:** Objeto `Proveedor` creado.
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **PUT /proveedores/:id**
    *   **Descripción:** Actualiza un proveedor existente.
    *   **Parámetros:** `id` (ID del proveedor).
    *   **Body:** `{ nombre, rut, telefono, id_ciudad }`
    *   **Respuesta:** `{ message: 'Supplier updated successfully', proveedor: updatedProveedor }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.

*   **DELETE /proveedores/:id**
    *   **Descripción:** Elimina un proveedor.
    *   **Parámetros:** `id` (ID del proveedor).
    *   **Respuesta:** `{ message: 'Supplier deleted successfully', proveedor: deletedProveedor }`
    *   **Test Status:** **OK** - Tested with `api_test.js`.
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
