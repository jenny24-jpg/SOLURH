import React, { useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:3000/api";

function GenericCrudModule({ title, endpoint, fields }) {
  const initialForm = useMemo(() => {
    return fields.reduce((acc, field) => {
      if (field.type === "multiselect") {
        acc[field.name] = field.defaultValue ?? [];
      } else {
        acc[field.name] = field.defaultValue ?? "";
      }
      return acc;
    }, {});
  }, [fields]);

  const [form, setForm] = useState(initialForm);
  const [data, setData] = useState([]);
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [remoteOptions, setRemoteOptions] = useState({});

  const fullEndpoint = `${API_BASE}${endpoint}`;

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullEndpoint]);

  useEffect(() => {
    fetchRemoteOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  const normalizeKey = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const findInsensitiveKey = (obj, targetKey) => {
    if (!obj) return null;
    const target = normalizeKey(targetKey);
    return (
      Object.keys(obj).find((key) => normalizeKey(key) === target) || null
    );
  };

  const getFieldValueFromItem = (item, fieldName) => {
    const exactKey = findInsensitiveKey(item, fieldName);
    if (exactKey) return item[exactKey];

    const upperKey = findInsensitiveKey(item, fieldName.toUpperCase());
    if (upperKey) return item[upperKey];

    return "";
  };

  const showMessage = (text) => {
    setMessage(text);
    setError("");
  };

  const showError = (text) => {
    setError(text);
    setMessage("");
  };

  const clearAlerts = () => {
    setMessage("");
    setError("");
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      clearAlerts();

      const res = await fetch(fullEndpoint);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || json.mensaje || "Error al obtener datos");
      }

      setData(json.data || json || []);
    } catch (err) {
      showError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRemoteOptions = async () => {
    try {
      const fieldsWithEndpoint = fields.filter((field) => field.optionsEndpoint);
      if (fieldsWithEndpoint.length === 0) return;

      setLoadingOptions(true);

      const responses = await Promise.all(
        fieldsWithEndpoint.map(async (field) => {
          const res = await fetch(`${API_BASE}${field.optionsEndpoint}`);
          const json = await res.json();

          if (!res.ok) {
            throw new Error(
              json.message ||
                json.mensaje ||
                `Error al cargar opciones de ${field.label}`
            );
          }

          return {
            fieldName: field.name,
            options: json.data || json || []
          };
        })
      );

      const mapped = {};
      responses.forEach((item) => {
        mapped[item.fieldName] = item.options;
      });

      setRemoteOptions(mapped);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: ""
    }));
  };

  // ── Maneja los checkboxes del campo tipo "multiselect" ──
  const handleMultiSelectChange = (fieldName, optionValue, checked) => {
    setForm((prev) => {
      const current = Array.isArray(prev[fieldName]) ? prev[fieldName] : [];
      const updated = checked
        ? [...current, optionValue]
        : current.filter((v) => v !== optionValue);

      return { ...prev, [fieldName]: updated };
    });

    setErrors((prev) => ({
      ...prev,
      [fieldName]: ""
    }));
  };

  const clearForm = () => {
    setForm(initialForm);
    setEditId(null);
    setErrors({});
    clearAlerts();
  };

  const validateForm = () => {
    const newErrors = {};

    fields.forEach((field) => {
      const value = form[field.name];

      if (field.required) {
        const empty =
          field.type === "multiselect"
            ? !Array.isArray(value) || value.length === 0
            : value === "" || value === null || value === undefined;

        if (empty) {
          newErrors[field.name] = `${field.label} es obligatorio`;
          return;
        }
      }

      if (
        field.type === "number" &&
        value !== "" &&
        value !== null &&
        value !== undefined &&
        Number.isNaN(Number(value))
      ) {
        newErrors[field.name] = `${field.label} debe ser numérico`;
      }

      if (field.validate && typeof field.validate === "function") {
        const customError = field.validate(value, form);
        if (customError) {
          newErrors[field.name] = customError;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Campos normales que sí se guardan directo en la tabla del propio módulo
  const normalizePayload = () => {
    const payload = {};

    fields.forEach((field) => {
      if (field.type === "multiselect") return; // este se maneja en un request aparte

      let value = form[field.name];

      if (field.type === "number") {
        value =
          value === "" || value === null || value === undefined
            ? null
            : Number(value);
      }

      payload[field.name] = value;
    });

    return payload;
  };

  const getIdKey = (item) => {
    if (!item) return null;

    return (
      Object.keys(item).find((key) => normalizeKey(key) === "id") ||
      Object.keys(item).find((key) => normalizeKey(key).startsWith("id_")) ||
      Object.keys(item).find((key) => normalizeKey(key).includes("id")) ||
      null
    );
  };

  // ── Envía por separado los campos "multiselect" a su endpoint de relación ──
  const submitRelations = async (recordId) => {
    const multiFields = fields.filter((field) => field.type === "multiselect");

    for (const field of multiFields) {
      if (!field.relationEndpoint) continue;

      const url = `${API_BASE}${field.relationEndpoint.replace("{id}", recordId)}`;
      const selectedIds = Array.isArray(form[field.name]) ? form[field.name] : [];

      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientes_ids: selectedIds })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || json.mensaje || `Error al asignar ${field.label}`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showError("Corrige los campos marcados.");
      return;
    }

    try {
      clearAlerts();

      const payload = normalizePayload();

      const res = await fetch(editId ? `${fullEndpoint}/${editId}` : fullEndpoint, {
        method: editId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || json.mensaje || "Error al guardar");
      }

      // El id del registro: si es edición ya lo teníamos (editId),
      // si es uno nuevo, viene en json.data.id (gracias al cambio en el backend)
      const recordId = editId || json.data?.id;

      if (recordId) {
        await submitRelations(recordId);
      }

      showMessage(
        editId
          ? "Registro actualizado correctamente."
          : "Registro creado correctamente."
      );

      clearForm();
      fetchData();
    } catch (err) {
      showError(err.message);
    }
  };

  // ── Al editar, si hay campos multiselect, trae los valores ya asignados ──
  const loadRelationValues = async (item, idKey) => {
    const multiFields = fields.filter((field) => field.type === "multiselect");
    if (multiFields.length === 0) return {};

    const recordId = item[idKey];
    const result = {};

    for (const field of multiFields) {
      if (!field.optionsEndpoint) continue;

      try {
        const res = await fetch(`${API_BASE}${field.optionsEndpoint}`);
        const json = await res.json();
        const allOptions = json.data || json || [];

        // Filtra las opciones (ej. clientes) que ya tienen asignado este id
        const assigned = allOptions
          .filter((opt) => String(opt.id_supervisor) === String(recordId))
          .map((opt) => getOptionValue(opt, field));

        result[field.name] = assigned;
      } catch {
        result[field.name] = [];
      }
    }

    return result;
  };

  const handleEdit = async (item) => {
    const updatedForm = {};

    fields.forEach((field) => {
      if (field.type === "multiselect") return; // se llena aparte, abajo
      updatedForm[field.name] = getFieldValueFromItem(item, field.name) ?? "";
    });

    const idKey = getIdKey(item);
    const relationValues = await loadRelationValues(item, idKey);

    setEditId(idKey ? item[idKey] : null);
    setForm({ ...updatedForm, ...relationValues });
    setErrors({});
    clearAlerts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (item) => {
    const idKey = getIdKey(item);
    if (!idKey) return;

    const confirmDelete = window.confirm("¿Deseas eliminar este registro?");
    if (!confirmDelete) return;

    try {
      clearAlerts();

      const res = await fetch(`${fullEndpoint}/${item[idKey]}`, {
        method: "DELETE"
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || json.mensaje || "Error al eliminar");
      }

      showMessage("Registro eliminado correctamente.");
      fetchData();
    } catch (err) {
      showError(err.message);
    }
  };

  const getOptionsForField = (field) => {
    if (field.options && Array.isArray(field.options)) {
      return field.options;
    }

    if (field.optionsEndpoint) {
      return remoteOptions[field.name] || [];
    }

    return [];
  };

  const getOptionValue = (option, field) => {
    if (typeof option !== "object") return option;

    if (field.optionValue && option[field.optionValue] !== undefined) {
      return option[field.optionValue];
    }

    const foundKey =
      Object.keys(option).find((key) => normalizeKey(key) === "id") ||
      Object.keys(option).find((key) => normalizeKey(key).startsWith("id_")) ||
      Object.keys(option)[0];

    return option[foundKey];
  };

  const getOptionLabel = (option, field) => {
    if (typeof option !== "object") return option;

    if (field.optionLabel && option[field.optionLabel] !== undefined) {
      return option[field.optionLabel];
    }

    const preferredKeys = [
      "nombre",
      "nombre_sector",
      "nombre_arbol",
      "descripcion",
      "tipo_uso"
    ];

    for (const preferred of preferredKeys) {
      const found = Object.keys(option).find(
        (key) => normalizeKey(key) === normalizeKey(preferred)
      );
      if (found) return option[found];
    }

    const firstTextKey = Object.keys(option).find(
      (key) => !normalizeKey(key).startsWith("id")
    );

    return firstTextKey ? option[firstTextKey] : JSON.stringify(option);
  };

  const renderField = (field) => {
    const commonProps = {
      name: field.name,
      value: form[field.name] ?? "",
      onChange: handleChange
    };

    if (field.type === "multiselect") {
      const options = getOptionsForField(field);
      const selected = Array.isArray(form[field.name]) ? form[field.name] : [];

      return (
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: 8,
            padding: 10,
            maxHeight: 180,
            overflowY: "auto"
          }}
        >
          {options.length === 0 && <small>No hay opciones disponibles.</small>}
          {options.map((option, index) => {
            const value = getOptionValue(option, field);
            const label = getOptionLabel(option, field);
            const checked = selected.includes(value);

            return (
              <label
                key={`${field.name}-${index}-${value}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                  fontWeight: 400
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    handleMultiSelectChange(field.name, value, e.target.checked)
                  }
                />
                {label}
              </label>
            );
          })}
        </div>
      );
    }

    if (field.type === "select") {
      const options = getOptionsForField(field);

      return (
        <select {...commonProps}>
          <option value="">
            {field.placeholder || `Seleccione ${field.label.toLowerCase()}`}
          </option>
          {options.map((option, index) => (
            <option
              key={`${field.name}-${index}-${getOptionValue(option, field)}`}
              value={getOptionValue(option, field)}
            >
              {getOptionLabel(option, field)}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "textarea") {
      return (
        <textarea
          {...commonProps}
          rows={field.rows || 4}
          placeholder={field.placeholder || `Ingrese ${field.label.toLowerCase()}`}
        />
      );
    }

    return (
      <input
        {...commonProps}
        type={field.type || "text"}
        placeholder={field.placeholder || `Ingrese ${field.label.toLowerCase()}`}
      />
    );
  };

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="module-page">
      <div className="module-hero">
        <div>
          <p className="module-kicker">PANEL ADMINISTRATIVO</p>
          <h1>{title}</h1>
          <p>
            Gestiona registros de forma simple y comparte cambios con tu equipo
            usando un backend centralizado.
          </p>
        </div>
        <div className="hero-badge">🌱 Gestión de árboles</div>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="module-grid">
        <div className="card form-card">
          <h2>{editId ? "Editar registro" : "Nuevo registro"}</h2>
          <p>{title}</p>

          <form onSubmit={handleSubmit}>
            {fields.map((field) => (
              <React.Fragment key={field.name}>
                <label>
                  {field.label}
                  {field.required ? " *" : ""}
                </label>

                {renderField(field)}

                {errors[field.name] && (
                  <small style={{ color: "#d32f2f", marginBottom: "10px", display: "block" }}>
                    {errors[field.name]}
                  </small>
                )}
              </React.Fragment>
            ))}

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editId ? "Actualizar" : "Guardar"}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={clearForm}
              >
                {editId ? "Cancelar" : "Limpiar"}
              </button>
            </div>

            {loadingOptions && (
              <small style={{ marginTop: "10px", display: "block", color: "#666" }}>
                Cargando opciones...
              </small>
            )}
          </form>
        </div>

        <div className="card table-card">
          <h2>Registros</h2>
          <p>{data.length} encontrados</p>

          {loading ? (
            <div className="empty-state">Cargando registros...</div>
          ) : data.length === 0 ? (
            <div className="empty-state">No hay registros todavía.</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={index}>
                      {columns.map((col) => (
                        <td key={col}>{item[col] ?? "-"}</td>
                      ))}
                      <td className="actions-cell">
                        <button
                          className="btn-edit"
                          onClick={() => handleEdit(item)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(item)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GenericCrudModule;
