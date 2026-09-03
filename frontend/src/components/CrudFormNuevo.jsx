import { useEffect, useMemo, useState } from 'react';
import DatePickerField from './DatePickerField';
import s from './CrudFormNuevo.module.css';
import { Joyride } from 'react-joyride';

import { API, apiFetch } from '../context/AuthContext';

export default function CrudFormNuevo({ config, editItem, editId, onClose, onSaved }) {
  const { fields, endpoint, title = 'Módulo' } = config;
  const isEdit = editId !== null && editId !== undefined;

  const initForm = () => {
    const f = {};

    fields.forEach(field => {
      if (field.type === 'remote-multiselect') {
        const raw =
          editItem?.[field.name] ?? editItem?.[field.name?.toUpperCase()] ?? null;

        f[field.name] =
          raw !== null && raw !== undefined && raw !== '' ? [raw] : [];
        return;
      }

      // Campos "divididos" (ej. Horas diurnas / Horas nocturnas): en edición,
      // solo se rellena el que coincide con el tipo real guardado en el registro.
      if (field.splitGroup) {
        const { targetField, typeField, typeValue } = field.splitGroup;
        const matches = editItem?.[typeField] === typeValue;
        f[field.name] = matches ? (editItem?.[targetField] ?? '') : '';
        return;
      }

      // Campos de rango de fecha (fecha_inicio/fecha_fin): en edición ambos
      // se prellenan con la fecha real del registro (rangeTarget), ya que
      // ese registro representa un único día.
      const sourceKey = field.rangeTarget || field.name;

      let val =
        editItem?.[sourceKey] ??
        editItem?.[sourceKey?.toUpperCase()] ??
        '';

      if (field.type === 'date' && val) {
        const d = new Date(val);
        if (!isNaN(d)) {
          val = d.toISOString().slice(0, 10);
        }
      }

      f[field.name] = val;
    });

    return f;
  };

  const [form, setForm] = useState(initForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [remoteOptions, setRemoteOptions] = useState({});
  const [loadingOptions, setLoadingOptions] = useState({});
  const [uploadingFile, setUploadingFile] = useState({});
  const [fileNames, setFileNames] = useState({});

  // Colisión de posición

  const [posConflict, setPosConflict] = useState(false);
  const [checkingPos, setCheckingPos] = useState(false);

  const isVariedad = title === 'Tipos de Variedad';
  const isFertilizante = title === 'Fertilizantes';
  const isTratamiento = title === 'Tratamientos';
  const isEstadoArbol = title === 'Estados de Árbol';
  const isPlaga = title === 'Plagas y Enfermedades';
  const isFinca = title === 'Fincas';
  const isSector = title === 'Sectores';
  const isArbol = title === 'Árboles';
  const isHistorialEstado = title === 'Historial de Estados';
  const isRegistroPlaga = title === 'Registros de Plaga';
  const isRegistroTratamiento = title === 'Registros de Tratamiento';
  const isResiembra = title === 'Resiembras';
  const isMovimientoInventario = title === 'Movimiento de Inventario';

  const runFormTour =
    (
      isVariedad ||
      isFertilizante ||
      isTratamiento ||
      isEstadoArbol ||
      isPlaga ||
      isFinca ||
      isSector ||
      isArbol ||
      isHistorialEstado ||
      isRegistroPlaga ||
      isRegistroTratamiento ||
      isResiembra ||
      isMovimientoInventario
    ) && !!config;
const formTourSteps =
isMovimientoInventario
  ? [
      { target: '.tour-campo-finca-movimiento', content: 'Selecciona la finca.' },
      { target: '.tour-campo-sector-movimiento', content: 'Selecciona el sector.' },
      { target: '.tour-campo-arbol-movimiento', content: 'Selecciona el árbol.' },
      { target: '.tour-campo-tipo-movimiento', content: 'Selecciona el tipo de movimiento.' },
      { target: '.tour-campo-fecha-movimiento', content: 'Selecciona la fecha del movimiento.' },
      { target: '.tour-campo-observaciones', content: 'Agrega observaciones si es necesario.' },
      { target: '.tour-guardar', content: 'Cuando termines, presiona aquí para guardar.' },
    ]
      : isResiembra
  ? [
      { target: '.tour-campo-finca-resiembra', content: 'Selecciona la finca.' },
      { target: '.tour-campo-sector-resiembra', content: 'Selecciona el sector.' },
      { target: '.tour-campo-arbol-resiembra', content: 'Selecciona el árbol.' },
      { target: '.tour-campo-fecha-resiembra', content: 'Selecciona la fecha de resiembra.' },
      { target: '.tour-campo-motivo', content: 'Escribe el motivo de la resiembra.' },
      { target: '.tour-guardar', content: 'Cuando termines, presiona aquí para guardar.' },
    ]
:
isRegistroTratamiento
  ? [
      { target: '.tour-campo-finca-regtrat', content: 'Selecciona la finca.' },
      { target: '.tour-campo-sector-regtrat', content: 'Selecciona el sector.' },
      { target: '.tour-campo-arbol-regtrat', content: 'Selecciona el árbol.' },
      { target: '.tour-campo-tratamiento-regtrat', content: 'Selecciona el tratamiento.' },
      { target: '.tour-campo-fertilizante-regtrat', content: 'Selecciona el fertilizante si aplica.' },
      { target: '.tour-campo-fecha-aplicacion', content: 'Selecciona la fecha de aplicación.' },
      { target: '.tour-campo-observaciones', content: 'Agrega observaciones.' },
      { target: '.tour-guardar', content: 'Cuando termines, presiona aquí para guardar.' },
    ]
:
isRegistroPlaga
  ? [
      { target: '.tour-campo-finca-regplaga', content: 'Selecciona la finca.' },
      { target: '.tour-campo-sector-regplaga', content: 'Selecciona el sector.' },
      { target: '.tour-campo-arbol-regplaga', content: 'Selecciona el árbol.' },
      { target: '.tour-campo-plaga-regplaga', content: 'Selecciona la plaga o enfermedad.' },
      { target: '.tour-campo-deteccion', content: 'Selecciona la fecha de detección.' },
      { target: '.tour-campo-resolucion', content: 'Selecciona la fecha de resolución.' },
      { target: '.tour-campo-observaciones', content: 'Agrega observaciones.' },
      { target: '.tour-guardar', content: 'Cuando termines, presiona aquí para guardar.' },
    ]
: isArbol
    ? [
        {
          target: '.tour-campo-finca-arbol',
          content: 'Selecciona la finca.',
        },
        {
          target: '.tour-campo-sector-arbol',
          content: 'Selecciona el sector.',
        },
        {
          target: '.tour-campo-variedad-arbol',
          content: 'Selecciona la variedad del árbol.',
        },
        {
          target: '.tour-campo-estado-arbol',
          content: 'Selecciona el estado actual.',
        },
        {
          target: '.tour-campo-surco-arbol',
          content: 'Ingresa el número de surco.',
        },
        {
          target: '.tour-campo-posicion-arbol',
          content: 'Ingresa la posición dentro del surco.',
        },
        {
          target: '.tour-campo-descripcion',
          content: 'Agrega una descripción si deseas.',
        },
        {
          target: '.tour-guardar',
          content: 'Cuando termines, presiona aquí para guardar.',
        },
      ]
  : 
isSector
  ? [
      {
        target: '.tour-campo-finca-sector',
        content: 'Selecciona la finca correspondiente.',
      },
      {
        target: '.tour-campo-sector',
        content: 'Selecciona el sector. Ejemplo: Sector Norte.',
      },
      {
        target: '.tour-campo-area',
        content: 'Ingresa el área en hectáreas. Ejemplo: 10.',
      },
      {
        target: '.tour-campo-surcos',
        content: 'Ingresa la cantidad de surcos.',
      },
      {
        target: '.tour-campo-pos-surco',
        content: 'Ingresa las posiciones por surco.',
      },
      {
        target: '.tour-campo-tipo-cultivo',
        content: 'Escribe el tipo de cultivo. Ejemplo: Mango.',
      },
      {
        target: '.tour-guardar',
        content: 'Cuando termines, presiona aquí para guardar.',
      },
    ]
: isFinca
  ? [
      {
        target: '.tour-campo-nombre-finca',
        content: 'Escribe el nombre de la finca. Ejemplo: Finca El Paraíso.',
      },
      {
        target: '.tour-campo-ubicacion',
        content: 'Escribe la ubicación. Ejemplo: Baja Verapaz.',
      },
      {
        target: '.tour-campo-area',
        content: 'Indica el área en hectáreas. Ejemplo: 25.',
      },
      {
        target: '.tour-campo-propietario',
        content: 'Escribe el propietario. Ejemplo: Ángel Galeano.',
      },
      {
        target: '.tour-campo-telefono',
        content: 'Ingresa el teléfono de contacto. Ejemplo: 32945163.',
      },
      {
        target: '.tour-campo-descripcion',
        content: 'Agrega una descripción breve de la finca.',
      },
      {
        target: '.tour-guardar',
        content: 'Cuando termines, presiona aquí para crear la finca.',
      },
    ]
: isPlaga
  ? [
      {
        target: '.tour-campo-nombre-plaga',
        content: 'Selecciona la plaga o enfermedad. Ejemplo: Pulgones.',
      },
      {
        target: '.tour-campo-tipo-plaga',
        content: 'Selecciona el tipo. Ejemplo: PLAGA o ENFERMEDAD.',
      },
      {
        target: '.tour-campo-riesgo',
        content: 'Selecciona el nivel de riesgo. Ejemplo: ALTO, MEDIO o BAJO.',
      },
      {
        target: '.tour-campo-descripcion',
        content: 'Agrega una descripción breve.',
      },
      {
        target: '.tour-guardar',
        content: 'Cuando termines, presiona aquí para guardar el registro.',
      },
    ]
: isEstadoArbol
    ? [
        {
          target: '.tour-campo-nombre-estado',
          content: 'Escribe el estado del árbol. Ejemplo: Semilla, Crecimiento o Producción.',
        },
        {
          target: '.tour-campo-orden-ciclo',
          content: 'Indica el orden del ciclo. Ejemplo: 1 para etapas iniciales.',
        },
        {
          target: '.tour-campo-productivo',
          content: 'Selecciona si este estado es productivo. Ejemplo: Sí o No.',
        },
        {
          target: '.tour-campo-descripcion',
          content: 'Agrega una descripción breve del estado.',
        },
        {
          target: '.tour-guardar',
          content: 'Cuando termines, presiona aquí para crear el registro.',
        },
      ]
    : isTratamiento
    ? [
        {
          target: '.tour-campo-nombre-tratamiento',
          content: 'Selecciona el tratamiento. Ejemplo: Poda de Formación.',
        },
        {
          target: '.tour-campo-categoria',
          content: 'Escribe la categoría. Ejemplo: Fitosanitario.',
        },
        {
          target: '.tour-campo-metodo',
          content: 'Escribe el método de aplicación. Ejemplo: Aspersión foliar.',
        },
        {
          target: '.tour-campo-frecuencia',
          content: 'Indica la frecuencia. Ejemplo: Anual o Según necesidad.',
        },
        {
          target: '.tour-campo-descripcion',
          content: 'Agrega una descripción breve del tratamiento.',
        },
        {
          target: '.tour-guardar',
          content: 'Cuando termines, presiona aquí para crear el registro.',
        },
      ]
    : isFertilizante
    ? [
        {
          target: '.tour-campo-nombre-fertilizante',
          content: 'Selecciona el fertilizante. Ejemplo: Urea.',
        },
        {
          target: '.tour-campo-tipo-fertilizante',
          content: 'Escribe el tipo. Ejemplo: Químico.',
        },
        {
          target: '.tour-campo-nutrientes',
          content: 'Indica los nutrientes principales.',
        },
        {
          target: '.tour-campo-metodo',
          content: 'Método de aplicación.',
        },
        {
          target: '.tour-campo-frecuencia',
          content: 'Frecuencia de aplicación.',
        },
        {
          target: '.tour-campo-descripcion',
          content: 'Descripción del fertilizante.',
        },
        {
          target: '.tour-guardar',
          content: 'Presiona aquí para guardar.',
        },
      ]
    : [
        {
          target: '.tour-campo-arbol',
          content: 'Selecciona el árbol.',
        },
        {
          target: '.tour-campo-tipo-uso',
          content: 'Escribe el tipo de uso.',
        },
        {
          target: '.tour-campo-descripcion',
          content: 'Descripción del registro.',
        },
        {
          target: '.tour-guardar',
          content: 'Presiona aquí para guardar.',
        },
      ];
  const requiredCount = useMemo(
    () =>
      fields.filter(
        field => field.required && !(isEdit && field.rangeRole === 'end')
      ).length,
    [fields, isEdit]
  );

  const fieldMap = useMemo(() => {
    const map = {};
    fields.forEach(field => {
      map[field.name] = field;
    });
    return map;
  }, [fields]);

  const getFieldValue = (obj, key) => {
    if (!key) return null;
    return obj?.[key] ?? obj?.[key?.toUpperCase()] ?? null;
  };

  const formatTemplateValue = (key, rawValue) => {
    if (rawValue === null || rawValue === undefined || rawValue === '') return null;

    if (key === 'numero_surco' || key === 'NUMERO_SURCO') {
      return `Surco ${rawValue}`;
    }

    if (key === 'posicion_y' || key === 'POSICION_Y') {
      return `Posición ${rawValue}`;
    }

    if (key === 'posicion_x' || key === 'POSICION_X') {
      return `Posición ${rawValue}`;
    }

    if (key === 'id_arbol' || key === 'ID_ARBOL') {
      return `ID ${rawValue}`;
    }

    return String(rawValue);
  };

  const dedupeOptions = options => {
    const seen = new Set();

    return options.filter(option => {
      const key = `${option.value}__${option.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const handleFileUpload = async (fieldName, file) => {
    if (!file) return;

    setUploadingFile(prev => ({ ...prev, [fieldName]: true }));
    setFileNames(prev => ({ ...prev, [fieldName]: file.name }));

    try {
      const formData = new FormData();
      formData.append('archivo', file);

      const res = await apiFetch(`${API}/upload`, {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (json.ok && json.url) {
        set(fieldName, json.url);
      } else {
        setError(json.mensaje ?? 'Error al subir el archivo');
      }
    } catch {
      setError('Error de conexión al subir el archivo');
    } finally {
      setUploadingFile(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const toggleMultiSelect = (fieldName, optionValue) => {
    setForm(prev => {
      const current = Array.isArray(prev[fieldName]) ? prev[fieldName] : [];
      const key = String(optionValue);
      const exists = current.some(v => String(v) === key);

      const next = exists
        ? current.filter(v => String(v) !== key)
        : [...current, optionValue];

      return { ...prev, [fieldName]: next };
    });

    setFieldErrors(prev => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  const set = (k, v) => {
    const field = fieldMap[k];

  if (field?.type === 'number') {
  if (v === '') {
    setForm(prev => ({
      ...prev,
      [k]: v
    }));
    return;
  }

  if (!/^\d*\.?\d*$/.test(v)) return;

  const numberValue = Number(v);

  if (Number.isNaN(numberValue)) return;

  if (field.min !== undefined && numberValue < field.min) return;

  if (field.max !== undefined && numberValue > field.max) return;
}

    if (field?.onlyLetters && v && !/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]*$/.test(v)) {
      return;
    }

    if (
  field?.onlyText &&
  v &&
  !/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s.,;:]*$/.test(v)
) {
  return;
}

    if (field?.onlyNumbers && v && !/^\d*$/.test(v)) {
      return;
    }

    setForm(prev => {
      const next = { ...prev, [k]: v };

      fields.forEach(field => {
        if (field.dependsOn?.field === k) {
          next[field.name] = '';
        }
      });

      return next;
    });

    setFieldErrors(prev => ({
      ...prev,
      [k]: ''
    }));

    fields.forEach(field => {
      if (field.dependsOn?.field === k) {
        setRemoteOptions(prev => ({
          ...prev,
          [field.name]: [],
        }));

        setFieldErrors(prev => ({
          ...prev,
          [field.name]: ''
        }));
      }
    });
  };

  useEffect(() => {
    const cancelledRef = { cancelled: false };

    const buildRemoteUrlLocal = (field) => {
      const url = new URL(`${API}${field.optionSource}`);

      if (field.dependsOn?.field) {
        const parentValue = form[field.dependsOn.field];

        if (parentValue !== undefined && parentValue !== null && parentValue !== '') {
          const queryParam =
            field.dependsOn.queryParam ||
            field.dependsOn.optionField ||
            field.dependsOn.field;

          url.searchParams.set(queryParam, parentValue);
        }
      }

      return url.toString();
    };

    const normalizeOptionLocal = (field, item, index) => {
      const value =
        getFieldValue(item, field.optionValue) ??
        item?.id ??
        item?.ID ??
        getFieldValue(item, field.name) ??
        index + 1;

      let label = null;

      if (Array.isArray(field.labelTemplate) && field.labelTemplate.length > 0) {
        const parts = field.labelTemplate
          .map(key => formatTemplateValue(key, getFieldValue(item, key)))
          .filter(Boolean);

        if (parts.length > 0) {
          label = parts.join(' · ');
        }
      }

      if (!label) {
        const candidateLabel =
          getFieldValue(item, field.optionLabel) ??
          item?.nombre ??
          item?.NOMBRE ??
          item?.descripcion ??
          item?.DESCRIPCION ??
          item?.nombre_finca ??
          item?.NOMBRE_FINCA ??
          item?.nombre_sector ??
          item?.NOMBRE_SECTOR ??
          item?.nombre_estado ??
          item?.NOMBRE_ESTADO ??
          item?.nombre_plaga ??
          item?.NOMBRE_PLAGA ??
          item?.nombre_tratamiento ??
          item?.NOMBRE_TRATAMIENTO ??
          item?.nombre_fertilizante ??
          item?.NOMBRE_FERTILIZANTE ??
          item?.nombre_arbol ??
          item?.NOMBRE_ARBOL;

        label =
          candidateLabel && String(candidateLabel).trim()
            ? String(candidateLabel)
            : `Registro #${value}`;
      }

      return {
        value: String(value),
        label,
        raw: item,
      };
    };

    const loadFieldOptions = async (field) => {
      const requiresParent = Boolean(field.dependsOn?.field);
      const parentValue = requiresParent ? form[field.dependsOn.field] : null;

      if (requiresParent && !parentValue) {
        if (!cancelledRef.cancelled) {
          setRemoteOptions(prev => ({
            ...prev,
            [field.name]: [],
          }));

          setLoadingOptions(prev => ({
            ...prev,
            [field.name]: false,
          }));
        }

        return;
      }

      if (!cancelledRef.cancelled) {
        setLoadingOptions(prev => ({
          ...prev,
          [field.name]: true,
        }));
      }

      try {
        const res = await apiFetch(buildRemoteUrlLocal(field));
        const json = await res.json();

        const rows = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.rows)
            ? json.rows
            : [];

        let options = rows.map((item, index) =>
          normalizeOptionLocal(field, item, index)
        );

        if (field.distinct) {
          const distinctMap = new Map();

          options.forEach(option => {
            const norm = String(option.value ?? '').trim();
            if (!norm) return;

            const dedupeKey =
              field.distinctBy === 'label'
                ? option.label
                : option.value;

            if (!distinctMap.has(dedupeKey)) {
              distinctMap.set(dedupeKey, option);
            }
          });

          options = Array.from(distinctMap.values());
        }

        options = dedupeOptions(options);

        if (!cancelledRef.cancelled) {
          setRemoteOptions(prev => ({
            ...prev,
            [field.name]: options,
          }));
        }
      } catch {
        if (!cancelledRef.cancelled) {
          setRemoteOptions(prev => ({
            ...prev,
            [field.name]: [],
          }));
        }
      } finally {
        if (!cancelledRef.cancelled) {
          setLoadingOptions(prev => ({
            ...prev,
            [field.name]: false,
          }));
        }
      }
    };

    const remoteFields = fields.filter(
      field =>
        (field.type === 'remote-select' || field.type === 'remote-multiselect') &&
        field.optionSource
    );

    remoteFields.forEach(field => {
      loadFieldOptions(field);
    });

    return () => {
      cancelledRef.cancelled = true;
    };
  }, [fields, form]);

  const getDependentOptions = field => {
    return remoteOptions[field.name] ?? [];
  };

  const isArbolesEndpoint = endpoint === '/arbol';

  const sector = form['id_sector'];
  const surco = form['numero_surco'];
  const posicionY = form['posicion_y'];

  useEffect(() => {
    if (!isArbolesEndpoint) return;

    const py = posicionY;

    if (
      !sector ||
      surco === '' ||
      py === '' ||
      surco === null ||
      py === null
    ) {
      setPosConflict(false);
      return;
    }

    let cancelled = false;

    const check = async () => {
      setCheckingPos(true);

      try {
        const res = await apiFetch(`${API}/arbol`);
        const json = await res.json();

        const rows = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.rows)
            ? json.rows
            : [];

        const conflict = rows.some(r => {
          const sameSector =
            String(r.ID_SECTOR ?? r.id_sector) === String(sector);

          const sameSurco =
            Number(r.NUMERO_SURCO ?? r.numero_surco) === Number(surco);

          const samePosY =
            Number(r.POSICION_Y ?? r.posicion_y) === Number(py);

          const sameId =
            String(r.ID_ARBOL ?? r.id_arbol) === String(editId);

          if (isEdit) {
            return sameSector && sameSurco && samePosY && !sameId;
          }

          return sameSector && sameSurco && samePosY;
        });

        if (!cancelled) {
          setPosConflict(conflict);
        }
      } catch {
        if (!cancelled) {
          setPosConflict(false);
        }
      } finally {
        if (!cancelled) {
          setCheckingPos(false);
        }
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [
    sector,
    surco,
    posicionY,
    isArbolesEndpoint,
    isEdit,
    editId,
  ]);

  const getRemotePlaceholder = field => {
    if (loadingOptions[field.name]) return 'Cargando opciones...';

    if (field.dependsOn?.field && !form[field.dependsOn.field]) {
      const parentLabel = fieldMap[field.dependsOn.field]?.label ?? 'campo anterior';
      return `Selecciona primero ${parentLabel.toLowerCase()}...`;
    }

    return 'Selecciona...';
  };

  const normalizeValueForSubmit = field => {
    const v = form[field.name];

    if (v === '' || v === null || v === undefined) return null;

    if (field.type === 'number') return Number(v);

    if (field.type === 'remote-select') {
      return field.valueType === 'string' ? String(v) : Number(v);
    }

    if (field.type === 'date') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return v;

      const parts = String(v).split('/');
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      }

      return v;
    }

    return String(v).trim() || null;
  };

  const validateForm = () => {
  const errors = {};
  const today = new Date().toISOString().slice(0, 10);

  for (const field of fields) {
    if (field.omitOnSubmit) continue;

    const value = form[field.name];

    if (field.type === 'remote-multiselect') {
      if (field.required && (!Array.isArray(value) || value.length === 0)) {
        errors[field.name] = `Selecciona al menos un elemento en "${field.label}"`;
      }
      continue;
    }

    const isEmpty =
      value === '' ||
      value === null ||
      value === undefined;

    if (field.required && isEmpty) {
      errors[field.name] = `El campo "${field.label}" es obligatorio`;
      continue;
    }

    if (isEmpty) continue;

    const textValue = String(value).trim();

    if (field.onlyLetters && !/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(textValue)) {
      errors[field.name] = `El campo "${field.label}" solo permite letras`;
      continue;
    }

    if (
      field.onlyText &&
      !/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s.,;:]+$/.test(textValue)
    ) {
      errors[field.name] = `El campo "${field.label}" solo permite texto`;
      continue;
    }

    if (field.onlyNumbers && !/^\d+$/.test(textValue)) {
      errors[field.name] = `El campo "${field.label}" solo permite números`;
      continue;
    }

    if (field.minLength && textValue.length < field.minLength) {
      errors[field.name] = `El campo "${field.label}" debe tener al menos ${field.minLength} caracteres`;
      continue;
    }

    if (field.maxLength && textValue.length > field.maxLength) {
      errors[field.name] = `El campo "${field.label}" no debe superar ${field.maxLength} caracteres`;
      continue;
    }

    if (field.type === 'number') {
      const numberValue = Number(value);

      if (Number.isNaN(numberValue)) {
        errors[field.name] = `El campo "${field.label}" debe ser numérico`;
        continue;
      }

      if (field.min !== undefined && numberValue < field.min) {
        errors[field.name] = `El campo "${field.label}" debe ser mayor o igual a ${field.min}`;
        continue;
      }

      if (field.max !== undefined && numberValue > field.max) {
        errors[field.name] = `El campo "${field.label}" debe ser menor o igual a ${field.max}`;
        continue;
      }
    }

    if (field.type === 'date') {
      if (field.noFutureDate && textValue > today) {
        errors[field.name] = `El campo "${field.label}" no puede ser una fecha futura`;
        continue;
      }

      if (field.minDateField) {
        const minDate = form[field.minDateField];

        if (minDate) {
  const currentDate = new Date(textValue);
  const baseDate = new Date(minDate);

  if (currentDate < baseDate) {
    const minFieldLabel =
      fieldMap[field.minDateField]?.label ?? 'fecha inicial';

    errors[field.name] =
      `"${field.label}" no puede ser menor que "${minFieldLabel}"`;

    continue;
  }
}
      }
    }
  }

  return errors;
};

  const handleSubmit = async e => {
    e.preventDefault();

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError('Revisa los campos marcados antes de guardar.');
      return;
    }

    if (isArbolesEndpoint && posConflict) {
      setError('Ya existe un árbol en ese sector, surco y posición. Elige una posición diferente.');
      return;
    }

    setFieldErrors({});
    setError('');
    setSaving(true);

    // ── Modo masivo: varios empleados × rango de fechas ──────────
    // Se activa cuando el módulo tiene un campo remote-multiselect
    // y un par de campos de rango de fecha (rangeRole: start/end),
    // y no estamos editando un registro existente.
    const multiField = fields.find(f => f.type === 'remote-multiselect');
    const rangeStartField = fields.find(f => f.rangeRole === 'start');
    const rangeEndField = fields.find(f => f.rangeRole === 'end');
    const isBulkMode = !isEdit && multiField && rangeStartField && rangeEndField;

    if (isBulkMode) {
      const employeeIds = Array.isArray(form[multiField.name])
        ? form[multiField.name]
        : [];

      const dateList = [];
      const cursor = new Date(`${form[rangeStartField.name]}T00:00:00`);
      const last = new Date(`${form[rangeEndField.name]}T00:00:00`);

      while (cursor <= last) {
        dateList.push(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
      }

      const otherFields = fields.filter(
        f =>
          f.name !== multiField.name &&
          f.name !== rangeStartField.name &&
          f.name !== rangeEndField.name
      );

      const baseBody = {};
      otherFields.forEach(field => {
        if (field.omitOnSubmit) return;
        baseBody[field.name] = normalizeValueForSubmit(field);
      });

      let successCount = 0;
      let failCount = 0;
      let lastErrorMsg = '';

      for (const empId of employeeIds) {
        for (const dateStr of dateList) {
          const body = {
            ...baseBody,
            [multiField.name]:
              multiField.valueType === 'string' ? String(empId) : Number(empId),
            [rangeStartField.rangeTarget]: dateStr,
          };

          try {
            const res = await apiFetch(`${API}${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });

            const json = await res.json();

            if (json.ok === true || json.success === true) {
              successCount += 1;
            } else {
              failCount += 1;
              lastErrorMsg = json.mensaje ?? json.message ?? 'Error al guardar';
            }
          } catch {
            failCount += 1;
            lastErrorMsg = 'Error de conexión';
          }
        }
      }

      setSaving(false);

      if (failCount === 0) {
        onSaved();
      } else if (successCount > 0) {
        setError(
          `Se crearon ${successCount} registro(s) correctamente, pero ${failCount} fallaron. ${lastErrorMsg}`
        );
        onSaved();
      } else {
        setError(`No se pudo crear ningún registro. ${lastErrorMsg}`);
      }

      return;
    }

    // ── Modo "split": un mismo registro se divide en varios envíos
    // (ej. Horas diurnas + Horas nocturnas para el mismo empleado/fecha) ──
    const splitFields = !isEdit ? fields.filter(f => f.splitGroup) : [];
    const isSplitMode = splitFields.length > 0;

    if (isSplitMode) {
      const otherFields = fields.filter(f => !f.splitGroup);
      const baseBody = {};
      otherFields.forEach(field => {
        if (field.omitOnSubmit) return;
        baseBody[field.name] = normalizeValueForSubmit(field);
      });

      const submissions = splitFields
        .map(field => {
          const raw = form[field.name];
          const num = raw === '' || raw === null || raw === undefined ? 0 : Number(raw);
          if (!num || num <= 0) return null;
          return {
            ...baseBody,
            [field.splitGroup.targetField]: num,
            [field.splitGroup.typeField]: field.splitGroup.typeValue,
          };
        })
        .filter(Boolean);

      if (submissions.length === 0) {
        setSaving(false);
        setError('Ingresa al menos una cantidad de horas (diurnas o nocturnas).');
        return;
      }

      let successCount = 0;
      let failCount = 0;
      let lastErrorMsg = '';

      for (const body of submissions) {
        try {
          const res = await apiFetch(`${API}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          const json = await res.json();

          if (json.ok === true || json.success === true) {
            successCount += 1;
          } else {
            failCount += 1;
            lastErrorMsg = json.mensaje ?? json.message ?? 'Error al guardar';
          }
        } catch {
          failCount += 1;
          lastErrorMsg = 'Error de conexión';
        }
      }

      setSaving(false);

      if (failCount === 0) {
        onSaved();
      } else if (successCount > 0) {
        setError(
          `Se crearon ${successCount} registro(s) correctamente, pero ${failCount} fallaron. ${lastErrorMsg}`
        );
        onSaved();
      } else {
        setError(`No se pudo crear ningún registro. ${lastErrorMsg}`);
      }

      return;
    }

    // ── Modo normal: un solo registro ─────────────────────────────
    const body = {};
    fields.forEach(field => {
      if (field.omitOnSubmit) return;

      if (field.type === 'remote-multiselect') {
        const arr = Array.isArray(form[field.name]) ? form[field.name] : [];
        const first = arr[0];
        body[field.name] =
          first === undefined
            ? null
            : field.valueType === 'string'
              ? String(first)
              : Number(first);
        return;
      }

      if (field.rangeTarget) {
        body[field.rangeTarget] = normalizeValueForSubmit(field);
        return;
      }

      if (field.splitGroup) {
        const raw = form[field.name];
        const num = raw === '' || raw === null || raw === undefined ? null : Number(raw);
        if (num && num > 0) {
          body[field.splitGroup.targetField] = num;
          body[field.splitGroup.typeField] = field.splitGroup.typeValue;
        }
        return;
      }

      body[field.name] = normalizeValueForSubmit(field);
    });

    try {
      const url = isEdit ? `${API}${endpoint}/${editId}` : `${API}${endpoint}`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (json.ok === true || json.success === true) {
        if (endpoint === '/registro-plaga') {
          window.dispatchEvent(new Event('plagas-actualizadas'));
        }

        if (endpoint === '/arbol') {
          window.dispatchEvent(new Event('arbol_actualizado'));
        }

        onSaved();
      } else {
        setError(json.mensaje ?? json.message ?? 'Error al guardar');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const shouldShowPositionStatus = fieldName =>
    isArbolesEndpoint &&
    (fieldName === 'numero_surco' || fieldName === 'posicion_y');

  const hasPositionData =
    form['id_sector'] &&
    form['numero_surco'] !== '' &&
    form['numero_surco'] !== null &&
    form['posicion_y'] !== '' &&
    form['posicion_y'] !== null;

  return (
    <div
      className={s.overlay}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
  
 {runFormTour && (
  <Joyride
  steps={formTourSteps}
  run={runFormTour}
  continuous
  showSkipButton
  showProgress
  disableScrolling
  disableScrollParentFix
  floaterProps={{
  hideArrow: false,
  offset: 16,
}}
    disableOverlayClose
    spotlightClicks
    locale={{
      back: 'Atrás',
      close: 'Cerrar',
      last: 'Finalizar',
      next: 'Siguiente',
      skip: 'Saltar',
    }}
    styles={{
      options: {
        zIndex: 20000,
        primaryColor: '#14532d',
      },
    }}
  />
)}

      <div className={s.modal}>
        <div className={s.header}>
          <div className={s.headerMain}>
            <div className={s.hIcon}>
              <span className="material-icons">{isEdit ? 'edit' : 'add'}</span>
            </div>

            <div className={s.headerText}>
              <p className={s.eyebrow}>
                {isEdit ? 'EDICIÓN DE REGISTRO' : 'NUEVO REGISTRO'}
              </p>
              <h3>{isEdit ? 'Editar registro' : 'Crear registro'}</h3>
              <p className={s.headerDesc}>
                {isEdit
                  ? `Actualiza la información del módulo ${title.toLowerCase()}.`
                  : `Completa los campos para agregar un nuevo elemento en ${title.toLowerCase()}.`}
              </p>
            </div>
          </div>

          <button className={s.closeBtn} onClick={onClose} type="button">
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className={s.metaBar}>
          <div className={s.metaItem}>
            <span className="material-icons">view_list</span>
            <span>{fields.length} campo{fields.length !== 1 ? 's' : ''}</span>
          </div>

          <div className={s.metaItem}>
            <span className="material-icons">priority_high</span>
            <span>{requiredCount} obligatorio{requiredCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className={s.body}>
          <form id="crudForm" onSubmit={handleSubmit} noValidate className={s.formGrid}>
            {fields
              .filter(field => !(isEdit && field.rangeRole === 'end'))
              .map(field => (
              <div
                key={field.name}
                className={`${s.fieldWrap} ${field.type === 'textarea' ? s.fieldFull : ''} ${
 field.name === 'nombre_arbol' ? 'tour-campo-arbol' :
field.name === 'tipo_uso' ? 'tour-campo-tipo-uso' :
field.name === 'nombre_fertilizante' ? 'tour-campo-nombre-fertilizante' :
field.name === 'tipo_fertilizante' ? 'tour-campo-tipo-fertilizante' :
field.name === 'nombre_tratamiento' ? 'tour-campo-nombre-tratamiento' :
field.name === 'categoria' ? 'tour-campo-categoria' :
field.name === 'nutrientes_principales' ? 'tour-campo-nutrientes' :
field.name === 'metodo_aplicacion' ? 'tour-campo-metodo' :
field.name === 'frecuencia' ? 'tour-campo-frecuencia' :
field.name === 'descripcion' ? 'tour-campo-descripcion' :
field.name === 'nombre_estado' ? 'tour-campo-nombre-estado' :
field.name === 'orden_ciclo' ? 'tour-campo-orden-ciclo' :
field.name === 'es_productivo' ? 'tour-campo-productivo' :
field.name === 'nombre_plaga' ? 'tour-campo-nombre-plaga' :
field.name === 'tipo_plaga' ? 'tour-campo-tipo-plaga' :
field.name === 'nivel_riesgo' ? 'tour-campo-riesgo' :
field.name === 'nombre_finca' ? 'tour-campo-nombre-finca' :
field.name === 'ubicacion' ? 'tour-campo-ubicacion' :
field.name === 'propietario' ? 'tour-campo-propietario' :
field.name === 'telefono_contacto' ? 'tour-campo-telefono' :
field.name === 'id_finca' ? 'tour-campo-finca-sector' :
field.name === 'nombre_sector' ? 'tour-campo-sector' :
field.name === 'area_hectareas' ? 'tour-campo-area' :
field.name === 'numero_surcos' ? 'tour-campo-surcos' :
field.name === 'posiciones_por_surco' ? 'tour-campo-pos-surco' :
field.name === 'tipo_cultivo' ? 'tour-campo-tipo-cultivo' :
field.name === 'id_sector' ? (
  isMovimientoInventario ? 'tour-campo-sector-movimiento' :
  isResiembra ? 'tour-campo-sector-resiembra' :
  'tour-campo-sector-arbol'
) :
field.name === 'id_tipo_variedad_arbol' ? 'tour-campo-variedad-arbol' :
field.name === 'id_estado' ? 'tour-campo-estado-arbol' :
field.name === 'numero_surco' ? 'tour-campo-surco-arbol' :
field.name === 'posicion_x' ? 'tour-campo-posicion-arbol' :
field.name === 'id_arbol_nuevo' ? 'tour-campo-arbol-resiembra' :
field.name === 'id_plaga' ? 'tour-campo-plaga-regplaga' :
field.name === 'fecha_deteccion' ? 'tour-campo-deteccion' :
field.name === 'fecha_resolucion' ? 'tour-campo-resolucion' :
field.name === 'observaciones' ? 'tour-campo-observaciones' :
field.name === 'id_tipo_tratamiento' ? 'tour-campo-tratamiento-regtrat' :
field.name === 'id_fertilizante' ? 'tour-campo-fertilizante-regtrat' :
field.name === 'fecha_aplicacion' ? 'tour-campo-fecha-aplicacion' :
field.name === 'fecha_resiembra' ? 'tour-campo-fecha-resiembra' :
field.name === 'motivo' ? 'tour-campo-motivo' :
field.name === 'id_finca_filtro' ? (
  isMovimientoInventario ? 'tour-campo-finca-movimiento' :
  isResiembra ? 'tour-campo-finca-resiembra' :
  isRegistroTratamiento ? 'tour-campo-finca-regtrat' :
  isRegistroPlaga ? 'tour-campo-finca-regplaga' :
  isHistorialEstado ? 'tour-campo-finca-historial' :
  'tour-campo-finca-arbol'
) :
field.name === 'id_sector_filtro' ? (
  isMovimientoInventario ? 'tour-campo-sector-movimiento' :
  isResiembra ? 'tour-campo-sector-resiembra' :
  isRegistroTratamiento ? 'tour-campo-sector-regtrat' :
  isRegistroPlaga ? 'tour-campo-sector-regplaga' :
  'tour-campo-sector-historial'
) :
field.name === 'id_arbol' ? (
  isMovimientoInventario ? 'tour-campo-arbol-movimiento' :
  isRegistroTratamiento ? 'tour-campo-arbol-regtrat' :
  isRegistroPlaga ? 'tour-campo-arbol-regplaga' :
  'tour-campo-arbol-historial'
) :
field.name === 'id_tipo_movimiento' ? 'tour-campo-tipo-movimiento' :
field.name === 'fecha_movimiento' ? 'tour-campo-fecha-movimiento' :
''
}`}
              >
                <label className={s.label}>
                  <span>
                    {isEdit && field.rangeRole === 'start' ? 'Fecha' : field.label}
                  </span>
                  {field.required && <span className={s.req}>*</span>}
                </label>

                {field.type === 'select' ? (
                  <select
                    value={form[field.name]}
                    onChange={e => set(field.name, e.target.value)}
                    className={`${s.input} ${fieldErrors[field.name] ? s.inputError : ''}`}
                  >
                    <option value="">Selecciona...</option>
                    {field.options?.map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'remote-multiselect' ? (
                  <div
                    className={`${s.input} ${fieldErrors[field.name] ? s.inputError : ''}`}
                    style={{
                      maxHeight: 160,
                      overflowY: 'auto',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    {loadingOptions[field.name] ? (
                      <span className={s.hint}>Cargando opciones...</span>
                    ) : getDependentOptions(field).length === 0 ? (
                      <span className={s.hint}>No hay opciones disponibles</span>
                    ) : (
                      getDependentOptions(field).map(option => {
                        const selected = Array.isArray(form[field.name])
                          ? form[field.name]
                          : [];
                        const checked = selected.some(
                          v => String(v) === String(option.value)
                        );

                        return (
                          <label
                            key={`${field.name}-${option.value}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              cursor: 'pointer',
                              fontWeight: 400,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleMultiSelect(field.name, option.value)
                              }
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                ) : field.type === 'remote-select' ? (
                  <select
                    value={form[field.name] === null ? '' : String(form[field.name] ?? '')}
                    onChange={e => set(field.name, e.target.value)}
                    className={`${s.input} ${fieldErrors[field.name] ? s.inputError : ''}`}
                    disabled={
                      loadingOptions[field.name] ||
                      (field.dependsOn?.field && !form[field.dependsOn.field])
                    }
                  >
                    <option value="">{getRemotePlaceholder(field)}</option>
                    {getDependentOptions(field).map(option => (
                      <option key={`${field.name}-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={form[field.name]}
                    onChange={e => set(field.name, e.target.value)}
                    className={`${s.input} ${s.textarea} ${fieldErrors[field.name] ? s.inputError : ''}`}
                    rows={4}
                    placeholder={`Ingresa ${field.label.toLowerCase()}`}
                  />
                  ) : field.type === 'time' ? (
                  <input
                    type="time"
                    value={form[field.name] || ''}
                    onChange={e => set(field.name, e.target.value)}
                    className={`${s.input} ${fieldErrors[field.name] ? s.inputError : ''}`}
                  />
                
                ) : field.type === 'date' ? (
                  <div className={fieldErrors[field.name] ? s.dateErrorWrap : ''}>
                    <DatePickerField
                      value={form[field.name]}
                      onChange={val => set(field.name, val)}
                      placeholder="dd/mm/aaaa"
                    />
                  </div>
                ) : field.type === 'file' ? (
                  <div>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={e => handleFileUpload(field.name, e.target.files[0])}
                      className={s.input}
                    />
                    {uploadingFile[field.name] && (
                      <span className={s.hint}>Subiendo archivo...</span>
                    )}
                    {!uploadingFile[field.name] && form[field.name] && (
                      <span className={s.hint}>
                        ✅ Archivo listo: {fileNames[field.name] || 'archivo subido'}
                      </span>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode={
                      field.onlyNumbers || field.type === 'number'
                        ? 'numeric'
                        : undefined
                    }
                    value={form[field.name]}
                    onChange={e => set(field.name, e.target.value)}
                    className={`${s.input} ${
                      fieldErrors[field.name] ||
                      (shouldShowPositionStatus(field.name) && posConflict)
                        ? s.inputError
                        : ''
                    }`}
                    placeholder={`Ingresa ${field.label.toLowerCase()}`}
                    min={field.type === 'number' ? field.min ?? 1 : undefined}
                    max={field.type === 'number' ? field.max : undefined}
                    maxLength={field.maxLength}
                  />
                )}

                {fieldErrors[field.name] && (
                  <span className={s.fieldError}>
                    {fieldErrors[field.name]}
                  </span>
                )}

                {field.hint && (
                  <span className={s.hint}>{field.hint}</span>
                )}

                {shouldShowPositionStatus(field.name) && field.name === 'posicion_y' && (
                  checkingPos ? (
                    <span className={s.posChecking}>
                      <span className={s.spinnerSm} /> Verificando posición…
                    </span>
                  ) : posConflict ? (
                    <span className={s.posConflict}>
                      <span
                        className="material-icons"
                        style={{ fontSize: '14px', verticalAlign: 'middle' }}
                      >
                        warning
                      </span>
                      {' '}
                      ¡Posición ocupada! Ya existe un árbol en el surco {form['numero_surco']} y posición {form['posicion_y']}.
                    </span>
                  ) : hasPositionData ? (
                    <span className={s.posOk}>
                      <span
                        className="material-icons"
                        style={{ fontSize: '14px', verticalAlign: 'middle' }}
                      >
                        check_circle
                      </span>
                      {' '}
                      Posición disponible
                    </span>
                  ) : null
                )}
              </div>
            ))}
          </form>
        </div>

        <div className={s.footer}>
          <div className={s.footerInfo}>
            {error ? (
              <p className={s.error}>
                <span className="material-icons">error_outline</span>
                <span>{error}</span>
              </p>
            ) : (
              <p className={s.helperText}>
                Los campos marcados con <span>*</span> son obligatorios.
              </p>
            )}
          </div>

          <div className={s.ftBtns}>
            <button type="button" className={s.btnCancel} onClick={onClose}>
              <span className={s.iconCircle}>
                <span className="material-icons">close</span>
              </span>
              Cancelar
            </button>

            <button type="submit" form="crudForm" className={`${s.btnSave} tour-guardar`} disabled={saving}>
              {saving ? (
                <>
                  <span className={s.spinner} />
                  Guardando...
                </>
              ) : isEdit ? (
                <>
                  <span className={s.iconCircle}>
                    <span className="material-icons">save</span>
                  </span>
                  Guardar cambios
                </>
              ) : (
                <>
                  <span className={s.iconCircle}>
                    <span className="material-icons">add</span>
                  </span>
                  Crear registro
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}