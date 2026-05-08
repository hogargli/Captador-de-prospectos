const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db_leads.json');

function checkLast24h() {
    const leads = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const newLeads = leads.filter(l => {
        const date = new Date(l.fecha_captura);
        return date >= last24h;
    });

    console.log(`📊 leads capturados en las últimas 24h: ${newLeads.length}`);
    
    // Categorías de interés
    const doctors = newLeads.filter(l => (l.giro || '').toLowerCase().includes('médico') || (l.giro || '').toLowerCase().includes('cirujano'));
    const singers = newLeads.filter(l => (l.giro || '').toLowerCase().includes('cantante') || (l.giro || '').toLowerCase().includes('músico'));
    const premium = newLeads.filter(l => l.es_premium);

    console.log(`🩺 MÉDICOS: ${doctors.length}`);
    console.log(`🎤 CANTANTES: ${singers.length}`);
    console.log(`💎 PREMIUM: ${premium.length}`);
}

checkLast24h();
