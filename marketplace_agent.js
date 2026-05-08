const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Usamos el modelo exacto que funciona en tus otros scripts
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`;

function loadConfig() {
  const configPath = path.join(__dirname, 'marketplace_config.json');
  try {
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function generateMarketplaceResponse(senderName, incomingMessage) {
  const config = loadConfig();
  if (!config) return null;

  const inventoryStr = JSON.stringify(config.inventario, null, 2);
  
  const prompt = `
    Eres un asesor de ventas de alto nivel para ${config.vendedor}. 
    Tu gramática debe ser impecable, profesional y cálida (Español de México).
    
    OBJETIVO: Responder dudas sobre Marketplace y agendar una cita o pedir el WhatsApp.
    
    INVENTARIO DISPONIBLE:
    ${inventoryStr}
    
    REGLAS ESTRICTAS:
    1. Si el mensaje es "Is this still available?" o "¿Sigue disponible?", responde: "¡Hola! Sí, aún está disponible. Ha tenido mucho interés hoy, ¿te gustaría venir a verlo o que te envíe la ubicación por WhatsApp?"
    2. NUNCA respondas a mensajes del sistema de Facebook (ej. "Vendido", "Recordatorio").
    3. Si el mensaje no tiene sentido o es personal, responde: "IGNORE_MESSAGE".
    4. Usa excelente ortografía. Evita abreviaturas informales.
    5. Si no estás seguro de la respuesta, invita al cliente a dejar su número para que un asesor físico le llame.
    
    CLIENTE: "${senderName}"
    MENSAJE: "${incomingMessage}"
    
    RESPUESTA PROFESIONAL:
  `;

  try {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    const response = await axios.post(GEMINI_URL, payload, { timeout: 10000 });
    const aiResponse = response.data.candidates[0].content.parts[0].text.trim();
    
    if (aiResponse.includes("IGNORE_MESSAGE") || aiResponse.length < 2) {
      return null;
    }

    return aiResponse;
  } catch (error) {
    // ELIMINADO: Ya no se envía un mensaje de error al cliente. Silencio total si falla la API.
    console.error("Error en IA, permaneciendo en silencio...");
    return null;
  }
}

module.exports = { generateMarketplaceResponse };
