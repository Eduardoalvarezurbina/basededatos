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
    }
    req.end();
  });
}

async function testMovimientosInventario() {
    console.log(`\n--- INICIANDO PRUEBA PARA: Movimientos de Inventario ---`);
    let adminToken, ubicacionOrigenId, ubicacionDestinoId, formatoId, movimientoId;
    const cantidadMovida = 5;
    const stockInicial = 20;

    try {
        // 1. Obtener token de admin
        console.log('1. Obteniendo token de administrador...');
        const loginRes = await request('POST', '/login', { username: 'admin', password: 'admin' });
        adminToken = loginRes.body.token;
        if (!adminToken) throw new Error('No se pudo obtener el token de administrador.');
        console.log('  -> ÉXITO. Token obtenido.');

        // 2. Crear dependencias: Ubicaciones y Formato de Producto
        console.log('2. Creando dependencias (Ubicaciones, Formato, Stock inicial)...');
        const origenRes = await request('POST', '/ubicaciones', { nombre: 'Bodega Origen Test' }, adminToken);
        ubicacionOrigenId = origenRes.body.id_ubicacion;
        const destinoRes = await request('POST', '/ubicaciones', { nombre: 'Tienda Destino Test' }, adminToken);
        ubicacionDestinoId = destinoRes.body.id_ubicacion;
        const formatoRes = await request('POST', '/formatos-producto', { id_producto: 1, formato: 'Formato para Movimientos', precio_detalle_neto: 1000 }, adminToken);
        formatoId = formatoRes.body.id_formato_producto;
        if (!ubicacionOrigenId || !ubicacionDestinoId || !formatoId) throw new Error('No se pudieron crear las dependencias.');

        // 3. Añadir stock a la ubicación de origen
        await request('POST', '/inventario', { id_formato_producto: formatoId, id_ubicacion: ubicacionOrigenId, stock_actual: stockInicial }, adminToken);
        console.log(`  -> ÉXITO. Dependencias creadas y stock inicial de ${stockInicial} añadido a la ubicación de origen.`);

        // 4. Crear el Movimiento de Inventario
        console.log('4. Probando POST /movimientos-inventario...');
        const movimientoPayload = {
            id_ubicacion_origen: ubicacionOrigenId,
            id_ubicacion_destino: ubicacionDestinoId,
            observacion: 'Movimiento de prueba',
            detalles: [
                { id_formato_producto: formatoId, cantidad: cantidadMovida }
            ]
        };
        const movimientoRes = await request('POST', '/movimientos-inventario', movimientoPayload, adminToken);
        if (movimientoRes.statusCode !== 201) throw new Error(`POST /movimientos-inventario falló: ${JSON.stringify(movimientoRes.body)}`);
        movimientoId = movimientoRes.body.id_movimiento;
        console.log(`  -> ÉXITO. Movimiento creado con ID: ${movimientoId}`);

        // 5. Verificar stock en origen y destino
        console.log('5. Verificando la actualización del stock...');
        const stockOrigenRes = await request('GET', `/inventario/stock/${formatoId}/${ubicacionOrigenId}`, null, adminToken);
        const stockOrigen = parseFloat(stockOrigenRes.body.stock_actual);
        const stockDestinoRes = await request('GET', `/inventario/stock/${formatoId}/${ubicacionDestinoId}`, null, adminToken);
        const stockDestino = parseFloat(stockDestinoRes.body.stock_actual);

        const expectedStockOrigen = stockInicial - cantidadMovida;
        const expectedStockDestino = cantidadMovida;

        if (stockOrigen !== expectedStockOrigen) throw new Error(`Stock en origen incorrecto. Esperado: ${expectedStockOrigen}, Obtenido: ${stockOrigen}`);
        if (stockDestino !== expectedStockDestino) throw new Error(`Stock en destino incorrecto. Esperado: ${expectedStockDestino}, Obtenido: ${stockDestino}`);
        console.log(`  -> ÉXITO. Stock en origen: ${stockOrigen}, Stock en destino: ${stockDestino}`);

        // 6. Verificar el movimiento creado
        console.log(`6. Probando GET /movimientos-inventario/${movimientoId}...`);
        const getRes = await request('GET', `/movimientos-inventario/${movimientoId}`, null, adminToken);
        if (getRes.statusCode !== 200 || getRes.body.detalles.length !== 1) throw new Error(`GET /movimientos-inventario/${movimientoId} falló.`);
        console.log('  -> ÉXITO. Movimiento obtenido correctamente.');

        console.log('--- PRUEBA PARA Movimientos de Inventario COMPLETADA CON ÉXITO ---');
        return true;

    } catch (error) {
        console.error(`--- PRUEBA PARA Movimientos de Inventario FALLÓ ---`);
        console.error(error.message);
        return false;
    } finally {
        // Limpieza de dependencias
        if (movimientoId) await request('DELETE', `/movimientos-inventario/${movimientoId}`, null, adminToken); // No hay endpoint de delete, la limpieza es manual
        if (ubicacionOrigenId) await request('DELETE', `/ubicaciones/${ubicacionOrigenId}`, null, adminToken);
        if (ubicacionDestinoId) await request('DELETE', `/ubicaciones/${ubicacionDestinoId}`, null, adminToken);
        if (formatoId) await request('DELETE', `/formatos-producto/${formatoId}`, null, adminToken);
    }
}

testMovimientosInventario();
