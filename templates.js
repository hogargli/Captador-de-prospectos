/**
 * Plantillas personalizadas por sector para GLI Inmobiliaria
 */

function getSectorTemplate(nombre, negocio, giro) {
    const defaultNombre = nombre || 'estimado líder empresarial';
    const cleanGiro = (giro || '').toLowerCase();

    // 1. SECTOR SALUD
    if (cleanGiro.includes('cirujano') || cleanGiro.includes('doctor') || cleanGiro.includes('clínica') || cleanGiro.includes('hospital')) {
        return {
            subject: `[Estratégico] Blindaje Patrimonial para el Sector Médico en Culiacán`,
            intro: `Estimado ${defaultNombre},`,
            body: `Como figura clave en el sector salud, usted comprende que la estabilidad de su patrimonio es el cimiento de su éxito profesional. Ante el panorama actual, hemos seleccionado activos inmobiliarios que ofrecen no solo plusvalía, sino una seguridad jurídica y operativa total para su práctica y familia.<br><br>
            Le presentamos nuestra propuesta de consultoría para la consolidación de activos patrimoniales de alto nivel.`
        };
    }

    // 2. SECTOR LEGAL
    if (cleanGiro.includes('notar') || cleanGiro.includes('abogado') || cleanGiro.includes('ley')) {
        return {
            subject: `Certidumbre Patrimonial y Ventanas de Oportunidad en Sinaloa`,
            intro: `Estimado ${defaultNombre},`,
            body: `Desde el ámbito legal, su visión sobre la solidez de los activos es fundamental. En GLI Inmobiliaria, nos especializamos en la estructuración de portafolios inmobiliarios para despachos y notarías que buscan refugiar capital en activos tangibles de alta rentabilidad en Culiacán.<br><br>
            Nuestra propuesta se centra en la certidumbre y el crecimiento estratégico del valor de su firma.`
        };
    }

    // 3. SECTOR AGRO
    if (cleanGiro.includes('agrícola') || cleanGiro.includes('campo') || cleanGiro.includes('ganadero') || cleanGiro.includes('productor')) {
        return {
            subject: `Diversificación Estratégica: Del Campo al Activo Urbano Premium`,
            intro: `Estimado ${defaultNombre},`,
            body: `El éxito del campo sinaloense requiere de una estrategia de diversificación sólida para proteger los rendimientos del ciclo agrícola. Hemos identificado ventanas de inversión en el sector comercial y residencial de lujo que permiten blindar sus ganancias con la mejor plusvalía del noroeste.<br><br>
            Queremos presentarle un análisis de rentabilidad para capitalizar el éxito de sus operaciones en activos inmobiliarios de primer orden.`
        };
    }

    // DEFAULT
    return {
        subject: `Estrategia de Blindaje Patrimonial para ${negocio || 'su sector'}`,
        intro: `Estimado ${defaultNombre},`,
        body: `Culiacán atraviesa un ciclo de transformación donde la preservación del capital es la prioridad para los líderes empresariales. Hemos estructurado una propuesta de inversión discreta y estratégica, diseñada para perfiles que exigen solidez y una plusvalía superior al mercado.<br><br>
        Le invitamos a revisar nuestro Reporte de Inteligencia Inmobiliaria 2026 adjunto.`
    };
}

module.exports = { getSectorTemplate };
