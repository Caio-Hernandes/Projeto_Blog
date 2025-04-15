// Carregando módulos
const express = require('express');
const { engine } = require('express-handlebars'); // desestruturação moderna
const admin = require("./routes/admin")
const path = require("path")
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const session = require ("express-session")
const flash = require ("connect-flash")
const app = express();
require("./models/Postagem")
const Postagem = mongoose.model("postagens")
require("./models/Categoria")
const Categoria = mongoose.model("categorias")
const usuarios = require("./routes/usuario")
const passport = require("passport")
require("./config/auth")(passport)
require("./models/Comentario");
const Comentario = mongoose.model("comentarios");
const eAutenticado = require("./helpers/eAutenticado");





// Configurações

dotenv.config();


app.use(session({
     secret: "node",
     resave: true,
     saveUninitialized: true
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())



// Middleware

app.use((req, res, next) => {
     if (req.user) {
       res.locals.user = {
         _id: req.user._id.toString(),
         nome: req.user.nome,
         email: req.user.email,
         eAdmin: req.user.eAdmin === 1
       };
     } else {
       res.locals.user = null;
     }
   
     res.locals.success_msg = req.flash("success_msg");
     res.locals.error_msg = req.flash("error_msg");
     res.locals.error = req.flash("error");
   
     next();
   });
   

// Body parser (integrado no Express agora)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware

app.use((req, res, next)=>{
     next();
})


// Handlebars
app.engine('handlebars', engine({
     defaultLayout: 'main',
     partialsDir: path.join(__dirname, 'views/partials'),
     helpers: {
      formatDate: (date)=>{
        const newDate = new Date(date);
        return newDate.toLocaleDateString('pt-BR')
      },
       eq: (a, b) => a == b,
       or: (a, b) => a || b
     }
   }));
   
app.set('view engine', 'handlebars');
// Mongoose
mongoose.Promise = global.Promise;
     mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
     .then(()=>{
        console.log("mongodb conectado")
     }).catch((err)=> {
    console.log("erro ao se conectar: "+err)
     })
// Public
app.use(express.static(path.join(__dirname, "public")))

// Rotas
app.get('/',(req,res)=>{
     Postagem.find().lean().populate("categoria").sort({data: "desc"}).then((postagens)=>{
          res.render("index",{postagens: postagens})
}).catch((err)=>{
     req.flash("error_msg", "Houve um erro interno")
     res.redirect("/404")
})
     })

     app.get("/postagem/:slug", (req, res) => {
     Postagem.findOne({ slug: req.params.slug }).lean()
    .then((postagem) => {
      if (postagem) {
        Comentario.find({ postagem: postagem._id }).lean().sort({ data: 'desc' })
          .then((comentarios) => {
            res.render("postagem/index", {
              postagem: postagem,
              comentarios: comentarios,
            });
          })
          .catch((err) => {
            req.flash("error_msg", "Erro ao carregar comentários");
            res.redirect("/");
          });
      } else {
        req.flash("error_msg", "Postagem não encontrada");
        res.redirect("/");
      }
    })
    .catch((err) => {
      req.flash("error_msg", "Houve um erro interno");
      res.redirect("/");
    });
});

     app.get("/404",(req,res)=>{
          res.send('Erro 404!')
     })

// Rota para listar todas as categorias
app.get('/categorias', (req, res) => {
     Categoria.find().lean()
         .then((categorias) => {
             res.render("categorias/index", { categorias: categorias });
         })
         .catch((err) => {
             req.flash("error_msg", "Houve um erro interno");
             res.redirect("/");
         });
 });
 
 // Rota para exibir postagens de uma categoria específica
 app.get("/categorias/:slug", (req, res) => {
     Categoria.findOne({ slug: req.params.slug }).lean()
         .then((categoria) => {
             if (categoria) {
                 Postagem.find({ categoria: categoria._id }).lean()
                     .then((postagens) => {
                         res.render("categorias/postagens", {
                             postagens: postagens,
                             categoria: categoria
                         });
                     })
                     .catch((err) => {
                         req.flash("error_msg", "Houve um erro ao listar os posts");
                         res.redirect("/");
                     });
             } else {
                 req.flash("error_msg", "Essa categoria não existe");
                 res.redirect("/");
             }
         })
         .catch((err) => {
             req.flash("error_msg", "Houve um erro interno");
             res.redirect("/");
         });
 });
 
app.use('/admin', admin)
app.use("/usuarios", usuarios)

app.post("/comentario/:id", eAutenticado, (req, res) => {
  const novoComentario = {
    postagem: req.params.id,  // O ID da postagem
    nome: req.user.nome,
    texto: req.body.texto
  };

  // Salva o novo comentário no banco de dados
  new Comentario(novoComentario)
    .save()
    .then(() => {
      // Após salvar o comentário, procura pela postagem usando o ID
      Postagem.findById(req.params.id).lean().then((postagem) => {
        if (postagem) {
          // Se a postagem for encontrada, redireciona para o slug
          req.flash("success_msg", "Comentário enviado com sucesso!");
          res.redirect(`/postagem/${postagem.slug}`);  // Redirecionando para a postagem pelo slug
        } else {
          // Caso a postagem não seja encontrada
          req.flash("error_msg", "Postagem não encontrada");
          res.redirect("/");  // Redireciona para a página inicial
        }
      }).catch((err) => {
        req.flash("error_msg", "Erro ao buscar a postagem.");
        res.redirect("/");  // Caso aconteça algum erro ao buscar a postagem
      });
    })
    .catch((err) => {
      req.flash("error_msg", "Erro ao enviar o comentário.");
      res.redirect("/");  // Caso haja erro ao salvar o comentário
    });
});

   
   app.get("/comentario/editar/:id", eAutenticado, (req, res) => {
    Comentario.findById(req.params.id).lean().then((comentario) => {
      if (!comentario) {
        req.flash("error_msg", "Comentário não encontrado");
        return res.redirect("/");
      }
  
      res.render("comentarios/editar", { comentario });
    }).catch((err) => {
      req.flash("error_msg", "Erro ao carregar o comentário");
      res.redirect("/");
    });
  });
  
   

   

// Outros
const PORT = 8081;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

