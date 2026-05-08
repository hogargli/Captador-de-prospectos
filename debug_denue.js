const axios = require('axios');
require('dotenv').config();

const token = process.env.DENUE_TOKEN;
const condicion = 'restaurante';

async function test() {
  const urls = [
    // Opción 1: Buscar por Condición (Cerca de Culiacán)
    `https://www.inegi.org.mx/app/api/denue/v1/consulta/buscar/${condicion}/24.8105,-107.3941/10000/${token}`,
    // Opción 2: Buscar área con Municipio simple (sin ceros)
    `https://www.inegi.org.mx/app/api/denue/v1/consulta/buscarArea/${condicion}/25/6/1/10/${token}`,
    // Opción 3: Buscar área con Municipio completo (006)
    `https://www.inegi.org.mx/app/api/denue/v1/consulta/BuscarAreaActEstr/${condicion}/25/006/0/0/1/10/${token}`,
    // Opción 4: Buscar Entidad simple
    `https://www.inegi.org.mx/app/api/denue/v1/consulta/buscarEntidad/${condicion}/25/1/10/${token}`
  ];

  console.log('🧪 Probando rutas de INEGI...');

  for (let url of urls) {
    try {
      console.log(`\n📡 Probando: ${url.split('/').slice(0, -1).join('/')}/TOKEN...`);
      const res = await axios.get(url, { timeout: 15000 });
      console.log(`✅ EXITO! Status: ${res.status}. Encontrados: ${res.data.length || 0}`);
      if (res.data.length > 0) {
        console.log('🏆 ESTA ES LA RUTA GANADORA!');
        process.exit(0);
      }
    } catch (e) {
      console.log(`❌ FALLO: ${e.message}`);
    }
  }
}

test();
