module.exports = function(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  // Evita redirecionar infinitamente se já estiver tentando logar
  if (req.originalUrl === "/usuarios/login") {
    return next();
  }

  req.flash("error_msg", "Você precisa estar logado para acessar essa página.");
  res.redirect("/usuarios/login");
};
