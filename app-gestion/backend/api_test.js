const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 3001;

// Función genérica para hacer peticiones HTTP
function request(method, path, postData, token) {
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

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

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
    }d
    req.end();
  });
}

// --- Funciones de Prueba ---

async function testCrud(entityName, basePath, postPayload, putPayload, idField, token) {
  let createdId;

  try {
    console.log(`\n--- INICIANDO PRUEBA PARA: ${entityName} ---`);

    // 1. POST (Crear)
    const postRes = await request('POST', basePath, postPayload, token);
    if (postRes.statusCode !== 201) throw new Error(`POST falló con status ${postRes.statusCode}: ${JSON.stringify(postRes.body)}`);
    
    createdId = postRes.body[idField];

    if (!createdId) throw new Error('No se pudo obtener el ID del recurso creado.');

    // 2. GET (Leer uno)
    const getRes = await request('GET', `${basePath}/${createdId}`, null, token);
    if (getRes.statusCode !== 200) throw new Error(`GET (uno) falló con status ${getRes.statusCode}`);

    // 3. PUT (Actualizar)
    const putRes = await request('PUT', `${basePath}/${createdId}`, putPayload, token);
    if (putRes.statusCode !== 200) throw new Error(`PUT falló con status ${putRes.statusCode}: ${JSON.stringify(putRes.body)}`);

    // 4. DELETE (Borrar)
    const deleteRes = await request('DELETE', `${basePath}/${createdId}`, null, token);
    if (deleteRes.statusCode !== 200) throw new Error(`DELETE falló con status ${deleteRes.statusCode}`);

    // 5. GET (Verificar borrado)
    const getAfterDeleteRes = await request('GET', `${basePath}/${createdId}`, null, token);
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
        await request('DELETE', `${basePath}/${createdId}`, null, token);
    }
    return false;
  }
}

async function testComprasCrud() {
    console.log(`\n--- INICIANDO PRUEBA COMPLEJA PARA: Compras ---`);
    let proveedorId, formatoId, compraId, adminToken, workerToken;
    const ubicacionId = 1; // Ubicación de prueba
    const cantidadComprada = 10;
    let initialStock;

    try {
        // 0. Login as admin and worker to get tokens
        console.log('0. Obteniendo tokens de autenticación...');
        const adminLoginRes = await request('POST', '/login', { username: 'admin', password: 'admin' });
        adminToken = adminLoginRes.body.token;
        const workerLoginRes = await request('POST', '/login', { username: 'worker', password: 'worker' });
        workerToken = workerLoginRes.body.token;
        if (!adminToken || !workerToken) throw new Error('No se pudieron obtener los tokens de autenticación.');
        console.log('  -> ÉXITO. Tokens obtenidos.');

        // 1. Crear dependencias y obtener stock inicial
        console.log('1. Creando dependencias y verificando stock inicial...');
        const proveedorRes = await request('POST', '/proveedores', { nombre: 'Proveedor para Compras', rut: '555-5', telefono: '123' }, adminToken);
        proveedorId = proveedorRes.body.id_proveedor;
        const formatoRes = await request('POST', '/formatos-producto', { id_producto: 1, formato: 'Formato para Compras', precio_detalle_neto: 1000 }, adminToken);
        formatoId = formatoRes.body.id_formato_producto;
        if (!proveedorId || !formatoId) throw new Error('No se pudieron crear las dependencias.');
        
        try {
            const stockRes = await request('GET', `/inventario/stock/${formatoId}/${ubicacionId}`, adminToken);
            if (stockRes.statusCode === 404) {
                initialStock = 0;
            } else {
                initialStock = parseFloat(stockRes.body.stock_actual);
            }
        } catch (e) {
            if (e.statusCode !== 404) {
                throw e;
            }
            initialStock = 0;
        }
        console.log(`  -> ÉXITO. Proveedor ID: ${proveedorId}, Formato ID: ${formatoId}, Stock Inicial: ${initialStock}`);

        // 2. Crear la Compra (con admin token)
        console.log('2. Probando POST /compras (admin)...');
        const compraPayload = {
            id_proveedor: proveedorId,
            observacion: 'Compra de prueba',
            detalles: [
                { id_formato_producto: formatoId, cantidad: cantidadComprada, precio_unitario: 100, id_ubicacion: ubicacionId }
            ]
        };
        const compraRes = await request('POST', '/compras', compraPayload, adminToken);
        if (compraRes.statusCode !== 201) throw new Error(`POST /compras (admin) falló: ${JSON.stringify(compraRes.body)}`);
        compraId = compraRes.body.id_compra;
        console.log(`  -> ÉXITO. Compra creada con ID: ${compraId}`);

        // 3. Verificar aumento de stock
        console.log('3. Verificando aumento de stock...');
        const stockAfterPostRes = await request('GET', `/inventario/stock/${formatoId}/${ubicacionId}`, adminToken);
        const stockAfterPost = parseFloat(stockAfterPostRes.body.stock_actual);
        if (stockAfterPost !== initialStock + cantidadComprada) {
            throw new Error(`El stock no aumentó correctamente. Esperado: ${initialStock + cantidadComprada}, Obtenido: ${stockAfterPost}`);
        }
        console.log(`  -> ÉXITO. Stock después de la compra: ${stockAfterPost}`);

        // 4. Intentar crear compra con worker token (debe fallar)
        console.log('4. Probando POST /compras (worker)...');
        const compraWorkerRes = await request('POST', '/compras', compraPayload, workerToken);
        if (compraWorkerRes.statusCode !== 403) throw new Error(`POST /compras (worker) debería haber fallado con 403, pero fue ${compraWorkerRes.statusCode}`);
        console.log('  -> ÉXITO. La creación de compra con rol de trabajador falló como se esperaba (403).');

        // 5. Eliminar la Compra (con admin token)
        console.log(`5. Probando DELETE /compras/${compraId} (admin)...`);
        const deleteRes = await request('DELETE', `/compras/${compraId}`, null, adminToken);
        if (deleteRes.statusCode !== 200) throw new Error(`DELETE /compras/${compraId} (admin) falló: ${JSON.stringify(deleteRes.body)}`);
        console.log('  -> ÉXITO. Compra eliminada.');

        // 6. Verificar reversión de stock
        console.log('6. Verificando reversión de stock...');
        const stockAfterDeleteRes = await request('GET', `/inventario/stock/${formatoId}/${ubicacionId}`, adminToken);
        const stockAfterDelete = parseFloat(stockAfterDeleteRes.body.stock_actual);
        if (stockAfterDelete !== initialStock) {
            throw new Error(`El stock no se revirtió correctamente. Esperado: ${initialStock}, Obtenido: ${stockAfterDelete}`);
        }
        console.log(`  -> ÉXITO. Stock después de eliminar: ${stockAfterDelete}`);

        console.log('--- PRUEBA PARA Compras COMPLETADA CON ÉXITO ---');
        return true;
    } catch (error) {
        console.error(`--- PRUEBA PARA Compras FALLÓ ---`);
        console.error(error.message);
        return false;
    } finally {
        // Limpieza de dependencias
        if (proveedorId) await request('DELETE', `/proveedores/${proveedorId}`, null, adminToken);
        if (formatoId) await request('DELETE', `/formatos-producto/${formatoId}`, null, adminToken);
        if (compraId) await request('DELETE', `/compras/${compraId}`, null, adminToken);
    }
}

async function testComunasCrud(token) {
    console.log(`\n--- INICIANDO PRUEBA COMPLEJA PARA: Comunas ---`);
    let regionId;
    try {
        console.log('1. Creando dependencia (Region)...');
        const regionRes = await request('POST', '/regiones', { nombre_region: 'Region para Comunas' }, token);
        regionId = regionRes.body.id_region;
        if (!regionId) throw new Error('No se pudo crear la Region de dependencia.');
        console.log(`  -> ÉXITO. Region creada con ID: ${regionId}`);

        await testCrud(
            'Comuna (con dependencia)',
            '/comunas',
            { nombre_comuna: 'Comuna de Prueba', id_region: regionId },
            { nombre_comuna: 'Comuna de Prueba Actualizada', id_region: regionId },
            'id_comuna',
            token
        );

        console.log('--- PRUEBA PARA Comunas COMPLETADA CON ÉXITO ---');
        return true;
    } catch (error) {
        console.error(`--- PRUEBA PARA Comunas FALLÓ ---`);
        console.error(error.message);
        return false;
    } finally {
        if (regionId) await request('DELETE', `/regiones/${regionId}`, null, token);
    }
}

async function testPedidoToVentaWorkflow(token) {
    console.log(`\n--- INICIANDO PRUEBA DE FLUJO: Pedido a Venta ---`);
    let clienteId, productoId, formatoId, loteId, pedidoId, ventaId, trabajadorId;
    const ubicacionId = 1;
    const cantidadPedido = 5;
    const precioUnitario = 1000;
    let initialStock;

    try {
        console.log('1. Creando dependencias (Cliente, Producto, Formato, Lote, Stock Inicial, Trabajador)...');
        const clienteRes = await request('POST', '/clients', { nombre: 'Cliente Pedido-Venta', telefono: '999888777' }, token);
        clienteId = clienteRes.body.id_cliente;
        const productoRes = await request('POST', '/products', { nombre: 'Producto Pedido-Venta', categoria: 'Flujo' }, token);
        productoId = productoRes.body.id_producto;
        const formatoRes = await request('POST', '/formatos-producto', { id_producto: productoId, formato: 'Formato Flujo', precio_detalle_neto: precioUnitario }, token);
        formatoId = formatoRes.body.id_formato_producto;
        const loteRes = await request('POST', '/lotes', { codigo_lote: `LOTE-FLUJO-${Date.now()}`, id_producto: productoId, fecha_produccion: '2025-01-01', cantidad_inicial: 100, costo_por_unidad: 500 }, token);
        loteId = loteRes.body.id_lote;
        const trabajadorRes = await request('POST', '/trabajadores', { nombre: 'Trabajador Flujo' }, token);
        trabajadorId = trabajadorRes.body.id_trabajador;

        await request('POST', '/inventario', { id_formato_producto: formatoId, id_ubicacion: ubicacionId, stock_actual: 50 }, token);
        const initialStockRes = await request('GET', `/inventario/stock/${formatoId}/${ubicacionId}`, null, token);
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
        const pedidoRes = await request('POST', '/pedidos', pedidoPayload, token);
        if (pedidoRes.statusCode !== 201) throw new Error(`POST /pedidos falló: ${JSON.stringify(pedidoRes.body)}`);
        pedidoId = pedidoRes.body.id_pedido;
        console.log(`  -> ÉXITO. Pedido creado con ID: ${pedidoId}`);

        const stockAfterPedidoRes = await request('GET', `/inventario/stock/${formatoId}/${ubicacionId}`, null, token);
        const stockAfterPedido = parseFloat(stockAfterPedidoRes.body.stock_actual);
        if (stockAfterPedido !== (parseFloat(initialStock) - cantidadPedido)) throw new Error(`Stock incorrecto después del pedido. Esperado: ${parseFloat(initialStock) - cantidadPedido}, Obtenido: ${stockAfterPedido}`);
        console.log(`  -> ÉXITO. Stock después del pedido: ${stockAfterPedido}`);

        console.log(`4. Convirtiendo Pedido ${pedidoId} a Venta...`);
        const ventaConvertPayload = { id_punto_venta: 1, id_tipo_pago: 1, neto_venta: cantidadPedido * precioUnitario, iva_venta: 0, total_bruto_venta: cantidadPedido * precioUnitario, estado_pago: 'Pagado', observacion: 'Venta convertida de pedido', con_factura: false };
        const ventaConvertRes = await request('POST', `/pedidos/${pedidoId}/convertir-a-venta`, ventaConvertPayload, token);
        if (ventaConvertRes.statusCode !== 201) throw new Error(`POST /pedidos/:id/convertir-a-venta falló: ${JSON.stringify(ventaConvertRes.body)}`);
        ventaId = ventaConvertRes.body.id_venta;
        console.log(`  -> ÉXITO. Pedido ${pedidoId} convertido a Venta ${ventaId}`);

        const stockAfterVentaRes = await request('GET', `/inventario/stock/${formatoId}/${ubicacionId}`, null, token);
        const stockAfterVenta = parseFloat(stockAfterVentaRes.body.stock_actual);
        if (stockAfterVenta !== stockAfterPedido) throw new Error(`Stock incorrecto después de la venta. Esperado: ${stockAfterPedido}, Obtenido: ${stockAfterVenta}`);
        console.log(`  -> ÉXITO. Stock después de la venta: ${stockAfterVenta}`);

        const getVentaRes = await request('GET', `/ventas/${ventaId}`, null, token);
        if (getVentaRes.statusCode !== 200 || getVentaRes.body.id_venta !== ventaId) throw new Error(`GET /ventas/${ventaId} falló.`);
        console.log(`  -> ÉXITO. Venta ${ventaId} verificada.`);

        console.log('--- PRUEBA DE FLUJO Pedido a Venta COMPLETADA CON ÉXITO ---');
        return true;

    } catch (error) {
        console.error(`--- PRUEBA DE FLUJO Pedido a Venta FALLÓ ---`);
        console.error(error.message);
        return false;
    } finally {
        if (ventaId) await request('DELETE', `/ventas/${ventaId}`, null, token);
        // if (pedidoId && !ventaId) await request('DELETE', `/pedidos/${pedidoId}`); // No hay endpoint para borrar pedidos
        if (clienteId) await request('DELETE', `/clients/${clienteId}`, null, token);
        if (formatoId) await request('DELETE', `/formatos-producto/${formatoId}`, null, token);
        if (productoId) await request('DELETE', `/products/${productoId}`, null, token);
        if (loteId) await request('DELETE', `/lotes/${loteId}`, null, token);
        if (trabajadorId) await request('DELETE', `/trabajadores/${trabajadorId}`, null, token);
    }
}

async function runAllTests() {
    console.log('\n--- OBTENIENDO TOKEN DE ADMINISTRADOR ---');
            await new Promise(resolve => setTimeout(resolve, 10000)); // Espera 10 segundos    const results = [];
    const testSuffix = new Date().getTime();
    let adminToken;

    try {
        const loginRes = await request('POST', '/login', { username: 'admin', password: 'admin' });
        adminToken = loginRes.body.token;
        if (!adminToken) throw new Error('No se pudo obtener el token de administrador.');
        console.log('  -> ÉXITO. Token de administrador obtenido.');
    } catch (error) {
        console.error('Fallo al iniciar sesión como administrador. No se pueden ejecutar las pruebas.');
        console.error(error.message);
        return;
    }

    results.push(await testCrud('Proveedores', '/proveedores', { nombre: `Proveedor de Prueba ${testSuffix}`, rut: '1234567-8', telefono: '987654321', id_ciudad: 1 }, { nombre: `Proveedor de Prueba Actualizado ${testSuffix}`, rut: '1234567-8', telefono: '987654321', id_ciudad: 2 }, 'id_proveedor', adminToken));
    results.push(await testCrud('Tipos de Cliente', '/tipos-cliente', { nombre_tipo: `Tipo de Prueba ${testSuffix}` }, { nombre_tipo: `Tipo de Prueba Actualizado ${testSuffix}` }, 'id_tipo_cliente', adminToken));
    results.push(await testCrud('Productos', '/products', { nombre: `Producto de Prueba ${testSuffix}`, categoria: 'Pruebas' }, { nombre: `Producto de Prueba Actualizado ${testSuffix}`, categoria: 'Pruebas', activo: false }, 'id_producto', adminToken));
    results.push(await testCrud('Ubicaciones', '/ubicaciones', { nombre: `Ubicación de Prueba ${testSuffix}`, tipo: 'Bodega', direccion: 'Fondo a la derecha', id_ciudad: 1 }, { nombre: `Ubicación de Prueba Actualizada ${testSuffix}`, tipo: 'Tienda', direccion: 'Fondo a la derecha', id_ciudad: 1 }, 'id_ubicacion', adminToken));
    results.push(await testCrud('Ciudades', '/ciudades', { nombre_ciudad: `Ciudad de Prueba ${testSuffix}` }, { nombre_ciudad: `Ciudad de Prueba Actualizada ${testSuffix}` }, 'id_ciudad', adminToken));
    results.push(await testCrud('Tipos de Pago', '/tipos-pago', { nombre_tipo_pago: `Tipo de Pago de Prueba ${testSuffix}` }, { nombre_tipo_pago: `Tipo de Pago de Prueba Actualizado ${testSuffix}` }, 'id_tipo_pago', adminToken));
    results.push(await testCrud('Fuentes de Contacto', '/fuentes-contacto', { nombre_fuente: `Fuente de Prueba ${testSuffix}` }, { nombre_fuente: `Fuente de Prueba Actualizada ${testSuffix}` }, 'id_fuente_contacto', adminToken));
    results.push(await testCrud('Puntos de Venta', '/puntos-venta', { nombre: `Punto de Venta de Prueba ${testSuffix}`, tipo: 'Tienda', direccion: 'Calle Falsa 123', id_ciudad: 1 }, { nombre: `Punto de Venta de Prueba Actualizado ${testSuffix}`, tipo: 'Kiosko', direccion: 'Calle Verdadera 456', id_ciudad: 1 }, 'id_punto_venta', adminToken));
    results.push(await testCrud('Trabajadores', '/trabajadores', { nombre: `Trabajador de Prueba ${testSuffix}` }, { nombre: `Trabajador de Prueba Actualizado ${testSuffix}` }, 'id_trabajador', adminToken));
    results.push(await testCrud('Regiones', '/regiones', { nombre_region: `Region de Prueba ${testSuffix}` }, { nombre_region: `Region de Prueba Actualizada ${testSuffix}` }, 'id_region', adminToken));
    results.push(await testComunasCrud(adminToken));
    results.push(await testCrud('Categorias de Cliente', '/categorias-cliente', { nombre_categoria: `Categoria de Prueba ${testSuffix}` }, { nombre_categoria: `Categoria de Prueba Actualizada ${testSuffix}` }, 'id_categoria_cliente', adminToken));
    results.push(await testCrud('Clasificaciones de Cliente', '/clasificaciones-cliente', { nombre_clasificacion: `Clasificacion de Prueba ${testSuffix}` }, { nombre_clasificacion: `Clasificacion de Prueba Actualizada ${testSuffix}` }, 'id_clasificacion_cliente', adminToken));
    results.push(await testCrud('Frecuencias de Compra', '/frecuencias-compra', { nombre_frecuencia: `Frecuencia de Prueba ${testSuffix}` }, { nombre_frecuencia: `Frecuencia de Prueba Actualizada ${testSuffix}` }, 'id_frecuencia_compra', adminToken
    ));
    results.push(await testCrud('Tipos de Consumo', '/tipos-consumo', { nombre_tipo: `TC Prueba ${testSuffix}` }, { nombre_tipo: `TC Prueba Actualizado ${testSuffix}` }, 'id_tipo_consumo', adminToken
    ));
    results.push(await testCrud('Cuentas Bancarias', '/cuentas-bancarias', 
        { nombre_banco: `Banco Prueba ${testSuffix}`, tipo_cuenta: 'Corriente', numero_cuenta: `123456789${testSuffix}`, rut_titular: '11111111-1', nombre_titular: `Titular Prueba ${testSuffix}`, email_titular: `test${testSuffix}@example.com` }, 
        { nombre_banco: `Banco Actualizado ${testSuffix}`, tipo_cuenta: 'Ahorro', numero_cuenta: `987654321${testSuffix}`, rut_titular: '22222222-2', nombre_titular: `Titular Actualizado ${testSuffix}`, email_titular: `updated${testSuffix}@example.com` }, 
        'id_cuenta', adminToken
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
        'id_cliente', adminToken
    ));
    results.push(await testPedidoToVentaWorkflow(adminToken));
    results.push(await testComprasCrud());

    console.log('\n--- Resumen de Pruebas ---');
    const all_passed = results.every(r => r);
    if(all_passed) {
        console.log('¡Todas las pruebas pasaron exitosamente!');
    } else {
        console.log('Algunas pruebas fallaron. Revisa los logs de arriba.');
    }
}

runAllTests();
