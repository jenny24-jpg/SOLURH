import DashboardNuevo from "./components/DashboardNuevo";
import React, { useMemo, useState } from "react";
import "./App.css";
import GenericCrudModule from "./components/GenericCrudModule";

const MENU_ITEMS = [
  { key: "empleados", label: "Empleados" },
  { key: "supervisores", label: "Supervisores" },
  { key: "asistencias", label: "Asistencias" },
  { key: "horas-extras", label: "Horas Extra" },
  { key: "documentos-empleado", label: "Documentos de Empleado" },
  { key: "historial-empleado", label: "Historial de Empleado" },
  { key: "clientes", label: "Clientes" },
  { key: "usuarios", label: "Usuarios" },
];

const MODULES_CONFIG = {
  empleados: {
    title: "Empleados",
    endpoint: "/empleado",
    fields: [
      { name: "nombre_completo", label: "Nombre completo", type: "text", required: true },
      { name: "dpi", label: "DPI", type: "text", required: true },
      { name: "telefono", label: "Teléfono", type: "text" },
      { name: "correo", label: "Correo", type: "text" },
      { name: "fecha_ingreso", label: "Fecha de ingreso", type: "date", required: true },
      { name: "puesto", label: "Puesto", type: "text" },
      {
        name: "estado",
        label: "Estado",
        type: "select",
        required: true,
        options: [
          { id: "ACTIVO", nombre: "Activo" },
          { id: "INACTIVO", nombre: "Inactivo" },
        ],
        optionValue: "id",
        optionLabel: "nombre",
      },
      { name: "id_supervisor", label: "Supervisor", type: "select", optionsEndpoint: "/supervisor", optionValue: "id", optionLabel: "nombre_completo" },
      { name: "descripcion", label: "Observaciones", type: "textarea" },
    ],
  },

  supervisores: {
  title: "Supervisores",
  endpoint: "/supervisor",
  fields: [
    { name: "nombre_completo", label: "Nombre completo", type: "text", required: true },
    { name: "telefono", label: "Teléfono", type: "text" },
    { name: "correo", label: "Correo", type: "text" },
    { name: "area_a_cargo", label: "Área a cargo", type: "text" },
    {
      name: "clientes_ids",
      label: "Clientes a cargo",
      type: "multiselect",
      optionsEndpoint: "/cliente",
      optionValue: "id",
      optionLabel: "nombre",
      relationEndpoint: "/supervisor/{id}/clientes",
    },
  ],
},
  asistencias: {
    title: "Asistencias",
    endpoint: "/asistencia",
    fields: [
      { name: "id_empleado", label: "Empleado", type: "select", required: true, optionsEndpoint: "/empleado", optionValue: "id", optionLabel: "nombre_completo" },
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "hora_entrada", label: "Hora de entrada", type: "text" },
      { name: "hora_salida", label: "Hora de salida", type: "text" },
      {
        name: "estado",
        label: "Estado",
        type: "select",
        options: [
          { id: "PRESENTE", nombre: "Presente" },
          { id: "TARDE", nombre: "Tarde" },
          { id: "AUSENTE", nombre: "Ausente" },
        ],
        optionValue: "id",
        optionLabel: "nombre",
      },
      { name: "observaciones", label: "Observaciones", type: "textarea" },
    ],
  },

  "horas-extras": {
    title: "Horas Extra",
    endpoint: "/horas-extra",
    fields: [
      { name: "id_empleado", label: "Empleado", type: "select", required: true, optionsEndpoint: "/empleado", optionValue: "id", optionLabel: "nombre_completo" },
      { name: "fecha", label: "Fecha", type: "date", required: true },
      { name: "horas", label: "Cantidad de horas", type: "number", required: true },
      { name: "motivo", label: "Motivo", type: "textarea" },
      {
        name: "aprobado",
        label: "¿Aprobado?",
        type: "select",
        options: [
          { id: "S", nombre: "Sí" },
          { id: "N", nombre: "No" },
        ],
        optionValue: "id",
        optionLabel: "nombre",
      },
    ],
  },

  "documentos-empleado": {
    title: "Documentos de Empleado",
    endpoint: "/documento-empleado",
    fields: [
      { name: "id_empleado", label: "Empleado", type: "select", required: true, optionsEndpoint: "/empleado", optionValue: "id", optionLabel: "nombre_completo" },
      { name: "tipo_documento", label: "Tipo de documento", type: "text", required: true },
      { name: "nombre_archivo", label: "Nombre del archivo", type: "text" },
      { name: "fecha_subida", label: "Fecha de subida", type: "date" },
    ],
  },

  "historial-empleado": {
    title: "Historial de Empleado",
    endpoint: "/historial-empleado",
    fields: [
      { name: "id_empleado", label: "Empleado", type: "select", required: true, optionsEndpoint: "/empleado", optionValue: "id", optionLabel: "nombre_completo" },
      { name: "tipo_cambio", label: "Tipo de cambio", type: "text", required: true },
      { name: "descripcion", label: "Descripción del cambio", type: "textarea", required: true },
      { name: "fecha_cambio", label: "Fecha", type: "date", required: true },
    ],
  },

  clientes: {
  title: "Clientes",
  endpoint: "/cliente",
  fields: [
    { name: "nombre", label: "Nombre", type: "text", required: true },
    { name: "telefono", label: "Teléfono", type: "text" },
    { name: "correo", label: "Correo", type: "text" },
    { name: "id_supervisor", label: "Supervisor", type: "select", optionsEndpoint: "/supervisor", optionValue: "id", optionLabel: "nombre_completo" }, // 👈 NUEVO
  ],
},
};

function App() {
  const [activeModule, setActiveModule] = useState("dashboard");

  const activeConfig = useMemo(
    () => MODULES_CONFIG[activeModule],
    [activeModule]
  );

  const renderModule = () => {
    if (activeModule === "dashboard") {
      return <DashboardNuevo onSelect={setActiveModule} />;
    }

    if (!activeConfig) {
      return (
        <div className="module-page">
          <div className="card table-card">
            <h2>Módulo no encontrado</h2>
            <p>No existe configuración para el módulo seleccionado.</p>
          </div>
        </div>
      );
    }

    return (
      <GenericCrudModule
        title={activeConfig.title}
        endpoint={activeConfig.endpoint}
        fields={activeConfig.fields}
      />
    );
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand-card">
          <div className="brand-icon">👥</div>
          <div>
            <h2>SoluRH</h2>
            <p>Gestión de Personal</p>
          </div>
        </div>

        <button
          className={`menu-item ${activeModule === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveModule("dashboard")}
        >
          Dashboard
        </button>

        <nav className="menu">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`menu-item ${activeModule === item.key ? "active" : ""}`}
              onClick={() => setActiveModule(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">{renderModule()}</main>
    </div>
  );
}

export default App;