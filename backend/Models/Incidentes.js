const mongoose = require('mongoose');

const IncidenteSchema = new mongoose.Schema({
    vehiculo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehiculos',
        required: true
    },
    reportadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuarios',
        required: true
    },
    descripcion: {
        type: String,
        required: true
    },
    fechaReporte: {
        type: Date,
        default: Date.now
    },
    estado: {
        type: String,
        enum: ['Pendiente', 'En Reparación', 'Resuelto'],
        default: 'Pendiente' 
    }
});

module.exports = mongoose.model('Incidentes', IncidenteSchema);