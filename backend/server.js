const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
require('dotenv').config();

const { initDB }         = require('./config/db');
const { verificarToken } = require('./middleware/auth');
const errorHandler       = require('./middleware/errorHandler');

// ── Rutas ────────────────────────────────────────────────
const usuarioRoutes    = require('./routes/usuarioRoutes');
const clienteRoutes    = require('./routes/clienteRoutes');
const empleadoRoutes   = require('./routes/empleadoRoutes');
const supervisorRoutes = require('./routes/supervisorRoutes');
const auditoriaRoutes  = require('./routes/auditoriaRoutes');

const app = express();

// ── Seguridad HTTP ────────────────────────────────────────
app.use(helmet());

// ── Logs de peticiones ────────────────────────────────────
app.use(morgan('dev'));

// ── CORS ──────────────────────────────────────────────────
const originesPermitidos = (process.env.CORS_ORIGINS || 'http://localhost:3001,http://localhost:3000')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || originesPermitidos.includes(origin)) return callback(null, true);
    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));

// ── Health check ──────────────────────────────────────────
app.get('/', (req, res) => res.json({ ok: true, message: 'API SoluRH activa' }));

// ── Rutas de usuarios (login es publico) ──────────────────
app.use('/api/usuarios', usuarioRoutes);

// ── JWT — protege todo lo de abajo ────────────────────────
app.use(verificarToken);

// ── Rutas protegidas ─────────────────────────────────────
app.use('/api/cliente', clienteRoutes);
app.use('/api/empleado', empleadoRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/horas-extra', require('./routes/horaextraRoute'));
app.use('/api/asistencia', require('./routes/asistenciaRoutes'));
app.use('/api/documento-empleado', require('./routes/documentoempleadoRoutes'));
app.use('/api/foto-asistencia', require('./routes/fotoasistenciaRoutes'));
app.use('/api/historial-empleado', require('./routes/historialempleadoRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// ── Error handler global (siempre al final) ───────────────
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
      console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  }
}

startServer();
