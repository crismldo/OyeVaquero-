const mongoose = require ('mongoose');

const RentaSchema = new mongoose.Schema({

    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuarios',
        required: true
    },
    vehiculo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehiculos',
        required: true
    },
    horaInicio: {
        type: Date,
        default: Date.now,
        required: true
    },
    horaFin: {
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