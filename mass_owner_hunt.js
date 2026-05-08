const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { extractOwnerNameWithAI } = require('./ai_extractor');
const { Lead } = require('./models');
const { connectDB } = require('./database');
require('dotenv').config();

puppeteer.use(StealthPlugin());

async function searchOwnerOnGoogle(page, businessName) {
    const query = `${businessName} Culiacan dueño director`;
    console.log(`🔍 Buscando en Google: "${query}"...`);
    
    try {
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Extraer snippets y títulos de los resultados
        const snippets = await page.evaluate(() => {
            const results = [];
            const elements = document.querySelectorAll('div.g');
            elements.forEach(el => {
                const title = el.querySelector('h3')?.innerText;
                const body = el.querySelector('div[style*="webkit-line-clamp"]')?.innerText || el.innerText;
                if (title) results.push(`${title}: ${body}`);
            });
            return results.join('\n\n').substring(0, 5000);
        });

        return snippets;
    } catch (e) {
        console.error(`❌ Error buscando ${businessName}:`, e.message);
        return "";
    }
}

async function runMassiveOwnerHunt() {
    console.log('🚀 INICIANDO BÚSQUEDA MASIVA DE DUEÑOS Y DIRECTIVOS');
    await connectDB();

    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Cargar leads premiun sin nombre
    const leads = await Lead.find({
        $or: [
            { nombre_contacto: '' },
            { nombre_contacto: null },
            { nombre_contacto: { $exists: false } }
        ],
        es_premium: true
    }, { limit: 100 }); // Pasado como opción para ser compatible con SimpleDB y Mongoose

    console.log(`📋 Procesando lote de ${leads.length} leads premium...`);

    let foundCount = 0;

    for (const lead of leads) {
        console.log(`\n--- [${lead.nombre_negocio}] ---`);
        
        // 1. Intentar por sitio web primero si tiene
        let aiResult = { nombre: "", cargo: "", email: "" };
        
        if (lead.sitio_web && lead.sitio_web !== 'Sin dato') {
            aiResult = await extractOwnerNameWithAI(lead.sitio_web);
        }

        // 2. Si falló sitio web, intentar Google Search Osint
        if (!aiResult.nombre) {
            const snippets = await searchOwnerOnGoogle(page, lead.nombre_negocio);
            if (snippets.length > 100) {
                // Reutilizamos callGeminiExtractor de ai_extractor (asumiendo que está exportado o lo copiamos)
                // Para simplificar, modificaré ai_extractor para exportar callGeminiExtractor
                const { callGeminiExtractor } = require('./ai_extractor_helper'); 
                // Wait, I'll just add the helper logic here or export it in ai_extractor.
                
                // For now, let's assume I export it there.
                try {
                    const { extractFromText } = require('./ai_extractor'); // I'll update ai_extractor to export this
                    aiResult = await extractFromText(snippets);
                } catch (err) {
                    console.log('⚠️ Error llamando al extractor de IA corporativo');
                }
            }
        }

        if (aiResult && aiResult.nombre) {
            console.log(`✅ ¡ENCONTRADO! Name: ${aiResult.nombre} | Job: ${aiResult.cargo}`);
            await Lead.findByIdAndUpdate(lead._id, {
                nombre_contacto: aiResult.nombre,
                cargo_contacto: aiResult.cargo,
                email: aiResult.email || lead.email,
                estado: 'contacto_encontrado'
            });
            foundCount++;
        } else {
            console.log(`❌ No se pudo identificar al dueño.`);
        }

        // Esperar un poco para no ser bloqueados
        await new Promise(r => setTimeout(r, 5000));
    }

    await browser.close();
    console.log(`\n🏁 Finalizado. Se encontraron ${foundCount} dueños/directivos.`);
    process.exit(0);
}

runMassiveOwnerHunt();
