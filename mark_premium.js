const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db_leads.json');

function updatePremiumStatus() {
    let leads = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let updated = 0;

    const premiumGiros = [
        'cirujano', 'médico', 'especialista', 'notario', 'notaría',
        'residencial', 'inmobiliaria de lujo', 'joyería', 'agencia de autos',
        'golf', 'yate', 'aviones', 'blindajes', 'corporativo', 'inversionista',
        'exportación', 'importación', 'agroindustrial', 'empaque', 'ganadera',
        'cantante', 'artista reconocido', 'productor'
    ];

    leads = leads.map(l => {
        const giro = (l.giro || '').toLowerCase();
        const nombre = (l.nombre_negocio || '').toLowerCase();
        
        const isPremium = premiumGiros.some(pg => giro.includes(pg) || nombre.includes(pg));
        
        if (isPremium && !l.es_premium) {
            l.es_premium = true;
            l.calificacion = (l.calificacion || 0) + 20;
            updated++;
        }
        return l;
    });

    fs.writeFileSync(DB_PATH, JSON.stringify(leads, null, 2));
    console.log(`✅ Se actualizaron ${updated} leads a estado PREMIUM.`);
}

updatePremiumStatus();
