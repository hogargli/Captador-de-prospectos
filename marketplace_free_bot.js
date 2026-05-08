+const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { generateMarketplaceResponse } = require('./marketplace_agent');
require('dotenv').config();

puppeteer.use(StealthPlugin());

/**
 * BOT DE MARKETPLACE - VERSIÓN DE ALTA SEGURIDAD
 * Diseñado para evitar traslapes y respuestas duplicadas.
 */

async function startProfessionalBot() {
  console.log('🛡️ Iniciando Bot de Alta Seguridad...');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--window-size=1200,900'],
    userDataDir: './fb_session'
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  console.log('🌐 Conectando a Messenger...');
  await page.goto('https://www.facebook.com/messages/t/', { waitUntil: 'networkidle2' });

  // Registro de chats procesados para evitar bucles
  const processedMessageIds = new Set();

  // CICLO INFINITO SEGURO (Uno por uno)
  while (true) {
    try {
      // 1. Buscar chats con indicadores de NO LEÍDO
      const unreadSelector = 'div[role="gridcell"] div[aria-label*="No leído"], div[role="gridcell"] div[aria-label*="Unread"]';
      const unreadChat = await page.$(unreadSelector);

      if (unreadChat) {
        console.log('📩 Nuevo mensaje detectado. Procesando...');

        // Hacer clic y esperar carga completa
        await unreadChat.click();
        await sleep(4000);

        // 2. Extraer TODAS las burbujas de mensaje para analizar el hilo
        const bubbles = await page.$$('div[dir="auto"]');
        if (bubbles.length > 0) {
          const lastBubble = bubbles[bubbles.length - 1];
          const lastText = await lastBubble.evaluate(el => el.innerText);

          // SEGURIDAD: ¿El último mensaje es del sistema o mío?
          const isInvalid = await lastBubble.evaluate(el => {
            const text = el.innerText || '';
            // Ignorar si es el asistente de FB o si el mensaje está alineado a la derecha (Mio)
            const style = window.getComputedStyle(el);
            const parentLabel = el.closest('[aria-label]')?.getAttribute('aria-label') || '';

            return text.includes('Marketplace Assistant') ||
              text.includes('¿Lo vendiste?') ||
              parentLabel.includes('Tú') ||
              parentLabel.includes('You sent') ||
              style.textAlign === 'right';
          });

          if (isInvalid) {
            console.log('⏩ Mensaje de sistema o propio detectado. Ignorando conversación.');
          } else {
            // 3. Generar y enviar respuesta
            console.log(`💬 Analizando mensaje: "${lastText.substring(0, 50)}..."`);
            const response = await generateMarketplaceResponse("Cliente", lastText);

            if (response && response !== "IGNORE_MESSAGE") {
              const inputSelector = 'div[role="textbox"]';
              await page.waitForSelector(inputSelector);

              // Limpiar por si acaso había algo escrito
              await page.click(inputSelector, { clickCount: 3 });
              await page.keyboard.press('Backspace');

              console.log(`🤖 Respondiendo: "${response}"`);
              await page.keyboard.type(response, { delay: 50 });
              await sleep(1000);
              await page.keyboard.press('Enter');
              console.log('✅ Respuesta enviada exitosamente.');
            }
          }
        }

        // Volver a la lista general para que se refresquen los estados
        console.log('⏳ Esperando 10 segundos antes de la próxima revisión...');
        await sleep(10000);
      }
    } catch (err) {
      console.log('⚠️ Error controlado:', err.message);
    }

    // Pequeña pausa antes de volver a buscar en la lista
    await sleep(5000);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

startProfessionalBot().catch(console.error);
