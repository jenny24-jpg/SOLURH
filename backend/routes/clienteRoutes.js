// ============================================================
// routes/clienteRoutes.js
// ============================================================
const express = require('express');
const router  = express.Router();

const { verificarToken } = require('../middleware/auth');
const { listar, obtenerPorId, insertar, actualizar, eliminar } = require('../controllers/clienteController');

router.use(verificarToken);

router.get('/', listar);
router.get('/:id_cliente', obtenerPorId);
router.post('/', insertar);
router.put('/:id_cliente', actualizar);
router.delete('/:id_cliente', eliminar);

module.exports = router;