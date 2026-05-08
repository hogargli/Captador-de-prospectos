/**
 * AGENTE DE SCORING PREDICTIVO - GLI Inmobiliaria
 * Evalúa el potencial de cierre y valor de renta de cada prospecto.
 */

const GIROS_ALTO_VALOR = [
  'HOSPITAL', 'CLINICA', 'CONSULTORIO', 'ESPECIALIDADES MEDICAS',
  'LABORATORIO', 'CORPORATIVO', 'OFICINAS', 'BANCO', 'FINANCIERA',
  'RESTAURANTE DE SERVICIO COMPLETO', 'BAR', 'FRANQUICIA', 'HOTEL'
];

const GIROS_MEDIO_VALOR = [
  'GIMNASIO', 'COLEGIO', 'ESCUELA', 'BOUTIQUE', 'AUTOPARTES',
  'FARMACIA', 'TIENDA DE CONVENIENCIA', 'MINISUPER'
];

/**
 * Calcula la calificación de un lead (0-100)
 */
function calculateScore(lead) {
  let score = 0;

  // 1. Evaluación por GIRO (Máximo 40 pts)
  const giro = (lead.giro || lead.clase_actividad || '').toUpperCase();
  
  if (GIROS_ALTO_VALOR.some(g => giro.includes(g))) {
    score += 40;
  } else if (GIROS_MEDIO_VALOR.some(g => giro.includes(g))) {
    score += 25;
  } else {
    score += 10;
  }

  // 2. Evaluación por TAMAÑO (Máximo 30 pts)
  const tamano = (lead.tamano_empresa || '').toLowerCase();
  if (tamano.includes('251') || tamano.includes('101') || tamano.includes('51')) {
    score += 30;
  } else if (tamano.includes('11 a 30') || tamano.includes('31 a 50')) {
    score += 20;
  } else if (tamano.includes('6 a 10')) {
    score += 10;
  } else {
    score += 5;
  }

  // 3. Evaluación Digital (Máximo 15 pts)
  if (lead.sitio_web && lead.sitio_web.length > 5) score += 10;
  if (lead.facebook || lead.linkedin) score += 5;

  // 4. Bonus por Lead Premium (Máximo 15 pts)
  if (lead.es_premium) score += 15;

  // Asegurar que no pase de 100
  return Math.min(score, 100);
}

/**
 * Determina el nivel de prioridad
 */
function getPriorityLevel(score) {
  if (score >= 80) return 'CRÍTICA (Pez Gordo) 🏆';
  if (score >= 60) return 'ALTA 🔥';
  if (score >= 40) return 'MEDIA ⚡';
  return 'BAJA 🧊';
}

module.exports = { calculateScore, getPriorityLevel };
