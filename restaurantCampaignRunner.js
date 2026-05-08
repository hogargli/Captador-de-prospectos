// restaurantCampaignRunner.js
// Módulo para enviar campaña de 50 correos a restaurantes
const Brevo = require('@getbrevo/brevo');
const fs = require('fs');
require('dotenv').config();
const { Lead } = require('./models');

function getRestaurantHTML(nombreContacto, nombreNegocio) {
  const nombre = nombreContacto || nombreNegocio || 'Empresario del Sector Gastronómico';
  const imgPath = "C:\\Users\\GLI\\Downloads\\La ubicación puede representar hasta 60–80% del éxito de un restaurante (1).jpg";
  const fallbackImageSrc = fs.existsSync(imgPath) ? 'cid:Exito_en_Restaurantes_GLI.jpg' : '';

  return `<!DOCTYPE html>
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
          <tr>
            <td style="text-align:center;">
              ${fallbackImageSrc ? `<img src="${fallbackImageSrc}" alt="El éxito está en la ubicación, by GLI" style="width:100%; max-width:600px; display:block; border:none; margin:0; padding:0;" />` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 20px;">
              <p style="color:#333; font-size:16px; margin:0 0 20px;">Estimado equipo de <strong>${nombre}</strong>:</p>
              <p style="color:#444; font-size:15px; line-height:1.6; margin:0 0 20px;">
                Trabajando con negocios gastronómicos vemos un patrón constante: <strong style="color:#1a1a2e;">los restaurantes que perduran eligieron su ubicación con el mismo cuidado que su menú.</strong>
              </p>
              <p style="color:#444; font-size:15px; line-height:1.6; margin:0 0 25px;">
                Soy Ramiro, de GLI Inmobiliaria. Trabajamos con restaurantes y grupos gastronómicos que buscan espacios con alto tráfico, visibilidad y el perfil de cliente correcto.
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
                Adjunto nuestro catálogo. <strong>¿Podríamos agendar una breve llamada para mostrarle las opciones disponibles en su zona?</strong>
              </p>
              <table role="presentation" width="100%">
                <tr>
                  <td style="padding-top:20px; border-top: 1px solid #eee;">
                    <p style="color:#333; font-size:15px; margin:0 0 5px;">Atentamente,</p>
                    <p style="color:#1a1a2e; font-size:16px; font-weight:bold; margin:0 0 2px;">GLI Ramiro</p>
                    <p style="color:#666; font-size:14px; margin:0;">📞 6672366555</p>
                  </td>
                </tr>
              </table>
              <p style="color:#999; font-size:11px; margin:30px 0 0; line-height:1.6; text-align:center;">
                Este correo fue enviado desde la base de datos de GLI Inmobiliaria.<br>
                Si desea dejar de recibir ofertas exclusivas, responder con "BAJA".
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendRestaurantCampaign() {
  console.log('\n🍽️ ===============================================');
  console.log('🍽️ CAMPAÑA RESTAURANTES - GLI INMOBILIARIA');
  console.log('🍽️ ===============================================\n');

  // 1. Obtener todos los leads elegibles y filtrar en JS
  const allLeads = await Lead.find({
    email: { $ne: '', $exists: true },
    email_enviado: false,
    dado_de_baja: false
  });

  const restaurantLeads = allLeads
    .filter(l => l.giro && /restauran|comida|alimento|gastron|café|cafeteria|taqueria|taco|mariscos|pizza|sushi|cocina|cenad|fonda|cantina|bar|buffet|antojitos/i.test(l.giro))
    .sort((a, b) => (b.es_premium ? 1 : 0) - (a.es_premium ? 1 : 0))
    .slice(0, 50);

  console.log(`📊 Total de leads en BD: ${allLeads.length}`);
  console.log(`🍽️ Restaurantes pendientes encontrados: ${restaurantLeads.length}\n`);

  if (restaurantLeads.length === 0) {
    console.log('⚠️ No se encontraron leads de restaurantes con email pendientes de envío.');
    console.log('💡 Tip: Verificar que los leads tienen giro con palabras: restauran, comida, gastron, etc.');
    return { sent: 0, total: 0 };
  }

  // 2. Configurar Brevo
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

  const imgPath = "C:\\Users\\GLI\\Downloads\\La ubicación puede representar hasta 60–80% del éxito de un restaurante (1).jpg";
  const catalogPath = "C:\\Users\\GLI\\Downloads\\Catálogo Propiedades Exclusivas de GLI.pdf (1) (1).pdf";

  let sentCount = 0;
  let errorCount = 0;

  for (let i = 0; i < restaurantLeads.length; i++) {
    const lead = restaurantLeads[i];
    const nombreEnCorreo = lead.nombre_contacto || lead.nombre_negocio || 'Restaurante';

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = "¿Su restaurante está donde están sus clientes?";
    sendSmtpEmail.htmlContent = getRestaurantHTML(lead.nombre_contacto, lead.nombre_negocio);
    sendSmtpEmail.sender = { name: 'GLI Ramiro', email: process.env.SENDER_EMAIL || 'hogargli@gmail.com' };
    sendSmtpEmail.to = [{ email: lead.email, name: nombreEnCorreo }];
    sendSmtpEmail.attachment = [];

    // Adjuntar catálogo PDF
    if (fs.existsSync(catalogPath)) {
      sendSmtpEmail.attachment.push({
        content: fs.readFileSync(catalogPath).toString('base64'),
        name: 'Opciones Gastronómicas - GLI Inmobiliaria.pdf'
      });
    }

    // Adjuntar imagen CID
    if (fs.existsSync(imgPath)) {
      sendSmtpEmail.attachment.push({
        content: fs.readFileSync(imgPath).toString('base64'),
        name: 'Exito_en_Restaurantes_GLI.jpg'
      });
    }

    try {
      console.log(`[${i+1}/${restaurantLeads.length}] 📧 Enviando a: ${lead.nombre_negocio} <${lead.email}>`);
      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

      // Marcar como enviado en la BD
      await Lead.updateOne(
        { _id: lead._id },
        {
          $set: {
            email_enviado: true,
            estado: 'email_enviado',
            fecha_email_enviado: new Date(),
            brevo_message_id: result.messageId || ''
          },
          $inc: { intentos_envio: 1 }
        }
      );

      console.log(`   ✅ Enviado → Message ID: ${result.messageId}`);
      sentCount++;
    } catch (error) {
      console.error(`   ❌ Error enviando a ${lead.email}: ${error.message}`);
      errorCount++;
    }

    // Delay de 2 segundos entre envíos para no saturar la API
    await new Promise(res => setTimeout(res, 2000));
  }

  console.log('\n🍽️ ===============================================');
  console.log(`✅ CAMPAÑA COMPLETADA`);
  console.log(`   📧 Enviados: ${sentCount}`);
  console.log(`   ❌ Errores:  ${errorCount}`);
  console.log(`   📋 Total procesados: ${restaurantLeads.length}`);
  console.log('🍽️ ===============================================\n');

  return { sent: sentCount, errors: errorCount, total: restaurantLeads.length };
}

module.exports = { sendRestaurantCampaign };
