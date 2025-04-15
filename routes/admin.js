const express = require('express');
const router = express.Router();
const mongoose = require ("mongoose")
require("../models/Categoria")
const Categoria = mongoose.model("categorias")
require('../models/Postagem')
const Postagem = mongoose.model("postagens")
const {eAdmin} = require("../helpers/eAdmin")
const eAutenticado = require("../helpers/eAutenticado");
require("../models/Comentario");
const Comentario = mongoose.model("comentarios");



router.get('/',eAdmin, (req,res) =>{
    res.render("admin/index")
})

router.get('/posts',eAdmin,(req,res)=>{
    res.send("Página de posts")
})
router.get('/categorias',eAdmin,(req,res)=>{
    Categoria.find().lean().then((categorias)=>{
    res.render("admin/categorias",{categorias: categorias})
    }).catch((err)=>{
        req.flash("error_msg", "Houve um erro ao listar as categorias")
        res.redirect("/admin")
    })
})
router.get('/categorias/add',eAdmin,(req,res)=>{
    res.render("admin/addcategorias")
})
router.post('/categorias/nova',eAdmin,(req,res)=>{

    var erros = []
    if (!req.body.nome || typeof req.body.nome !== "string" || req.body.nome.trim() === "") {
        erros.push({ texto: "Nome inválido" });
    }
    
    if (!req.body.slug || typeof req.body.slug !== "string" || req.body.slug.trim() === "") {
        erros.push({ texto: "Slug inválido" });
    }
    
    if (erros.length > 0) {
        res.render("admin/addcategorias", { erros: erros });
    } else {
        const novaCategoria = {
            nome: req.body.nome,
            slug: req.body.slug
        }
    
        new Categoria(novaCategoria).save().then(() => {
            req.flash("success_msg", "Categoria criada com sucesso");
            res.redirect("/admin/categorias")
        }).catch((err) => {
            req.flash("error_msg", "Houve um erro ao salvar a categoria");
            res.redirect("/admin");
        })
    }
    })
    router.get("/categorias/edit/:id",eAdmin, (req,res)=>{
        Categoria.findOne({_id:req.params.id}).lean().then((categoria)=>{
            res.render("admin/editcategorias",{categoria: categoria})
        }).catch((err)=>{
            req.flash("error_msg", "Essa categoria não existe")
            res.redirect("/admin/categorias")
        })
        
    })
    router.post("/categorias/edit", eAdmin, (req, res) => {
        Categoria.findOne({ _id: req.body.id }).then((categoria) => {
            if (!categoria) {
                req.flash("error_msg", "Categoria não encontrada.");
                return res.redirect("/admin/categorias");
            }
    
            // Verifica se o novo slug já está em uso por outra categoria
            Categoria.findOne({ slug: req.body.slug, _id: { $ne: req.body.id } }).then((categoriaComMesmoSlug) => {
                if (categoriaComMesmoSlug) {
                    req.flash("error_msg", "Slug já está em uso por outra categoria. Use outro.");
                    return res.redirect("/admin/categorias/edit/" + req.body.id);
                }
    
                // Se estiver tudo certo, atualiza
                categoria.nome = req.body.nome;
                categoria.slug = req.body.slug;
    
                categoria.save().then(() => {
                    req.flash("success_msg", "Categoria editada com sucesso");
                    res.redirect("/admin/categorias");
                }).catch((err) => {
                    req.flash("error_msg", "Erro ao salvar edição");
                    res.redirect("/admin/categorias");
                });
            }).catch((err) => {
                req.flash("error_msg", "Erro ao verificar slug duplicado.");
                res.redirect("/admin/categorias");
            });
        }).catch((err) => {
            req.flash("error_msg", "Erro ao editar a categoria");
            res.redirect("/admin/categorias");
        });
    });
    
    router.post("/categorias/deletar",eAdmin, (req, res) => {
        Categoria.deleteOne({ _id: req.body.id }).then(() => {
            req.flash("success_msg", "Categoria deletada com sucesso");
            res.redirect("/admin/categorias");
        }).catch((err) => {
            req.flash("error_msg", "Houve um erro ao deletar a categoria");
            res.redirect("/admin/categorias");
        });
    });

    router.get("/postagens",eAdmin, (req,res)=>{

        Postagem.find().populate("categoria")
        .sort({date:"desc"})
        .lean()
        .then((postagens)=> {
            res.render("admin/postagens",{postagens: postagens})
        })
        .catch((err)=>{
            req.flash("error_msg", "Houve um erro ao listar as postagens")
            res.redirect("/admin")

        })
    })
    router.get("/postagens/add",eAdmin, (req,res)=>{
        Categoria.find().populate().lean().then((categorias)=>{
            res.render("admin/addpostagem",{categorias: categorias}) 
        }).catch((err)=>{
            req.flash("error_msg", "Houve um erro ao carregar o formulário")
            res.redirect("/admin")
        })
        
    })
    router.post("/postagens/nova",eAdmin, (req,res)=>{
        const erros = []

        // Validação dos campos
    if (!req.body.titulo || req.body.titulo.trim() === "") {
        erros.push({ texto: "Título inválido" });
    }

    if (!req.body.slug || req.body.slug.trim() === "") {
        erros.push({ texto: "Slug inválido" });
    }

    if (!req.body.descricao || req.body.descricao.trim() === "") {
        erros.push({ texto: "Descrição inválida" });
    }

    if (!req.body.conteudo || req.body.conteudo.trim() === "") {
        erros.push({ texto: "Conteúdo inválido" });
    }

    if (!req.body.categoria || req.body.categoria === "0") {
        erros.push({ texto: "Categoria inválida, registre uma categoria" });
    }
     
        if (erros.length > 0){
            res.render("admin/addpostagem",{erros: erros})
        }
        else{
            const novaPostagem ={
                titulo: req.body.titulo,
                descricao: req.body.descricao,
                conteudo: req.body.conteudo,
                slug: req.body.slug,
                categoria: req.body.categoria
            }
    new Postagem(novaPostagem).save().then(()=>{
        req.flash("success_msg", "Postagem criada com sucesso!")
        res.redirect("/admin/postagens")
    }).catch((err)=>{
        req.flash("error_msg", "Erro ao criar postagem!")
        res.redirect("/admin/postagens")
    })
        }
    })
    
    router.get("/postagens/edit/:id", eAdmin, (req, res) => {
        const postId = new mongoose.Types.ObjectId(req.params.id); // Converte para ObjectId
    
        Postagem.findOne({ _id: postId }).lean().then((postagem) => {
            if (!postagem) {
                req.flash("error_msg", "Essa postagem não existe");
                return res.redirect("/admin/postagens");
            }
    
            Categoria.find().lean().then((categorias) => {
                res.render("admin/editpostagens", {
                    postagem: postagem,
                    categorias: categorias
                });
            }).catch((err) => {
                req.flash("error_msg", "Erro ao listar categorias");
                res.redirect("/admin/postagens");
            });
        }).catch((err) => {
            req.flash("error_msg", "Erro ao encontrar a postagem");
            res.redirect("/admin/postagens");
        });
    });
router.post("/postagens/edit/:id", eAdmin, async (req, res) => {
    try {
        const { titulo, slug, descricao, conteudo, categoria } = req.body;
        
        await Postagem.findByIdAndUpdate(
            req.params.id,
            { titulo, slug, descricao, conteudo, categoria },
            { new: true } // Retorna o documento atualizado
        );

        req.flash("success_msg", "Postagem atualizada com sucesso!");
        res.redirect("/admin/postagens");
    } catch (err) {
        console.error(err);
        req.flash("error_msg", "Erro ao atualizar postagem");
        res.redirect("/admin/postagens");
    }
});
    
    router.post("/comentarios/deletar/:id", eAutenticado, (req, res) => {
        Comentario.findByIdAndDelete(req.params.id)
            .then(() => {
                req.flash("success_msg", "Comentário deletado com sucesso!");
                res.redirect("/");
            })
            .catch((err) => {
                req.flash("error_msg", "Erro ao deletar o comentário.");
                res.redirect("back");
            });
    });
    
    // Rota para editar comentário (GET)
    router.get("/comentario/editar/:id", eAutenticado, (req, res) => {
        Comentario.findById(req.params.id).lean().then((comentario) => {
            if (comentario) {
                // Verifica se o usuário logado é o dono do comentário ou é admin
                if (comentario.nome === req.user.nome || req.user.eAdmin) {
                    res.render("comentarios/editar", { comentario: comentario });
                } else {
                    req.flash("error_msg", "Você não tem permissão para editar esse comentário.");
                    res.redirect("back");
                }
            } else {
                req.flash("error_msg", "Comentário não encontrado.");
                res.redirect("back");
            }
        }).catch((err) => {
            req.flash("error_msg", "Erro ao carregar o comentário.");
            res.redirect("back");
        });
    });
    
    // Rota para atualizar comentário (POST) - CORRIGIDA
router.post("/comentario/editar/:id", eAutenticado, async (req, res) => {
    try {
        const { texto } = req.body;
        const comentario = await Comentario.findById(req.params.id).populate('postagem');

        if (!comentario) {
            req.flash("error_msg", "Comentário não encontrado.");
            return res.redirect("back");
        }

        // Verifica permissão
        if (comentario.nome !== req.user.nome && !req.user.eAdmin) {
            req.flash("error_msg", "Você não tem permissão para editar este comentário.");
            return res.redirect("back");
        }

        comentario.texto = texto;
        await comentario.save();

        req.flash("success_msg", "Comentário atualizado com sucesso!");
        res.redirect(`/postagem/${comentario.postagem.slug}`);
        
    } catch (err) {
        console.error(err);
        req.flash("error_msg", "Erro ao editar comentário.");
        res.redirect("back");
    }
});
    
    module.exports = router;
    