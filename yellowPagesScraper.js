const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Lead } = require('./models');
const { connectDB } = require('./database');
puppeteer.use(StealthPlugin());
require('dotenv').config();

/**
 * Scraper para Sección Amarilla (Culiacán)
 * Busca profesionales específicos y extrae sus datos
 */
async function scrapeSeccionAmarilla(keyword) {
  console.log(`🔍 Iniciando búsqueda en Sección Amarilla para: "${keyword}"...`);
  
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  const page = await browser.newPage();
  
  // Ocultar Puppeteer
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
  });

  try {
    const url = `https://www.seccionamarilla.com.mx/resultados/${encodeURIComponent(keyword)}/culiacan/1`;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });

    // Esperar a que los resultados carguen
    try {
      await page.waitForSelector('.list-item, .cl-item, .item-listado', { timeout: 20000 });
    } catch (e) {
      console.log(`⚠️ No se detectaron contenedores de resultados para "${keyword}" con selectores estándar.`);
    }

    const results = await page.evaluate(() => {
      const items = [];
      // Intentar varios selectores comunes
      const blocks = document.querySelectorAll('.list-item, .cl-item, .item-listado, [itemtype*="LocalBusiness"]');
      
      blocks.forEach(block => {
        // Buscar el título/nombre
        const nombreLink = block.querySelector('a[class^="gtm-header-"], .title, h2, h3');
        const nombre = nombreLink?.querySelector('span')?.innerText.trim() || nombreLink?.innerText.trim();
        
        // Buscar teléfono
        const telefono = block.querySelector('a.color-llamar span, a[id*="tel"] span, .tel, [itemprop="telephone"]')?.innerText.trim();
        
        // Buscar dirección
        const direccion = block.querySelector('span[itemprop="streetAddress"], .cl-address, .address, address')?.innerText.trim();
        
        // El sitio web a veces es el link del titulo si no es de seccion amarilla
        let sitio_web = block.querySelector('a.gtm-web-link, .website')?.getAttribute('href');
        const mainLink = nombreLink?.getAttribute('href');
        
        if (!sitio_web && mainLink && !mainLink.includes('seccionamarilla.com.mx')) {
          sitio_web = mainLink;
        }
        
        if (nombre) {
          items.push({
            nombre_negocio: nombre,
            nombre_contacto: nombre,
            telefono: telefono || '',
            direccion_raw: direccion || '',
            sitio_web: sitio_web || '',
            fuente: 'Seccion Amarilla'
          });
        }
      });
      return items;
    });

    console.log(`✅ Se encontraron ${results.length} resultados en la página.`);
    
    await connectDB();
    let nuevos = 0;

    for (const item of results) {
      // Intentar guardar o actualizar
      const existing = await Lead.findOne({ 
        nombre_negocio: item.nombre_negocio,
        $or: [{ fuente: 'Seccion Amarilla' }, { telefono: item.telefono }]
      });

      if (!existing) {
        await Lead.create({
          ...item,
          giro: keyword,
          estado: 'nuevo',
          es_premium: true, // Profesionales de Sección Amarilla se consideran premium
          calificacion: 80
        });
        nuevos++;
      }
    }

    console.log(`💾 ${nuevos} nuevos leads guardados de Sección Amarilla`);
    return nuevos;

  } catch (error) {
    console.error(`❌ Error en scraper Sección Amarilla (${keyword}):`, error.message);
    return 0;
  } finally {
    await browser.close();
  }
}

// Ejecutar para categorías clave
async function runSpecializedProspection() {
  const categorias = [
    'cirujano plastico',
    'hospitales privados',
    'clinicas de especialidades',
    'notarias publicas',
    'agencias de autos de lujo',
    'clubes de golf',
    'arquitectos'
  ];

  for (const cat of categorias) {
    await scrapeSeccionAmarilla(cat);
    // Esperar un poco entre búsquedas para evitar bloqueos
    await new Promise(r => setTimeout(r, 5000));
  }
}

if (require.main === module) {
  runSpecializedProspection()
    .then(() => {
      console.log('🏁 Prospección especializada completada');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error fatal:', err);
      process.exit(1);
    });
}

module.exports = { scrapeSeccionAmarilla, runSpecializedProspection };
