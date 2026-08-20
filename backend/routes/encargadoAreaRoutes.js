// ============================================================
// routes/encargadoAreaRoutes.js
// ============================================================
const express = require('express');
const router  = express.Router();

const { verificarToken } = require('../middleware/auth');
const { listar, obtenerPorId, listarAreas, insertar, actualizar, eliminar } = require('../controllers/encargadoAreaController');

router.use(verificarToken);

router.get('/areas', listarAreas);
router.get('/', listar);
router.get('/:id_encargado_area', obtenerPorId);
router.post('/', insertar);
router.put('/:id_encargado_area', actualizar);
router.delete('/:id_encargado_area', eliminar);

module.exports = router;