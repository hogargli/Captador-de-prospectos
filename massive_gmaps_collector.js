const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function scrapeGMaps(page, query) {
    console.log(`🔍 GMaps: "${query}"...`);
    try {
        await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query + ' Culiacán')}`, { waitUntil: 'networkidle2' });
        
        // Scroll para cargar más resultados
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => {
                const resultsSideBar = document.querySelector('div[role="feed"]');
                if (resultsSideBar) resultsSideBar.scrollBy(0, 1000);
            });
            await new Promise(r => setTimeout(r, 2000));
        }

        const items = await page.evaluate(() => {
            const results = [];
            const cards = document.querySelectorAll('div[role="article"]');
            cards.forEach(card => {
                const name = card.querySelector('div.fontHeadlineSmall')?.innerText;
                const link = card.querySelector('a')?.href;
                if (name) results.push({ name, link });
            });
            return results;
        });
        
        return items;
    } catch (e) {
        console.error(`❌ Error en GMaps "${query}":`, e.message);
        return [];
    }
}

async function runMassiveCollector() {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    const categories = [
        'Notaría Pública', 'Joyas Personalizadas', 'Relojes de Lujo', 'Inmuebles Premium',
        'Médicos Cirujanos', 'Clínicas de Especialidad', 'Cantantes Locales', 'Bandas de Música',
        'Artistas Plásticos', 'Escultores', 'Empresarios Industriales'
    ];

    const dbPath = './db_leads.json';
    const leads = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    let added = 0;

    for (const cat of categories) {
        const found = await scrapeGMaps(page, cat);
        for (const item of found) {
            if (!leads.find(l => l.nombre_negocio === item.name)) {
                leads.push({
                    _id: Math.random().toString(36).substr(2, 9),
                    nombre_negocio: item.name,
                    google_link: item.link,
                    giro: cat,
                    fuente: 'Google Maps Premium',
                    es_premium: true,
                    calificacion: 85,
                    estado: 'nuevo',
                    fecha_captura: new Date().toISOString()
                });
                added++;
            }
        }
    }

    fs.writeFileSync(dbPath, JSON.stringify(leads, null, 2));
    console.log(`🚀 Colección masiva finalizada. Se agregaron ${added} nuevos prospectos.`);
    await browser.close();
    process.exit(0);
}

runMassiveCollector();
