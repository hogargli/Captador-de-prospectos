const Brevo = require('@getbrevo/brevo');
const fs = require('fs');
require('dotenv').config();

async function testRestaurantEmail() {
  console.log('🧪 Preparando el súper correo para Restaurantes...');

  // Configurar Brevo
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

  const sendSmtpEmail = new Brevo.SendSmtpEmail();

  // Datos
  const toEmail1 = 'marcoaven2@gmail.com';
  const imgPath = "C:\\Users\\GLI\\Downloads\\La ubicación puede representar hasta 60–80% del éxito de un restaurante.jpg";
  let imgBase64 = '';
  if (fs.existsSync(imgPath)) {
    imgBase64 = fs.readFileSync(imgPath).toString('base64');
  }

  sendSmtpEmail.subject = "¿Su restaurante está donde están sus clientes?";

  // Plantilla HTML diseñada específicamente para el sector gastronómico
  sendSmtpEmail.htmlContent = `
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
          
          <!-- Imagen de Cabecera (Incrustada Nativa) -->
          <tr>
            <td style="text-align:center;">
              <img src="cid:Exito_en_Restaurantes_GLI.jpg" alt="El éxito está en la ubicación, by GLI" style="width:100%; max-width:600px; display:block; border:none; margin:0; padding:0;" />
            </td>
          </tr>
          
          <!-- Contenido del Correo -->
          <tr>
            <td style="padding:40px 40px 20px;">
              <p style="color:#333; font-size:16px; margin:0 0 20px;">Estimado equipo de <strong>La Gran Cocina (Prueba)</strong>:</p>
              
              <p style="color:#444; font-size:15px; line-height:1.6; margin:0 0 20px;">
                Trabajando con negocios gastronómicos vemos un patrón constante: <strong style="color:#1a1a2e;">los restaurantes que perduran eligieron su ubicación con el mismo cuidado que su menú.</strong>
              </p>
              
              <p style="color:#444; font-size:15px; line-height:1.6; margin:0 0 25px;">
                Soy Ramiro, de GLI Inmobiliaria. Trabajamos con restaurantes y grupos gastronómicos que buscan espacios con alto tráfico, visibilidad y el perfil de cliente correcto.
              </p>
              
              <!-- Caja de Oferta de Valor -->
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
                Adjunto nuestro catálogo. <strong>¿Podríamos agendar una breve llamada para mostrarle las opciones disponibles en su zona?</strong>
              </p>
              
              <!-- Firma -->
              <table role="presentation" width="100%">
                <tr>
                  <td style="padding-top:20px; border-top: 1px solid #eee;">
                    <p style="color:#333; font-size:15px; margin:0 0 5px;">Atentamente,</p>
                    <p style="color:#1a1a2e; font-size:16px; font-weight:bold; margin:0 0 2px;">GLI Ramiro</p>
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
</html>
  `;

  sendSmtpEmail.sender = { name: 'GLI Ramiro', email: process.env.SENDER_EMAIL || 'hogargli@gmail.com' };
  sendSmtpEmail.to = [
    { email: toEmail1, name: 'Equipo de La Gran Cocina (Prueba)' }
  ];
  
  // Intentar adjuntar el catálogo en la ruta especificada
  const catalogPath = "C:\\Users\\GLI\\Downloads\\Catálogo Propiedades Exclusivas de GLI.pdf (1) (1).pdf";
  const fallbackPath = "C:\\Users\\GLI\\Downloads\\Catálogo Propiedades Exclusivas de GLI.pdf (1) (1).pdf";

  let finalPath = null;
  if (fs.existsSync(catalogPath)) {
    finalPath = catalogPath;
  } else if (fs.existsSync(fallbackPath)) {
    finalPath = fallbackPath;
  }

  sendSmtpEmail.attachment = [];

  if (finalPath) {
    console.log("📎 Adjuntando catálogo desde:", finalPath);
    const pdfContent = fs.readFileSync(finalPath);
    sendSmtpEmail.attachment.push({
      content: pdfContent.toString('base64'),
      name: 'Opciones Gastronómicas - GLI Inmobiliaria.pdf'
    });
  } else {
    console.log("⚠️ No se encontró el PDF en la ruta logica. Revisa la ruta.");
  }

  // Agregando la imagen oculta (CID) para visualización nativa
  if (fs.existsSync(imgPath)) {
    console.log("🖼️ Adjuntando la imagen vinculada por CID...");
    const imgContent = fs.readFileSync(imgPath);
    sendSmtpEmail.attachment.push({
      content: imgContent.toString('base64'),
      name: 'Exito_en_Restaurantes_GLI.jpg'
    });
  } else {
    console.log("⚠️ No se encontró la imagen en:", imgPath);
  }

  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ ¡CORREO ENVIADO CON ÉXITO a ambos destinatarios!`);
    console.log("Revisa tu bandeja de entrada o spam. Respuesta Brevo:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Falló el envío:", error.message);
  }
}

testRestaurantEmail();
