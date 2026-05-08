const fs = require('fs');
const path = require('path');
const { extractOwnerNameWithAI } = require('./ai_extractor');

const DB_PATH = path.join(__dirname, 'db_leads.json');

async function highIncomeHunt() {
  console.log('🚀 INICIANDO CACERÍA DE DUEÑOS PREMIUM (10 MINUTOS)...');
  
  if (!fs.existsSync(DB_PATH)) return;

  const rawData = fs.readFileSync(DB_PATH, 'utf8');
  let leads = JSON.parse(rawData);

  // Filtro de "Ingresos Altos": Empresas grandes (>31 personas) o de sectores premium
  const premiumCandidates = leads.filter(lead => {
    const esGrande = lead.tamano_empresa && (
      lead.tamano_empresa.includes('31 a 50') || 
      lead.tamano_empresa.includes('51 a 100') || 
      lead.tamano_empresa.includes('101 a 250') ||
      lead.tamano_empresa.includes('251 y más')
    );
    
    const tieneWeb = lead.sitio_web && 
                     lead.sitio_web !== 'Sin dato' && 
                     lead.sitio_web !== '' && 
                     !lead.sitio_web.includes('facebook.com');

    const faltaNombre = !lead.nombre_contacto || lead.nombre_contacto === '';

    return (esGrande && tieneWeb && faltaNombre);
  });

  console.log(`💎 Encontradas ${premiumCandidates.length} joyas potenciales para investigar.`);

  // Procesaremos tantos como alcancemos en 10 minutos
  const toProcess = premiumCandidates.slice(0, 20); // Un bache potente
  let updatedCount = 0;

  for (const lead of toProcess) {
    try {
      console.log(`🔍 [${lead.nombre_negocio}] Analizando...`);
      const data = await extractOwnerNameWithAI(lead.sitio_web);
      
      if (data && (data.nombre || data.email)) {
        const index = leads.findIndex(l => l._id === lead._id);
        if (index !== -1) {
          leads[index].nombre_contacto = data.nombre || leads[index].nombre_contacto;
          leads[index].cargo_contacto = data.cargo || leads[index].cargo_contacto;
          if (data.email) leads[index].email = data.email;
          updatedCount++;
          console.log(`✅ ¡NOMBRE ENCONTRADO! -> ${data.nombre} | ${data.email || ''}`);
        }
      }
    } catch (e) {
      console.error(`❌ Error al investigar ${lead.nombre_negocio}:`, e.message);
    }
  }

  if (updatedCount > 0) {
    fs.writeFileSync(DB_PATH, JSON.stringify(leads, null, 2));
    console.log(`\n🎉 ¡Cierre de día exitoso! Se encontraron ${updatedCount} directivos para mañana.`);
  } else {
    console.log('\n⌛ No se detectaron nombres nuevos en este bache rápido.');
  }
}

highIncomeHunt();
