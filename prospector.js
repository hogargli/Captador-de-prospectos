// ============================================================
// AGENTE PROSPECTOR - GLI Inmobiliaria
// Busca negocios en Culiacán via DENUE/INEGI API
// y extrae emails de sus sitios web
// ============================================================

const axios = require('axios');
const cheerio = require('cheerio');
const dns = require('dns').promises;
const { Lead, ProspectionLog } = require('./models');
const { connectDB } = require('./database');
const { extractOwnerNameWithAI, generateHyperPersonalization } = require('./ai_extractor');
const { syncAllLeadsToSheet } = require('./googleSheetsAgent');
const { calculateScore } = require('./scoringAgent');
const { notifyAdminOfPremiumLead } = require('./emailAgent');
require('dotenv').config();

// ... (rest of imports and constants)

// ==========================================
// GENERAR PÁRRAFOS PERSONALIZADOS CON IA
// ==========================================
async function generatePersonalizedParagraphs() {
  console.log('🤖 Generando párrafos personalizados para leads premium...\n');
  await connectDB();

  // Buscar leads premium con email que no tengan personalización aún
  const leadsToPersonalize = await Lead.find({
    es_premium: true,
    email: { $ne: '' },
    $or: [{ personalizacion_ia: '' }, { personalizacion_ia: null }, { personalizacion_ia: { $exists: false } }]
  }, { limit: 40 });

  console.log(`📋 ${leadsToPersonalize.length} leads premium listos para personalización.\n`);

  let count = 0;
  for (const lead of leadsToPersonalize) {
    console.log(`✨ Personalizando: ${lead.nombre_negocio}...`);
    
    const snippet = await generateHyperPersonalization(
      lead.nombre_negocio,
      lead.clase_actividad || lead.giro,
      lead.sitio_web
    );

    if (snippet) {
      await Lead.findByIdAndUpdate(lead._id, { personalizacion_ia: snippet });
      count++;
      console.log(`   📝 Snippet: "${snippet.substring(0, 60)}..."`);
    }

    await sleep(2000); // Respetar límites de API
  }

  console.log(`\n✅ ${count} leads personalizados exitosamente.\n`);
  return count;
}

// ... (rest of the file)

module.exports = { 
  runProspection, 
  enrichLeadsWithWebEmails, 
  enrichNamesWithAI,
  generatePersonalizedParagraphs,
  getLeadStats,
  buscarEnDenue,
  extractEmailsFromWebsite 
};

const DENUE_TOKEN = process.env.DENUE_TOKEN;
const BASE_URL = 'https://www.inegi.org.mx/app/api/denue/v1/consulta';

// Clave de entidad para Sinaloa = 25
// Culiacán municipio = 006
const SINALOA_CVE = '25';

// Categorías de negocios a prospectar (todos los giros)
// Categorías de negocios con alta probabilidad de ingresos > $100k/mes
const CATEGORIAS_BUSQUEDA = [
  // Salud Premium
  'cirujano plastico', 'cirugia plastica', 'oncologo', 'cardiologo', 'urologo', 'oftalmologo', 'clinica', 'hospital', 'diagnostico', 'laboratorio', 'dentista', 'psicologo', 'pediatra', 'veterinaria', 'implantes', 'estética',
  'radiologia', 'fisioterapia', 'rehabilitacion', 'ginecologo', 'dermatologo', 'nutriologo', 'ortopedista', 'psiquiatra', 'audiologia',
  
  // Servicios Legales y Financieros
  'notaria', 'corporativo', 'seguros', 'financiera', 'arrendadora', 'contadores', 'juridico', 'consultoria', 'aduana', 'comercio exterior', 'banco', 'casa de cambio',
  'fiscalistas', 'asesoria patrimonial', 'banca privada', 'valuacion', 'perito', 'auditoria', 'recursos humanos',
  
  // Construcción e Inmobiliaria
  'constructora', 'arquitecto', 'ingenieria', 'obras', 'estructuras', 'materiales', 'concreto', 'electrico', 'maquinaria pesada', 'elevadores', 'refrigeracion industrial',
  'urbanizadora', 'terracerias', 'pavimentos', 'climas', 'aire acondicionado', 'iluminacion', 'decoracion', 'interiorismo', 'paisajismo',
  
  // Sector Agropecuario (Muy fuerte en Culiacán)
  'agro', 'agropecuario', 'empaque', 'frigos', 'semillas', 'fertilizantes', 'agricola', 'ganaderia', 'riego', 'agronegocios', 'acuicultura', 'piscicultura', 'granjas',
  'implementos agricolas', 'fumigacion', 'agroindustria', 'granos', 'hortalizas', 'porcicultura', 'avicola',
  
  // Industria y Manufactura
  'fabrica', 'manufactura', 'procesadora', 'plastico', 'metalmecanica', 'quimica', 'carton', 'autopartes', 'textil', 'muebles', 'aluminio', 'vidrio',
  'empaques industriales', 'herramental', 'mantenimiento industrial', 'estructuras metalicas', 'fundicion',
  
  // Comercio Mayorista y Logística
  'distribuidor', 'almacenadora', 'logistica', 'transporte', 'fletes', 'herramientas', 'abarrotes mayorista', 'ferreteria industrial',
  'paqueteria', 'mensajeria', 'aduanal', 'CEDIS', 'centro de distribucion', 'montacargas', 'refacciones industriales',
  
  // Tecnología y Servicios Elite
  'energia solar', 'paneles', 'seguridad', 'software', 'marketing', 'publicidad', 'telecomunicaciones', 'outsourcing',
  'informatica', 'sistemas', 'redes', 'automatizacion', 'seguridad privada', 'alarmas', 'monitoreo', 'hosting', 'cloud',
  
  // Estilo de Vida y Lujo
  'restaurante', 'mariscos', 'sushi', 'cortes', 'bar', 'club', 'eventos', 'gimnasio', 'spa', 'joyeria', 'hotel', 'motel', 'agencia autos', 'muebleria lujo',
  'campo de golf', 'marina', 'vivero', 'florería premium', 'relojería', 'boutique', 'salon de fiestas', 'catering',
  'cantante', 'musico', 'artista', 'produccion musical', 'estudio de grabacion'
];

// Filtros de exclusión (No competencia, no militares, no gobierno, NO EDUCACION)
const EXCLUDED_KEYWORDS = [
  'inmobiliaria', 'bienes raices', 'realty', 'remax', 'kw ', 'zona militar', 'sedena', 'gobierno', 
  'seguridad publica', 'ayuntamiento', 'secretaria de', 'partido politico', 'iglesia', 'parroquia',
  'universidad', 'escuela', 'colegio', 'kinder', 'primaria', 'secundaria', 'preparatoria', 'instituto', 'uade', 'uas ',
  'facultad', 'educacion', 'educativa', 'academ', 'bachilleres', 'conalep', 'cobaes', 'capacitacion', 'guarderia'
];

// ==========================================
// DENUE API - Buscar por Entidad
// ==========================================
async function buscarEnDenue(condicion) {
  // SINALOA_CVE = 25
  // La ruta mas estable del INEGI hoy es 'buscarEntidad'
  const url = `${BASE_URL}/buscarEntidad/${encodeURIComponent(condicion)}/25/1/1000/${DENUE_TOKEN}`;
  
  try {
    const response = await axios.get(url, { 
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  } catch (error) {
    if (error.response && error.response.status === 406) {
       console.warn(`⚠️ INEGI 406 para "${condicion}".`);
    } else {
       console.error(`❌ Error DENUE buscando "${condicion}":`, error.message);
    }
    return [];
  }
}

// ==========================================
// DENUE API - Buscar por Area y Actividad con Estrato
// ==========================================
async function buscarPorAreaActEstr(condicion, area = SINALOA_CVE, estrato = '3', inicio = 1, fin = 1000) {
  // Estratos: 1=0-5, 2=6-10, 3=11-30, 4=31-50, 5=51-100, 6=101-250, 7=251+
  const url = `${BASE_URL}/BuscarAreaActEstr/${encodeURIComponent(condicion)}/${area}/0/${estrato}/${inicio}/${fin}/${DENUE_TOKEN}`;
  
  try {
    const response = await axios.get(url, { timeout: 60000 });
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return [];
    }
    console.error(`❌ Error DENUE Area (${condicion}):`, error.message);
    return [];
  }
}

// ==========================================
// Parsear resultado DENUE a Lead
// ==========================================
function parseDenueToLead(item, fuente = 'DENUE') {
  // Filtrar SOLAMENTE los que pertenezcan a CULIACAN
  const ubicacion = item.Ubicacion || '';
  if (!ubicacion.toLowerCase().includes('culiac')) {
    return null;
  }

  // Filtrar EXCLUIDOS (Competencia, Militares, Gobierno)
  const name = (item.Nombre || '').toLowerCase();
  const social = (item.Razon_social || '').toLowerCase();
  const actividad = (item.Clase_actividad || '').toLowerCase();
  
  const isExcluded = EXCLUDED_KEYWORDS.some(kw => 
    name.includes(kw) || social.includes(kw) || actividad.includes(kw)
  );

  if (isExcluded) {
    // console.log(`⏩ Saltando excluido: ${item.Nombre}`);
    return null;
  }

  return {
    nombre_negocio: (item.Nombre || '').trim(),
    razon_social: (item.Razon_social || '').trim(),
    email: (item.Correo_e || '').trim().toLowerCase(),
    telefono: (item.Telefono || '').trim(),
    giro: (fuente === 'DENUE' ? (item.Clase_actividad || 'General').split(' ').slice(0, 2).join(' ') : fuente),
    clase_actividad: (item.Clase_actividad || '').trim(),
    direccion: {
      calle: `${(item.Tipo_vialidad || '')} ${(item.Calle || '')}`.trim(),
      num_exterior: (item.Num_Exterior || '').trim(),
      num_interior: (item.Num_Interior || '').trim(),
      colonia: (item.Colonia || '').trim(),
      cp: (item.CP || '').trim(),
      ubicacion: ubicacion.trim()
    },
    tamano_empresa: (item.Estrato || '').trim(),
    sitio_web: (item.Sitio_internet || '').trim(),
    coordenadas: {
      latitud: (item.Latitud || '').toString(),
      longitud: (item.Longitud || '').toString()
    },
    fuente: 'DENUE',
    id_denue: (item.Id || '').toString(),
    clee: (item.CLEE || '').toString(),
    // Lógica para Ingresos > $100,000 Pesos
    ...calculateValueMetrics(item)
  };
}

/**
 * Determina si el lead tiene un ingreso estimado > $100k/mes
 * Basado en Estrato (tamaño) y Giro de actividad
 */
  const score = calculateScore({
    giro: item.Clase_actividad || '',
    tamano_empresa: item.Estrato || '',
    sitio_web: item.Sitio_internet || '',
    es_premium: premium
  });

  return { es_premium: premium, calificacion: score };
}

// ==========================================
// Validar formato de email
// ==========================================
function isValidEmail(email) {
  if (!email || email.trim() === '') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

// ==========================================
// Validar email via DNS (MX record)
// ==========================================
async function validateEmailDNS(email) {
  try {
    const domain = email.split('@')[1];
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
}

// ==========================================
// Extraer emails de pagina web
// ==========================================
async function extractEmailsFromWebsite(url) {
  try {
    if (!url || url.trim() === '' || url === 'Sin dato') return [];
    
    // Asegurar que tiene protocolo
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    const response = await axios.get(url, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      maxRedirects: 3
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Buscar emails en el HTML
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const text = $.text() + ' ' + $('a[href^="mailto:"]').map((i, el) => $(el).attr('href')).get().join(' ');
    const emails = text.match(emailRegex) || [];
    
    // Filtrar emails validos y unicos
    const uniqueEmails = [...new Set(emails)]
      .map(e => e.toLowerCase().replace('mailto:', ''))
      .filter(e => isValidEmail(e))
      .filter(e => !e.includes('example.com'))
      .filter(e => !e.includes('sentry'))
      .filter(e => !e.includes('webpack'))
      .filter(e => !e.endsWith('.png'))
      .filter(e => !e.endsWith('.jpg'));
    
    return uniqueEmails;
  } catch {
    return [];
  }
}

// ==========================================
// Guardar lead en la base de datos
// ==========================================
async function saveLead(leadData) {
  try {
    // Si no tiene email y no tiene sitio web, no es util
    if (!leadData.email && !leadData.sitio_web) {
      // Aun asi guardar si tiene telefono (podria ser util)
      if (!leadData.telefono) return { saved: false, reason: 'sin_contacto' };
    }
    
    // Si tiene email, verificar duplicado
    if (leadData.email && isValidEmail(leadData.email)) {
      const existing = await Lead.findOne({ email: leadData.email });
      if (existing) {
        return { saved: false, reason: 'duplicado' };
      }
      leadData.email_verificado = true;
      leadData.estado = 'email_encontrado';
    } else if (leadData.id_denue) {
      // Verificar duplicado por ID DENUE
      const existing = await Lead.findOne({ id_denue: leadData.id_denue });
      if (existing) {
        return { saved: false, reason: 'duplicado' };
      }
      }
    }
    
    // Calcular Score Predictivo final
    leadData.calificacion = calculateScore(leadData);
    
    const newLead = await Lead.create(leadData);
    
    // ALERTA DE EMAIL PARA PECES GORDOS (Con Email + Teléfono)
    if (leadData.calificacion >= 80 && leadData.email && leadData.telefono) {
      console.log(`💎 Pez Gordo con contacto completo: ${leadData.nombre_negocio}. Enviando Alerta Email...`);
      await notifyAdminOfPremiumLead(newLead);
    }
    
    return { saved: true, lead: newLead };
  } catch (error) {
    if (error.code === 11000) {
      return { saved: false, reason: 'duplicado' };
    }
    return { saved: false, reason: error.message };
  }
}

// ==========================================
// PROSPECCION PRINCIPAL
// ==========================================
async function runProspection() {
  console.log('🔍 ============================================');
  console.log('🔍 INICIANDO PROSPECCION - GLI Inmobiliaria');
  console.log('🔍 Target: Negocios en Culiacán, Sinaloa');
  console.log('🔍 ============================================\n');
  
  await connectDB();
  
  let totalEncontrados = 0;
  let totalConEmail = 0;
  let totalNuevos = 0;
  let totalDuplicados = 0;
  let totalWebEmails = 0;
  const errores = [];
  
  // Estratos a buscar (negocios medianos y grandes)
  // 2=6-10, 3=11-30, 4=31-50, 5=51-100, 6=101-250, 7=251+
  const estratos = ['2', '3', '4', '5', '6', '7'];
  
  for (const categoria of CATEGORIAS_BUSQUEDA) {
    console.log(`\n📂 Buscando: "${categoria}" en Sinaloa...`);
    
    try {
      // Buscar en DENUE por categoria
      const resultados = await buscarEnDenue(categoria, 1, 2000);
      
      if (resultados.length === 0) {
        console.log(`   ⚪ Sin resultados para "${categoria}"`);
        continue;
      }
      
      console.log(`   📊 ${resultados.length} establecimientos encontrados`);
      totalEncontrados += resultados.length;
      
      let emailsEnCategoria = 0;
      let nuevosEnCategoria = 0;
      
      for (const item of resultados) {
        const leadData = parseDenueToLead(item, categoria);
        if (!leadData) continue; // No es Culiacán
        
        // Si no tiene email pero tiene sitio web, intentar extraerlo
        if (!isValidEmail(leadData.email) && leadData.sitio_web && leadData.sitio_web !== 'Sin dato') {
          console.log(`   🌐 Buscando email en: ${leadData.sitio_web}`);
          const webEmails = await extractEmailsFromWebsite(leadData.sitio_web);
          if (webEmails.length > 0) {
            leadData.email = webEmails[0]; // Usar el primer email encontrado
            leadData.fuente = 'DENUE + Web';
            totalWebEmails++;
            console.log(`   ✅ Email encontrado: ${leadData.email}`);
          }
          // Delay para no saturar servidores
          await sleep(1000);
        }
        
        if (isValidEmail(leadData.email)) {
          emailsEnCategoria++;
          totalConEmail++;
        }
        
        const result = await saveLead(leadData);
        if (result.saved) {
          nuevosEnCategoria++;
          totalNuevos++;
        } else if (result.reason === 'duplicado') {
          totalDuplicados++;
        }
      }
      
      console.log(`   ✅ ${nuevosEnCategoria} nuevos | 📧 ${emailsEnCategoria} con email`);
      
      // Delay entre categorias para respetar el API
      await sleep(2000);
      
    } catch (error) {
      console.error(`   ❌ Error en "${categoria}":`, error.message);
      errores.push(`${categoria}: ${error.message}`);
    }
  }
  
  // Guardar log de prospeccion
  await ProspectionLog.save({
    fuente: 'DENUE',
    tipo: 'denue',
    total_encontrados: totalEncontrados,
    total_con_email: totalConEmail,
    total_nuevos: totalNuevos,
    total_duplicados: totalDuplicados,
    parametros: { 
      categorias: CATEGORIAS_BUSQUEDA.length, 
      entidad: 'Sinaloa',
      ciudad: 'Culiacán',
      web_emails: totalWebEmails
    },
    errores
  });
  
  console.log('\n📊 ============================================');
  console.log('📊 RESUMEN DE PROSPECCION');
  console.log('📊 ============================================');
  console.log(`📊 Total encontrados: ${totalEncontrados}`);
  console.log(`📊 Con email: ${totalConEmail}`);
  console.log(`📊 Emails de web: ${totalWebEmails}`);
  console.log(`📊 Nuevos guardados: ${totalNuevos}`);
  console.log(`📊 Duplicados: ${totalDuplicados}`);
  console.log(`📊 Errores: ${errores.length}`);
  console.log('📊 ============================================\n');
  
  // Sincronizar con Google Sheets
  await syncAllLeadsToSheet();
  
  return { totalEncontrados, totalConEmail, totalNuevos, totalDuplicados };
}

// ==========================================
// PROSPECCION EXTRA: Buscar emails faltantes via web
// ==========================================
async function enrichLeadsWithWebEmails() {
  console.log('🌐 Enriqueciendo leads sin email via web scraping...\n');
  
  await connectDB();
  
  // Buscar leads que tienen sitio web pero no email
  const leadsWithoutEmail = await Lead.find({
    $or: [
      { email: '' },
      { email: { $exists: false } }
    ],
    sitio_web: { $ne: '' }
  }, { limit: 200 });
  
  // Filtrar 'Sin dato' en JS porque SimpleDB no soporta múltiples condiciones en la misma key
  const leadsToEnrich = leadsWithoutEmail.filter(l => l.sitio_web && l.sitio_web !== 'Sin dato');
  
  console.log(`📋 ${leadsToEnrich.length} leads para enriquecer\n`);
  
  let enriched = 0;
  
  for (const lead of leadsToEnrich) {
    console.log(`🔗 Revisando: ${lead.nombre_negocio} - ${lead.sitio_web}`);
    
    const emails = await extractEmailsFromWebsite(lead.sitio_web);
    
    if (emails.length > 0) {
      // Verificar que no exista ya
      const existing = await Lead.findOne({ email: emails[0] });
      if (!existing) {
        // Recalcular Score con la nueva información digital
        lead.calificacion = calculateScore(lead);
        
        await Lead.findByIdAndUpdate(lead._id, {
          email: emails[0],
          email_verificado: true,
          estado: 'email_encontrado',
          calificacion: lead.calificacion,
          fuente: (lead.fuente || 'DENUE') + ' + Web'
        });
        enriched++;
        console.log(`   ✅ Email encontrado: ${emails[0]}`);
      }
    }
    
    await sleep(1500); // Respetar servidores
  }
  
  // Sincronizar con Google Sheets
  await syncAllLeadsToSheet();
  
  return enriched;
}

// ==========================================
// EXTRACCION DE NOMBRES CON INTELIGENCIA ARTIFICIAL
// ==========================================
async function enrichNamesWithAI() {
  console.log('🤖 Iniciando enriquecimiento de directivos con Gemini AI...\n');
  await connectDB();
  
  // Buscar leads premium que tengan sitio web pero no tengan nombre de contacto
  const leadsSinNombre = await Lead.find({
    es_premium: true,
    sitio_web: { $ne: '' },
    $or: [{ nombre_contacto: '' }, { nombre_contacto: null }, { nombre_contacto: { $exists: false } }]
  }, { limit: 50 });
  // Filtrar 'Sin dato' en JS
  const leadsParaIA = leadsSinNombre.filter(l => l.sitio_web && l.sitio_web !== 'Sin dato');
  
  console.log(`📋 ${leadsParaIA.length} leads preparados para análisis de IA\n`);
  
  let enriched = 0;
  for (const lead of leadsParaIA) {
    const aiData = await extractOwnerNameWithAI(lead.sitio_web);
    
    if (aiData && aiData.nombre) {
      await Lead.findByIdAndUpdate(lead._id, {
        nombre_contacto: aiData.nombre,
        notas: (lead.notas || '') + `Cargo IA: ${aiData.cargo}. `
      });
      enriched++;
    }
    await sleep(2000); // Respetar cuotas de Google GEMINI API
  }
  
  console.log(`\n✅ ${enriched} nombres de directivos extraídos con IA.\n`);
  return enriched;
}

// ==========================================
// GENERAR PÁRRAFOS PERSONALIZADOS CON IA
// ==========================================
async function generatePersonalizedParagraphs() {
  console.log('🤖 Generando párrafos personalizados para leads premium...\n');
  await connectDB();

  // Buscar leads premium con email que no tengan personalización aún
  const leadsToPersonalize = await Lead.find({
    es_premium: true,
    email: { $ne: '' },
    $or: [{ personalizacion_ia: '' }, { personalizacion_ia: null }, { personalizacion_ia: { $exists: false } }]
  }, { limit: 40 });

  console.log(`📋 ${leadsToPersonalize.length} leads premium listos para personalización.\n`);

  let count = 0;
  for (const lead of leadsToPersonalize) {
    console.log(`✨ Personalizando: ${lead.nombre_negocio}...`);
    
    const snippet = await generateHyperPersonalization(
      lead.nombre_negocio,
      lead.clase_actividad || lead.giro,
      lead.sitio_web
    );

    if (snippet) {
      await Lead.findByIdAndUpdate(lead._id, { personalizacion_ia: snippet });
      count++;
      console.log(`   📝 Snippet: "${snippet.substring(0, 60)}..."`);
    }

    await sleep(2000); // Respetar límites de API
  }

  console.log(`\n✅ ${count} leads personalizados exitosamente.\n`);
  return count;
}

// ==========================================
// ESTADISTICAS DE LEADS
// ==========================================
async function getLeadStats() {
  await connectDB();
  
  const total = await Lead.countDocuments();
  const conEmail = await Lead.countDocuments({ 
    email: { $ne: '', $exists: true },
    email_verificado: true 
  });
  const sinEmail = await Lead.countDocuments({ 
    $or: [{ email: '' }, { email: { $exists: false } }] 
  });
  const enviados = await Lead.countDocuments({ email_enviado: true });
  const abiertos = await Lead.countDocuments({ email_abierto: true });
  const respondidos = await Lead.countDocuments({ email_respondido: true });
  const dadosDeBaja = await Lead.countDocuments({ dado_de_baja: true });
  
  // Por fuente
  const porFuente = await Lead.aggregate([
    { $group: { _id: '$fuente', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  // Por estado
  const porEstado = await Lead.aggregate([
    { $group: { _id: '$estado', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  return {
    total,
    conEmail,
    sinEmail,
    enviados,
    abiertos,
    respondidos,
    dadosDeBaja,
    porFuente,
    porEstado
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runProspection()
    .then(() => {
      console.log('✅ Prospección completada');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = { 
  runProspection, 
  enrichLeadsWithWebEmails, 
  enrichNamesWithAI,
  generatePersonalizedParagraphs,
  getLeadStats,
  buscarEnDenue,
  extractEmailsFromWebsite 
};
