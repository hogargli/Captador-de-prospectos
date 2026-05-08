// analyze_leads.js - Analizar giros disponibles en la BD
require('dotenv').config();
const { connectDB } = require('./database');
const { Lead } = require('./models');
const fs = require('fs');

async function analyze() {
  await connectDB();

  const totalLeads = await Lead.countDocuments();
  const conEmail = await Lead.countDocuments({ email: { $ne: '', $exists: true } });
  const enviados = await Lead.countDocuments({ email_enviado: true });

  // Obtener pendientes con email (sin .select ni .lean que no estan soportados en SimpleDB)
  const allPending = await Lead.find({
    email: { $ne: '', $exists: true },
    email_enviado: false,
    dado_de_baja: false
  }, { limit: 500 });

  // Agrupar por giro
  const giroMap = {};
  for (const lead of allPending) {
    const g = (lead.giro || 'SIN GIRO').toLowerCase().substring(0, 40);
    giroMap[g] = (giroMap[g] || 0) + 1;
  }

  // Ordenar por cantidad
  const sorted = Object.entries(giroMap).sort((a, b) => b[1] - a[1]);

  const lines = [];
  lines.push('=== ESTADISTICAS DE LA BD ===');
  lines.push('Total leads: ' + totalLeads);
  lines.push('Con email: ' + conEmail);
  lines.push('Ya enviados: ' + enviados);
  lines.push('Pendientes con email (primeros 500): ' + allPending.length);
  lines.push('');
  lines.push('=== TOP 50 GIROS MAS COMUNES EN PENDIENTES ===');
  sorted.slice(0, 50).forEach(([giro, count]) => {
    lines.push(count + 'x - ' + giro);
  });

  // Buscar restaurantes con filtro amplio
  const restaurantLeads = allPending.filter(l =>
    l.giro && /restaur|comida|aliment|gastron|cafe|taqui|taco|marisco|pizza|sushi|cocin|cenad|fonda|cantina|bar |buffet|antojit/i.test(l.giro)
  );
  lines.push('');
  lines.push('=== RESTAURANTES CON FILTRO AMPLIO (pendientes) ===');
  lines.push('Encontrados: ' + restaurantLeads.length);
  restaurantLeads.slice(0, 20).forEach((l, i) => {
    lines.push((i+1) + '. "' + l.nombre_negocio + '" | giro="' + l.giro + '" | email="' + l.email + '"');
  });

  // Restaurantes YA enviados
  const restaurantSent = await Lead.countDocuments({
    email_enviado: true,
    giro: { $regex: 'restaur|comida|gastron|cafe|taqueria|mariscos', $options: 'i' }
  });
  lines.push('');
  lines.push('Restaurantes YA enviados anteriormente: ' + restaurantSent);
  lines.push('');
  lines.push('=== FIN DEL DIAGNOSTICO ===');

  fs.writeFileSync('analyze_output.txt', lines.join('\n'), 'utf8');

  // Resumen en consola en ASCII plano
  console.log('DIAGNOSTICO COMPLETADO');
  console.log('Total leads: ' + totalLeads);
  console.log('Con email: ' + conEmail);
  console.log('Ya enviados: ' + enviados);
  console.log('Pendientes con email: ' + allPending.length);
  console.log('Restaurantes pendientes (filtro amplio): ' + restaurantLeads.length);
  console.log('Restaurantes ya enviados: ' + restaurantSent);
  console.log('Detalles en: analyze_output.txt');
  process.exit(0);
}

analyze().catch(e => { console.error('Error: ' + e.message); process.exit(1); });
