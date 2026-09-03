// ── Etiquetas legibles para columnas de BD ────────
  export const COL_LABELS = {
    id: 'ID',
    nombre: 'Nombre',
    nombres: 'Nombres',
    apellidos: 'Apellidos',
    telefono: 'Teléfono',
    correo: 'Correo',
    estado: 'Estado',
    estado_empleado: 'Estado del empleado',
    dpi: 'DPI',
    nit: 'NIT',
    cliente_id: 'Cliente',
    supervisor_id: 'Supervisor',
    area: 'Área',
    encargado_area_id: 'Encargado de área',
    encargado_area: 'Encargado de área',
    jornada: 'Jornada',
    fecha_ingreso: 'Fecha de ingreso',
    salario: 'Salario',
    observaciones: 'Observaciones',
    fotografia: 'Fotografía',
    fecha_baja: 'Fecha de baja',
    motivo_baja: 'Motivo de baja',
    empleado_id: 'Empleado',
    fecha: 'Fecha',
    hora_entrada: 'Hora entrada',
    hora_salida: 'Hora salida',
    horas: 'Horas',
    motivo: 'Motivo',
    aprobado: 'Aprobado',
    tipo_documento: 'Tipo de documento',
    archivo_url: 'Archivo',
    fecha_subida: 'Fecha de subida',
    asistencia_id: 'Asistencia',
    intento: 'Intento',
    url_foto: 'Foto',
    cliente_nombre: 'Cliente',
    supervisor_nombre: 'Supervisor',
    observacion: 'Observación',
    campo_modificado: 'Campo modificado',
    valor_anterior: 'Valor anterior',
    valor_nuevo: 'Valor nuevo',
    usuario_modifico: 'Modificado por',
    usuario: 'Usuario',
    nombre_completo: 'Nombre completo',
    rol: 'Rol',
    cliente: 'Cliente',
    fecha_ingreso: 'Fecha de ingreso',
    fecha_de_baja: 'Fecha de baja',
    supervisor: 'Supervisor',
  };

  export const colLabel = (key) =>
    COL_LABELS[key?.toLowerCase()] ?? key?.replace(/_/g, ' ') ?? key;

  export const HIDDEN_COLS = new Set([
    'id', 'aprobado', 'salario',
    'created_at', 'fecha_creacion', 'correo', 'telefono', 'fecha_baja', 'motivo_baja', 'fotografia',
    'empleado_id', 'supervisor_id', 'cliente_id', 'asistencia_id', 'usuario_modifico','id_supervisor', 'encargado_area_id',
  ]);

  export const DASHBOARD_QUICK_ACCESS = [
    'empleados',
    'asistencias',
    'horas-extras',
    'documentos-empleado',
  ];

  export const JORNADA_OPTIONS = [
    { value: 'Diurna', label: 'Diurna' },
    { value: 'Nocturna', label: 'Nocturna' },
    { value: 'Mixta', label: 'Mixta' },
    { value: 'Fin de semana', label: 'Fin de semana' },
  ];

  export const ESTADO_ACTIVO_OPTIONS = [
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'INACTIVO', label: 'Inactivo' },
  ];

  export const ESTADO_ASISTENCIA_OPTIONS = [
    { value: 'PRESENTE', label: 'Presente' },
    { value: 'TARDE', label: 'Tarde' },
    { value: 'AUSENTE', label: 'Ausente' },
  ];

  export const TIPO_HORA_EXTRA_OPTIONS = [
    { value: 'Diurna', label: 'Diurna' },
    { value: 'Nocturna', label: 'Nocturna' },
  ];

  export const APROBADO_OPTIONS = [
    { value: 'true', label: 'Sí' },
    { value: 'false', label: 'No' },
  ];

  export const TIPO_DOCUMENTO_OPTIONS = [
    { value: 'DPI', label: 'DPI' },
    { value: 'Contrato', label: 'Contrato laboral' },
    { value: 'CV', label: 'Currículum' },
    { value: 'Antecedentes', label: 'Antecedentes penales/policiacos' },
    { value: 'Título', label: 'Título / Diploma' },
    { value: 'Otro', label: 'Otro' },
  ];

  export const MODULES = {
    supervisores: {
      title: 'Supervisores',
      endpoint: '/supervisor',
      icon: 'supervisor_account',
      fields: [
        { name: 'nombre', label: 'Nombre', type: 'text', required: true, onlyLetters: true, minLength: 3 },
        { name: 'telefono', label: 'Teléfono', type: 'text', onlyNumbers: true, minLength: 8, maxLength: 8 },
        {
          name: 'cliente_id',
          label: 'Cliente',
          type: 'remote-select',
          required: true,
          optionSource: '/cliente',
          optionValue: 'id',
          optionLabel: 'nombre',
        },
      ],
    },

  clientes: {
      title: 'Clientes',
      endpoint: '/cliente',
      icon: 'business',
      fields: [
        { name: 'nombre', label: 'Nombre', type: 'text', required: true, onlyText: true, minLength: 3 },
        {
          name: 'supervisor_id',
          label: 'Supervisor',
          type: 'remote-select',
          optionSource: '/supervisor',
          optionValue: 'id',
          optionLabel: 'nombre',
        },
      ],
    },

  'encargados-area': {
      title: 'Encargados de Área',
      endpoint: '/encargado-area',
      icon: 'engineering',
      fields: [
        { name: 'nombre', label: 'Nombre del encargado', type: 'text', required: true, onlyLetters: true, minLength: 3 },
        { name: 'area', label: 'Área', type: 'text', required: true, minLength: 2, maxLength: 100 },
        {
          name: 'cliente_id',
          label: 'Cliente',
          type: 'remote-select',
          required: true,
          optionSource: '/cliente',
          optionValue: 'id',
          optionLabel: 'nombre',
        },
      ],
    },



    empleados: {
      title: 'Empleados',
      endpoint: '/empleado',
      icon: 'badge',
      fields: [
        { name: 'nombres', label: 'Nombres', type: 'text', required: true, onlyLetters: true, minLength: 2 },
        { name: 'apellidos', label: 'Apellidos', type: 'text', required: true, onlyLetters: true, minLength: 2 },
        { name: 'dpi', label: 'DPI', type: 'text', required: true, onlyNumbers: true, minLength: 13, maxLength: 13 },
        { name: 'nit', label: 'NIT', type: 'text', maxLength: 20 },
        {
          name: 'cliente_id',
          label: 'Cliente',
          type: 'remote-select',
          required: true,
          optionSource: '/cliente',
          optionValue: 'id',
          optionLabel: 'nombre',
        },
        {
          name: 'supervisor_id',
          label: 'Supervisor',
          type: 'remote-select',
          required: true,
          optionSource: '/supervisor',
          optionValue: 'id',
          optionLabel: 'nombre',
        },
        { name: 'jornada', label: 'Jornada', type: 'select', required: true, options: JORNADA_OPTIONS },
        { name: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date', required: true, noFutureDate: true },
        {
  name: 'banco',
  label: 'Banco',
  type: 'select',
  options: [
    { value: 'BI', label: 'Banco Industrial (BI)' },
  ],
},
{ name: 'cuenta', label: 'No. de cuenta', type: 'text', onlyNumbers: true, maxLength: 20 },
{
  name: 'tipo_cuenta',
  label: 'Tipo de cuenta',
  type: 'select',
  options: [
    { value: 'Ahorro', label: 'Ahorro' },
    { value: 'Monetaria', label: 'Monetaria' },
  ],
},
{ name: 'nombre_cuenta', label: 'A nombre de quién está la cuenta', type: 'text', onlyText: true, maxLength: 100 },
        { name: 'estado', label: 'Estado', type: 'select', options: ESTADO_ACTIVO_OPTIONS },
        { name: 'observaciones', label: 'Observaciones', type: 'textarea', maxLength: 500 },
      ],
    },

    asistencias: {
    title: 'Asistencias',
    endpoint: '/asistencia',
    icon: 'event_available',
    fields: [
      {
        name: 'empleado_id',
        label: 'Empleados',
        type: 'remote-multiselect',
        required: true,
        optionSource: '/empleado',
        optionValue: 'id',
        optionLabel: 'nombres',
      },
      { name: 'fecha_inicio', label: 'Fecha inicio', type: 'date', required: true, noFutureDate: true, rangeTarget: 'fecha', rangeRole: 'start' },
      { name: 'fecha_fin', label: 'Fecha fin', type: 'date', required: true, noFutureDate: true, minDateField: 'fecha_inicio', rangeTarget: 'fecha', rangeRole: 'end' },
      {
        name: 'cliente_id',
        label: 'Cliente',
        type: 'remote-select',
        required: true,
        optionSource: '/cliente',
        optionValue: 'id',
        optionLabel: 'nombre',
        omitOnSubmit: true,
      },
      {
        name: 'encargado_area_id',
        label: 'Encargado de área',
        type: 'remote-select',
        optionSource: '/encargado-area',
        optionValue: 'id',
        labelTemplate: ['nombre', 'area'],
        dependsOn: {
          field: 'cliente_id',
          queryParam: 'cliente_id',
        },
      },
      { name: 'hora_entrada', label: 'Hora entrada', type: 'time' },
      { name: 'hora_salida', label: 'Hora salida', type: 'time' },
      { name: 'estado', label: 'Estado', type: 'select', options: ESTADO_ASISTENCIA_OPTIONS },
     { name: 'horas_extra', label: 'Horas extra (si aplica)', type: 'number', min: 0 },
      { name: 'tipo_hora_extra', label: 'Tipo de hora extra', type: 'select', options: TIPO_HORA_EXTRA_OPTIONS },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', maxLength: 500 },
    ],
  },

    'horas-extras': {
      title: 'Horas Extras',
      endpoint: '/horas-extra',
      icon: 'more_time',
      fields: [
        {
          name: 'empleado_id',
          label: 'Empleado',
          type: 'remote-select',
          required: true,
          optionSource: '/empleado',
          optionValue: 'id',
          optionLabel: 'nombres',
        },
        { name: 'fecha', label: 'Fecha', type: 'date', required: true, noFutureDate: true },
        {
          name: 'horas_diurnas',
          label: 'Horas diurnas (si aplica)',
          type: 'number',
          min: 0,
          splitGroup: { targetField: 'horas', typeField: 'tipo_hora_extra', typeValue: 'Diurna' },
        },
        {
          name: 'horas_nocturnas',
          label: 'Horas nocturnas (si aplica)',
          type: 'number',
          min: 0,
          splitGroup: { targetField: 'horas', typeField: 'tipo_hora_extra', typeValue: 'Nocturna' },
        },
        { name: 'motivo', label: 'Motivo', type: 'textarea', required: true, minLength: 5, maxLength: 300 },
        { name: 'aprobado', label: 'Aprobado', type: 'select', options: APROBADO_OPTIONS },
      ],
    },

    'documentos-empleado': {
      title: 'Documentos de Empleado',
      endpoint: '/documento-empleado',
      icon: 'folder',
      fields: [
        {
          name: 'empleado_id',
          label: 'Empleado',
          type: 'remote-select',
          required: true,
          optionSource: '/empleado',
          optionValue: 'id',
          optionLabel: 'nombres',
        },
        { name: 'tipo_documento', label: 'Tipo de documento', type: 'select', required: true, options: TIPO_DOCUMENTO_OPTIONS },
        { name: 'archivo_url', label: 'Archivo', type: 'file', required: true },
        { name: 'observaciones', label: 'Observaciones', type: 'textarea', maxLength: 300 },
      ],
    },

    'fotos-asistencia': {
      title: 'Fotos de Asistencia',
      endpoint: '/foto-asistencia',
      icon: 'photo_camera',
      fields: [
        {
          name: 'cliente_id',
          label: 'Cliente',
          type: 'remote-select',
          required: true,
          optionSource: '/cliente',
          optionValue: 'id',
          optionLabel: 'nombre',
          omitOnSubmit: true,
        },
        {
          name: 'supervisor_id',
          label: 'Supervisor',
          type: 'remote-select',
          required: true,
          optionSource: '/supervisor',
          optionValue: 'id',
          optionLabel: 'nombre',
          dependsOn: {
            field: 'cliente_id',
            queryParam: 'cliente_id',
          },
        },
        { name: 'fecha', label: 'Fecha', type: 'date', required: true, noFutureDate: true },
        { name: 'url_foto', label: 'Foto', type: 'file', required: true },
        { name: 'observacion', label: 'Observación', type: 'textarea', maxLength: 300 },
      ],
    },

    'historial-empleado': {
      title: 'Bajas de Empleado',
      endpoint: '/historial-empleado',
      icon: 'history',
      fields: [
        {
          name: 'empleado_id',
          label: 'Empleado',
          type: 'remote-select',
          required: true,
          optionSource: '/empleado',
          optionValue: 'id',
          optionLabel: 'nombres',
        },
        { name: 'fecha_baja', label: 'Fecha de baja', type: 'date', required: true, noFutureDate: true },
        { name: 'motivo_baja', label: 'Motivo', type: 'textarea', required: true, minLength: 5, maxLength: 300 },
      ],
    },
  };

  export const NAV_SECTIONS = [
    {
      title: 'Catálogos',
      entries: [
        { key: 'supervisores', label: 'Supervisores', icon: 'supervisor_account', adminOnly: true },
        { key: 'clientes', label: 'Clientes', icon: 'business', adminOnly: true },
        { key: 'encargados-area', label: 'Encargados de área', icon: 'engineering' },
      ],
    },
    {
      title: 'Operativo',
      entries: [
        { key: 'empleados', label: 'Empleados', icon: 'badge' },
        { key: 'asistencias', label: 'Asistencias', icon: 'event_available' },
        { key: 'horas-extras', label: 'Horas extras', icon: 'more_time' },
        { key: 'documentos-empleado', label: 'Documentos', icon: 'folder' },
      ],
    },
    {
      title: 'Registros',
      entries: [
        { key: 'historial-empleado', label: 'Bajas de empleado', icon: 'history', adminOnly: true },
        { key: 'fotos-asistencia', label: 'Fotos de asistencia', icon: 'photo_camera' },
      ],
    },
  ];

  export const MODULE_PK = {
    supervisores: 'id',
    clientes: 'id',
    'encargados-area': 'id',
    empleados: 'id',
    asistencias: 'id',
    'horas-extras': 'id',
    'documentos-empleado': 'id',
    'fotos-asistencia': 'id',
    'historial-empleado': 'id',
  };