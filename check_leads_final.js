const fs = require('fs');
const path = require('path');

const leadsPath = path.join(__dirname, 'db_leads.json');
const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));

const restaurantRegex = /restauran|comida|alimento|gastron|café|cafeteria|taqueria|taco|mariscos|pizza|sushi|cocina|cenad|fonda|cantina|bar|buffet|antojitos/i;

const restaurantLeads = leads.filter(l => l.giro && restaurantRegex.test(l.giro));
const pendingRestaurantLeads = restaurantLeads.filter(l => !l.email_enviado && l.email && !l.dado_de_baja);

console.log('Total Leads:', leads.length);
console.log('Total Restaurant Leads:', restaurantLeads.length);
console.log('Pending Restaurant Leads (with email):', pendingRestaurantLeads.length);
console.log('Premium Pending:', pendingRestaurantLeads.filter(l => l.es_premium).length);

process.exit(0);
