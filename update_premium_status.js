const { Lead } = require('./models');
const { connectDB } = require('./database');

async function updateExistingLeads() {
  console.log('🔄 Actualizando leads existentes con criterios premium...');
  await connectDB();
  
  const leads = await Lead.find({});
  console.log(`📋 Revisando ${leads.length} leads...`);
  
  let updated = 0;
  
  for (const lead of leads) {
    const metrics = calculateValueMetrics(lead);
    if (metrics.es_premium !== lead.es_premium || metrics.calificacion !== lead.calificacion) {
      await Lead.findByIdAndUpdate(lead._id, {
        es_premium: metrics.es_premium,
        calificacion: metrics.calificacion
      });
      updated++;
    }
  }
  
  console.log(`✅ Se actualizaron ${updated} leads con el nuevo criterio premium.`);
  process.exit(0);
}

function calculateValueMetrics(lead) {
  const estrato = (lead.tamano_empresa || '').toString();
  const clase = (lead.clase_actividad || '').toLowerCase();
  const giro = (lead.giro || '').toLowerCase();
  
  let score = 0;
  let premium = false;

  // 1. Basado en TAMAÑO
  const estratosTarget = ['11 a 30', '31 a 50', '51 a 100', '101 a 250', '251 y más'];
  if (estratosTarget.some(e => estrato.includes(e))) {
    score += 50;
    premium = true;
  }
  
  // 2. Basado en ACTIVIDAD
  const premiumKeywords = [
    'cirugía', 'clínica', 'notaría', 'abogados', 'constructora', 'inmobiliaria', 
    'vivienda', 'arquitecto', 'financiera', 'agencia de autos', 'exportación', 
    'agrícola', 'industrial', 'hotel', 'servicios de tecnología'
  ];
  
  if (premiumKeywords.some(key => clase.includes(key) || giro.includes(key))) {
    score += 30;
    if (score >= 50) premium = true;
  }

  // 3. Médicos especialistas, Notarios
  if (clase.includes('cirugía') || clase.includes('oncología') || clase.includes('notaría')) {
    premium = true;
    score += 20;
  }

  return { es_premium: premium, calificacion: score };
}

updateExistingLeads();
