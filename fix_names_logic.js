const fs = require('fs');

async function fixNames() {
    const leads = JSON.parse(fs.readFileSync('./db_leads.json', 'utf8'));
    let fixed = 0;
    
    for (const lead of leads) {
        // Casos de doctores
        const drMatch = lead.nombre_negocio.match(/(DR\.|DRA\.)\s+([A-Z\s]+)/i);
        if (drMatch && (!lead.nombre_contacto || lead.nombre_contacto === '')) {
            lead.nombre_contacto = drMatch[2].trim();
            lead.cargo_contacto = drMatch[1].toUpperCase().includes('DRA') ? 'Dra. Especialista' : 'Dr. Especialista';
            fixed++;
            continue;
        }
        
        // Casos de Notarías (Suelen tener el nombre en la razón social o negocio)
        if (lead.nombre_negocio.toLowerCase().includes('notaria') || lead.clase_actividad.toLowerCase().includes('notar')) {
            const notMatch = lead.nombre_negocio.match(/NOTARIA\s+(PUBLIC\s+)?(\d+)?\s+([A-Z\s]+)/i);
            if (notMatch && notMatch[3] && notMatch[3].length > 5) {
                lead.nombre_contacto = notMatch[3].trim();
                lead.cargo_contacto = 'Notario Público';
                fixed++;
            }
        }
    }
    
    fs.writeFileSync('./db_leads.json', JSON.stringify(leads, null, 2));
    console.log(`✅ Fixed ${fixed} names from strings.`);
}

fixNames();
