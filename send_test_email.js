const Brevo = require('@getbrevo/brevo');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Reutilizamos la lógica del script de restaurantes
const { connectDB } = require('./database');

function getRestaurantHTML(nombreContacto, nombreNegocio) {
  const nombre = nombreContacto || nombreNegocio || 'Empresario';
  const fallbackImageSrc = 'cid:Exito_en_Restaurantes_GLI.jpg';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>GLI Inmobiliaria - Análisis de Ubicación</title>
</head>
<body style="margin:0; padding:0; background-color:#f9f9f9; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" style="background-color:#f9f9f9; padding:30px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" style="background-color:#ffffff; border-radius:8px; overflow:hidden; border: 1px solid #e1e1e1;">
          
          <!-- Imagen de Cabecera (Incrustada) -->
          <tr>
            <td style="text-align:center;">
              <img src="${fallbackImageSrc}" alt="El éxito está en la ubicación, by GLI" style="width:100%; max-width:600px; display:block; border:none; margin:0; padding:0;" />
            </td>
          </tr>
          
          <!-- Contenido -->
          <tr>
            <td style="padding:40px 40px 20px;">
              <p style="color:#333; font-size:16px; margin:0 0 20px;">Estimado equipo de <strong>${nombre}</strong>:</p>
              
              <p style="color:#444; font-size:15px; line-height:1.6; margin:0 0 20px;">
                Trabajando con negocios gastronómicos vemos un patrón constante: <strong style="color:#1a1a2e;">los restaurantes que perduran eligieron su ubicación con el mismo cuidado que su menú.</strong>
              </p>
              
              <p style="color:#444; font-size:15px; line-height:1.6; margin:0 0 25px;">
                Soy Ramiro, de GLI Inmobiliaria. Trabajamos con grupos gastronómicos que buscan espacios con alto tráfico, visibilidad y el perfil de cliente correcto.
              </p>
              
              <table role="presentation" width="100%" style="background-color:#f4f7f6; border-left: 4px solid #e4a948; padding:20px; margin:0 0 25px;">
                <tr>
                  <td>
                    <p style="color:#333; font-size:15px; font-weight:bold; margin:0 0 10px;">Este mes ofrecemos sin costo:</p>
                    <p style="color:#444; font-size:15px; margin:0 0 8px;">🔹 Análisis de flujo peatonal y competencia en la zona</p>
                    <p style="color:#444; font-size:15px; margin:0;">🔹 Asesoría personalizada según su concepto gastronómico</p>
                  </td>
                </tr>
              </table>
              
              <p style="color:#444; font-size:15px; line-height:1.6; margin:0 0 30px;">
                Le compartimos nuestro catálogo actualizado con excelentes oportunidades disponibles. <strong>¿Podríamos agendar una breve llamada para mostrarle las opciones disponibles en su zona?</strong>
              </p>
              
              <!-- Firma -->
              <table role="presentation" width="100%">
                <tr>
                  <td style="padding-top:20px; border-top: 1px solid #eee;">
                    <p style="color:#333; font-size:15px; margin:0 0 5px;">Atentamente,</p>
                    <p style="color:#1a1a2e; font-size:16px; font-weight:bold; margin:0 0 2px;">Ramiro <span style="font-weight:normal; color:#e4a948;">|</span> GLI Inmobiliaria</p>
                    <p style="color:#666; font-size:14px; margin:0;">📞 6672366555</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendTest() {
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

  const testEmail = "marcoaven2@gmail.com"; 
  const nombreEnCorreo = "Marco";

  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.subject = "¿Su restaurante está donde están sus clientes?";
  sendSmtpEmail.htmlContent = getRestaurantHTML("Marco", "Restaurante");
  sendSmtpEmail.sender = { name: 'Ramiro | GLI Inmobiliaria', email: process.env.SENDER_EMAIL || 'hogargli@gmail.com' };
  sendSmtpEmail.to = [{ email: testEmail, name: nombreEnCorreo }];
  
  sendSmtpEmail.attachment = [];

  // PDF
  const catalogPath = path.join(__dirname, 'catalogo_final.pdf');
  if (fs.existsSync(catalogPath)) {
    sendSmtpEmail.attachment.push({
      content: fs.readFileSync(catalogPath).toString('base64'),
      name: 'Catalogo de Propiedades.pdf'
    });
  }

  // Imagen CID PERFECTA
  const imgPath = "C:\\Users\\GLI\\Downloads\\La ubicación puede representar hasta 60–80% del éxito de un restaurante.jpg";
  if (fs.existsSync(imgPath)) {
    sendSmtpEmail.attachment.push({
      content: fs.readFileSync(imgPath).toString('base64'),
      name: 'Exito_en_Restaurantes_GLI.jpg',
      contentId: 'Exito_en_Restaurantes_GLI.jpg' // Usado como cid: en el HTML
    });
  }

  try {
    console.log(`📧 Enviando correo de prueba a ${testEmail}...`);
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Prueba enviada exitosamente. Message ID: ${result.messageId}`);
  } catch (error) {
    console.error(`❌ Error en prueba: ${error.message}`);
  }
}

sendTest();
