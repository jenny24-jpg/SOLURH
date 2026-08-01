# Sistema de GPersonal

Sistema web full-stack para administración de inventario, monitoreo y trazabilidad de árboles en fincas agrícolas.

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 |
| Backend | Node.js + Express |
| Base de datos | Oracle (PL/SQL) |
| Autenticación | JWT (8 horas) |

---

## Requisitos previos

- Node.js v18 o superior
- npm v9 o superior
- Acceso a una base de datos Oracle con el esquema `GESTIONARBOLES` instalado

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd GESTION-DE-ARBOLES
```

### 2. Configurar el Backend

```bash
cd backend
npm install
```

Crea el archivo `.env` copiando la plantilla:

```bash
cp .env.example .env
```

Edita `.env` con tus datos reales:

```
PORT=3000
DB_USER=gestionarboles
DB_PASSWORD=tu_contraseña
DB_CONNECT_STRING=ip_servidor:1521/XEPDB1
JWT_SECRET=clave_secreta_larga_y_aleatoria
CORS_ORIGINS=http://localhost:3001
```

### 3. Configurar la Base de Datos

Si es una instalación nueva, ejecuta en SQL Developer conectado como `GESTIONARBOLES`:

```
Archivo: database/gestion_arbol.sql
```

> Este script crea las 18 tablas, 19 secuencias, 17 paquetes PL/SQL y los datos iniciales.

### 4. Configurar el Frontend

```bash
cd ../frontend
npm install
```

---

## Ejecución en desarrollo

Abre **dos terminales**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
Corre en `http://localhost:3000`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
```
Corre en `http://localhost:3001`

---

## Usuario inicial

| Campo | Valor |
|-------|-------|
| Usuario | `admin` |
| Contraseña | `Admin123!` |
| Rol | Super Administrador |

> Cambia la contraseña después del primer inicio de sesión.

---

## Estructura del proyecto

```
GESTION-DE-ARBOLES/
├── backend/
│   ├── config/         # Conexión a Oracle
│   ├── controllers/    # Lógica de negocio
│   ├── middleware/      # Auth, validaciones, errores
│   ├── routes/         # Endpoints de la API
│   ├── .env.example    # Plantilla de configuración
│   └── server.js       # Punto de entrada
├── frontend/
│   ├── public/         # Archivos estáticos e íconos
│   └── src/
│       ├── components/ # Componentes reutilizables
│       ├── context/    # AuthContext (sesión global)
│       ├── pages/      # Vistas principales
│       └── index.js    # Punto de entrada React
└── database/
    └── gestion_arbol.sql  # Script completo de base de datos
```

---

## Módulos del sistema

- **Fincas y Sectores** — gestión del territorio
- **Árboles** — inventario con mapa visual interactivo
- **Estados y Historial** — ciclo de vida de cada árbol
- **Plagas y Tratamientos** — registro de incidencias y aplicaciones
- **Fertilizantes** — catálogo y registro de aplicaciones
- **Resiembra** — trazabilidad de reemplazos
- **Movimiento de Inventario** — traslados entre sectores
- **Auditoría** — log de todas las acciones del sistema
- **Usuarios y Roles** — control de acceso por nivel

---

## Seguridad implementada

- Autenticación JWT con expiración de 8 horas
- Contraseñas hasheadas con bcrypt (10 salt rounds)
- Rate limiting en login (10 intentos / 15 minutos)
- Headers de seguridad HTTP con Helmet
- Protección contra inyección SQL (bind variables en Oracle)
- CORS restringido a orígenes configurados
- Validación de entradas con express-validator

---

## API — Endpoints principales

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/usuarios/login` | Iniciar sesión | No |
| GET | `/api/arbol` | Listar árboles | Sí |
| GET | `/api/finca` | Listar fincas | Sí |
| GET | `/api/sector` | Listar sectores | Sí |
| GET | `/api/auditoria` | Ver auditoría | Sí |

Todos los endpoints protegidos requieren el header:
```
Authorization: Bearer <token>
```
