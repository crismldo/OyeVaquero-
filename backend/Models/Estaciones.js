const mongoose = require('mongoose');

const EstacionSchema = new mongoose.Schema({

    nombre: {
        type: String,
        required: true,
        unique: true
    },
    capacidadMaxima: {
        type: Number,
        required: true,
        min: 1 
    },
    coordenadas: {
    lat: { 
      type: Number, 
      required: true 
    },
    lng: { 
      type: Number, 
      required: true 
    }
    },
    estado: {
        type: String,
        enum: ['Activo', 'Inactivo', 'En Reparación'],
        default: 'Activo'
    }
});

module.exports = mongoose.model('Estaciones', EstacionSchema);