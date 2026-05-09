// ============================================================
// SERVER + DASHBOARD - GLI Inmobiliaria Email Prospector
// ============================================================

const express = require('express');
const path = require('path');
const cron = require('node-cron');
const { connectDB } = require('./database');
const { Lead, Campaign, ProspectionLog } = require('./models');
const { runProspection, enrichLeadsWithWebEmails, enrichNamesWithAI, generatePersonalizedParagraphs, getLeadStats } = require('./prospector');
const { sendDailyCampaign, getCampaignStats, processUnsubscribe, getDailyLimit } = require('./emailAgent');
const { generateMarketplaceResponse } = require('./marketplace_agent');
const { syncAllLeadsToSheet } = require('./googleSheetsAgent');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// API ROUTES
// ==========================================

// Dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments({});
    const leadsConEmail = await Lead.countDocuments({ email: { $exists: true, $ne: '' } });
    const leadsPremium = await Lead.countDocuments({ es_premium: true });
    
    // Agregaciones para los gráficos
    const porEstado = await Lead.aggregate([{ $group: { _id: '$estado' } }]);
    const porFuente = await Lead.aggregate([{ $group: { _id: '$fuente' } }]);

    const totalEnviados = await Lead.countDocuments({ email_enviado: true });
    const totalRebotados = await Lead.countDocuments({ email_rebotado: true });
    const totalBajas = await Lead.countDocuments({ dado_de_baja: true });

    // Calcular enviados hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const enviadosHoy = await Lead.countDocuments({ 
      email_enviado: true, 
      fecha_email_enviado: { $gte: today } 
    });

    const { getDailyLimit } = require('./emailAgent');
    const pendientes = leadsConEmail - totalEnviados;
    const tasaEnvio = totalLeads > 0 ? ((leadsConEmail / totalLeads) * 100).toFixed(1) : 0;
    
    res.json({
      success: true,
      leads: {
        total: totalLeads,
        conEmail: leadsConEmail,
        premium: leadsPremium,
        pendientes: pendientes,
        porEstado,
        porFuente
      },
      campaign: {
        total: leadsConEmail,
        enviados: totalEnviados,
        enviadosHoy: enviadosHoy,
        pendientes: pendientes > 0 ? pendientes : 0,
        rebotados: totalRebotados,
        bajas: totalBajas,
        tasaEnvio: tasaEnvio,
        dailyLimit: getDailyLimit()
      },
      meta: {
        objetivo_emails: 7000,
        objetivo_contactos: 100,
        objetivo_ventas: 4,
        mes: 'Abril 2026'
      }
    });
  } catch (error) {
    console.error('❌ Error en /api/stats:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Preview de campaña (Template HTML)
app.get('/api/campaign-preview', async (req, res) => {
  try {
    const { getEmailHTML } = require('./emailAgent');
    const html = getEmailHTML('Nombre de Contacto', 'Nombre de Empresa', 'Este es un ejemplo de párrafo personalizado generado por IA analizando el sector de su negocio...');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error al generar preview');
  }
});

// Lista de leads con filtros
app.get('/api/leads', async (req, res) => {
  try {
    const { page = 1, limit = 50, estado, giro, conEmail, buscar, premium } = req.query;
    const query = {};
    
    if (estado) query.estado = estado;
    if (giro) query.giro = { $regex: giro, $options: 'i' }; 
    if (premium === 'premium') query.es_premium = true;
    if (premium === 'normal') query.es_premium = false;
    
    console.log('🔍 API QUERY:', JSON.stringify(query));
    if (conEmail === 'true') query.email = { $ne: '' };
    if (conEmail === 'false') query.$or = [{ email: '' }, { email: { $exists: false } }];
    if (buscar) {
      query.$or = [
        { nombre_negocio: { $regex: buscar, $options: 'i' } },
        { email: { $regex: buscar, $options: 'i' } },
        { giro: { $regex: buscar, $options: 'i' } }
      ];
    }
    
    const total = await Lead.countDocuments(query);
    const leads = await Lead.find(query, {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      leads,
      pagination: {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / (parseInt(limit) || 50)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ejecutar prospeccion manualmente
app.post('/api/prospect', async (req, res) => {
  try {
    const { tipo } = req.body;
    
    if (tipo === 'especializada') {
      try {
        const { runSpecializedProspection } = require('./yellowPagesScraper');
        res.json({ success: true, message: 'Prospección especializada (Sección Amarilla) iniciada' });
        runSpecializedProspection().catch(err => console.error('Error en prospección especializada:', err));
      } catch (err) {
        console.error('❌ Error cargando scraper:', err.message);
        return res.status(500).json({ success: false, error: 'Módulo de prospección especializado no cargado: ' + err.message });
      }
    } else {
      res.json({ success: true, message: 'Prospección DENUE iniciada en segundo plano' });
      runProspection().catch(err => console.error('Error en prospección:', err));
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enriquecer leads con emails de web
app.post('/api/enrich', async (req, res) => {
  try {
    res.json({ success: true, message: 'Enriquecimiento iniciado en segundo plano' });
    enrichLeadsWithWebEmails().catch(err => console.error('Error en enriquecimiento:', err));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enriquecer nombres de leads con Gemini AI
app.post('/api/enrich-names', async (req, res) => {
  try {
    res.json({ success: true, message: 'Investigación con IA iniciada en segundo plano' });
    enrichNamesWithAI().catch(err => console.error('Error en extracción de IA:', err));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generar personalización hiper-específica con IA
app.post('/api/personalize', async (req, res) => {
  try {
    res.json({ success: true, message: 'Generación de personalización IA iniciada' });
    generatePersonalizedParagraphs().catch(err => console.error('Error en personalización IA:', err));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enviar campaña manual
app.post('/api/send-campaign', async (req, res) => {
  try {
    res.json({ success: true, message: 'Envío de campaña iniciado en segundo plano' });
    sendDailyCampaign().then(() => syncAllLeadsToSheet()).catch(err => console.error('Error en campaña:', err));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sincronizar con Google Sheets manualmente (Con limpieza automática)
app.post('/api/sync-sheets', async (req, res) => {
  try {
    console.log('🧹 Iniciando limpieza automática antes de sincronizar...');
    
    // 1. Limpieza de base de datos
    await Lead.deleteMany({
      $and: [
        { email: { $in: ['', null] } },
        { telefono: { $in: ['', null] } }
      ]
    });

    const duplicateEmails = await Lead.aggregate([
      { $match: { email: { $ne: '' } } },
      { $group: { _id: "$email", ids: { $push: "$_id" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    for (const dup of duplicateEmails) {
      const [keep, ...remove] = dup.ids;
      await Lead.deleteMany({ _id: { $in: remove } });
    }

    // 2. Sincronización
    const success = await syncAllLeadsToSheet();
    
    if (success) {
      res.json({ success: true, message: 'Base de datos optimizada y sincronizada con Google Sheets' });
    } else {
      res.status(500).json({ success: false, error: 'Error al sincronizar con la nube' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Campaña especial: 50 correos a restaurantes
app.post('/api/send-restaurant-campaign', async (req, res) => {
  try {
    res.json({ success: true, message: '🍽️ Campaña restaurantes iniciada en segundo plano. Revisa la consola del servidor para ver el progreso.' });
    const { sendRestaurantCampaign } = require('./restaurantCampaignRunner');
    sendRestaurantCampaign().catch(err => console.error('Error en campaña restaurantes:', err));
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dar de baja
app.post('/api/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email requerido' });
    
    await processUnsubscribe(email);
    res.json({ success: true, message: `${email} dado de baja exitosamente` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Limpieza de Base de Datos
app.post('/api/admin/cleanup', async (req, res) => {
  try {
    console.log('🧹 Iniciando limpieza solicitada desde CRM...');
    
    // 1. Eliminar sin contacto útil
    const r1 = await Lead.deleteMany({
      $and: [
        { email: { $in: ['', null] } },
        { telefono: { $in: ['', null] } }
      ]
    });

    // 2. Eliminar duplicados por email
    const duplicateEmails = await Lead.aggregate([
      { $match: { email: { $ne: '' } } },
      { $group: { _id: "$email", ids: { $push: "$_id" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    let dupCount = 0;
    for (const dup of duplicateEmails) {
      const [keep, ...remove] = dup.ids;
      await Lead.deleteMany({ _id: { $in: remove } });
      dupCount += remove.length;
    }

    res.json({ 
      success: true, 
      message: `Limpieza completada. Eliminados: ${r1.deletedCount} inútiles y ${dupCount} duplicados.`,
      deletedInutil: r1.deletedCount,
      deletedDuplicates: dupCount
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Logs de prospeccion
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await ProspectionLog.find({}, {
      sort: { createdAt: -1 },
      limit: 20
    });
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Exportar leads a CSV
app.get('/api/export-csv', async (req, res) => {
  try {
    const leads = await Lead.find({ email: { $ne: '' } });
    
    const header = 'Negocio,Contacto,Email,Telefono,Giro,Actividad,Tamaño,Estado,Premium,Facebook,LinkedIn,Fecha\n';
    const rows = leads.map(l => 
      `"${l.nombre_negocio}","${l.nombre_contacto}","${l.email}","${l.telefono}","${l.giro}","${l.clase_actividad}","${l.tamano_empresa}","${l.estado}","${l.es_premium ? 'SI' : 'NO'}","${l.facebook || ''}","${l.linkedin || ''}","${l.fecha_captura}"`
    ).join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=leads_gli_inmobiliaria.csv');
    res.send('\uFEFF' + header + rows); // BOM for Excel
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// MARKETPLACE BOT WEBHOOK
// ==========================================
app.post('/api/marketplace/webhook', async (req, res) => {
  try {
    const incoming = req.body;
    console.log('📱 Mensaje recibido de Marketplace:', JSON.stringify(incoming));

    // Formatos variados de apps de AutoResponder
    const message = incoming.message || incoming.query || incoming.msg;
    const sender = incoming.sender || incoming.contact || 'Cliente';

    if (!message) {
      return res.json({ skip: true });
    }

    const response = await generateMarketplaceResponse(sender, message);

    if (!response) {
      console.log('⏩ Mensaje ignorado por la IA (No relacionado a ventas)');
      return res.json({ skip: true });
    }

    console.log(`🤖 IA Responde a ${sender}: "${response}"`);
    
    // El formato que espera "AutoResponder for Messenger"
    res.json({
      replies: [
        {
          text: response,
          delay: 2000 // Milisegundos de espera para parecer humano
        }
      ]
    });
  } catch (error) {
    console.error('❌ Error Webhook Marketplace:', error.message);
    res.json({ skip: true });
  }
});

// Pagina de baja (link en emails)
app.get('/baja', async (req, res) => {
  const { email } = req.query;
  if (email) {
    await processUnsubscribe(email);
  }
  res.send(`
    <html>
    <head><title>GLI - Dado de baja</title></head>
    <body style="font-family:Arial;text-align:center;padding:50px;">
      <h2>Has sido dado de baja exitosamente</h2>
      <p>No recibirás más correos de GLI Inmobiliaria.</p>
    </body>
    </html>
  `);
});

// ==========================================
// CRON JOBS (Tareas programadas)
// ==========================================

// 1. Prospección Automática Diaria (3:00 AM)
// Busca nuevos negocios todos los días para tener leads frescos
cron.schedule('0 3 * * *', async () => {
  console.log('⏰ CRON: Iniciando prospección automática diaria...');
  try {
    const { runProspection } = require('./prospector');
    const { runSpecializedProspection } = require('./yellowPagesScraper');
    
    await runProspection();
    await runSpecializedProspection();
    console.log('✅ CRON: Prospección diaria completada.');
  } catch (error) {
    console.error('❌ CRON Error Prospección:', error.message);
  }
}, {
  timezone: 'America/Mazatlan'
});

// 2. Enriquecimiento de Leads (2:00 AM)
cron.schedule('0 2 * * *', async () => {
  console.log('⏰ CRON: Enriqueciendo leads...');
  try {
    await enrichLeadsWithWebEmails();
  } catch (error) {
    console.error('❌ CRON Error Enriquecimiento:', error.message);
  }
}, {
  timezone: 'America/Mazatlan'
});

// 3. Envío de Campaña (9:00 AM Lunes a Viernes)
cron.schedule('0 9 * * 1-5', async () => {
  console.log('⏰ CRON: Iniciando envío diario de campaña...');
  try {
    await sendDailyCampaign();
  } catch (error) {
    console.error('❌ CRON Error Campaña:', error.message);
  }
}, {
  timezone: 'America/Mazatlan' // Culiacán/Mazatlán timezone
});


// ==========================================
// INICIAR SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;

async function start() {
  const connected = await connectDB();
  if (!connected) {
    console.error('❌ No se pudo conectar a MongoDB. Saliendo...');
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    console.log(`\n🚀 ============================================`);
    console.log(`🚀 GLI Email Prospector - Dashboard`);
    console.log(`🚀 ============================================`);
    console.log(`🌐 Dashboard: http://localhost:${PORT}`);
    console.log(`📧 Limite diario: ${getDailyLimit()} emails`);
    console.log(`⏰ Envío automático: 9:00 AM (Lun-Vie)`);
    console.log(`🔍 Enriquecimiento: 2:00 AM (diario)`);
    console.log(`🚀 ============================================\n`);
  });
}

start();

module.exports = app;
