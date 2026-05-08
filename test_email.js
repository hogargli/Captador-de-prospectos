const { sendEmail } = require('./emailAgent');
const { connectDB, getDB } = require('./database');
const { Lead } = require('./models');

async function test() {
  console.log('🧪 Iniciando ENVIO DE PRUEBA...');
  await connectDB();
  
  const testLead = {
    _id: 'test_id',
    nombre_negocio: 'Marco Avenue',
    nombre_contacto: 'Marco',
    email: 'marcoaven2@gmail.com',
    giro: 'Prueba de Sistema',
    intentos_envio: 0
  };
  
  console.log(`📧 Intentando enviar a: ${testLead.email}`);
  const result = await sendEmail(testLead);
  
  if (result.success) {
    console.log('✅ PRUEBA EXITOSA. Revisa tu bandeja de entrada (y spam por si acaso).');
  } else {
    console.log('❌ FALLO LA PRUEBA: ' + result.error);
  }
  process.exit(0);
}

test();
