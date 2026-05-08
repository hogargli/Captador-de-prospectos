const Brevo = require('@getbrevo/brevo');
require('dotenv').config();

async function extremeDebug() {
  console.log('🔍 Iniciando diagnóstico de envío a marcoaven2@gmail.com...');
  
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.subject = "DIAGNOSTICO - GLI";
  sendSmtpEmail.htmlContent = "<p>Prueba de diagnostico</p>";
  sendSmtpEmail.sender = { name: 'GLI', email: process.env.SENDER_EMAIL || 'hogargli@gmail.com' };
  sendSmtpEmail.to = [{ email: 'marcoaven2@gmail.com' }];

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ API respondio con éxito.");
    console.log("📄 Cuerpo total de la respuesta:", JSON.stringify(response, null, 2));
    
    // Si llegamos aquí, Brevo "aceptó" el paquete, pero ellos pueden tenerlo en cola o bloqueado
    if (response && response.messageId) {
        console.log("🆔 Mensaje aceptado por Brevo con ID:", response.messageId);
    } else {
        console.log("⚠️ Brevo respondio exito pero no dio MessageID (Raro)");
    }

  } catch (error) {
    console.error("❌ ERROR DETECTADO:");
    if (error.response && error.response.body) {
        console.error("Cuerpo del error:", JSON.stringify(error.response.body, null, 2));
    } else {
        console.error("Mensaje de error:", error.message);
    }
  }
}
extremeDebug();
