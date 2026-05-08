const Brevo = require('@getbrevo/brevo');
require('dotenv').config();

async function debugEmail() {
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.subject = "PRUEBA SIMPLE - ¿Te llega este?";
  sendSmtpEmail.htmlContent = "<h1>Hola Marco</h1><p>Esta es una prueba de solo texto para ver si llega el correo sin adjuntos.</p>";
  sendSmtpEmail.sender = { name: 'GLI Inmobiliaria', email: process.env.SENDER_EMAIL || 'hogargli@gmail.com' };
  sendSmtpEmail.to = [{ email: 'marcoaven2@gmail.com', name: 'Marco' }];

  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Enviado con éxito. ID:", result.messageId);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}
debugEmail();
