const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, 'db_leads.json');

const browserLeads = [
    { name: "Dr. Kenji Alejandro Maquita Esquivel", giro: "Cirugía Plástica" },
    { name: "Dr. Sergio Ramón Ruíz Barajas", giro: "Cirugía Plástica" },
    { name: "Dr. Otoniel Cuadras Verdugo", giro: "Cirugía Plástica" },
    { name: "Dr. Emilio Gastelum Bon", giro: "Cirugía Plástica" },
    { name: "Dr. Esteban Adrián Pérez Cebreros", giro: "Cirugía Plástica" },
    { name: "Dr. Gerardo Sánchez Carvajal", giro: "Cirugía Plástica" },
    { name: "Dr. Gerardo Lelevier De Doig Alvear", giro: "Cirugía Plástica" },
    { name: "Dr. Benjamín Jaime López Palazuelos", giro: "Cirugía Plástica" },
    { name: "Dr. Christian Valenzuela Madero", giro: "Cirugía Plástica" },
    { name: "Dr. Arturo Ceyca", giro: "Cirugía Plástica" },
    { name: "Banda Renovación", giro: "Cantante / Grupo" },
    { name: "Quinta Sincronía", giro: "Cantante / Grupo" },
    { name: "Santo Remedio", giro: "Cantante / Grupo" },
    { name: "Sax Efraín Acosta", giro: "Músico" },
    { name: "Fidel Rueda", giro: "Cantante" },
    { name: "Grupo Musical Crisánju", giro: "Grupo Musical" },
    { name: "Mezcala Orquesta", giro: "Orquesta" },
    { name: "Buena Sintonía", giro: "Grupo Musical" },
    { name: "Décadas Banda Orquesta", giro: "Orquesta" },
    { name: "Mariachi Continental", giro: "Mariachi" }
];

function addLeads() {
    let leads = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let added = 0;

    browserLeads.forEach(bl => {
        if (!leads.find(l => l.nombre_negocio === bl.name)) {
            leads.push({
                _id: Math.random().toString(36).substr(2, 9),
                nombre_negocio: bl.name,
                giro: bl.giro,
                es_premium: true,
                fuente: 'Investigación Browser',
                estado: 'nuevo',
                fecha_captura: new Date().toISOString()
            });
            added++;
        }
    });

    fs.writeFileSync(DB_PATH, JSON.stringify(leads, null, 2));
    console.log(`✅ Agregados ${added} leads de investigación manual.`);
}

addLeads();
