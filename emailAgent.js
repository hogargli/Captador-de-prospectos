// ============================================================
// AGENTE DE EMAIL - GLI Inmobiliaria
// Envia correos personalizados con catalogo de propiedades
// usando Brevo API (antes Sendinblue)
// ============================================================

const Brevo = require('@getbrevo/brevo');
const fs = require('fs');
const path = require('path');
const { Lead, Campaign } = require('./models');
const { connectDB } = require('./database');
require('dotenv').config();

// Excel para registro de envíos
let XLSX;
try {
  XLSX = require('xlsx');
} catch(e) {
  console.log('⚠️ xlsx no instalado, se usará CSV como respaldo');
}

// ==========================================
// Configurar Brevo API
// ==========================================
const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

const contactsApi = new Brevo.ContactsApi();
contactsApi.setApiKey(Brevo.ContactsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

// ==========================================
// Template HTML del email
// ==========================================
function getEmailHTML(nombreContacto, nombreNegocio, personalizacionIA = '') {
  const primerNombre = (nombreContacto || '').split(' ')[0] || 'Estimado cliente';
  
  // Si no hay personalización IA, usar el párrafo por defecto
  const introIA = personalizacionIA ? 
    `<p style="font-size:16px; line-height:1.6; margin:0 0 20px; color:#1a1a1a; font-style: italic; border-left: 3px solid #b8955a; padding-left: 15px;">
      ${personalizacionIA}
    </p>` : '';
  
  const introDefault = !personalizacionIA ? `
    <p style="font-size:16px; line-height:1.6; margin:0 0 20px;">
      En Culiacán, algunas propiedades están empezando a destacar por razones que no son tan evidentes.
    </p>
    <p style="font-size:16px; line-height:1.6; margin:0 0 20px;">
      Quienes logran identificarlas a tiempo suelen tomar mejores decisiones.
    </p>` : '';
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GLI Inmobiliaria - Análisis de Mercado</title>
</head>
<body style="margin:0; padding:0; background-color:#ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color:#333333;">
  <table role="presentation" width="100%" style="background-color:#ffffff; padding:0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" style="background-color:#ffffff; border:none; margin:0 auto;">
          
          <!-- Header GLI - Logo Real -->
          <tr>
            <td style="background-color:#ffffff; padding:25px 30px; text-align:center; border-bottom:2px solid #b8955a;">
              <img src="cid:gli_logo_hd.png" alt="GLI Grupo Líder Inmobiliario" width="220" style="max-width:220px; display:inline-block; border:0;">
            </td>
          </tr>

          <!-- Barra de curiosidad -->
          <tr>
            <td style="background-color:#b8955a; padding:14px 30px; text-align:center;">
              <p style="margin:0; color:#ffffff; font-size:14px; font-weight:700; letter-spacing:0.5px;">
                ¿Ya identificó lo que está cambiando en el mercado inmobiliario de Culiacán?
              </p>
            </td>
          </tr>
          
          <!-- Imagen Hero (Zona Residencial Atractiva - Culiacán Real) -->
          <tr>
            <td style="padding:0; line-height:0;">
              <img src="https://www.sinaloa360.com/wp-content/uploads/2020/03/country02.jpg" alt="Culiacán Residencial" width="600" style="width:100%; max-width:600px; display:block; border:0;">
            </td>
          </tr>
          
          <!-- Contenido principal -->
          <tr>
            <td style="padding:40px 30px; text-align:left;">
              <p style="font-size:18px; margin:0 0 25px; color:#1a1a1a;">
                Estimado ${primerNombre},
              </p>
              
              ${introIA}
              ${introDefault}
              
              <p style="font-size:16px; line-height:1.6; margin:0 0 25px;">
                En GLI hemos estado analizando estas oportunidades y detectando qué realmente puede marcar una diferencia.
              </p>

              <p style="font-size:16px; font-weight:bold; margin:0 0 15px;">
                Si le interesa verlo con ejemplos claros:
              </p>
              
              <!-- CTA 1 -->
              <table role="presentation" width="100%" style="margin:20px 0 40px;">
                <tr>
                  <td>
                    <a href="mailto:ventas@gli.com.mx?subject=Interes%20en%20Puntos%20Clave" 
                       style="background-color: #b8955a; color:#ffffff; text-decoration:none; padding:15px 30px; border-radius:4px; font-size:15px; font-weight:600; display:inline-block; letter-spacing:0.5px;">
                      Ver qué está marcando la diferencia
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:16px; line-height:1.6; margin:0 0 25px;">
                Contamos con más de 15 años de experiencia y un equipo respaldado en lo legal, fiscal y financiero, lo que nos permite brindarle un proceso seguro y bien estructurado.
              </p>
              
              <p style="font-size:16px; font-weight:bold; margin:0 0 15px;">
                Si en algún momento le resulta útil profundizar un poco más:
              </p>

              <!-- CTA 2 -->
              <table role="presentation" width="100%" style="margin:20px 0 40px;">
                <tr>
                  <td>
                    <a href="mailto:ventas@gli.com.mx?subject=Consulta%20Profunda" 
                       style="background-color: #ffffff; color:#b8955a; text-decoration:none; padding:15px 30px; border-radius:4px; font-size:15px; font-weight:600; display:inline-block; border: 2px solid #b8955a;">
                      Explorar opciones con mayor claridad
                    </a>
                  </td>
                </tr>
              </table>

              <!-- WhatsApp CTA -->
              <table role="presentation" width="100%" style="margin:10px 0 40px;">
                <tr>
                  <td>
                    <a href="https://wa.me/${process.env.WHATSAPP_NUMBER || '526672366555'}?text=Hola,%20me%20interesa%20obtener%20más%20información%20sobre%20las%20propiedades%20de%20GLI." 
                       style="background-color: #25D366; color:#ffffff; text-decoration:none; padding:12px 25px; border-radius:30px; font-size:14px; font-weight:bold; display:inline-block;">
                      📱 WhatsApp: ${process.env.WHATSAPP_NUMBER ? process.env.WHATSAPP_NUMBER.replace('52', '') : '6672366555'}
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="font-size:16px; font-weight:bold; margin:40px 0 5px; color:#1a1a1a;">
                GLI Ramiro
              </p>
              <p style="font-size:13px; color:#666; margin:0;">
                Seguimiento Estratégico & Gestión de Activos
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:40px 30px; border-top:1px solid #eeeeee; text-align:center;">
              <p style="color:#999999; font-size:11px; margin:0;">
                © 2026 GLI Inmobiliaria. Le enviamos esta información considerando su perfil empresarial en Culiacán.
              </p>
              <p style="color:#999999; font-size:11px; margin:10px 0 0;">
                <a href="mailto:ventas@gli.com.mx?subject=BAJA" style="color:#666666; text-decoration:underline;">Dar de baja</a>
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

// ==========================================
// Obtener asunto personalizado (variaciones A/B)
// ==========================================
function getSubject(nombre, variante = 0) {
  const subjects = [
    `${nombre.split(' ')[0]}, algo está cambiando en el mercado de Culiacán`,
    `Análisis exclusivo: Lo que está destacando hoy en Culiacán`,
    `Decisiones estratégicas en el mercado inmobiliario de Sinaloa`,
    `${nombre.split(' ')[0]}, identificación de oportunidades en tiempo real`,
    `Propuesta GLI: Análisis de lo que marca la diferencia hoy`,
    `Estrategia y claridad en el mercado inmobiliario de Culiacán`
  ];
  return subjects[variante % subjects.length];
}

// ==========================================
// Enviar email con Brevo
// ==========================================
async function sendEmail(lead, campaignId = null) {
  try {
    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    
    const nombreDisplay = lead.nombre_contacto || lead.nombre_negocio || 'Estimado empresario';
    
    sendSmtpEmail.subject = getSubject(nombreDisplay, lead.intentos_envio || 0);
    sendSmtpEmail.htmlContent = getEmailHTML(lead.nombre_contacto, lead.nombre_negocio, lead.personalizacion_ia);
    sendSmtpEmail.sender = { 
      name: process.env.SENDER_NAME || 'GLI Ramiro', 
      email: process.env.SENDER_EMAIL || 'ventas@gli.com.mx' 
    };
    sendSmtpEmail.to = [{ 
      email: lead.email, 
      name: nombreDisplay 
    }];
    sendSmtpEmail.replyTo = { 
      email: process.env.SENDER_EMAIL || 'ventas@gli.com.mx',
      name: process.env.SENDER_NAME || 'GLI Inmobiliaria'
    };
    
    // Se eliminó el BCC para evitar saturar la bandeja de entrada del remitente
    // sendSmtpEmail.bcc = [{
    //   email: process.env.SENDER_EMAIL || 'ventas@gli.com.mx',
    //   name: 'GLI - Copia Envío'
    // }];
    
    sendSmtpEmail.attachment = [];
    
    // Adjuntar catalogo PDF si existe
    const catalogPath = path.join(__dirname, 'catalogo_gli.pdf');
    if (fs.existsSync(catalogPath)) {
      const pdfContent = fs.readFileSync(catalogPath);
      sendSmtpEmail.attachment.push({
        content: pdfContent.toString('base64'),
        name: 'Catalogo_GLI_Inmobiliaria_2026.pdf'
      });
    }

    // Adjuntar Logo CID para que se vea en todos los dispositivos
    const logoPath = path.join(__dirname, 'public', 'assets', 'gli_logo_hd.png');
    if (fs.existsSync(logoPath)) {
      const logoContent = fs.readFileSync(logoPath);
      sendSmtpEmail.attachment.push({
        content: logoContent.toString('base64'),
        name: 'gli_logo_hd.png' // El CID se vincula por el nombre
      });
    }
    
    // Tags para tracking
    sendSmtpEmail.tags = ['prospeccion', 'catalogo', 'abril2026'];
    
    // Headers para tracking
    sendSmtpEmail.headers = {
      'X-Lead-Id': lead._id.toString(),
      'charset': 'iso-8859-1'
    };
    
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    // Actualizar lead
    await Lead.findByIdAndUpdate(lead._id, {
      email_enviado: true,
      estado: 'email_enviado',
      fecha_email_enviado: new Date(),
      intentos_envio: (lead.intentos_envio || 0) + 1,
      brevo_message_id: result.messageId || ''
    });
    
    // Actualizar campana si hay
    if (campaignId) {
      await Campaign.findByIdAndUpdate(campaignId, {
        $inc: { total_enviados: 1 }
      });
    }
    
    console.log(`   ✅ Email enviado a: ${lead.email} (${nombreDisplay})`);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error(`   ❌ Error enviando a ${lead.email}:`, error.message);
    
    // Marcar como rebotado si es error permanente
    if (error.statusCode === 400 || error.statusCode === 422) {
      await Lead.findByIdAndUpdate(lead._id, {
        email_rebotado: true,
        notas: `Error: ${error.message}`
      });
    }
    
    return { success: false, error: error.message };
  }
}

// ==========================================
// Calcular limite diario segun semana de calentamiento
// ==========================================
function getDailyLimit() {
  if (process.env.WARMUP_ENABLED !== 'true') {
    return parseInt(process.env.DAILY_LIMIT) || 2000;
  }
  
  // Calcular semana desde el 1 de abril
  const startDate = new Date('2026-04-01');
  const today = new Date();
  const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  const week = Math.floor(daysDiff / 7) + 1;
  
  switch (week) {
    case 1: return 50;   // Semana 1: calentamiento
    case 2: return 150;  // Semana 2: ramp up
    case 3: return 250;  // Semana 3: velocidad crucero
    default: return 300; // Semana 4+: maxima capacidad
  }
}

// ==========================================
// Enviar campaña del dia
// ==========================================
async function sendDailyCampaign() {
  console.log('📧 ============================================');
  console.log('📧 AGENTE DE EMAIL - GLI Inmobiliaria');
  console.log('📧 ============================================\n');
  
  await connectDB();
  
  const dailyLimit = getDailyLimit();
  console.log(`📊 Limite diario: ${dailyLimit} emails`);
  
  // Contar emails enviados hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sentToday = await Lead.countDocuments({
    email_enviado: true,
    fecha_email_enviado: { $gte: today }
  });
  
  const remaining = dailyLimit - sentToday;
  console.log(`📊 Enviados hoy: ${sentToday} | Pendientes: ${remaining}`);
  
  if (remaining <= 0) {
    console.log('⚠️  Limite diario alcanzado. Intentar mañana.');
    return { sent: 0, errors: 0 };
  }
  
  // Obtener leads pendientes de enviar
  const allLeads = await Lead.find({});
  
  // Filtrar en JS para compatibilidad con SimpleDB
  const leadsConEmail = allLeads.filter(l => {
    return l.email && l.email.trim() !== '' 
      && !l.email_enviado 
      && !l.email_rebotado 
      && !l.dado_de_baja;
  }).slice(0, remaining);
  
  console.log(`📋 ${leadsConEmail.length} leads con email válido pendientes de enviar\n`);
  
  let sent = 0;
  let errors = 0;
  
  for (const lead of leadsConEmail) {
    const result = await sendEmail(lead);
    
    if (result.success) {
      sent++;
    } else {
      errors++;
    }
    
    // Delay entre emails (2-5 segundos random para parecer humano)
    const delay = 2000 + Math.random() * 3000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  console.log('\n📊 ============================================');
  console.log(`📊 Enviados: ${sent} | Errores: ${errors}`);
  console.log('📊 ============================================\n');
  
  // ==========================================
  // Exportar a Excel los emails enviados
  // ==========================================
  try {
    const allData = await Lead.find({});
    const allSent = allData.filter(l => l.email_enviado).sort((a, b) => {
      return new Date(b.fecha_email_enviado || 0) - new Date(a.fecha_email_enviado || 0);
    });
    const excelData = allSent.map(l => ({
      'Negocio': l.nombre_negocio || '',
      'Contacto': l.nombre_contacto || '',
      'Email': l.email,
      'Giro': l.giro || '',
      'Fecha Envío': l.fecha_email_enviado ? new Date(l.fecha_email_enviado).toLocaleString('es-MX') : '',
      'Estado': l.estado || 'email_enviado',
      'Message ID': l.brevo_message_id || '',
      'Intentos': l.intentos_envio || 1
    }));
    
    if (XLSX) {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 30 }, { wch: 25 }, { wch: 35 }, { wch: 20 },
        { wch: 22 }, { wch: 15 }, { wch: 30 }, { wch: 8 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Emails Enviados');
      const excelPath = path.join(__dirname, 'emails_enviados.xlsx');
      XLSX.writeFile(wb, excelPath);
      console.log(`📊 Excel actualizado: ${excelPath} (${excelData.length} registros)`);
    } else {
      // Respaldo en CSV
      const csvHeader = 'Negocio,Contacto,Email,Giro,Fecha Envio,Estado,Message ID,Intentos\n';
      const csvRows = excelData.map(r => 
        `"${r.Negocio}","${r.Contacto}","${r.Email}","${r.Giro}","${r['Fecha Envío']}","${r.Estado}","${r['Message ID']}",${r.Intentos}`
      ).join('\n');
      fs.writeFileSync(path.join(__dirname, 'emails_enviados.csv'), csvHeader + csvRows, 'utf-8');
      console.log(`📊 CSV actualizado: emails_enviados.csv (${excelData.length} registros)`);
    }
  } catch (excelErr) {
    console.error('⚠️ Error exportando Excel:', excelErr.message);
  }
  
  return { sent, errors };
}

// ==========================================
// Procesar bajas
// ==========================================
async function processUnsubscribe(email) {
  await connectDB();
  
  const lead = await Lead.findOne({ email: email.toLowerCase() });
  if (lead) {
    await Lead.findByIdAndUpdate(lead._id, {
      dado_de_baja: true,
      estado: 'dado_de_baja'
    });
    console.log(`✅ ${email} dado de baja`);
    return true;
  }
  return false;
}

// ==========================================
// Obtener estadísticas de campaña
// ==========================================
async function getCampaignStats() {
  await connectDB();
  
  const total = await Lead.countDocuments({ email_verificado: true, email: { $ne: '' } });
  const enviados = await Lead.countDocuments({ email_enviado: true });
  const pendientes = await Lead.countDocuments({ 
    email_verificado: true, 
    email_enviado: false,
    email: { $ne: '' }
  });
  const rebotados = await Lead.countDocuments({ email_rebotado: true });
  const bajas = await Lead.countDocuments({ dado_de_baja: true });
  
  // Enviados hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const enviadosHoy = await Lead.countDocuments({
    email_enviado: true,
    fecha_email_enviado: { $gte: today }
  });
  
  const dailyLimit = getDailyLimit();
  
  return {
    total,
    enviados,
    pendientes,
    rebotados,
    bajas,
    enviadosHoy,
    dailyLimit,
    tasaEnvio: total > 0 ? ((enviados / total) * 100).toFixed(1) : 0
  };
}

// Ejecutar si se llama directamente
if (require.main === module) {
  sendDailyCampaign()
    .then(result => {
      console.log('✅ Campaña del día completada:', result);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = {
  sendEmail,
  sendDailyCampaign,
  processUnsubscribe,
  getCampaignStats,
  getDailyLimit,
  getEmailHTML
};
