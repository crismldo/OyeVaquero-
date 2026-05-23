const mongoose = require ('mongoose');

const VehiculoSchema = new mongoose.Schema({

    codigoVehiculo :{
        type: String,
        required: true
    },
    tipo :{
        type: String,
        required: true
    },
    bateria :{
        type: Number,
        required: true,
        default: 100,
        min: 0,
        max: 100
    },
    estado :{
        type: String,
        default: 'Disponible',
        enum: ['Disponible', 'En Uso', 'Requiere Reubicación', 'Mantenimiento']
    },
    precioPorMinuto :{
        type: Number,
        required: true
    },
    estacionActual:{

        type: mongoose.Schema.Types.ObjectId,
        ref: 'Estaciones',
        default: null

    }

});

module.exports = mongoose.model('Vehiculos', VehiculoSchema);