// ============================================================
// controllers/uploadController.js
// ============================================================
const supabase = require('../config/supabaseClient');

const BUCKET = 'documentos';

const subirArchivo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, mensaje: 'No se recibió ningún archivo.' });
    }

    const file = req.file;
    const extension = file.originalname.split('.').pop();
    const nombreArchivo = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;

    // Subcarpeta opcional dentro del bucket (ej. "asistencias"), enviada
    // desde el formulario como campo de texto "carpeta". Se sanea para
    // evitar rutas fuera del bucket (path traversal).
    const carpetaRaw = (req.body?.carpeta || '').toString();
    const carpeta = carpetaRaw.replace(/[^a-zA-Z0-9_-]/g, '');
    const rutaArchivo = carpeta ? `${carpeta}/${nombreArchivo}` : nombreArchivo;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(rutaArchivo, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      return res.status(500).json({ ok: false, mensaje: `Error al subir el archivo: ${error.message}` });
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(rutaArchivo);

    res.status(200).json({ ok: true, url: urlData.publicUrl });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

module.exports = { subirArchivo };