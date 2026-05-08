const fs = require('fs');
const path = require('path');
const { extractOwnerNameWithAI } = require('./ai_extractor');

const DB_PATH = path.join(__dirname, 'db_leads.json');

async function enrichRestaurants() {
  console.log('🏁 Iniciando enriquecimiento IA de restaurantes...');
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ No se encontró la base de datos db_leads.json');
    return;
  }

  const rawData = fs.readFileSync(DB_PATH, 'utf8');
  let leads = JSON.parse(rawData);

  // Filtrar inteligentemente: que sea restaurante, tenga web y NO tenga nombre de contacto aún
  const candidates = leads.filter(lead => {
    const esSocioRestaurante = lead.clase_actividad && 
                               (lead.clase_actividad.toLowerCase().includes('restaurante') || 
                                lead.clase_actividad.toLowerCase().includes('alimentos'));
    
    const tieneWebValida = lead.sitio_web && 
                           lead.sitio_web !== 'Sin dato' && 
                           lead.sitio_web !== '' && 
                           !lead.sitio_web.includes('facebook.com');

    const faltaNombre = !lead.nombre_contacto || lead.nombre_contacto === '' || lead.nombre_contacto === 'Sin dato';

    return esSocioRestaurante && tieneWebValida && faltaNombre;
  });

  console.log(`🔍 Encontrados ${candidates.length} candidatos potenciales.`);

  // Procesamos los primeros 50 para avanzar con fuerza
  const toProcess = candidates.slice(0, 50);
  let updatedCount = 0;

  for (const lead of toProcess) {
    try {
      const data = await extractOwnerNameWithAI(lead.sitio_web);
      
      if (data && (data.nombre || data.email)) {
        // Buscamos el original en la lista general para actualizarlo
        const index = leads.findIndex(l => l.id === lead.id);
        if (index !== -1) {
          leads[index].nombre_contacto = data.nombre || leads[index].nombre_contacto;
          leads[index].cargo_contacto = data.cargo || leads[index].cargo_contacto;
          if (data.email) {
            leads[index].email = data.email;
          }
          updatedCount++;
          console.log(`✅ [${lead.empresa}] Actualizado: ${data.nombre || 'Sin nombre'} | ${data.email || ''}`);
        }
      }
    } catch (e) {
      console.error(`❌ Error enriqueciendo ${lead.empresa}:`, e.message);
    }
  }

  if (updatedCount > 0) {
    fs.writeFileSync(DB_PATH, JSON.stringify(leads, null, 2));
    console.log(`\n🎉 ¡Éxito! Se actualizaron ${updatedCount} dueños de restaurantes.`);
  } else {
    console.log('\n⌛ No se encontraron datos nuevos en esta tanda.');
  }
}

enrichRestaurants();
