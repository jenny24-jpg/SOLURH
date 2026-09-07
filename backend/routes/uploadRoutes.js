// ============================================================
// routes/uploadRoutes.js
// ============================================================
const express = require('express');
const router = express.Router();
const multer = require('multer');

const { subirArchivo } = require('../controllers/uploadController');
const { verificarToken } = require('../middleware/auth');

// Guarda el archivo temporalmente en memoria (no en disco) antes de subirlo a Supabase
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // límite de 10 MB por archivo
});

router.post('/', verificarToken, upload.single('archivo'), subirArchivo);

module.exports = router;