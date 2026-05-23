const mongoose = require ('mongoose');

const RentaSchema = new mongoose.Schema({

    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    vehiculo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehiculos',
        required: true
    },
    estacionOrigen: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Estacion' 
    },
    fechaInicio: {
        type: Date,
        default: Date.now,
        required: true
    },
    fechaFin: {
        type: Date,
        default: null
    },
    costoTiempo: {
        type: Number,
        default: 0 
    },
    multa: {
        type: Boolean,
        default: false 
    },
    costoTotal: {
        type: Number,
        default: 0
    },
    estado: {
        type: String,
        enum: ['Activo', 'Finalizado'],
        default: 'Activo'
    }

});

module.exports = mongoose.model('RentaVehiculo', RentaSchema);