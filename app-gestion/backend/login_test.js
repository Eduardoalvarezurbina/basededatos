const http = require('http');
const { app, pool, startServer } = require('./index.js');

const API_HOST = 'localhost';
const API_PORT = 3001;

let server;

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

async function testLogin() {
  console.log('--- INICIANDO PRUEBA DE LOGIN ---');
  try {
    const loginRes = await request('POST', '/login', { username: 'admin', password: 'admin' });
    if (loginRes.statusCode !== 200 || !loginRes.body.token) {
      throw new Error(`Login falló con status ${loginRes.statusCode}: ${JSON.stringify(loginRes.body)}`);
    }
    console.log('  -> ÉXITO. Token de administrador obtenido.');
    return true;
  } catch (error) {
    console.error('--- PRUEBA DE LOGIN FALLÓ ---');
    console.error(error.message);
    return false;
  }
}

async function runTest() {
  server = startServer();
  server.on('listening', async () => {
    const success = await testLogin();
    server.close(() => {
      pool.end();
      process.exit(success ? 0 : 1);
    });
  });
}

runTest();
