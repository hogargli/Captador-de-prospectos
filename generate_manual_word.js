const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
const fs = require('fs');

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                text: "Manual de Difusión Segura en WhatsApp",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Para evitar que WhatsApp suspenda nuestra cuenta al difundir propiedades, debemos seguir estas reglas basadas estrictamente en las políticas de Meta Business.",
                        italics: true,
                    }),
                ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
                text: "1. Listas de Difusión vs. Grupos",
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
                text: "• Listas de Difusión: Límite de 256 personas por lista.",
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "  REGLA DE ORO: ", bold: true, color: "FF0000" }),
                    new TextRun("Solo recibirán el mensaje las personas que TENGAN NUESTRO NÚMERO GUARDADO en sus contactos. Si no nos tienen agregados, el mensaje nunca les llegará."),
                ],
            }),
            new Paragraph({
                text: "• Grupos: Límite de hasta 1,024 personas. Es efectivo para que todos vean la información, pero configura como 'Solo administradores pueden enviar mensajes'.",
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
                text: "2. Límites de Mensajes Diarios (Tiers)",
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
                text: "El límite aumenta según nuestro comportamiento (mensajes de calidad):",
            }),
            new Paragraph({ text: "• Nivel 1: Hasta 250 contactos únicos cada 24 horas." }),
            new Paragraph({ text: "• Nivel 2: Hasta 1,000 contactos únicos cada 24 horas." }),
            new Paragraph({ text: "• Nivel 3: Hasta 10,000 contactos únicos cada 24 horas." }),
            new Paragraph({ text: "• Nivel 4: Hasta 100,000 contactos." }),
            new Paragraph({ text: "" }),
            new Paragraph({
                text: "3. Cómo evitar la Suspensión (Baneo)",
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({ text: "1. Personaliza el inicio: Saluda por su nombre." }),
            new Paragraph({ text: "2. Frecuencia: Máximo 1 mensaje de difusión al día por número." }),
            new Paragraph({ text: "3. Opción de salida: Incluye 'Responde BAJA para no recibir más'." }),
            new Paragraph({ text: "4. Calidad: Evita palabras en mayúsculas como 'COMPRA YA'." }),
            new Paragraph({ text: "" }),
            new Paragraph({
                text: "4. Recomendación Técnica",
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
                text: "Deja pasar al menos 5-10 segundos entre cada mensaje si usas herramientas externas para que WhatsApp no detecte comportamiento de robot.",
            }),
        ],
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("Manual_Difusion_WhatsApp.docx", buffer);
    console.log("✅ Archivo Word generado: Manual_Difusion_WhatsApp.docx");
});
