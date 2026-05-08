const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

async function searchGoogle(query) {
    console.log(`🔍 Buscando en Google: "${query}"...`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    try {
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query + ' Culiacan')}`, { waitUntil: 'networkidle2' });
        
        const results = await page.evaluate(() => {
            const items = [];
            const elements = document.querySelectorAll('div.g');
            elements.forEach(el => {
                const title = el.querySelector('h3')?.innerText;
                const link = el.querySelector('a')?.href;
                if (title && link && !link.includes('google.com')) {
                    items.push({ nombre: title, web: link });
                }
            });
            return items;
        });

        console.log(`✅ Encontrados ${results.length} resultados.`);
        return results;
    } catch (e) {
        console.error('❌ Error:', e.message);
        return [];
    } finally {
        await browser.close();
    }
}

async function run() {
    const categories = [
        'Dueños de Agrícolas', 
        'Empresas en Parque Industrial La Primavera', 
        'Notarios Públicos', 
        'Despachos de Arquitectos',
        'Constructoras de Lujo',
        'Agencias de Autos Premium',
        'Clínicas de Cirugía Plástica',
        'Inversionistas Inmobiliarios'
    ];
    const dbPath = './db_leads.json';
    const leads = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    let added = 0;

    for (const cat of categories) {
        const found = await searchGoogle(cat);
        for (const item of found) {
            // Evitar duplicados
            if (!leads.find(l => l.nombre_negocio === item.nombre || l.sitio_web === item.web)) {
                leads.push({
                    _id: Math.random().toString(36).substr(2, 9),
                    nombre_negocio: item.nombre,
                    sitio_web: item.web,
                    giro: cat,
                    fuente: 'Google Search',
                    es_premium: true,
                    calificacion: 70,
                    estado: 'nuevo',
                    fecha_captura: new Date().toISOString()
                });
                added++;
            }
        }
    }

    fs.writeFileSync(dbPath, JSON.stringify(leads, null, 2));
    console.log(`🚀 Finalizado. Se agregaron ${added} nuevos leads potenciales.`);
}

run();
