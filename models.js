const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// El mismo esquema de antes para MongoDB
const leadSchema = new mongoose.Schema({
  nombre_negocio: { type: String, required: true },
  nombre_contacto: { type: String, default: '' },
  razon_social: { type: String, default: '' },
  email: { type: String, default: '' },
  telefono: { type: String, default: '' },
  giro: { type: String, default: '' },
  clase_actividad: { type: String, default: '' },
  direccion: {
    calle: { type: String, default: '' },
    num_exterior: { type: String, default: '' },
    num_interior: { type: String, default: '' },
    colonia: { type: String, default: '' },
    cp: { type: String, default: '' },
    ubicacion: { type: String, default: '' }
  },
  tamano_empresa: { type: String, default: '' },
  sitio_web: { type: String, default: '' },
  coordenadas: {
    latitud: { type: String, default: '' },
    longitud: { type: String, default: '' }
  },
  fuente: { type: String, default: 'DENUE' },
  id_denue: { type: String, default: '' },
  clee: { type: String, default: '' },
  email_verificado: { type: Boolean, default: false },
  email_enviado: { type: Boolean, default: false },
  email_abierto: { type: Boolean, default: false },
  email_clicked: { type: Boolean, default: false },
  email_respondido: { type: Boolean, default: false },
  email_rebotado: { type: Boolean, default: false },
  dado_de_baja: { type: Boolean, default: false },
  estado: { 
    type: String, 
    enum: ['nuevo', 'email_encontrado', 'email_enviado', 'abierto', 'respondido', 'interesado', 'no_interesado', 'cliente', 'dado_de_baja'],
    default: 'nuevo'
  },
  fecha_captura: { type: Date, default: Date.now },
  fecha_email_enviado: { type: Date },
  fecha_email_abierto: { type: Date },
  fecha_respuesta: { type: Date },
  intentos_envio: { type: Number, default: 0 },
  brevo_message_id: { type: String, default: '' },
  es_premium: { type: Boolean, default: false },
  calificacion: { type: Number, default: 0 },
  facebook: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  notas: { type: String, default: '' },
  personalizacion_ia: { type: String, default: '' }
}, {
  timestamps: true
});

const MongooseLead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);

// RUTAS DE ARCHIVOS LOCALES
const DB_FILES = {
  Lead: path.join(__dirname, 'db_leads.json'),
  Log: path.join(__dirname, 'db_logs.json'),
  Campaign: path.join(__dirname, 'db_campaigns.json')
};

// ==========================================
// UNIVERSAL MODEL (LOCAL JSON || CLOUD MONGO)
// ==========================================
class SimpleDB {
  constructor(type) {
    this.type = type;
    this.filePath = DB_FILES[type];
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, '[]', 'utf8');
    }
  }

  async read() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch { return []; }
  }

  async write(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  async find(q, opt = {}) {
    if (mongoose.connection.readyState === 1) {
      if (this.type === 'Lead') return MongooseLead.find(q).sort(opt.sort || {}).limit(opt.limit || 0).skip(opt.skip || 0);
    }
    const all = await this.read();
    let res = all.filter(item => {
      for (let key in q) {
        if (key === '$or' && Array.isArray(q.$or)) {
          const orMatches = q.$or.some(orCondition => {
            for (let orKey in orCondition) {
               const orQueryVal = orCondition[orKey];
               const orItemVal = item[orKey];
               if (orQueryVal && typeof orQueryVal === 'object' && !Array.isArray(orQueryVal)) {
                 if (orQueryVal.$regex !== undefined) {
                   if (!new RegExp(orQueryVal.$regex, orQueryVal.$options || 'i').test(orItemVal || '')) return false;
                 }
                 // Agregados básicos
                 if (orQueryVal.$ne !== undefined && orItemVal === orQueryVal.$ne) return false;
               } else if (orItemVal !== orQueryVal) {
                 return false;
               }
            }
            return true;
          });
          if (!orMatches) return false;
          continue; // Pasa al siguiente key si se cumple el $or
        }

        const queryVal = q[key];
        const itemVal = item[key];

        if (queryVal && typeof queryVal === 'object' && !Array.isArray(queryVal)) {
          // Soporte básico para operadores de MongoDB
          if (queryVal.$ne !== undefined && itemVal === queryVal.$ne) return false;
          if (queryVal.$exists !== undefined) {
            const exists = itemVal !== undefined && itemVal !== null && itemVal !== '';
            if (queryVal.$exists !== exists) return false;
          }
          if (queryVal.$regex !== undefined) {
            if (!new RegExp(queryVal.$regex, queryVal.$options || 'i').test(itemVal || '')) return false;
          }
          if (queryVal.$in !== undefined && Array.isArray(queryVal.$in)) {
            if (!queryVal.$in.includes(itemVal)) return false;
          }
          if (queryVal.$gte !== undefined && new Date(itemVal) < new Date(queryVal.$gte)) return false;
          if (queryVal.$lte !== undefined && new Date(itemVal) > new Date(queryVal.$lte)) return false;
        } else if (itemVal !== queryVal) {
          return false;
        }
      }
      return true;
    });
    
    if (opt.sort) {
      const field = Object.keys(opt.sort)[0];
      const order = opt.sort[field];
      res.sort((a, b) => order === 1 ? (a[field] > b[field] ? 1 : -1) : (a[field] < b[field] ? 1 : -1));
    }
    if (opt.skip) res = res.slice(opt.skip);
    if (opt.limit) res = res.slice(0, opt.limit);
    return res;
  }

  async findOne(q) {
    const res = await this.find(q, { limit: 1 });
    return res[0] || null;
  }

  async create(data) {
    if (mongoose.connection.readyState === 1 && this.type === 'Lead') return MongooseLead.create(data);
    const all = await this.read();
    const newItem = { 
      _id: Math.random().toString(36).substr(2, 9), 
      ...data, 
      fecha_captura: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    all.push(newItem);
    await this.write(all);
    return newItem;
  }

  async findByIdAndUpdate(id, update) {
    if (mongoose.connection.readyState === 1 && this.type === 'Lead') return MongooseLead.findByIdAndUpdate(id, update, { new: true });
    const all = await this.read();
    const idx = all.findIndex(i => i._id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...update };
      await this.write(all);
      return all[idx];
    }
    return null;
  }

  async countDocuments(q = {}) {
    if (mongoose.connection.readyState === 1 && this.type === 'Lead') return MongooseLead.countDocuments(q);
    const all = await this.read();
    if (Object.keys(q).length === 0) return all.length;
    return (await this.find(q)).length;
  }

  async aggregate(pipeline) {
    const all = await this.read();
    const groupStage = pipeline.find(p => p.$group);
    if (groupStage && groupStage.$group._id) {
      let field = typeof groupStage.$group._id === 'string' ? groupStage.$group._id : '';
      if (field.startsWith('$')) field = field.substring(1);
      
      if (!field) return [];
      
      const counts = {};
      all.forEach(item => {
        const val = item[field] || 'Otro';
        counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts).map(([k, v]) => ({ _id: k, count: v }));
    }
    return [];
  }

  async updateOne(query, update) {
    if (mongoose.connection.readyState === 1 && this.type === 'Lead') {
      return MongooseLead.updateOne(query, update);
    }
    const all = await this.read();
    // Encontrar el primer elemento que coincida con el query
    const idx = all.findIndex(item => {
      for (let key in query) {
        if (key === '_id') {
          if (item._id !== query._id && String(item._id) !== String(query._id)) return false;
        } else if (item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });
    if (idx !== -1) {
      if (update.$set) Object.assign(all[idx], update.$set);
      if (update.$inc) {
        for (let field in update.$inc) {
          all[idx][field] = (all[idx][field] || 0) + update.$inc[field];
        }
      }
      await this.write(all);
      return { modifiedCount: 1 };
    }
    return { modifiedCount: 0 };
  }

  async save(data) {
    return this.create(data);
  }
}

const Lead = new SimpleDB('Lead');
const ProspectionLog = new SimpleDB('Log');
const Campaign = new SimpleDB('Campaign');

module.exports = { Lead, ProspectionLog, Campaign };
