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

async function testCrud(entityName, basePath, postPayload, putPayload) {
  let createdId;

  try {
    console.log(`\n--- INICIANDO PRUEBA PARA: ${entityName} ---`);

    // 1. POST (Crear)
    console.log(`1. Probando POST ${basePath}...`);
    const postRes = await request('POST', basePath, postPayload);
    if (postRes.statusCode !== 201) throw new Error(`POST falló con status ${postRes.statusCode}: ${JSON.stringify(postRes.body)}`);
    createdId = postRes.body.id_proveedor || postRes.body.id_tipo_cliente || postRes.body.id_producto || postRes.body.id_formato_producto || postRes.body.id_ubicacion;
    if (!createdId) throw new Error('No se pudo obtener el ID del recurso creado.');
    console.log(`  -> ÉXITO. Creado con ID: ${createdId}`);

    // 2. GET (Leer uno)
    console.log(`2. Probando GET ${basePath}/${createdId}...`);
    const getRes = await request('GET', `${basePath}/${createdId}`);
    if (getRes.statusCode !== 200) throw new Error(`GET (uno) falló con status ${getRes.statusCode}`);
    console.log(`  -> ÉXITO. Obtenido: ${JSON.stringify(getRes.body)}`);

    // 3. PUT (Actualizar)
    console.log(`3. Probando PUT ${basePath}/${createdId}...`);
    const putRes = await request('PUT', `${basePath}/${createdId}`, putPayload);
    if (putRes.statusCode !== 200) throw new Error(`PUT falló con status ${putRes.statusCode}: ${JSON.stringify(putRes.body)}`);
    console.log(`  -> ÉXITO. Actualizado: ${JSON.stringify(putRes.body)}`);

    // 4. DELETE (Borrar)
    console.log(`4. Probando DELETE ${basePath}/${createdId}...`);
    const deleteRes = await request('DELETE', `${basePath}/${createdId}`);
    if (deleteRes.statusCode !== 200) throw new Error(`DELETE falló con status ${deleteRes.statusCode}`);
    console.log(`  -> ÉXITO. Borrado.`);

    // 5. GET (Verificar borrado)
    console.log(`5. Verificando borrado con GET ${basePath}/${createdId}...`);
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
  
  async function runAllTests() {
      const results = [];
      
      // Prueba para Proveedores
      results.push(await testCrud(
          'Proveedores',
          '/proveedores',
          { nombre: 'Proveedor de Prueba', rut: '1234567-8', telefono: '987654321' },
          { nombre: 'Proveedor de Prueba Actualizado', rut: '1234567-8', telefono: '987654321' }
      ));
  
      // Prueba para Tipos de Cliente
      results.push(await testCrud(
          'Tipos de Cliente',
          '/tipos-cliente',
          { nombre_tipo: 'Tipo de Prueba' },
          { nombre_tipo: 'Tipo de Prueba Actualizado' }
      ));
  
      // Prueba para Productos
      results.push(await testCrud(
          'Productos',
          '/products',
          { nombre: 'Producto de Prueba', categoria: 'Pruebas' },
          { nombre: 'Producto de Prueba Actualizado', categoria: 'Pruebas', activo: false }
      ));
      
      // Prueba para Ubicaciones
      results.push(await testCrud(
          'Ubicaciones',
          '/ubicaciones',
          { nombre: 'Ubicación de Prueba', tipo: 'Bodega', direccion: 'Fondo a la derecha', id_ciudad: 1 },
          { nombre: 'Ubicación de Prueba Actualizada', tipo: 'Tienda', direccion: 'Fondo a la derecha', id_ciudad: 1 }
      ));
  
      // Prueba específica para Compras
          results.push(await testComprasCrud());
      
          // Prueba específica para Ventas (solo GET)
          results.push(await testVentasGet());
      
          // Para Formatos de Producto, necesitamos un id_producto existente.
          // Asumimos que el producto creado anteriormente funciona.
          // Esta prueba es más compleja y la omitimos en este script simple.
      
          console.log('\n--- Resumen de Pruebas ---');
          const all_passed = results.every(r => r);
          if(all_passed) {
              console.log('¡Todas las pruebas pasaron exitosamente!');
          } else {
              console.log('Algunas pruebas fallaron. Revisa los logs de arriba.');
          }
      }
      
      async function testVentasGet() {
          console.log(`\n--- INICIANDO PRUEBA DE LECTURA PARA: Ventas ---`);
          let clienteId, formatoId, loteId, ventaId;
          const ubicacionId = 1; // Usar una ubicación conocida
      
          try {
              // 1. Crear dependencias
              console.log('1. Creando dependencias para la venta...');
              const clienteRes = await request('POST', '/clients', { nombre: 'Cliente para Ventas', telefono: '111222' });
              clienteId = clienteRes.body.id_cliente;
      
              const productoRes = await request('POST', '/products', { nombre: 'Producto para Ventas', categoria: 'Ventas' });
              const productoId = productoRes.body.id_producto;
      
              const formatoRes = await request('POST', '/formatos-producto', { id_producto: productoId, formato: 'Formato Ventas', precio_detalle_neto: 1500 });
              formatoId = formatoRes.body.id_formato_producto;
      
              const loteRes = await request('POST', '/lotes', { codigo_lote: `LOTE-VENTA-${Date.now()}`, id_producto: productoId, fecha_produccion: '2025-01-01', cantidad_inicial: 100, costo_por_unidad: 500 });
              loteId = loteRes.body.id_lote;
      
              // 2. Añadir stock manualmente para la prueba (endpoint de inventario no existe para esto)
              // Esto es un hack para la prueba. En la app real, el stock se añade por Compras o Producción.
              await request('POST', '/inventario', { id_formato_producto: formatoId, id_ubicacion: ubicacionId, stock_actual: 100 });
      
              // 3. Crear la Venta
              console.log('2. Creando una venta de prueba...');
              const ventaPayload = {
                  id_cliente: clienteId,
                  id_punto_venta: 1, // Asumir punto de venta 1
                  id_tipo_pago: 1, // Asumir tipo de pago 1
                  total_bruto_venta: 15000,
                  detalles: [
                      { id_formato_producto: formatoId, cantidad: 10, precio_unitario: 1500, id_lote: loteId, id_ubicacion: ubicacionId }
                  ]
              };
              const ventaRes = await request('POST', '/ventas', ventaPayload);
              if (ventaRes.statusCode !== 201) throw new Error(`POST /ventas falló: ${JSON.stringify(ventaRes.body)}`);
              ventaId = ventaRes.body.id_venta;
              console.log(`  -> ÉXITO. Venta creada con ID: ${ventaId}`);
      
              // 4. Probar GET /ventas
              console.log('3. Probando GET /ventas...');
              const getListRes = await request('GET', '/ventas');
              if (getListRes.statusCode !== 200 || !getListRes.body.some(v => v.id_venta === ventaId)) {
                  throw new Error('GET /ventas falló o no contiene la venta creada.');
              }
              console.log('  -> ÉXITO. La lista de ventas contiene la nueva venta.');
      
              // 5. Probar GET /ventas/:id
              console.log(`4. Probando GET /ventas/${ventaId}...`);
              const getSingleRes = await request('GET', `/ventas/${ventaId}`);
              if (getSingleRes.statusCode !== 200 || getSingleRes.body.detalles.length !== 1) {
                  throw new Error(`GET /ventas/${ventaId} falló.`);
              }
              console.log('  -> ÉXITO. Detalle de venta obtenido correctamente.');
      
              console.log('--- PRUEBA DE LECTURA PARA Ventas COMPLETADA CON ÉXITO ---');
              return true;
      
          } catch (error) {
              console.error(`--- PRUEBA DE LECTURA PARA Ventas FALLÓ ---`);
              console.error(error.message);
              return false;
          } finally {
              // Limpieza de datos creados
              if (ventaId) await request('DELETE', `/ventas/${ventaId}`); // Asumiendo que DELETE /ventas existe
              if (clienteId) await request('DELETE', `/clients/${clienteId}`);
              // La limpieza de producto, formato, lote e inventario se omite por simplicidad,
              // pero en un entorno de prueba real sería necesaria.
          }
      }runAllTests();
