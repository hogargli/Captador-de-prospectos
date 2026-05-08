const Brevo = require('@getbrevo/brevo');
const fs = require('fs');
require('dotenv').config();
const { connectDB } = require('./database');
const { Lead } = require('./models');

// Función que devuelve la plantilla exacta aprobada
function getRestaurantHTML(nombreContacto, nombreNegocio) {
  const nombre = nombreContacto || nombreNegocio || 'Empresario del Sector Gastronómico';
  const imgPath = "C:\\Users\\GLI\\Downloads\\La ubicación puede representar hasta 60–80% del éxito de un restaurante.jpg";
  let fallbackImageSrc = '';

  if (fs.existsSync(imgPath)) {
    fallbackImageSrc = 'cid:Exito_en_Restaurantes_GLI.jpg';
  }

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
          
          <!-- Imagen de Cabecera (Incrustada Nativa) -->
          <tr>
            <td style="text-align:center;">
              <img src="${fallbackImageSrc}" alt="El éxito está en la ubicación, by GLI" style="width:100%; max-width:600px; display:block; border:none; margin:0; padding:0;" />
            </td>
          </tr>
          
          <!-- Contenido del Correo -->
          <tr>
            <td style="padding:40px 40px 20px;">
              <p style="color:#333; font-size:16px; margin:0 0 20px;">Estimado equipo de <strong>${nombre}</strong>:</p>
              
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
                Le compartimos nuestro catálogo actualizado con excelentes oportunidades disponibles. <strong>¿Podríamos agendar una breve llamada para mostrarle las opciones disponibles en su zona?</strong>
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
</html>
  `;
}

async function sendRestaurantCampaignTo50() {
  console.log('🚀 ===============================================');
  console.log('🚀 INICIANDO CAMPAÑA MASIVA A 50 RESTAURANTES');
  console.log('🚀 ===============================================\n');

  await connectDB();

  const path = require('path');
  const leadsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'db_leads.json'), 'utf8'));
  
  const restaurantRegex = /restauran|comida|alimento|gastron|café|cafeteria|taqueria|taco|mariscos|pizza|sushi|cocina|cenad|fonda|cantina|bar|buffet|antojitos/i;

  const pendingLeads = leadsData
    .filter(l => {
      const hasEmail = l.email && l.email.trim() !== '';
      const notSent = !l.email_enviado;
      const notUnsubscribed = !l.dado_de_baja;
      
      const searchSpace = `${l.giro || ''} ${l.clase_actividad || ''} ${l.nombre_negocio || ''}`.toLowerCase();
      const isRestaurant = restaurantRegex.test(searchSpace);
      
      return hasEmail && notSent && notUnsubscribed && isRestaurant;
    })
    .sort((a, b) => (b.es_premium ? 1 : 0) - (a.es_premium ? 1 : 0))
    .slice(0, 50);

  console.log(`📋 Se encontraron ${pendingLeads.length} leads de restaurantes elegibles para envío inicial.`);

  if (pendingLeads.length === 0) {
    console.log('⚠️ No hay leads de restaurantes nuevos con email para enviar.');
    process.exit(0);
  }

  // Configurar Brevo
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

  let sentCount = 0;

  for (let i = 0; i < pendingLeads.length; i++) {
    const lead = pendingLeads[i];
    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    // Personalizacion
    const nombreEnCorreo = lead.nombre_contacto || lead.nombre_negocio || 'Restaurante';

    sendSmtpEmail.subject = "¿Su restaurante está donde están sus clientes?";
    sendSmtpEmail.htmlContent = getRestaurantHTML(lead.nombre_contacto, lead.nombre_negocio);
    sendSmtpEmail.sender = { name: 'GLI Ramiro', email: process.env.SENDER_EMAIL || 'hogargli@gmail.com' };
    sendSmtpEmail.to = [{ email: lead.email, name: nombreEnCorreo }];
    
    sendSmtpEmail.attachment = [];

    // Archivo PDF
    const catalogPath = path.join(__dirname, 'catalogo_final.pdf');
    if (fs.existsSync(catalogPath)) {
      sendSmtpEmail.attachment.push({
        content: fs.readFileSync(catalogPath).toString('base64'),
        name: 'Catalogo de Propiedades.pdf'
      });
    }

    // Imagen CID
    const imgPath = "C:\\Users\\GLI\\Downloads\\La ubicación puede representar hasta 60–80% del éxito de un restaurante.jpg";
    if (fs.existsSync(imgPath)) {
      sendSmtpEmail.attachment.push({
        content: fs.readFileSync(imgPath).toString('base64'),
        name: 'Exito_en_Restaurantes_GLI.jpg'
      });
    }

    try {
      console.log(`[${i+1}/${pendingLeads.length}] 📧 Enviando al restaurante: ${lead.nombre_negocio} (${lead.email})...`);
      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
      
      // Marcar en la BD como enviado y sumar interes
      await Lead.updateOne({ _id: lead._id }, {
        $set: {
          email_enviado: true,
          estado: 'email_enviado',
          fecha_email_enviado: new Date(),
          brevo_message_id: result.messageId || ''
        },
        $inc: { intentos_envio: 1 }
      });
      console.log(`   ✅ Éxito -> Message ID: ${result.messageId}`);
      sentCount++;
    } catch (error) {
      console.error(`   ❌ Error al enviar a ${lead.email}: ${error.message}`);
    }

    // Delay entre 1 a 2 segundos reales para que la API no bannee y simular flujo
    await new Promise(res => setTimeout(res, 1500));
  }

  console.log('\n===============================================');
  console.log(`✅ CAMPAÑA EXITOSA. Correos enviados: ${sentCount} de ${pendingLeads.length}.`);
  console.log('===============================================');
  process.exit(0);
}

sendRestaurantCampaignTo50();
