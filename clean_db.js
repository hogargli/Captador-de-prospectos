const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db_leads.json');
let leads = [];

try {
  const data = fs.readFileSync(dbPath, 'utf8');
  leads = JSON.parse(data);
} catch (err) {
  console.error("Error reading db_leads.json:", err);
  process.exit(1);
}

const EXCLUDED_KEYWORDS = [
  'inmobiliaria', 'bienes raices', 'realty', 'remax', 'kw ', 'zona militar', 'sedena', 'gobierno', 
  'seguridad publica', 'ayuntamiento', 'secretaria de', 'partido politico', 'iglesia', 'parroquia',
  'universidad', 'escuela', 'colegio', 'kinder', 'primaria', 'secundaria', 'preparatoria', 'instituto', 'uade', 'uas ',
  'facultad', 'educacion', 'educativa', 'academ', 'bachilleres', 'conalep', 'cobaes', 'capacitacion', 'guarderia'
];

const initialCount = leads.length;

const validLeads = leads.filter(item => {
  const name = (item.nombre_negocio || '').toLowerCase();
  const social = (item.razon_social || '').toLowerCase();
  const actividad = (item.clase_actividad || '').toLowerCase();
  const giro = (item.giro || '').toLowerCase();
  
  const isExcluded = EXCLUDED_KEYWORDS.some(kw => 
    name.includes(kw) || social.includes(kw) || actividad.includes(kw) || giro.includes(kw)
  );

  return !isExcluded;
});

const removedCount = initialCount - validLeads.length;

try {
  fs.writeFileSync(dbPath, JSON.stringify(validLeads, null, 2), 'utf8');
  console.log(`Cleaned up database. Removed ${removedCount} leads.`);
  console.log(`Remaining leads: ${validLeads.length}`);
} catch (error) {
  console.error("Error writing to db_leads.json:", error);
}
