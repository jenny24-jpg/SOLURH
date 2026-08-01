// routes/documentoEmpleado.js
const express = require('express');
const router = express.Router();
const documentoEmpleadoController = require('../controllers/documentoempleadoController');
const { verificarToken } = require('../middleware/auth');

router.get('/', verificarToken, documentoEmpleadoController.listar);
router.get('/empleado/:empleado_id', verificarToken, documentoEmpleadoController.listarPorEmpleado);
router.get('/:id_documento', verificarToken, documentoEmpleadoController.obtenerPorId);
router.post('/', verificarToken, documentoEmpleadoController.insertar);
router.put('/:id_documento', verificarToken, documentoEmpleadoController.actualizar);
router.delete('/:id_documento', verificarToken, documentoEmpleadoController.eliminar);

module.exports = router;