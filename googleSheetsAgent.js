/**
 * AGENTE DE SINCRONIZACIÓN GOOGLE SHEETS (Reforzado)
 */

const axios = require('axios');
const { Lead } = require('./models');
const { connectDB } = require('./database');
require('dotenv').config();

const WEBAPP_URL = process.env.GOOGLE_SHEETS_WEBAPP_URL;

async function syncAllLeadsToSheet() {
  if (!WEBAPP_URL) {
    console.error('❌ Error: GOOGLE_SHEETS_WEBAPP_URL no configurada en .env');
    return false;
  }

  try {
    await connectDB();
    console.log('☁️  Preparando sincronización reforzada...');
    const allLeads = await Lead.find({}, { sort: { createdAt: -1 } });
    
    // Solo enviar leads que tengan algo de información útil para no saturar
    const validLeads = allLeads.filter(l => l.nombre_negocio || l.email);

    console.log(`📦 Leads encontrados en DB: ${allLeads.length}`);
    console.log(`📦 Enviando ${validLeads.length} leads válidos a la nube...`);

    // Dividir en bloques de 500 para mayor estabilidad
    const chunkSize = 500;
    for (let i = 0; i < validLeads.length; i += chunkSize) {
      const chunk = validLeads.slice(i, i + chunkSize);
      
      const payload = {
        action: 'sync_all',
        is_first_chunk: i === 0,
        leads: chunk.map(l => ({
          nombre: l.nombre_negocio || '-',
          contacto: l.nombre_contacto || '-',
          email: l.email || '-',
          telefono: l.telefono || '-',
          giro: l.giro || '-',
          estado: (l.estado || 'nuevo').toUpperCase(),
          premium: l.es_premium ? 'SI' : 'NO',
          enviado: l.email_enviado ? 'SI' : 'NO',
          fecha: l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '-',
          ia: (l.personalizacion_ia || '').substring(0, 500)
        }))
      };

      await axios({
        method: 'post',
        url: WEBAPP_URL,
        data: JSON.stringify(payload),
        headers: { 
          'Content-Type': 'text/plain;charset=utf-8' // Google prefiere text/plain para evitar pre-flights
        },
        maxRedirects: 10
      });
      
      console.log(`   ✅ Bloque ${Math.floor(i/chunkSize) + 1} enviado...`);
    }

    console.log('✅ Sincronización completa.');
    return true;
  } catch (error) {
    console.error('❌ Error crítico en sincronización:', error.message);
    if (error.response) console.error('   Detalle Google:', error.response.status);
    return false;
  }
}

module.exports = { syncAllLeadsToSheet };
