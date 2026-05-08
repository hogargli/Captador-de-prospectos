const { extractOwnerNameWithAI } = require('./ai_extractor');
const fs = require('fs');

async function testExtraction() {
    const targets = [
        { name: 'CLINICA DE CIRUGIA PLASTICA', url: 'https://www.google.com/search?q=clinica+cirugia+plastica+culiacan+director' }, // Just an example
        // I will use real ones from the DB
    ];
    
    // Let's get real ones
    const leads = JSON.parse(fs.readFileSync('./db_leads.json', 'utf8'));
    const premium = leads.filter(l => l.sitio_web && l.sitio_web.length > 5 && !l.sitio_web.includes('google')).slice(0, 10);
    
    console.log(`🔎 Mode: Aggressive Search on ${premium.length} leads`);
    
    for (const lead of premium) {
        console.log(`\n--- [${lead.nombre_negocio}] ---`);
        const result = await extractOwnerNameWithAI(lead.sitio_web);
        if (result && result.nombre) {
            console.log(`✅ FOUND: ${result.nombre} (${result.cargo})`);
            lead.nombre_contacto = result.nombre;
            lead.cargo_contacto = result.cargo;
        } else {
            console.log(`❌ NOT FOUND on website.`);
        }
    }
    
    fs.writeFileSync('./db_leads.json', JSON.stringify(leads, null, 2));
    console.log('\n✅ Mission Completed. Database Updated.');
}

testExtraction();
