// ==========================================
// Misión: 7,000 Leads Premium - GLI
// ==========================================
const { runProspection, enrichLeadsWithWebEmails } = require('./prospector');

async function main() {
    console.log('🚀 INICIANDO ESCANEO MASIVO DE PROSPECTOS PREMIUM...');
    console.log('📍 OBJETIVO: 7,000 Leads en Culiacán, Sinaloa\n');
    
    try {
        // 1. Prospección de todas las categorías
        console.log('--- FASE 1: Búsqueda en Directorios ---');
        await runProspection();
        
        // 2. Enriquecimiento de emails
        console.log('\n--- FASE 2: Enriquecimiento Web de Emails ---');
        await enrichLeadsWithWebEmails();
        
        console.log('\n✅ MISIÓN COMPLETADA CON ÉXITO');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ ERROR DURANTE EL ESCANEO:', error);
        process.exit(1);
    }
}

main();
