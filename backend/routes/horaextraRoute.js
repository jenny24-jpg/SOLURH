const express = require('express');
const router = express.Router();
const horaExtraController = require('../controllers/horaExtraController');
const { verificarToken } = require('../middleware/auth');

router.get('/', verificarToken, horaExtraController.listar);
router.get('/empleado/:empleado_id', verificarToken, horaExtraController.listarPorEmpleado);
router.get('/:id_hora_extra', verificarToken, horaExtraController.obtenerPorId);
router.post('/', verificarToken, horaExtraController.insertar);
router.put('/:id_hora_extra', verificarToken, horaExtraController.actualizar);
router.put('/:id_hora_extra/aprobacion', verificarToken, horaExtraController.cambiarAprobacion);
router.delete('/:id_hora_extra', verificarToken, horaExtraController.eliminar);

module.exports = router;