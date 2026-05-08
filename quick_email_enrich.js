const fs = require('fs');
const path = require('path');
const { extractEmailsFromWebsite } = require('./prospector');
require('dotenv').config();

const DB_PATH = path.join(__dirname, 'db_leads.json');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function quickEmailEnrich() {
    console.log('📧 ENRIQUECIMIENTO RÁPIDO DE EMAILS');
    let leads = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

    // Leads sin email pero con sitio web, priorizar nuevos
    const candidates = leads.filter(l => 
        (!l.email || l.email === '') && 
        l.sitio_web && 
        l.sitio_web !== 'Sin dato' &&
        l.sitio_web !== ''
    ).reverse().slice(0, 50); // Tomar los últimos 50 (probablemente los nuevos)

    console.log(`📋 Procesando ${candidates.length} sitios web...`);

    let enriched = 0;
    for (const lead of candidates) {
        try {
            console.log(`🔗 Scrapeando emails: ${lead.nombre_negocio} - ${lead.sitio_web}`);
            const emails = await extractEmailsFromWebsite(lead.sitio_web);
            if (emails.length > 0) {
                const idx = leads.findIndex(l => l._id === lead._id);
                if (idx !== -1) {
                    leads[idx].email = emails[0];
                    leads[idx].email_verificado = true;
                    leads[idx].estado = 'email_encontrado';
                    enriched++;
                    console.log(`   ✅ Encontrado: ${emails[0]}`);
                }
            }
        } catch (e) {}
        await sleep(1000);
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(leads, null, 2));
    console.log(`✅ ${enriched} emails agregados.`);
}

quickEmailEnrich().then(() => process.exit(0));
