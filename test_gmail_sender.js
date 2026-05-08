const Brevo = require('@getbrevo/brevo');
const fs = require('fs');
require('dotenv').config();

async function backToGmail() {
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.subject = "PRUEBA CON GMAIL - Restaurante";
  sendSmtpEmail.htmlContent = "<p>Hola Marco, este se envia desde hogargli@gmail.com que parece que si te llegaba.</p>";
  
  // Usando el sender que funcionó antes
  sendSmtpEmail.sender = { name: 'GLI | Marco', email: 'hogargli@gmail.com' };
  sendSmtpEmail.to = [{ email: 'marcoaven2@gmail.com', name: 'Marco' }];

  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Enviado con gmail. ID:", JSON.stringify(result));
  } catch (error) {
    console.error("❌ Falló:", error.message);
  }
}
backToGmail();
