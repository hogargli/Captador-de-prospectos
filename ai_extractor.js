const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`;

// Palabras clave en los enlaces para encontrar las paginas de equipo/nosotros
const TARGET_LINKS_REGEX = /(nosotros|acerca|about|directorio|equipo|conocenos|contacto|quienes-somos)/i;

/**
 * Busca las paginas más prometedoras de un sitio web para encontrar nombres.
 */
async function getRelevantPagesText(baseUrl) {
  try {
    if (!baseUrl.startsWith('http')) {
      baseUrl = 'https://' + baseUrl;
    }
    
    // Obtener la pagina principal
    const response = await axios.get(baseUrl, { 
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    
    const $ = cheerio.load(response.data);
    let combinedText = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Buscar enlaces clave
    const linksToVisit = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text();
      // Si el enlace parece llevar a "Nosotros" o "Directorio"
      if (href && (TARGET_LINKS_REGEX.test(href) || TARGET_LINKS_REGEX.test(text))) {
        // Formatear si es ruta relativa
        if (href.startsWith('/')) {
          linksToVisit.push(new URL(href, baseUrl).href);
        } else if (href.startsWith('http')) {
          linksToVisit.push(href);
        }
      }
    });

    // Limitar a máximo 2 sub-páginas para no demorar mucho
    const uniqueLinks = [...new Set(linksToVisit)].slice(0, 2);
    
    for (const link of uniqueLinks) {
      try {
        const subRes = await axios.get(link, { timeout: 8000 });
        const sub$ = cheerio.load(subRes.data);
        const subText = sub$('body').text().replace(/\s+/g, ' ').trim();
        combinedText += "\n" + subText;
      } catch (e) {
        console.log(`[AI Extractor] No se pudo cargar: ${link}`);
      }
    }

    // Limitar a los primeros 10,000 caracteres para no saturar al IA
    return combinedText.substring(0, 10000);
    
  } catch (error) {
    console.error(`[AI Extractor] Error scrapeando ${baseUrl}:`, error.message);
    return "";
  }
}

/**
 * Envía el texto a Gemini para extraer Nombre y Cargo
 */
async function callGeminiExtractor(htmlText) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY no encontrada en el archivo .env");
  }

  const prompt = `
  Eres un asistente experto en investigación comercial y minería de datos (OSINT).
  Te voy a dar el texto extraído de un sitio web o de resultados de búsqueda de un negocio en Culiacán, Sinaloa, México.
  
  Tu misión es encontrar:
  1. El nombre del DUEÑO, FUNDADOR, SOCIO o DIRECTOR GENERAL.
  2. El CORREO ELECTRÓNICO directo o corporativo.
  3. El PUESTO o CARGO exacto.
  
  Instrucciones:
  - Busca nombres propios de personas asociados a cargos directivos.
  - Si no encuentras el nombre del dueño pero ves el nombre de un gerente o administrador, elígelo.
  - Si encuentras un correo, devuélvelo.
  - Ignora nombres de clientes en testimonios a menos que parezcan ser los dueños.
  
  Devuelve ÚNICAMENTE un objeto JSON plano (SIN MARKDOWN, SIN \`\`\`json):
  {"nombre": "Nombre completo", "cargo": "Dueño/Director/Notario/etc", "email": "correo@ejemplo.com"}
  
  Si no hay NADA de información personal real, devuelve:
  {"nombre": "", "cargo": "", "email": ""}
  
  Texto a analizar:
  """
  ${htmlText}
  """
  `;

  try {
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    const response = await axios.post(GEMINI_URL, payload, { headers: { 'Content-Type': 'application/json' } });
    const aiResponseText = response.data.candidates[0].content.parts[0].text;
    
    // Limpieza robusta de JSON (Gemini a veces pone ```json ... ```)
    const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { nombre: "", cargo: "", email: "" };
  } catch (error) {
    console.error("[AI Extractor] Error con Google Gemini:", error.message);
    return { nombre: "", cargo: "", email: "" };
  }
}

/**
 * Función Principal a exportar
 */
async function extractOwnerNameWithAI(url) {
  if(!url || url === 'Sin dato' || url === '' || url.includes('facebook.com')) return { nombre: "", cargo: "", email: "" };
  
  console.log(`🤖 Analizando sitio web con IA: ${url}`);
  const text = await getRelevantPagesText(url);
  
  if (text.length < 50) {
    return { nombre: "", cargo: "", email: "" };
  }

  const result = await callGeminiExtractor(text);
  
  if (result && (result.nombre || result.email)) {
    console.log(`✅ IA Encontró: ${result.nombre || 'Sin nombre'} | Email: ${result.email || 'Sin email'}`);
  }

  return result;
}

/**
 * Genera un párrafo de apertura personalizado para un correo de ventas
 * basado en el contexto del negocio.
 */
async function generateHyperPersonalization(businessName, activity, url = '') {
  let contextText = `Nombre del negocio: ${businessName}. Actividad: ${activity}.`;
  
  if (url && url !== 'Sin dato' && url !== '') {
    const webText = await getRelevantPagesText(url);
    if (webText.length > 50) {
      contextText += `\nInformación extraída de su web: ${webText.substring(0, 3000)}`;
    }
  }

  const prompt = `
  Eres un experto en copywriting y ventas B2B de alto nivel.
  Tu misión es escribir un PÁRRAFO DE APERTURA (máximo 2-3 líneas) para un correo en frío.
  Este párrafo debe sonar natural, profesional y NO robótico. Debe romper el hielo demostrando que conocemos su negocio.

  Objetivo: El correo es de GLI Inmobiliaria, ofreciendo servicios de inversión inmobiliaria de alto retorno o espacios corporativos premium en Culiacán.
  
  Reglas:
  - NO saludes (el saludo se pondrá aparte).
  - NO digas "Espero que estés bien" o frases genéricas.
  - Menciona algo específico sobre su giro o su éxito (basado en la info que te doy).
  - Usa un tono de consultor experto, no de vendedor desesperado.
  - Idioma: Español (México).

  Datos del negocio:
  ${contextText}

  Devuelve ÚNICAMENTE el párrafo de texto plano.
  `;

  try {
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    const response = await axios.post(GEMINI_URL, payload, { headers: { 'Content-Type': 'application/json' } });
    const aiResponseText = response.data.candidates[0].content.parts[0].text;
    
    return aiResponseText.replace(/["']/g, '').trim();
  } catch (error) {
    console.error("[AI Extractor] Error generando personalización:", error.message);
    return "";
  }
}

module.exports = { 
  extractOwnerNameWithAI, 
  extractFromText: callGeminiExtractor,
  generateHyperPersonalization
};

