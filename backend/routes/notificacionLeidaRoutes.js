// ============================================================
// routes/notificacionLeidaRoutes.js
// ============================================================
const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middleware/auth');
const { listar, marcar, marcarVarias } = require('../controllers/notificacionLeidaController');

router.use(verificarToken);

router.get('/', listar);
router.post('/', marcar);
router.post('/varias', marcarVarias);

module.exports = router;