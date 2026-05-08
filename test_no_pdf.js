const Brevo = require('@getbrevo/brevo');
const fs = require('fs');
require('dotenv').config();

async function testNoPdf() {
  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  const imgPath = "C:\\Users\\GLI\\Downloads\\La ubicación puede representar hasta 60–80% del éxito de un restaurante.jpg";
  
  sendSmtpEmail.subject = "PRUEBA SIN PDF - ¿Te llega este?";
  sendSmtpEmail.htmlContent = `
    <html>
      <body>
        <p>Hola Marco, este es el texto del restaurante sin el adjunto pesado.</p>
        <img src="cid:Exito_en_Restaurantes_GLI.jpg" style="width:100\%; max-width:600px;" />
        <p>Si este llega, confirmamos que el PDF era el culpable.</p>
      </body>
    </html>
  `;
  sendSmtpEmail.sender = { name: 'GLI Inmobiliaria', email: process.env.SENDER_EMAIL || 'ventas@gli.com.mx' };
  sendSmtpEmail.to = [{ email: 'marcoaven2@gmail.com', name: 'Marco' }];

  if (fs.existsSync(imgPath)) {
    const imgContent = fs.readFileSync(imgPath);
    sendSmtpEmail.attachment = [{
      content: imgContent.toString('base64'),
      name: 'Exito_en_Restaurantes_GLI.jpg'
    }];
  }

  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Enviado con éxito (sin PDF). ID:", result.messageId);
  } catch (error) {
    console.error("❌ Falló:", error.message);
  }
}
testNoPdf();
