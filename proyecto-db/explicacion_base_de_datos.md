# Explicación Detallada de la Base de Datos

Este documento explica la estructura de la base de datos. El objetivo es entender qué información contiene cada tabla, cómo se relaciona con las demás y qué preguntas de negocio podemos responder con ellas.

---

## **Tabla: `Clientes`**

- **Propósito:** Funciona como la agenda de contactos del negocio. Centraliza toda la información de las personas que nos compran.

- **Atributos Clave:**
    - `id_cliente`: Un número de identificación único para cada cliente.
    - `nombre`, `telefono`, `email`: Datos de contacto.
    - `fecha_ultima_compra`: Registra la fecha de la última vez que el cliente nos compró algo.

- **Conexiones:**
    - Con `Ventas`, `Pedidos` y `Reclamos` para saber quién realiza la acción.

- **Preguntas que Ayuda a Resolver:**
    - "¿Quiénes son nuestros clientes más leales?"
    - "Necesito contactar al cliente 'Juan Pérez', ¿cuál es su teléfono?"
    - "¿Qué clientes no han comprado nada en los últimos 6 meses?"

---

## **Tabla: `Ventas` y `Detalle_Ventas`**

- **Propósito:** Registran una venta. `Ventas` contiene el total y `Detalle_Ventas` el desglose de qué se vendió.

- **Ejemplo de Conexión:** Si un cliente compra 2kg de arándanos a granel y una pulpa de piña envasada, la tabla `Ventas` tendrá una fila con el total, y `Detalle_Ventas` tendrá dos filas (una para los arándanos y otra para la pulpa), ambas apuntando a la misma venta.

- **Preguntas que Ayuda a Resolver:**
    - "¿Cuál es nuestro producto estrella? ¿La frambuesa envasada o los arándanos a granel?"
    - "¿Qué producto nos genera mayor margen de ganancia?"
    - "Si un lote de frambuesas salió malo, ¿a qué clientes se las vendimos?"

---

## **Tabla: `Productos`**

- **Propósito:** Es el catálogo conceptual de lo que ofrecemos.

- **Atributos Clave:**
    - `nombre`: El nombre genérico del producto (ej: "Arándano", "Frambuesa", "Pulpa de Piña").
    - `categoria`: Agrupación de los productos (ej: "Berries", "Pulpas Congeladas").

- **Preguntas que Ayuda a Resolver:**
    - "¿Qué tipos de berries ofrecemos?"
    - "Listar todos los productos de la categoría 'Pulpas Congeladas'."

---

## **Tabla: `Formatos_Producto`**

- **Propósito:** Define las diferentes maneras en que un producto se vende y a qué precio.

- **Atributos Clave:**
    - `formato`: La descripción de la presentación (ej: "Envasado 500g", "Granel por kg", "Caja 2kg").
    - `precio_detalle_neto`: El precio de venta al público para ese formato.

- **Conexiones:** Es la tabla que se usa en los detalles de ventas y pedidos, y en el inventario, ya que las operaciones se hacen sobre formatos específicos (ej. se venden "Arándanos Envasados 500g", no "Arándanos" genéricos).

- **Preguntas que Ayuda a Resolver:**
    - "¿Cuánto cuesta la caja de 2kg de frambuesas?"
    - "Listar todos los formatos de venta para los arándanos."

---

## **Tabla: `Lotes_Produccion`**

- **Propósito:** Permite la trazabilidad de los productos. Cada lote es un grupo de producción con un origen y costo común.

- **Preguntas que Ayuda a Resolver:**
    - "El lote 'LOTE-FRAM-23' tiene un problema de calidad, ¿a qué clientes se les vendió?"
    - "¿Cuál fue el margen de ganancia real de los productos del lote de pulpa de piña de enero?"

---

## **Tabla: `Inventario`**

- **Propósito:** Es una foto en tiempo real de nuestro stock. Nos dice qué tenemos y dónde.

- **Preguntas que Ayuda a Resolver:**
    - "¿Cuántos envases de 500g de arándanos nos quedan en la 'Bodega Principal'?"
    - "Generar una alerta de productos con bajo stock."
    - "¿Cuál es el valor total de nuestro inventario de pulpas de fruta?"

---

## **Tabla: `Ubicaciones_Inventario`**

- **Propósito:** Una lista de los lugares físicos (bodegas, tiendas) donde podemos almacenar productos.

- **Preguntas que Ayuda a Resolver:**
    - "¿Cuáles son todos nuestros puntos de almacenamiento?"
    - "Listar todo el stock que se encuentra en la 'Tienda Centro'."

---

## **Tabla: `Proveedores`**

- **Propósito:** Nuestra agenda de proveedores.

- **Preguntas que Ayuda a Resolver:**
    - "¿Quién es nuestro principal proveedor de pulpa de fruta?"
    - "Listar todos los proveedores a los que les hemos comprado en el último año."

---

## **Tablas: `Compras` y `Detalle_Compras`**

- **Propósito:** Registran qué compramos, a quién, cuándo y por cuánto.

- **Preguntas que Ayuda a Resolver:**
    - "¿Cuánto hemos gastado en compras de berries este mes?"
    - "¿A qué precio compramos la frambuesa la última vez?"

---

## **Tablas: `Pedidos` y `Detalle_Pedidos`**

- **Propósito:** Gestionan las reservas de los clientes para preparar entregas futuras.

- **Preguntas que Ayuda a Resolver:**
    - "¿Qué pedidos de pulpa de piña tenemos que preparar para mañana?"
    - "¿El pedido del cliente 'María' ya está listo para retirar?"

---

## **Tabla: `Reclamos`**

- **Propósito:** Un sistema para registrar y dar seguimiento a las quejas de los clientes.

- **Preguntas que Ayuda a Resolver:**
    - "¿Cuántos reclamos sobre 'frambuesas en mal estado' hemos tenido este mes?"
    - "Listar todos los reclamos que todavía están 'Abiertos'."

---

## **Tabla: `Historial_Precios`**

- **Propósito:** Un registro histórico de cómo han cambiado los precios de los productos.

- **Preguntas que Ayuda a Resolver:**
    - "¿Cuánto ha subido el precio de los arándanos a granel en el último año?"
    - "¿Cuál era el precio de la pulpa de piña envasada en enero?"