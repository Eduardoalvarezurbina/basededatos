# Documentación API RESTful

**URL Base:** `http://localhost:3001`

**Nota sobre autorización:** La mayoría de los endpoints requieren un token de autenticación. Las peticiones deben incluir la cabecera: `Authorization: Bearer <token_jwt>`. Algunos endpoints también requieren un rol específico (`admin` o `trabajador`), lo cual se indicará en cada caso.

---

## Módulo de Autenticación

### **POST /login**
- **Descripción:** Autentica a un usuario y devuelve un token JWT, su rol y su ID.
- **Método:** `POST`
- **URL:** `/login`
- **Auth:** Pública
- **Request Body:**
  ```json
  {
    "username": "admin_user",
    "password": "secure_password"
  }
  ```
- **Response Body (200 OK):**
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "role": "admin",
    "id_usuario": 1
  }
  ```

---

## Módulo de Clientes (`/clients`)

(Documentación existente...)

---

## Módulo de Compras (`/compras`)

(Documentación existente...)

---

## Módulo de Pedidos (`/pedidos`)

### **POST /pedidos**
- **Descripción:** Agenda un nuevo pedido y reserva el stock.
- **Auth:** `admin`, `trabajador`
- **Request Body:**
  ```json
  {
    "id_cliente": 1,
    "id_trabajador": 1,
    "total": 5000,
    "fecha_entrega": "2025-11-10",
    "detalles": [
      {
        "id_formato_producto": 5,
        "cantidad": 2,
        "precio_unitario": 2500,
        "id_lote": 10,
        "id_ubicacion": 2
      }
    ]
  }
  ```
- **Response Body (201 Created):**
  ```json
  {
    "message": "Order scheduled successfully",
    "id_pedido": 3
  }
  ```

### **GET /pedidos**
- **Descripción:** Obtiene la lista de todos los pedidos.
- **Auth:** `admin`, `trabajador`
- **Response Body (200 OK):**
  ```json
  [
    {
      "id_pedido": 3,
      "fecha": "2025-11-06T15:00:00.000Z",
      "estado": "Agendado",
      "total": 5000,
      "fecha_entrega": "2025-11-10T03:00:00.000Z",
      "nombre_cliente": "Cliente Ejemplo"
    }
  ]
  ```

### **GET /pedidos/:id**
- **Descripción:** Obtiene un pedido específico con sus detalles.
- **Auth:** `admin`, `trabajador`
- **Response Body (200 OK):**
  ```json
  {
    "id_pedido": 3,
    "id_cliente": 1,
    "total": 5000,
    "estado": "Agendado",
    "detalles": [
        {
            "id_detalle_pedido": 1,
            "id_pedido": 3,
            "id_formato_producto": 5,
            "cantidad": 2,
            "precio_unitario": 2500,
            "id_lote": 10,
            "id_ubicacion": 2
        }
    ]
  }
  ```

### **POST /pedidos/:id/convertir-a-venta**
- **Descripción:** Convierte un pedido agendado en una venta final.
- **Auth:** `admin`, `trabajador`
- **Request Body:**
  ```json
  {
    "id_punto_venta": 1,
    "id_tipo_pago": 1,
    "con_factura": false,
    "neto_venta": 5000,
    "iva_venta": 950,
    "total_bruto_venta": 5950,
    "estado_pago": "Pagado",
    "observacion": "Venta desde pedido agendado"
  }
  ```
- **Response Body (201 Created):**
  ```json
  {
    "message": "Order converted to sale successfully",
    "id_venta": 101
  }
  ```

### **PUT /pedidos/:id**
- **Descripción:** Actualiza los datos de un pedido agendado. No modifica el detalle de productos.
- **Auth:** `admin`
- **Request Body:**
  ```json
  {
    "id_cliente": 1,
    "id_trabajador": 2,
    "total": 5500,
    "estado": "Agendado",
    "fecha_entrega": "2025-11-12"
  }
  ```
- **Response Body (200 OK):**
  ```json
  {
    "message": "Order updated successfully",
    "pedido": {
      "id_pedido": 3,
      "total": 5500,
      "estado": "Agendado"
    }
  }
  ```

---

## Módulo de Ventas (`/ventas`)

(Documentación existente...)

---

## Módulo de Productos (`/products`)

(Documentación existente...)

---

## Módulo de Proveedores (`/proveedores`)

(Documentación existente...)

---

## Módulo de Producción (`/produccion`)

(Documentación existente...)

---

## Módulo de Reclamos (`/reclamos`)

(Documentación existente...)

---

## Módulo de Inventario (`/inventario`)

### **GET /inventario/stock/:id_formato_producto/:id_ubicacion**
- **Descripción:** Obtiene el stock actual para un formato de producto específico en una ubicación determinada.
- **Auth:** `admin`, `trabajador`
- **Response Body (200 OK):**
  ```json
  {
    "stock_actual": 50
  }
  ```

---

## Módulo de Formatos de Producto (`/formatos-producto`)

### **GET /formatos-producto**
- **Descripción:** Obtiene una lista de todos los formatos de producto.
- **Auth:** `admin`, `trabajador`
- **Response Body (200 OK):**
  ```json
  [
    {
      "id_formato_producto": 1,
      "id_producto": 1,
      "formato": "500g",
      "precio_detalle_neto": 2500,
      "nombre_producto": "Pulpa de Frutilla"
    }
  ]
  ```

---

## Módulo de Ubicaciones (`/ubicaciones`)

### **GET /ubicaciones**
- **Descripción:** Obtiene una lista de todas las ubicaciones de inventario.
- **Auth:** `admin`, `trabajador`
- **Response Body (200 OK):**
  ```json
  [
    {
      "id_ubicacion": 1,
      "nombre": "Bodega Principal",
      "tipo": "Interna"
    }
  ]
  ```

---

## Módulo de Tipos de Pago (`/tipos-pago`)

### **GET /tipos-pago**
- **Descripción:** Obtiene una lista de todos los tipos de pago disponibles.
- **Auth:** `admin`, `trabajador`
- **Response Body (200 OK):**
  ```json
  [
    {
      "id_tipo_pago": 1,
      "nombre_tipo_pago": "Efectivo"
    }
  ]
  ```

---

## Módulo de Cuentas Bancarias (`/cuentas-bancarias`)

### **GET /cuentas-bancarias**
- **Descripción:** Obtiene una lista de todas las cuentas bancarias de la empresa.
- **Auth:** `admin`, `trabajador`
- **Response Body (200 OK):**
  ```json
  [
    {
      "id_cuenta": 1,
      "nombre_banco": "Banco Estado",
      "tipo_cuenta": "Cuenta Corriente",
      "numero_cuenta": "123456789"
    }
  ]
  ```

---

## Módulo de Procesos (`/procesos`)

### **GET /procesos**
- **Descripción:** Obtiene una lista de todos los procesos de producción/envasado.
- **Auth:** `admin`, `trabajador`
- **Query Params (Opcional):** `?tipo=PRODUCCION` o `?tipo=ENVASADO` para filtrar.
- **Response Body (200 OK):**
  ```json
  [
    {
      "id_proceso": 1,
      "nombre_proceso": "Producción Pulpa Frutilla 500g",
      "tipo_proceso": "PRODUCCION"
    }
  ]
  ```

### **POST /procesos**
- **Descripción:** Crea un nuevo proceso y sus ingredientes.
- **Auth:** `admin`
- **Request Body:**
  ```json
  {
    "nombre_proceso": "Envasado Mix Berries 250g",
    "tipo_proceso": "ENVASADO",
    "id_formato_producto_final": 10,
    "observacion": "Nuevo proceso de envasado",
    "ingredientes": [
      {
        "id_formato_producto_ingrediente": 3,
        "cantidad_requerida": 0.125
      },
      {
        "id_formato_producto_ingrediente": 4,
        "cantidad_requerida": 0.125
      }
    ]
  }
  ```
- **Response Body (201 Created):**
  ```json
  {
    "message": "Process created successfully",
    "id_proceso": 2
  }
  ```

### **PUT /procesos/:id**
- **Descripción:** Actualiza un proceso existente y sus ingredientes.
- **Auth:** `admin`
- **Request Body:** (Similar al de POST)
- **Response Body (200 OK):**
  ```json
  {
    "message": "Process updated successfully",
    "id_proceso": 2
  }
  ```

### **DELETE /procesos/:id**
- **Descripción:** Elimina un proceso y sus ingredientes asociados.
- **Auth:** `admin`
- **Response Body (200 OK):**
  ```json
  {
    "message": "Process deleted successfully",
    "proceso": {
      "id_proceso": 2,
      ...
    }
  }
  ```

---

## Módulo de Lotes (`/lotes`)

### **GET /lotes**
- **Descripción:** Obtiene una lista de todos los lotes de producción.
- **Auth:** `admin`, `trabajador`
- **Response Body (200 OK):**
  ```json
  [
    {
      "id_lote": 10,
      "codigo_lote": "LOTE-5-2025-11-05-100",
      "costo_por_unidad": 2000
    }
  ]
  ```
