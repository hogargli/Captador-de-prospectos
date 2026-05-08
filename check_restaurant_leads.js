// check_restaurant_leads.js - Diagnóstico de leads de restaurantes pendientes
require('dotenv').config();
const { connectDB } = require('./database');
const { Lead } = require('./models');
const fs = require('fs');

async function check() {
  await connectDB();

  const totalLeads = await Lead.countDocuments();
  const conEmail = await Lead.countDocuments({ email: { $ne: '', $exists: true } });
  const enviados = await Lead.countDocuments({ email_enviado: true });
  const pendienteConEmail = await Lead.countDocuments({
    email: { $ne: '', $exists: true },
    email_enviado: false,
    dado_de_baja: false
  });

  const lines = [];
  lines.push('=== ESTADO GENERAL DE LA BD ===');
  lines.push(`Total leads:             ${totalLeads}`);
  lines.push(`Con email:               ${conEmail}`);
  lines.push(`Ya enviados:             ${enviados}`);
  lines.push(`Pendientes con email:    ${pendienteConEmail}`);
  lines.push('');

  // Obtener todos los pendientes para filtrar por restaurante
  const allPending = await Lead.find({
    email: { $ne: '', $exists: true },
    email_enviado: false,
    dado_de_baja: false
  });

  const restaurantLeads = allPending.filter(l =>
    l.giro && /restauran|comida|alimento|gastron|cafe|cafeteria|taqueria|taco|mariscos|pizza|sushi|cocina|cenad|fonda|cantina|bar|buffet|antojitos/i.test(l.giro)
  ).sort((a, b) => (b.es_premium ? 1 : 0) - (a.es_premium ? 1 : 0));

  lines.push('=== RESTAURANTES PENDIENTES (filtro ampliado) ===');
  lines.push(`Total restaurantes pendientes: ${restaurantLeads.length}`);
  lines.push('');

  if (restaurantLeads.length > 0) {
    lines.push('Primeros 20 leads de restaurantes:');
    restaurantLeads.slice(0, 20).forEach((l, i) => {
      const premium = l.es_premium ? 'PREM' : '    ';
      lines.push(`[${premium}] ${i+1}. ${l.nombre_negocio} | giro: ${l.giro} | email: ${l.email}`);
    });
  } else {
    lines.push('WARNING: No se encontraron leads de restaurantes pendientes con ese filtro.');
    lines.push('');
    lines.push('Muestra de giros disponibles (primeros 30 de la lista pendiente):');
    allPending.slice(0, 30).forEach(l => {
      lines.push(` - giro="${l.giro}" | negocio="${l.nombre_negocio}"`);
    });
  }

  lines.push('');
  lines.push('=== FIN DEL DIAGNOSTICO ===');

  fs.writeFileSync('diagnostico_restaurantes.txt', lines.join('\n'), 'utf8');
  console.log('Diagnostico guardado en: diagnostico_restaurantes.txt');
  console.log('Restaurantes pendientes:', restaurantLeads.length);
  console.log('Total pendientes con email:', pendienteConEmail);

  process.exit(0);
}

check().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
