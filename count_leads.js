const fs = require('fs');
const leads = JSON.parse(fs.readFileSync('db_leads.json', 'utf8'));
const withName = leads.filter(l => l.nombre_contacto && l.nombre_contacto !== '' && l.nombre_contacto !== 'Sin dato').length;
const total = leads.length;
console.log(`\n================================`);
console.log(`📊 TOTAL DE LEADS: ${total}`);
console.log(`👤 DUEÑOS DETECTADOS: ${withName}`);
console.log(`================================\n`);
