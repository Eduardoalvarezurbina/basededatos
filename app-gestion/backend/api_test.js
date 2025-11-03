const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 3001;

// Función genérica para hacer peticiones HTTP
function request(method, path, postData) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({ statusCode: res.statusCode, body: parsedBody });
        } catch (e) {
          console.error("Failed to parse JSON response:", body);
          reject(new Error('Failed to parse JSON response.'));
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

// --- Funciones de Prueba ---

async function testCrud(entityName, basePath, postPayload, putPayload, idField) {
  let createdId;

  try {
    console.log(`\n--- INICIANDO PRUEBA PARA: ${entityName} ---`);

    // 1. POST (Crear)
    // console.log(`1. Probando POST ${basePath}...`);
    const postRes = await request('POST', basePath, postPayload);
    if (postRes.statusCode !== 201) throw new Error(`POST falló con status ${postRes.statusCode}: ${JSON.stringify(postRes.body)}`);
    
    createdId = postRes.body[idField];

    if (!createdId) throw new Error('No se pudo obtener el ID del recurso creado.');
    // console.log(`  -> ÉXITO. Creado con ID: ${createdId}`);

    // 2. GET (Leer uno)
    // console.log(`2. Probando GET ${basePath}/${createdId}...`);
    const getRes = await request('GET', `${basePath}/${createdId}`);
    if (getRes.statusCode !== 200) throw new Error(`GET (uno) falló con status ${getRes.statusCode}`);
    // console.log(`  -> ÉXITO. Obtenido: ${JSON.stringify(getRes.body)}`);

    // 3. PUT (Actualizar)
    // console.log(`3. Probando PUT ${basePath}/${createdId}...`);
    const putRes = await request('PUT', `${basePath}/${createdId}`, putPayload);
    if (putRes.statusCode !== 200) throw new Error(`PUT falló con status ${putRes.statusCode}: ${JSON.stringify(putRes.body)}`);
    // console.log(`  -> ÉXITO. Actualizado: ${JSON.stringify(putRes.body)}`);

    // 4. DELETE (Borrar)
    // console.log(`4. Probando DELETE ${basePath}/${createdId}...`);
    const deleteRes = await request('DELETE', `${basePath}/${createdId}`);
    if (deleteRes.statusCode !== 200) throw new Error(`DELETE falló con status ${deleteRes.statusCode}`);
    // console.log(`  -> ÉXITO. Borrado.`);

    // 5. GET (Verificar borrado)
    // console.log(`5. Verificando borrado con GET ${basePath}/${createdId}...`);
    const getAfterDeleteRes = await request('GET', `${basePath}/${createdId}`);
    if (getAfterDeleteRes.statusCode !== 404) throw new Error(`GET (después de borrar) debería ser 404, pero fue ${getAfterDeleteRes.statusCode}`);
    console.log(`  -> ÉXITO. Recurso no encontrado (404).`);

    console.log(`--- PRUEBA PARA ${entityName} COMPLETADA CON ÉXITO ---`);
    return true;

  } catch (error) {
    console.error(`--- PRUEBA PARA ${entityName} FALLÓ ---`);
    console.error(error.message);
    // Intentar limpiar el recurso si fue creado
    if (createdId) {
        console.log(`Intentando limpiar recurso con ID ${createdId}...`);
        await request('DELETE', `${basePath}/${createdId}`);
    }
    return false;
  }
}

async function testComprasCrud() {
    console.log(`\n--- INICIANDO PRUEBA COMPLEJA PARA: Compras ---`);
    let proveedorId, formatoId, compraId;

    try {
        // 1. Crear dependencias: Proveedor y Formato de Producto
        console.log('1. Creando dependencias (Proveedor y Formato de Producto)...');
        const proveedorRes = await request('POST', '/proveedores', { nombre: 'Proveedor para Compras', rut: '555-5', telefono: '123' });
        proveedorId = proveedorRes.body.id_proveedor;
        const formatoRes = await request('POST', '/formatos-producto', { id_producto: 1, formato: 'Formato para Compras', precio_detalle_neto: 1000 });
        formatoId = formatoRes.body.id_formato_producto;
        if (!proveedorId || !formatoId) throw new Error('No se pudieron crear las dependencias.');
        console.log(`  -> ÉXITO. Proveedor ID: ${proveedorId}, Formato ID: ${formatoId}`);

        // 2. Crear la Compra
        console.log('2. Probando POST /compras...');
        const compraPayload = {
            id_proveedor: proveedorId,
            observacion: 'Compra de prueba',
            detalles: [
                { id_formato_producto: formatoId, cantidad: 10, precio_unitario: 100, id_ubicacion: 1 } // Asumimos ubicación 1
            ]
        };
        const compraRes = await request('POST', '/compras', compraPayload);
        if (compraRes.statusCode !== 201) throw new Error(`POST /compras falló: ${JSON.stringify(compraRes.body)}`);
        compraId = compraRes.body.id_compra;
        console.log(`  -> ÉXITO. Compra creada con ID: ${compraId}`);

        // 3. Verificar la Compra creada
        console.log(`3. Probando GET /compras/${compraId}...`);
        const getRes = await request('GET', `/compras/${compraId}`);
        if (getRes.statusCode !== 200 || getRes.body.detalles.length !== 1) throw new Error(`GET /compras/${compraId} falló.`);
        console.log('  -> ÉXITO. Compra obtenida correctamente.');

        // 4. Actualizar la Compra
        console.log(`4. Probando PUT /compras/${compraId}...`);
        const putPayload = { ...getRes.body, observacion: 'Compra de prueba actualizada' };
        const putRes = await request('PUT', `/compras/${compraId}`, putPayload);
        if (putRes.statusCode !== 200 || putRes.body.compra.observacion !== 'Compra de prueba actualizada') throw new Error(`PUT /compras/${compraId} falló.`);
        console.log('  -> ÉXITO. Compra actualizada.');

        // 5. Eliminar la Compra
        console.log(`5. Probando DELETE /compras/${compraId}...`);
        const deleteRes = await request('DELETE', `/compras/${compraId}`);
        if (deleteRes.statusCode !== 200) throw new Error(`DELETE /compras/${compraId} falló: ${JSON.stringify(deleteRes.body)}`);
        console.log('  -> ÉXITO. Compra eliminada.');

        // 6. Verificar el borrado
        console.log(`6. Verificando borrado con GET /compras/${compraId}...`);
        const getAfterDelete = await request('GET', `/compras/${compraId}`);
        if (getAfterDelete.statusCode !== 404) throw new Error('La compra no fue eliminada correctamente.');
        console.log('  -> ÉXITO. Compra no encontrada (404).');

        console.log('--- PRUEBA PARA Compras COMPLETADA CON ÉXITO ---');
        return true;
    } catch (error) {
        console.error(`--- PRUEBA PARA Compras FALLÓ ---`);
        console.error(error.message);
        return false;
    } finally {
        // Limpieza de dependencias
        if (proveedorId) await request('DELETE', `/proveedores/${proveedorId}`);
        if (formatoId) await request('DELETE', `/formatos-producto/${formatoId}`);
        if (compraId) await request('DELETE', `/compras/${compraId}`); // Por si el test falló antes de limpiar
    }
}

async function testComunasCrud() {
    console.log(`\n--- INICIANDO PRUEBA COMPLEJA PARA: Comunas ---`);
    let regionId;
    try {
        console.log('1. Creando dependencia (Region)...');
        const regionRes = await request('POST', '/regiones', { nombre_region: 'Region para Comunas' });
        regionId = regionRes.body.id_region;
        if (!regionId) throw new Error('No se pudo crear la Region de dependencia.');
        console.log(`  -> ÉXITO. Region creada con ID: ${regionId}`);

        await testCrud(
            'Comuna (con dependencia)',
            '/comunas',
            { nombre_comuna: 'Comuna de Prueba', id_region: regionId },
            { nombre_comuna: 'Comuna de Prueba Actualizada', id_region: regionId },
            'id_comuna'
        );

        console.log('--- PRUEBA PARA Comunas COMPLETADA CON ÉXITO ---');
        return true;
    } catch (error) {
        console.error(`--- PRUEBA PARA Comunas FALLÓ ---`);
        console.error(error.message);
        return false;
    } finally {
        if (regionId) await request('DELETE', `/regiones/${regionId}`);
    }
}

async function testPedidoToVentaWorkflow() {
    console.log(`\n--- INICIANDO PRUEBA DE FLUJO: Pedido a Venta ---`);
    let clienteId, productoId, formatoId, loteId, pedidoId, ventaId, trabajadorId;
    const ubicacionId = 1;
    const cantidadPedido = 5;
    const precioUnitario = 1000;
    let initialStock;

    try {
        console.log('1. Creando dependencias (Cliente, Producto, Formato, Lote, Stock Inicial, Trabajador)...');
        const clienteRes = await request('POST', '/clients', { nombre: 'Cliente Pedido-Venta', telefono: '999888777' });
        clienteId = clienteRes.body.id_cliente;
        const productoRes = await request('POST', '/products', { nombre: 'Producto Pedido-Venta', categoria: 'Flujo' });
        productoId = productoRes.body.id_producto;
        const formatoRes = await request('POST', '/formatos-producto', { id_producto: productoId, formato: 'Formato Flujo', precio_detalle_neto: precioUnitario });
        formatoId = formatoRes.body.id_formato_producto;
        const loteRes = await request('POST', '/lotes', { codigo_lote: `LOTE-FLUJO-${Date.now()}`, id_producto: productoId, fecha_produccion: '2025-01-01', cantidad_inicial: 100, costo_por_unidad: 500 });
        loteId = loteRes.body.id_lote;
        const trabajadorRes = await request('POST', '/trabajadores', { nombre: 'Trabajador Flujo' });
        trabajadorId = trabajadorRes.body.id_trabajador;

        await request('POST', '/inventario', { id_formato_producto: formatoId, id_ubicacion: ubicacionId, stock_actual: 50 });
        const initialStockRes = await request('GET', `/inventario/stock/${formatoId}/${ubicacionId}`);
        initialStock = initialStockRes.body.stock_actual;
        console.log(`  -> ÉXITO. Stock inicial: ${initialStock}`);

        console.log('2. Creando un Pedido...');
        const pedidoPayload = {
            id_cliente: clienteId,
            id_trabajador: trabajadorId,
            total: cantidadPedido * precioUnitario,
            fecha_entrega: '2025-12-31',
            detalles: [{ id_formato_producto: formatoId, cantidad: cantidadPedido, precio_unitario: precioUnitario, id_lote: loteId, id_ubicacion: ubicacionId }]
        };
        const pedidoRes = await request('POST', '/pedidos', pedidoPayload);
        if (pedidoRes.statusCode !== 201) throw new Error(`POST /pedidos falló: ${JSON.stringify(pedidoRes.body)}`);
        pedidoId = pedidoRes.body.id_pedido;
        console.log(`  -> ÉXITO. Pedido creado con ID: ${pedidoId}`);

        const stockAfterPedidoRes = await request('GET', `/inventario/stock/${formatoId}/${ubicacionId}`);
        const stockAfterPedido = parseFloat(stockAfterPedidoRes.body.stock_actual);
        if (stockAfterPedido !== (parseFloat(initialStock) - cantidadPedido)) throw new Error(`Stock incorrecto después del pedido. Esperado: ${parseFloat(initialStock) - cantidadPedido}, Obtenido: ${stockAfterPedido}`);
        console.log(`  -> ÉXITO. Stock después del pedido: ${stockAfterPedido}`);

        console.log(`4. Convirtiendo Pedido ${pedidoId} a Venta...`);
        const ventaConvertPayload = { id_punto_venta: 1, id_tipo_pago: 1, neto_venta: cantidadPedido * precioUnitario, iva_venta: 0, total_bruto_venta: cantidadPedido * precioUnitario, estado_pago: 'Pagado', observacion: 'Venta convertida de pedido', con_factura: false };
        const ventaConvertRes = await request('POST', `/pedidos/${pedidoId}/convertir-a-venta`, ventaConvertPayload);
        if (ventaConvertRes.statusCode !== 201) throw new Error(`POST /pedidos/:id/convertir-a-venta falló: ${JSON.stringify(ventaConvertRes.body)}`);
        ventaId = ventaConvertRes.body.id_venta;
        console.log(`  -> ÉXITO. Pedido ${pedidoId} convertido a Venta ${ventaId}`);

        const stockAfterVentaRes = await request('GET', `/inventario/stock/${formatoId}/${ubicacionId}`);
        const stockAfterVenta = parseFloat(stockAfterVentaRes.body.stock_actual);
        if (stockAfterVenta !== stockAfterPedido) throw new Error(`Stock incorrecto después de la venta. Esperado: ${stockAfterPedido}, Obtenido: ${stockAfterVenta}`);
        console.log(`  -> ÉXITO. Stock después de la venta: ${stockAfterVenta}`);

        const getVentaRes = await request('GET', `/ventas/${ventaId}`);
        if (getVentaRes.statusCode !== 200 || getVentaRes.body.id_venta !== ventaId) throw new Error(`GET /ventas/${ventaId} falló.`);
        console.log(`  -> ÉXITO. Venta ${ventaId} verificada.`);

        console.log('--- PRUEBA DE FLUJO Pedido a Venta COMPLETADA CON ÉXITO ---');
        return true;

    } catch (error) {
        console.error(`--- PRUEBA DE FLUJO Pedido a Venta FALLÓ ---`);
        console.error(error.message);
        return false;
    } finally {
        if (ventaId) await request('DELETE', `/ventas/${ventaId}`);
        // if (pedidoId && !ventaId) await request('DELETE', `/pedidos/${pedidoId}`); // No hay endpoint para borrar pedidos
        if (clienteId) await request('DELETE', `/clients/${clienteId}`);
        if (formatoId) await request('DELETE', `/formatos-producto/${formatoId}`);
        if (productoId) await request('DELETE', `/products/${productoId}`);
        if (loteId) await request('DELETE', `/lotes/${loteId}`);
        if (trabajadorId) await request('DELETE', `/trabajadores/${trabajadorId}`);
    }
}

async function runAllTests() {
    const results = [];
    const testSuffix = new Date().getTime();

    results.push(await testCrud('Proveedores', '/proveedores', { nombre: `Proveedor de Prueba ${testSuffix}`, rut: '1234567-8', telefono: '987654321', id_ciudad: 1 }, { nombre: `Proveedor de Prueba Actualizado ${testSuffix}`, rut: '1234567-8', telefono: '987654321', id_ciudad: 2 }, 'id_proveedor'));
    results.push(await testCrud('Tipos de Cliente', '/tipos-cliente', { nombre_tipo: `Tipo de Prueba ${testSuffix}` }, { nombre_tipo: `Tipo de Prueba Actualizado ${testSuffix}` }, 'id_tipo_cliente'));
    results.push(await testCrud('Productos', '/products', { nombre: `Producto de Prueba ${testSuffix}`, categoria: 'Pruebas' }, { nombre: `Producto de Prueba Actualizado ${testSuffix}`, categoria: 'Pruebas', activo: false }, 'id_producto'));
    results.push(await testCrud('Ubicaciones', '/ubicaciones', { nombre: `Ubicación de Prueba ${testSuffix}`, tipo: 'Bodega', direccion: 'Fondo a la derecha', id_ciudad: 1 }, { nombre: `Ubicación de Prueba Actualizada ${testSuffix}`, tipo: 'Tienda', direccion: 'Fondo a la derecha', id_ciudad: 1 }, 'id_ubicacion'));
    results.push(await testCrud('Ciudades', '/ciudades', { nombre_ciudad: `Ciudad de Prueba ${testSuffix}` }, { nombre_ciudad: `Ciudad de Prueba Actualizada ${testSuffix}` }, 'id_ciudad'));
    results.push(await testCrud('Tipos de Pago', '/tipos-pago', { nombre_tipo_pago: `Tipo de Pago de Prueba ${testSuffix}` }, { nombre_tipo_pago: `Tipo de Pago de Prueba Actualizado ${testSuffix}` }, 'id_tipo_pago'));
    results.push(await testCrud('Fuentes de Contacto', '/fuentes-contacto', { nombre_fuente: `Fuente de Prueba ${testSuffix}` }, { nombre_fuente: `Fuente de Prueba Actualizada ${testSuffix}` }, 'id_fuente_contacto'));
    results.push(await testCrud('Puntos de Venta', '/puntos-venta', { nombre: `Punto de Venta de Prueba ${testSuffix}`, tipo: 'Tienda', direccion: 'Calle Falsa 123', id_ciudad: 1 }, { nombre: `Punto de Venta de Prueba Actualizado ${testSuffix}`, tipo: 'Kiosko', direccion: 'Calle Verdadera 456', id_ciudad: 1 }, 'id_punto_venta'));
    results.push(await testCrud('Trabajadores', '/trabajadores', { nombre: `Trabajador de Prueba ${testSuffix}` }, { nombre: `Trabajador de Prueba Actualizado ${testSuffix}` }, 'id_trabajador'));
    results.push(await testCrud('Regiones', '/regiones', { nombre_region: `Region de Prueba ${testSuffix}` }, { nombre_region: `Region de Prueba Actualizada ${testSuffix}` }, 'id_region'));
    results.push(await testComunasCrud());
    results.push(await testCrud('Categorias de Cliente', '/categorias-cliente', { nombre_categoria: `Categoria de Prueba ${testSuffix}` }, { nombre_categoria: `Categoria de Prueba Actualizada ${testSuffix}` }, 'id_categoria_cliente'));
    results.push(await testCrud('Clasificaciones de Cliente', '/clasificaciones-cliente', { nombre_clasificacion: `Clasificacion de Prueba ${testSuffix}` }, { nombre_clasificacion: `Clasificacion de Prueba Actualizada ${testSuffix}` }, 'id_clasificacion_cliente'));
    results.push(await testCrud('Frecuencias de Compra', '/frecuencias-compra', { nombre_frecuencia: `Frecuencia de Prueba ${testSuffix}` }, { nombre_frecuencia: `Frecuencia de Prueba Actualizada ${testSuffix}` }, 'id_frecuencia_compra'
    ));
    results.push(await testCrud('Tipos de Consumo', '/tipos-consumo', { nombre_tipo: `TC Prueba ${testSuffix}` }, { nombre_tipo: `TC Prueba Actualizado ${testSuffix}` }, 'id_tipo_consumo'
    ));
    results.push(await testCrud('Cuentas Bancarias', '/cuentas-bancarias', 
        { nombre_banco: `Banco Prueba ${testSuffix}`, tipo_cuenta: 'Corriente', numero_cuenta: `123456789${testSuffix}`, rut_titular: '11111111-1', nombre_titular: `Titular Prueba ${testSuffix}`, email_titular: `test${testSuffix}@example.com` }, 
        { nombre_banco: `Banco Actualizado ${testSuffix}`, tipo_cuenta: 'Ahorro', numero_cuenta: `987654321${testSuffix}`, rut_titular: '22222222-2', nombre_titular: `Titular Actualizado ${testSuffix}`, email_titular: `updated${testSuffix}@example.com` }, 
        'id_cuenta'
    ));
    results.push(await testCrud('Clientes', '/clients', 
        { 
            nombre: `Cliente Prueba ${testSuffix}`, 
            telefono: `+569${Math.floor(10000000 + Math.random() * 90000000)}`
        }, 
        { 
            nombre: `Cliente Actualizado ${testSuffix}`, 
            telefono: `+569${Math.floor(10000000 + Math.random() * 90000000)}`
        }, 
        'id_cliente'
    ));
    results.push(await testPedidoToVentaWorkflow());

    console.log('\n--- Resumen de Pruebas ---');
    const all_passed = results.every(r => r);
    if(all_passed) {
        console.log('¡Todas las pruebas pasaron exitosamente!');
    } else {
        console.log('Algunas pruebas fallaron. Revisa los logs de arriba.');
    }
}

runAllTests();
