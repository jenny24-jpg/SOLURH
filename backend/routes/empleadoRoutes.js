// ============================================================
// routes/empleadoRoutes.js
// ============================================================
const express = require('express');
const router  = express.Router();

const { verificarToken } = require('../middleware/auth');
const { listar, obtenerPorId, insertar, actualizar, eliminar } = require('../controllers/empleadoController');

router.use(verificarToken);

router.get('/', listar);
router.get('/:id_empleado', obtenerPorId);
router.post('/', insertar);
router.put('/:id_empleado', actualizar);
router.delete('/:id_empleado', eliminar);

module.exports = router;