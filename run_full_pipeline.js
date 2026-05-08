// ============================================================
// PIPELINE COMPLETO - GLI Inmobiliaria
// 1. Enriquecimiento Web (buscar emails en sitios web)
// 2. Extracción de Nombres con IA (Gemini)
// 3. Generación de Excel actualizado
// ============================================================

const fs = require('fs');
const path = require('path');
const { connectDB } = require('./database');
const { Lead } = require('./models');
const { extractEmailsFromWebsite } = require('./prospector');
const { extractOwnerNameWithAI } = require('./ai_extractor');
require('dotenv').config();

const DB_PATH = path.join(__dirname, 'db_leads.json');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// FASE 1: Enriquecimiento Web de Emails
// ==========================================
async function enrichEmails() {
  console.log('\n🌐 ═══════════════════════════════════════');
  console.log('🌐 FASE 1: ENRIQUECIMIENTO WEB DE EMAILS');
  console.log('🌐 ═══════════════════════════════════════\n');

  const rawData = fs.readFileSync(DB_PATH, 'utf8');
  let leads = JSON.parse(rawData);

  // Leads sin email pero con sitio web
  const candidates = leads.filter(l =>
    (!l.email || l.email === '') &&
    l.sitio_web &&
    l.sitio_web !== '' &&
    l.sitio_web !== 'Sin dato' &&
    !l.sitio_web.includes('facebook.com')
  );

  // Deduplicar por sitio web para no visitar el mismo sitio varias veces
  const visitedSites = new Set();
  const uniqueCandidates = candidates.filter(l => {
    const site = l.sitio_web.toLowerCase();
    if (visitedSites.has(site)) return false;
    visitedSites.add(site);
    return true;
  }).slice(0, 300); // Procesar hasta 300

  console.log(`📋 ${uniqueCandidates.length} leads únicos para buscar emails\n`);

  let enriched = 0;
  let processed = 0;

  for (const lead of uniqueCandidates) {
    processed++;
    if (processed % 20 === 0) {
      console.log(`   ⏳ Progreso: ${processed}/${uniqueCandidates.length} procesados, ${enriched} emails encontrados`);
    }

    try {
      const emails = await extractEmailsFromWebsite(lead.sitio_web);

      if (emails.length > 0) {
        const validEmail = emails[0];
        // Verificar que no sea un email genérico inválido
        if (validEmail.includes('example.com') || validEmail.includes('sentry') || validEmail.length > 60) continue;

        // Verificar que no exista ya en la BD
        const exists = leads.some(l => l.email === validEmail);
        if (!exists) {
          // Actualizar este lead y todos los que tengan el mismo sitio web
          const siteKey = lead.sitio_web.toLowerCase();
          const idx = leads.findIndex(l => l._id === lead._id);
          if (idx !== -1) {
            leads[idx].email = validEmail;
            leads[idx].email_verificado = true;
            leads[idx].estado = 'email_encontrado';
            leads[idx].fuente = (leads[idx].fuente || 'DENUE') + ' + Web';
            enriched++;
            console.log(`   ✅ ${lead.nombre_negocio} → ${validEmail}`);
          }
        }
      }
    } catch (e) {
      // Silenciar errores de red
    }

    await sleep(1200);
  }

  // Guardar cambios
  fs.writeFileSync(DB_PATH, JSON.stringify(leads, null, 2));
  console.log(`\n✅ FASE 1 COMPLETA: ${enriched} nuevos emails encontrados\n`);
  return enriched;
}

// ==========================================
// FASE 2: Extracción de Nombres con Gemini AI
// ==========================================
async function enrichNames() {
  console.log('\n🤖 ═══════════════════════════════════════');
  console.log('🤖 FASE 2: EXTRACCIÓN DE NOMBRES CON IA');
  console.log('🤖 ═══════════════════════════════════════\n');

  const rawData = fs.readFileSync(DB_PATH, 'utf8');
  let leads = JSON.parse(rawData);

  // Leads premium sin nombre de contacto pero con sitio web
  const candidates = leads.filter(l =>
    l.es_premium === true &&
    (!l.nombre_contacto || l.nombre_contacto === '') &&
    l.sitio_web &&
    l.sitio_web !== '' &&
    l.sitio_web !== 'Sin dato' &&
    !l.sitio_web.includes('facebook.com')
  );

  // Deduplicar por sitio web
  const visitedSites = new Set();
  const uniqueCandidates = candidates.filter(l => {
    const site = l.sitio_web.toLowerCase();
    if (visitedSites.has(site)) return false;
    visitedSites.add(site);
    return true;
  }).slice(0, 50); // Máximo 50 para no agotar la cuota

  console.log(`📋 ${uniqueCandidates.length} leads premium para analizar con IA\n`);

  let enriched = 0;

  for (const lead of uniqueCandidates) {
    try {
      const aiData = await extractOwnerNameWithAI(lead.sitio_web);

      if (aiData && (aiData.nombre || aiData.email)) {
        const idx = leads.findIndex(l => l._id === lead._id);
        if (idx !== -1) {
          if (aiData.nombre) {
            leads[idx].nombre_contacto = aiData.nombre;
            leads[idx].cargo_contacto = aiData.cargo || 'Director / Dueño';
          }
          if (aiData.email && !leads[idx].email) {
            leads[idx].email = aiData.email;
            leads[idx].email_verificado = true;
            leads[idx].estado = 'email_encontrado';
          }
          enriched++;
          console.log(`   ✅ ${lead.nombre_negocio} → ${aiData.nombre || 'Sin nombre'} | ${aiData.email || leads[idx].email || 'Sin email'}`);
        }
      }
    } catch (e) {
      console.log(`   ⚠️ Error IA ${lead.nombre_negocio}: ${e.message}`);
    }

    await sleep(2500); // Respetar cuotas de Gemini
  }

  // Guardar cambios
  fs.writeFileSync(DB_PATH, JSON.stringify(leads, null, 2));
  console.log(`\n✅ FASE 2 COMPLETA: ${enriched} nombres/emails extraídos con IA\n`);
  return enriched;
}

// ==========================================
// FASE 3: Generar Excel Actualizado
// ==========================================
async function generateExcel() {
  console.log('\n📊 ═══════════════════════════════════════');
  console.log('📊 FASE 3: GENERACIÓN DE EXCEL ACTUALIZADO');
  console.log('📊 ═══════════════════════════════════════\n');

  const XLSX = require('xlsx');
  const rawData = fs.readFileSync(DB_PATH, 'utf8');
  let leads = JSON.parse(rawData);

  // Separar en hojas
  // Hoja 1: TODOS los leads
  const allLeadsData = leads.map(lead => ({
    'Negocio': lead.nombre_negocio || '',
    'Razón Social': lead.razon_social || '',
    'Contacto': lead.nombre_contacto || '',
    'Cargo': lead.cargo_contacto || '',
    'Email': lead.email || '',
    'Teléfono': lead.telefono || '',
    'Giro': lead.giro || '',
    'Actividad': lead.clase_actividad || '',
    'Tamaño': lead.tamano_empresa || '',
    'Sitio Web': lead.sitio_web || '',
    'Dirección': lead.direccion ? `${lead.direccion.calle || ''} ${lead.direccion.num_exterior || ''}, ${lead.direccion.colonia || ''}` : '',
    'CP': lead.direccion ? lead.direccion.cp || '' : '',
    'Premium': lead.es_premium ? 'SÍ' : 'NO',
    'Calificación': lead.calificacion || 0,
    'Estado': lead.estado || 'nuevo',
    'Fuente': lead.fuente || '',
    'Email Enviado': lead.email_enviado ? 'SÍ' : 'NO',
    'Fecha Captura': lead.fecha_captura || ''
  }));

  // Hoja 2: Solo los que tienen email (listos para campaña)
  const withEmail = leads.filter(l => l.email && l.email !== '' && l.email.includes('@'));
  const emailLeadsData = withEmail.map(lead => ({
    'Negocio': lead.nombre_negocio || '',
    'Contacto': lead.nombre_contacto || '',
    'Email': lead.email || '',
    'Teléfono': lead.telefono || '',
    'Giro': lead.clase_actividad || lead.giro || '',
    'Premium': lead.es_premium ? 'SÍ' : 'NO',
    'Estado': lead.estado || '',
    'Sitio Web': lead.sitio_web || ''
  }));

  // Hoja 3: Dueños/directivos identificados
  const owners = leads.filter(l => l.nombre_contacto && l.nombre_contacto !== '' && l.nombre_contacto !== '---');
  const ownersData = owners.map(lead => ({
    'Nombre del Dueño/Director': lead.nombre_contacto,
    'Cargo': lead.cargo_contacto || 'Director / Dueño',
    'Empresa': lead.nombre_negocio,
    'Email': lead.email || 'Sin email',
    'Teléfono': lead.telefono || '',
    'Giro': lead.clase_actividad || lead.giro || '',
    'Ingreso Estimado': lead.es_premium ? '>$100,000 MXN' : 'Variable',
    'Calificación': lead.calificacion || 0,
    'Sitio Web': lead.sitio_web || ''
  }));

  // Crear libro Excel
  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(allLeadsData);
  ws1['!cols'] = [
    {wch:30}, {wch:30}, {wch:25}, {wch:20}, {wch:30}, {wch:15},
    {wch:15}, {wch:40}, {wch:18}, {wch:30}, {wch:40}, {wch:8},
    {wch:8}, {wch:10}, {wch:15}, {wch:15}, {wch:12}, {wch:20}
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Todos los Leads');

  const ws2 = XLSX.utils.json_to_sheet(emailLeadsData);
  ws2['!cols'] = [{wch:30}, {wch:25}, {wch:30}, {wch:15}, {wch:35}, {wch:8}, {wch:15}, {wch:30}];
  XLSX.utils.book_append_sheet(wb, ws2, 'Con Email');

  const ws3 = XLSX.utils.json_to_sheet(ownersData);
  ws3['!cols'] = [{wch:30}, {wch:20}, {wch:30}, {wch:30}, {wch:15}, {wch:35}, {wch:18}, {wch:10}, {wch:30}];
  XLSX.utils.book_append_sheet(wb, ws3, 'Dueños Identificados');

  const outputPath = path.join(__dirname, 'Leads_Premium_GLI.xlsx');
  XLSX.writeFile(wb, outputPath);

  console.log(`✅ Excel generado: ${outputPath}`);
  console.log(`   📊 Hoja 1 "Todos los Leads": ${allLeadsData.length} registros`);
  console.log(`   📧 Hoja 2 "Con Email": ${emailLeadsData.length} registros`);
  console.log(`   👤 Hoja 3 "Dueños Identificados": ${ownersData.length} registros\n`);
}

// ==========================================
// RESUMEN FINAL
// ==========================================
async function printSummary() {
  const rawData = fs.readFileSync(DB_PATH, 'utf8');
  const leads = JSON.parse(rawData);

  const total = leads.length;
  const conEmail = leads.filter(l => l.email && l.email !== '' && l.email.includes('@')).length;
  const premium = leads.filter(l => l.es_premium === true).length;
  const conNombre = leads.filter(l => l.nombre_contacto && l.nombre_contacto !== '' && l.nombre_contacto !== '---').length;
  const conTelefono = leads.filter(l => l.telefono && l.telefono !== '').length;

  console.log('\n🏆 ═══════════════════════════════════════');
  console.log('🏆 RESUMEN FINAL DE LA BASE DE DATOS');
  console.log('🏆 ═══════════════════════════════════════');
  console.log(`📊 Total de leads:          ${total}`);
  console.log(`📧 Con email:               ${conEmail}`);
  console.log(`💎 Premium:                 ${premium}`);
  console.log(`👤 Con nombre de contacto:  ${conNombre}`);
  console.log(`📞 Con teléfono:            ${conTelefono}`);
  console.log('🏆 ═══════════════════════════════════════\n');
}

// ==========================================
// EJECUTAR PIPELINE
// ==========================================
async function main() {
  console.log('🚀 ═══════════════════════════════════════════════');
  console.log('🚀 PIPELINE COMPLETO - GLI Inmobiliaria');
  console.log('🚀 ═══════════════════════════════════════════════\n');

  await connectDB();

  // Fase 1: Buscar emails en sitios web
  await enrichEmails();

  // Fase 2: Extraer nombres con Gemini AI
  await enrichNames();

  // Fase 3: Generar Excel
  await generateExcel();

  // Resumen final
  await printSummary();

  console.log('✅ PIPELINE COMPLETADO CON ÉXITO');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
