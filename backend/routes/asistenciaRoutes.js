const express = require('express');
const router = express.Router();
const asistenciaController = require('../controllers/asistenciaController');
const { verificarToken } = require('../middleware/auth'); // ajusta el nombre si tu middleware se llama distinto

router.get('/', verificarToken, asistenciaController.listar);
router.get('/empleado/:empleado_id', verificarToken, asistenciaController.listarPorEmpleado);
router.get('/:id_asistencia', verificarToken, asistenciaController.obtenerPorId);
router.post('/', verificarToken, asistenciaController.insertar);
router.put('/:id_asistencia', verificarToken, asistenciaController.actualizar);
router.put('/:id_asistencia/salida', verificarToken, asistenciaController.marcarSalida);
router.delete('/:id_asistencia', verificarToken, asistenciaController.eliminar);

module.exports = router;