// routes/fotoAsistencia.js
const express = require('express');
const router = express.Router();
const fotoAsistenciaController = require('../controllers/fotoAsistenciaController');
const { verificarToken, requiereRol } = require('../middleware/auth');

router.get('/', verificarToken, fotoAsistenciaController.listar);
// Solo Administrador: trae TODO lo que hay en Supabase Storage, tenga o no registro guardado.
router.get('/storage/todas', verificarToken, requiereRol(1), fotoAsistenciaController.listarTodasDeStorage);
router.get('/asistencia/:asistencia_id', verificarToken, fotoAsistenciaController.listarPorAsistencia);
router.get('/:id_foto', verificarToken, fotoAsistenciaController.obtenerPorId);
router.post('/', verificarToken, fotoAsistenciaController.insertar);
router.delete('/:id_foto', verificarToken, fotoAsistenciaController.eliminar);

module.exports = router;