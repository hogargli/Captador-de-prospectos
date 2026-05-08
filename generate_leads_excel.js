const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { extractOwnerNameWithAI } = require('./ai_extractor');

const DB_PATH = path.join(__dirname, 'db_leads.json');
const OUTPUT_FILE = path.join(__dirname, 'Leads_Premium_V2.xlsx');

async function generateExcel() {
    console.log('📊 Iniciando generación de reporte Excel...');

    if (!fs.existsSync(DB_PATH)) {
        console.error('❌ No se encontró la base de datos db_leads.json');
        return;
    }

    const rawData = fs.readFileSync(DB_PATH, 'utf8');
    let leads = JSON.parse(rawData);

    // Palabras clave para gente con ingresos > $100k
    const premiumKeywords = [
        'doctor', 'médico', 'cirujano', 'hospital', 'clínica', 'notar', 'corporativo', 
        'director', 'gerente', 'especialista', 'estética', 'dental', 'consultorio',
        'agencia', 'desarrollador', 'arquitecto', 'inmobiliaria', 'constructora'
    ];

    // 1. FILTRAR LEADS BUENOS
    const filteredLeads = leads.filter(lead => {
        const giroMatch = premiumKeywords.some(kw => 
            (lead.giro || '').toLowerCase().includes(kw) || 
            (lead.clase_actividad || '').toLowerCase().includes(kw)
        );

        const esPremium = lead.es_premium === true;
        const buenaCalif = lead.calificacion >= 30;
        const empresaGrande = lead.tamano_empresa && (
            lead.tamano_empresa.includes('11 a 30') ||
            lead.tamano_empresa.includes('31 a 50') ||
            lead.tamano_empresa.includes('51 a 100') ||
            lead.tamano_empresa.includes('101 a 250') ||
            lead.tamano_empresa.includes('251 y más')
        );

        // Queremos leads con email o que sean muy buenos candidatos para buscarles el contacto
        return (giroMatch || esPremium || buenaCalif || empresaGrande);
    });

    console.log(`🎯 leads potenciales seleccionados: ${filteredLeads.length}`);

    // 2. BUSCAR CONTACTOS DIRECTOS (ENRIQUECIMIENTO RÁPIDO PARA EL TOP 15)
    // Solo leads que no tienen nombre de contacto pero sí tienen sitio web
    const leadsToEnrich = filteredLeads
        .filter(l => (!l.nombre_contacto || l.nombre_contacto === '') && l.sitio_web && l.sitio_web !== 'Sin dato')
        .slice(0, 15);

    if (leadsToEnrich.length > 0) {
        console.log(`🔍 Intentando encontrar contactos directos para ${leadsToEnrich.length} leads clave...`);
        for (const lead of leadsToEnrich) {
            try {
                const data = await extractOwnerNameWithAI(lead.sitio_web);
                if (data && data.nombre) {
                    lead.nombre_contacto = data.nombre;
                    lead.cargo_contacto = data.cargo || 'Dueño/Director';
                    if (data.email && !lead.email) lead.email = data.email;
                    
                    // Actualizar en la base de datos original si se desea persistencia
                    const idx = leads.findIndex(l => l._id === lead._id);
                    if (idx !== -1) {
                        leads[idx].nombre_contacto = data.nombre;
                        leads[idx].cargo_contacto = data.cargo || 'Dueño/Director';
                    }
                }
            } catch (e) {
                console.log(`⚠️ Error procesando ${lead.nombre_negocio}: ${e.message}`);
            }
        }
        // Guardar cambios en el JSON original
        fs.writeFileSync(DB_PATH, JSON.stringify(leads, null, 2));
    }

const { getSectorTemplate } = require('./templates');

// ... (previous setup codes) ...

    // 3. SELECCIÓN EXCLUSIVA DE DUEÑOS Y CONTACTOS CONFIRMADOS (> $100k)
    const confirmedContacts = filteredLeads.filter(lead => 
        lead.nombre_contacto && 
        lead.nombre_contacto !== '---' && 
        lead.nombre_contacto !== '' &&
        (premiumKeywords.some(kw => (lead.cargo_contacto || '').toLowerCase().includes(kw)) || lead.es_premium || lead.calificacion >= 40)
    );

    const ownersData = confirmedContacts.map(lead => {
        const template = getSectorTemplate(lead.nombre_contacto, lead.nombre_negocio, lead.clase_actividad || lead.giro);
        return {
            'Nombre del Dueño/Contacto': lead.nombre_contacto,
            'Cargo Específico': lead.cargo_contacto || 'Dueño / Director General',
            'Empresa': lead.nombre_negocio,
            'Correo Directo': lead.email || 'Sin email',
            'Teléfono': lead.telefono || 'Sin teléfono',
            'Ingreso Estimado': '>$100,000 MXN',
            'Rubro': lead.clase_actividad || lead.giro,
            'Asunto Sugerido': template.subject,
            'Mensaje Personalizado (Borrador)': template.body.replace(/<br>/g, '\n').replace(/<\/?[^>]+(>|$)/g, ""),
            'Ya se le envió correo': lead.email_enviado ? 'SÍ' : 'NO'
        };
    });

    // 4. FORMATEAR PARA EXCEL
    const excelData = filteredLeads.map(lead => ({
        'Negocio': lead.nombre_negocio,
        'Nombre de Contacto': lead.nombre_contacto || '---',
        'Cargo': lead.cargo_contacto || (lead.es_premium ? 'Directivo/Dueño' : 'Encargado'),
        'Email': lead.email || 'Sin email',
        'Teléfono': lead.telefono || 'Sin teléfono',
        'Email Enviado': lead.email_enviado ? 'SÍ' : 'NO',
        'Giro / Actividad': lead.clase_actividad || lead.giro,
        'Tamaño': lead.tamano_empresa || 'Desconocido',
        'Sitio Web': lead.sitio_web || 'Sin web',
        'Calificación': lead.calificacion || 0,
        'Ubicación': lead.direccion ? `${lead.direccion.colonia}, ${lead.direccion.ubicacion}` : 'Culiacán'
    }));

    // 5. CREAR EXCEL CON DOS HOJAS
    const wb = XLSX.utils.book_new();
    
    // Hoja 1: Todo el universo premium
    const ws1 = XLSX.utils.json_to_sheet(excelData);
    const wscols1 = [
        {wch: 30}, {wch: 25}, {wch: 20}, {wch: 30}, {wch: 15}, {wch: 12}, 
        {wch: 40}, {wch: 20}, {wch: 30}, {wch: 10}, {wch: 40}
    ];
    ws1['!cols'] = wscols1;
    XLSX.utils.book_append_sheet(wb, ws1, 'Universo Premium');

    // Hoja 2: Solo contactos confirmados (Dueños/Directivos)
    const ws2 = XLSX.utils.json_to_sheet(ownersData);
    const wscols2 = [
        {wch: 30}, {wch: 25}, {wch: 25}, {wch: 30}, {wch: 15}, {wch: 15}, {wch: 30}, {wch: 35}, {wch: 60}, {wch: 15}
    ];
    ws2['!cols'] = wscols2;
    XLSX.utils.book_append_sheet(wb, ws2, 'Dueños y Directivos');

    XLSX.writeFile(wb, OUTPUT_FILE);

    console.log(`✅ ¡Excel actualizado exitosamente en: ${OUTPUT_FILE}`);
    console.log(`📌 Se incluyeron ${confirmedContacts.length} mensajes personalizados en la Hoja 2.`);
}

generateExcel().catch(err => {
    console.error('❌ Error fatal:', err);
});
