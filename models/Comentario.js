const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Comentario = new Schema({
  postagem: {
    type: Schema.Types.ObjectId,
    ref: "postagens",
    required: true
  },
  nome: {
    type: String,
    required: true
  },
  texto: {
    type: String,
    required: true
  },
  data: {
    type: Date,
    default: Date.now
   }
});

mongoose.model("comentarios", Comentario);
