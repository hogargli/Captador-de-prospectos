const fs = require('fs');
const path = require('path');
require('dotenv').config();

const mongoose = require('mongoose');

// Base de datos local ultra-simple para evitar errores de Windows
const DB_PATH = {
  Lead: path.join(__dirname, 'db_leads.json'),
  Log: path.join(__dirname, 'db_logs.json'),
  Campaign: path.join(__dirname, 'db_campaigns.json')
};

async function connectDB() {
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('usuario:password')) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Conectado a MongoDB Atlas (Nube)');
      return true;
    } catch (err) {
      console.warn('⚠️ No se pudo conectar a MongoDB Cloud. Usando local...');
    }
  }

  // Inicializar archivos locales si no existen
  Object.values(DB_PATH).forEach(p => {
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, '[]', 'utf8');
    }
  });

  // console.log('📂 Usando Base de Datos local (Archivos JSON)');
  return true;
}

module.exports = { connectDB, DB_PATH };
