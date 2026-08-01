// routes/historialEmpleado.js
const express = require('express');
const router = express.Router();
const historialEmpleadoController = require('../controllers/historialEmpleadoController');
const { verificarToken } = require('../middleware/auth');

router.get('/cambios/todos', verificarToken, historialEmpleadoController.listarCambios);
router.get('/', verificarToken, historialEmpleadoController.listar);
router.get('/empleado/:empleado_id', verificarToken, historialEmpleadoController.listarPorEmpleado);
router.get('/:id_historial', verificarToken, historialEmpleadoController.obtenerPorId);
router.post('/', verificarToken, historialEmpleadoController.insertar);

module.exports = router;