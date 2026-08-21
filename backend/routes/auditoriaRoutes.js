// ============================================================
// routes/auditoriaRoutes.js
// ============================================================
const express = require('express');
const router  = express.Router();

const {
  verificarToken,
  requiereRol
} = require('../middleware/auth');

const {
  listar,
  listarRecientes,
  listarPorTabla,
  resumenUsuariosActivos
} = require('../controllers/auditoriaController');

// Todas las rutas de auditoría protegidas
router.use(verificarToken);

// Solo Administrador puede ver auditoría
router.use(requiereRol(1));

router.get('/', listar);
router.get('/recientes', listarRecientes);
router.get('/tabla/:tabla', listarPorTabla);
router.get('/usuarios-activos', resumenUsuariosActivos);

module.exports = router;