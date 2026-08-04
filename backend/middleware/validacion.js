// ============================================================
// middleware/validacion.js
// Validaciones de entrada con express-validator
// Uso: importar las reglas que necesitas en cada ruta
// ============================================================
const { body, param, validationResult } = require('express-validator');

// ── Helper: ejecutar validaciones y responder si hay errores ─
const validar = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    const mensajes = errores.array().map(e => e.msg);
    return res.status(400).json({
      ok: false,
      mensaje: mensajes[0],   // primer error (el mas relevante)
      errores: mensajes,      // todos los errores para debug
    });
  }
  next();
};

// ── LOGIN ─────────────────────────────────────────────────────
const reglasLogin = [
  body('usuario')
    .trim()
    .notEmpty().withMessage('El usuario es requerido')
    .isLength({ max: 80 }).withMessage('El usuario no puede superar 80 caracteres'),
  body('password')
    .notEmpty().withMessage('La contrasena es requerida')
    .isLength({ min: 4 }).withMessage('La contrasena es demasiado corta'),
];

// ── USUARIO — crear / actualizar ──────────────────────────────
// ── USUARIO — crear / actualizar ──────────────────────────────
const reglasUsuario = [
  body('usuario')
    .trim()
    .notEmpty().withMessage('El usuario es requerido')
    .isLength({ min: 3, max: 80 }).withMessage('El usuario debe tener entre 3 y 80 caracteres')
    .matches(/^[a-zA-Z0-9]+$/).withMessage('El usuario solo puede contener letras y números'),
  body('nombre_completo')
    .trim()
    .notEmpty().withMessage('El nombre completo es requerido')
    .isLength({ min: 3, max: 150 }).withMessage('El nombre completo debe tener entre 3 y 150 caracteres'),
  body('rol')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['admin', 'supervisor', 'empleado']).withMessage('El rol debe ser admin, supervisor o empleado'),
  body('estado')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['activo', 'inactivo']).withMessage('El estado debe ser activo o inactivo'),
  body('supervisor_id')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 }).withMessage('El supervisor debe ser un número válido'),
];


// ── CAMBIAR CONTRASENA ────────────────────────────────────────
const reglasPassword = [
  body('password_actual')
    .notEmpty().withMessage('La contrasena actual es requerida'),
  body('password_nueva')
    .notEmpty().withMessage('La contrasena nueva es requerida')
    .isLength({ min: 8 }).withMessage('La contrasena debe tener al menos 8 caracteres')
    .matches(/[A-Z]/).withMessage('La contrasena debe tener al menos una mayuscula')
    .matches(/[a-z]/).withMessage('La contrasena debe tener al menos una minuscula')
    .matches(/[0-9]/).withMessage('La contrasena debe tener al menos un numero'),
];

// ── ARBOL ─────────────────────────────────────────────────────
const reglasArbol = [
  body('id_sector')
    .notEmpty().withMessage('El sector es requerido')
    .isInt({ min: 1 }).withMessage('El sector debe ser un numero valido'),
  body('id_tipo_variedad_arbol')
    .notEmpty().withMessage('El tipo de variedad es requerido')
    .isInt({ min: 1 }).withMessage('El tipo de variedad debe ser un numero valido'),
  body('id_estado')
    .notEmpty().withMessage('El estado es requerido')
    .isInt({ min: 1 }).withMessage('El estado debe ser un numero valido'),
  body('descripcion')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 500 }).withMessage('La descripcion no puede superar 500 caracteres'),
];

// ── FINCA ─────────────────────────────────────────────────────
const reglasFinca = [
  body('nombre_finca')
    .trim()
    .notEmpty().withMessage('El nombre de la finca es requerido')
    .isLength({ max: 100 }).withMessage('El nombre no puede superar 100 caracteres'),
  body('area_hectareas')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('El area debe ser un numero positivo'),
  body('telefono_contacto')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^[\d\s\+\-\(\)]+$/).withMessage('El telefono no tiene un formato valido'),
];

// ── SECTOR ────────────────────────────────────────────────────
const reglasSector = [
  body('id_finca')
    .notEmpty().withMessage('La finca es requerida')
    .isInt({ min: 1 }).withMessage('La finca debe ser un numero valido'),
  body('nombre_sector')
    .trim()
    .notEmpty().withMessage('El nombre del sector es requerido')
    .isLength({ max: 100 }).withMessage('El nombre no puede superar 100 caracteres'),
  body('numero_surcos')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0 }).withMessage('El numero de surcos debe ser un entero positivo'),
  body('posiciones_por_surco')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0 }).withMessage('Las posiciones por surco deben ser un entero positivo'),
];

// ── ID en parametro de ruta ───────────────────────────────────
const reglasIdParam = [
  param('id_usuario')
    .optional()
    .isInt({ min: 1 }).withMessage('El ID debe ser un numero valido'),
];

module.exports = {
  validar,
  reglasLogin,
  reglasUsuario,
  reglasPassword,
  reglasArbol,
  reglasFinca,
  reglasSector,
  reglasIdParam,
};
