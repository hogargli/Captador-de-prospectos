const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Lead } = require('./models');
const { connectDB } = require('./database');

puppeteer.use(StealthPlugin());

async function findSocialProfilesForLead(lead) {
  console.log(`🔍 Buscando perfiles sociales para: ${lead.nombre_negocio}...`);
  
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  
  try {
    // 1. Buscar Facebook
    const fbQuery = `${lead.nombre_negocio} culiacan facebook`;
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(fbQuery)}`, { waitUntil: 'networkidle2' });
    
    const fbLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const fb = links.find(l => l.href.includes('facebook.com') && !l.href.includes('google.com'));
      return fb ? fb.href : null;
    });
    
    // 2. Buscar LinkedIn
    const liQuery = `${lead.nombre_negocio} culiacan linkedin`;
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(liQuery)}`, { waitUntil: 'networkidle2' });
    
    const liLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const li = links.find(l => l.href.includes('linkedin.com') && !l.href.includes('google.com'));
      return li ? li.href : null;
    });
    
    if (fbLink || liLink) {
      console.log(`   ✅ Encontrado: FB: ${fbLink || 'n/a'} | LI: ${liLink || 'n/a'}`);
    } else {
      console.log(`   ⚪ No se encontraron perfiles sociales.`);
    }

    return { facebook: fbLink, linkedin: liLink };

  } catch (error) {
    console.error(`❌ Error buscando sociales para ${lead.nombre_negocio}:`, error.message);
    return { facebook: null, linkedin: null };
  } finally {
    await browser.close();
  }
}

async function runSocialUpdate() {
  await connectDB();
  // Solo buscar para los premium que no tengan ya info social
  const leads = await Lead.find({ 
    es_premium: true, 
    $or: [{ facebook: '' }, { linkedin: '' }] 
  }).limit(20); // Limitar a 20 por ejecución para evitar bloqueos
  
  console.log(`📋 Procesando ${leads.length} leads premium para perfiles sociales...`);
  
  for (const lead of leads) {
    const social = await findSocialProfilesForLead(lead);
    await Lead.findByIdAndUpdate(lead._id, {
      facebook: social.facebook || lead.facebook,
      linkedin: social.linkedin || lead.linkedin
    });
    // Esperar un poco para no ser bloqueados por Google
    await new Promise(r => setTimeout(r, 10000));
  }
  
  console.log('✅ Actualización social completada.');
  process.exit(0);
}

if (require.main === module) {
  runSocialUpdate();
}

module.exports = { findSocialProfilesForLead };
