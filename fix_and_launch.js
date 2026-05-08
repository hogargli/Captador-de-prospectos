// fix_and_launch.js - Diagnosticar y lanzar campaña
// Corrige el problema de leads sin campo email_enviado y lanza la campaña
require('dotenv').config();
const { connectDB } = require('./database');
const { Lead } = require('./models');
const Brevo = require('@getbrevo/brevo');
const fs = require('fs');

function getRestaurantHTML(nombreContacto, nombreNegocio) {
  const nombre = nombreContacto || nombreNegocio || 'Empresario del Sector Gastronomico';
  const imgPath = "C:\\Users\\GLI\\Downloads\\La ubicación puede representar hasta 60–80% del éxito de un restaurante (1).jpg";
  const fallbackImageSrc = fs.existsSync(imgPath) ? 'cid:Exito_en_Restaurantes_GLI.jpg' : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>GLI Inmobiliaria - Analisis de Ubicacion</title>
</head>
<body style="margin:0; padding:0; background-color:#f9f9f9; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" style="background-color:#f9f9f9; padding:30px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" style="background-color:#ffffff; border-radius:8px; overflow:hidden; border: 1px solid #e1e1e1;">
          <tr>
            <td style="text-align:center;">
              ${fallbackImageSrc ? `<img src="${fallbackImageSrc}" alt="El exito esta en la ubicacion, by GLI" style="width:100%; max-width:600px; display:block; border:none; margin:0; padding:0;" />` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 20px;">
              <p style="color:#333; font-size:16px; margin:0 0 20px;">Estimado equipo de <strong>${nombre}</strong>:</p>
              <p style="color:#444; font-size:15px; line-height:1.6; margin:0 0 20px;">
                Trabajando con negocios gastronomicos vemos un patron constante: <strong style="color:#1a1a2e;">los restaurantes que perduran eligieron su ubicacion con el mismo cuidado que su menu.</strong>
              </p>
              <p style="color:#444; font-size:15px; line-height:1.6; margin:0 0 25px;">
                Soy Ramiro, de GLI Inmobiliaria. Trabajamos con restaurantes y grupos gastronomicos que buscan espacios con alto trafico, visibilidad y el perfil de cliente correcto.
              </p>
              <table role="presentation" width="100%" style="background-color:#f4f7f6; border-left: 4px solid #e4a948; padding:20px; margin:0 0 25px;">
                <tr>
                  <td>
                    <p style="color:#333; font-size:15px; font-weight:bold; margin:0 0 10px;">Este mes ofrecemos sin costo:</p>
                    <p style="color:#444; font-size:15px; margin:0 0 8px;">Analisis de flujo peatonal y competencia en la zona</p>
                    <p style="color:#444; font-size:15px; margin:0;">Asesoria personalizada segun su concepto gastronomico</p>
                  </td>
                </tr>
              </table>
              <p style="color:#444; font-size:15px; line-height:1.6; margin:0 0 30px;">
                Adjunto nuestro catalogo. <strong>Podriamos agendar una breve llamada para mostrarle las opciones disponibles en su zona?</strong>
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
                Si desea dejar de recibir ofertas exclusivas, responder con BAJA.
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

async function run() {
  await connectDB();
  console.log('Conectado a MongoDB');

  // PASO 1: DIAGNOSTICAR - buscar leads con email que no sean email_enviado:true
  // El problema: algunos leads tienen email_enviado=undefined en lugar de false
  // Solución: buscar leads con email que NO tengan email_enviado=true
  const mongoose = require('mongoose');
  
  let restaurantLeads;
  
  if (mongoose.connection.readyState === 1) {
    // Usando MongoDB directamente para hacer la consulta correcta
    const MongooseLead = mongoose.model('Lead');
    
    // Contar diagnóstico
    const total = await MongooseLead.countDocuments();
    const conEmail = await MongooseLead.countDocuments({ email: { $ne: '', $exists: true } });
    const enviados = await MongooseLead.countDocuments({ email_enviado: true });
    const pendientes = await MongooseLead.countDocuments({ 
      email: { $ne: '', $exists: true },
      email_enviado: { $ne: true }  // Captura false, undefined, null
    });

    console.log('=== DIAGNOSTICO MONGODB ===');
    console.log('Total leads: ' + total);
    console.log('Con email: ' + conEmail);
    console.log('Ya enviados (email_enviado=true): ' + enviados);
    console.log('Pendientes (email_enviado != true): ' + pendientes);

    // Buscar restaurantes pendientes con filtro correcto
    restaurantLeads = await MongooseLead.find({
      email: { $ne: '', $exists: true },
      email_enviado: { $ne: true },
      dado_de_baja: { $ne: true }
    }).sort({ es_premium: -1 });

    // Filtrar por giro de restaurante
    restaurantLeads = restaurantLeads.filter(l =>
      l.giro && /restaur|comida|aliment|gastron|cafe|cafeteria|taqui|taco|marisco|pizza|sushi|cocin|cenad|fonda|cantina|buffet|antojit/i.test(l.giro)
    );

    console.log('Restaurantes pendientes: ' + restaurantLeads.length);
    
    // Mostrar primeros 5
    restaurantLeads.slice(0, 5).forEach((l, i) => {
      console.log((i+1) + '. ' + l.nombre_negocio + ' | ' + l.giro + ' | ' + l.email);
    });

  } else {
    console.log('ERROR: No conectado a MongoDB');
    process.exit(1);
  }

  if (restaurantLeads.length === 0) {
    console.log('No se encontraron restaurantes pendientes. Verificar giros en la BD.');
    process.exit(0);
  }

  // PASO 2: LANZAR CAMPAÑA - enviar a hasta 50 restaurantes
  const batch = restaurantLeads.slice(0, 50);
  console.log('\nIniciando envio a ' + batch.length + ' restaurantes...');

  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

  const imgPath = "C:\\Users\\GLI\\Downloads\\La ubicación puede representar hasta 60–80% del éxito de un restaurante (1).jpg";
  const catalogPath = "C:\\Users\\GLI\\Downloads\\Catálogo Propiedades Exclusivas de GLI.pdf (1) (1).pdf";

  let sentCount = 0;
  let errorCount = 0;
  const mongoose2 = require('mongoose');
  const MongooseLead2 = mongoose2.model('Lead');

  for (let i = 0; i < batch.length; i++) {
    const lead = batch[i];
    const nombreEnCorreo = lead.nombre_contacto || lead.nombre_negocio || 'Restaurante';

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = "Su restaurante esta donde estan sus clientes?";
    sendSmtpEmail.htmlContent = getRestaurantHTML(lead.nombre_contacto, lead.nombre_negocio);
    sendSmtpEmail.sender = { name: 'GLI Ramiro', email: process.env.SENDER_EMAIL || 'hogargli@gmail.com' };
    sendSmtpEmail.to = [{ email: lead.email, name: nombreEnCorreo }];
    sendSmtpEmail.attachment = [];

    if (fs.existsSync(catalogPath)) {
      sendSmtpEmail.attachment.push({
        content: fs.readFileSync(catalogPath).toString('base64'),
        name: 'Opciones Gastronomicas - GLI Inmobiliaria.pdf'
      });
    }

    if (fs.existsSync(imgPath)) {
      sendSmtpEmail.attachment.push({
        content: fs.readFileSync(imgPath).toString('base64'),
        name: 'Exito_en_Restaurantes_GLI.jpg'
      });
    }

    try {
      console.log('[' + (i+1) + '/' + batch.length + '] Enviando a: ' + lead.nombre_negocio + ' <' + lead.email + '>');
      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

      await MongooseLead2.updateOne(
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

      console.log('   OK -> Message ID: ' + result.messageId);
      sentCount++;
    } catch (error) {
      console.error('   ERROR enviando a ' + lead.email + ': ' + error.message);
      errorCount++;
    }

    // Delay de 2 segundos
    await new Promise(res => setTimeout(res, 2000));
  }

  console.log('\n=== CAMPANA COMPLETADA ===');
  console.log('Enviados: ' + sentCount);
  console.log('Errores: ' + errorCount);
  console.log('Total procesados: ' + batch.length);
  process.exit(0);
}

run().catch(e => { console.error('Error fatal: ' + e.message); process.exit(1); });
