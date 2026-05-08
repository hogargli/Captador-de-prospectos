const { connectDB } = require('./database');
const { Lead } = require('./models');

async function checkLeads() {
  await connectDB();
  const allLeads = await Lead.find({
    email: { $ne: '', $exists: true },
    email_enviado: false,
    dado_de_baja: false
  });

  const restaurantLeads = allLeads.filter(l => l.giro && /restauran|comida|alimento|gastron|café|cafeteria|taqueria|taco|mariscos|pizza|sushi|cocina|cenad|fonda|cantina|bar|buffet|antojitos/i.test(l.giro));

  console.log(`📊 Total leads con email pendientes: ${allLeads.length}`);
  console.log(`🍽️ Restaurantes pendientes: ${restaurantLeads.length}`);
  
  const premiumRestaurants = restaurantLeads.filter(l => l.es_premium);
  console.log(`💎 Restaurantes Premium pendientes: ${premiumRestaurants.length}`);

  process.exit(0);
}

checkLeads();
