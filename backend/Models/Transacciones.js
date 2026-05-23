const mongoose = require ('mongoose');

const TransaccionSchema = new mongoose.Schema({

    usuarioID:{
        type: mongoose.Schema.Types.ObjectId,
            ref: 'Usuarios',
        required: true
    },
    tipo:{
        type: String,
        required: true,
        enum: ['Recarga', 'Cobro_Renta', 'Multa']
    },
    monto: {
        type: Number,
        required: true,
        min: 0
    },
    fecha: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model('Transacciones', TransaccionSchema);