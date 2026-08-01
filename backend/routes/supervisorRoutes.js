// ============================================================
// routes/supervisorRoutes.js
// ============================================================
const express = require('express');
const router  = express.Router();

const { verificarToken } = require('../middleware/auth');
const { listar, obtenerPorId, insertar, actualizar, eliminar, asignarClientes } = require('../controllers/supervisorController');

router.use(verificarToken);

router.get('/', listar);
router.get('/:id_supervisor', obtenerPorId);
router.post('/', insertar);
router.put('/:id_supervisor', actualizar);
router.delete('/:id_supervisor', eliminar);


module.exports = router;