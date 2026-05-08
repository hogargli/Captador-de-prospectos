const fs = require('fs');
const path = require('path');
const { connectDB } = require('./database');
const { Lead } = require('./models');
const { extractOwnerNameWithAI } = require('./ai_extractor');
require('dotenv').config();

const DB_PATH = path.join(__dirname, 'db_leads.json');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function enrichPremiumPersonae() {
    console.log('💎 ═══════════════════════════════════════');
    console.log('💎 ENRIQUECIMIENTO DE PERSONAS PREMIUM');
    console.log('💎 (Médicos, Cirujanos, Cantantes, Dueños)');
    console.log('💎 ═══════════════════════════════════════\n');

    await connectDB();
    
    // Leer DB
    let leads = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

    // Filtrar los que son de las categorías nuevas o premium sin nombre
    const targetKeywords = ['cirujano', 'médico', 'especialista', 'cantante', 'músico', 'artista', 'dueño', 'director', 'notario'];
    
    const candidates = leads.filter(l => {
        const giro = (l.giro || '').toLowerCase();
        const nombreValido = !l.nombre_contacto || l.nombre_contacto === '' || l.nombre_contacto === '---';
        const isTarget = targetKeywords.some(kw => giro.includes(kw));
        return (l.es_premium || isTarget) && nombreValido;
    }).slice(0, 100);

    console.log(`📋 Se encontraron ${candidates.length} candidatos para enriquecimiento profundo.\n`);

    let enriched = 0;

    for (const lead of candidates) {
        console.log(`🔍 Investigando: ${lead.nombre_negocio} (${lead.giro})`);
        
        let aiData = { nombre: "", cargo: "", email: "" };

        // Si tiene sitio web, usarlo
        if (lead.sitio_web && lead.sitio_web !== 'Sin dato' && !lead.sitio_web.includes('facebook.com')) {
            aiData = await extractOwnerNameWithAI(lead.sitio_web);
        }

        // Si no tiene sitio web o falló, pero es un profesional individual, el nombre del negocio suele ser el nombre del doctor
        if (!aiData.nombre && (lead.giro.toLowerCase().includes('médico') || lead.giro.toLowerCase().includes('cirujano'))) {
            // Limpiar "Dr." o "Doctor" del nombre del negocio
            let name = lead.nombre_negocio.replace(/Dr\.|Doctor|Médico|Cirujano/gi, '').trim();
            if (name.split(' ').length >= 2) {
                aiData.nombre = name;
                aiData.cargo = lead.giro;
            }
        }

        if (aiData.nombre) {
            const idx = leads.findIndex(l => l._id === lead._id);
            if (idx !== -1) {
                leads[idx].nombre_contacto = aiData.nombre;
                leads[idx].cargo_contacto = aiData.cargo || lead.giro;
                if (aiData.email && !leads[idx].email) {
                    leads[idx].email = aiData.email;
                    leads[idx].email_verificado = true;
                }
                enriched++;
                console.log(`   ✅ Encontrado: ${aiData.nombre} | ${aiData.email || 'Sin email'}`);
            }
        }

        await sleep(2000); // Evitar 429
    }

    // Guardar DB
    fs.writeFileSync(DB_PATH, JSON.stringify(leads, null, 2));
    console.log(`\n✅ Proceso completado. ${enriched} perfiles enriquecidos.`);
}

enrichPremiumPersonae().then(() => process.exit(0));
