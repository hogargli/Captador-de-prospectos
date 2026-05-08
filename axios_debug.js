const axios = require('axios');
require('dotenv').config();

async function axiosDebug() {
  console.log('🚀 Probando envio directo via HTTP para diagnostico...');
  
  try {
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { name: 'GLI Inmobiliaria', email: process.env.SENDER_EMAIL || 'hogargli@gmail.com' },
      to: [{ email: 'marcoaven2@gmail.com', name: 'Marco' }],
      subject: 'PRUEBA FINAL - GLI',
      htmlContent: '<p>Si este llega, es la libreria. Si no llega, es el servidor.</p>'
    }, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ RESPUESTA DEL SERVIDOR (Brevo):');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ ERROR EN SERVIDOR:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Cuerpo del error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Mensaje:', error.message);
    }
  }
}
axiosDebug();
