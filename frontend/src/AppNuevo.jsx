import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Login          from './pages/Login';
import Registro       from './pages/Registro';
import PerfilUsuario  from './pages/PerfilUsuario';
import SidebarNuevo   from './components/SidebarNuevo';
import DashboardNuevo from './components/DashboardNuevo';
import CrudPageNuevo  from './components/CrudPageNuevo';
import MapaPlanoModule from './components/MapaPlanoModule';
import GestionUsuarios      from './components/GestionUsuarios';
import NotificacionesPanel  from './components/NotificacionesPanel';
import HistorialCambios     from './components/HistorialCambios';
import ReporteHistorialEstados from './components/ReporteHistorialEstados';

export default function AppNuevo() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </ThemeProvider>
  );
}

// ── Router principal ──────────────────────────────
function Router() {
  const { isLoggedIn, iniciando } = useAuth();
  const [page, setPage] = useState('login');

  if (iniciando) return <Splash />;

  if (!isLoggedIn) {
    return page === 'registro'
      ? <Registro onLogin={() => setPage('login')} />
      : <Login   onRegistro={() => setPage('registro')} />;
  }

  return <MainLayout />;
}

// ── Toggle de tema ─────────────────────────────────
function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button
      className="themeToggle"
      onClick={toggle}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      type="button"
    >
      <span className="material-icons">
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
      <span style={{ fontSize: 11 }}>{isDark ? 'Claro' : 'Oscuro'}</span>
    </button>
  );
}

// ── Layout autenticado ────────────────────────────
function MainLayout() {
  const [activeKey,   setActiveKey]   = useState('');
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isDesktop = windowWidth >= 900;
  const isTablet  = windowWidth >= 600 && windowWidth < 900;
  const isMobile  = windowWidth < 600;

  const handleSelect = key => {
    setActiveKey(key);
    if (isMobile) setDrawerOpen(false);
  };

  return (
    <div className="appShell">
      {isDesktop && (
        <SidebarNuevo activeKey={activeKey} onSelect={handleSelect} mode="full" />
      )}
      {isTablet && (
        <SidebarNuevo activeKey={activeKey} onSelect={handleSelect} mode="rail" />
      )}
      {isMobile && drawerOpen && (
        <>
          <div className="mobileOverlay" onClick={() => setDrawerOpen(false)} />
          <div className="mobileDrawer">
            <SidebarNuevo activeKey={activeKey} onSelect={handleSelect} mode="full" />
          </div>
        </>
      )}

      <div className="appMain">
        {isMobile && (
          <div className="mobileTopbar">
            <button
              className="mobileMenuBtn"
              onClick={() => setDrawerOpen(d => !d)}
              type="button"
            >
              <span className="material-icons">menu</span>
            </button>
            <div className="mobileBrand">
              <div className="mobileBrandIcon">
                <span className="material-icons">park</span>
              </div>
              <div className="mobileBrandText">
                <span>SoluRH</span>
                <small>Panel de RRHH</small>
              </div>
            </div>
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
              <ThemeToggle />
              <NotificacionesPanel onSelect={handleSelect} />
            </div>
          </div>
        )}
        {!isMobile && (
          <div className="desktopTopbar">
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
              <ThemeToggle />
              <NotificacionesPanel onSelect={handleSelect} />
            </div>
          </div>
        )}

        <main className="appContent">
          <ActivePage activeKey={activeKey} onSelect={setActiveKey} />
        </main>
      </div>
    </div>
  );
}

// ── Permisos por rol ──────────────────────────────
const REQUIERE_ADMIN = new Set([
  'historial-cambios', 'reporte-historial-estados',
  'empleados', 'supervisores', 'historial-empleado',
]);

function canAccess(key, rolId) {
  if (!key) return true;
  if (key === 'perfil') return true;
  if (REQUIERE_ADMIN.has(key)) return rolId <= 2;
  return true;
}

// ── Página activa ─────────────────────────────────
function ActivePage({ activeKey, onSelect }) {
  const { usuario } = useAuth();
  const rolId = usuario?.ROL_ID ?? usuario?.rol_id ?? 3;

  if (activeKey && !canAccess(activeKey, rolId)) {
    return <AccesoDenegado onBack={() => onSelect('')} rolId={rolId} />;
  }

  if (!activeKey) return <DashboardNuevo onSelect={onSelect} />;
  if (activeKey === 'perfil') return <PerfilUsuario onBack={() => onSelect('')} />;
  if (activeKey === 'gestion-usuarios') return <GestionUsuarios onBack={() => onSelect('')} />;
  if (activeKey === 'historial-cambios') return <HistorialCambios onBack={() => onSelect('')} />;
  if (activeKey === 'reporte-historial-estados') return <ReporteHistorialEstados onBack={() => onSelect('')} />;

  if (activeKey === 'mapa-plano') {
    return (
      <div className="mapPage">
        <div className="pageToolbar">
          <button className="breadcrumbBtn" onClick={() => onSelect('')} type="button">
            <span className="material-icons">arrow_back_ios</span> Inicio
          </button>
          <span className="breadcrumbSep">/</span>
          <span className="breadcrumbCurrent">Mapa de árboles</span>
        </div>
        <div className="mapWrapper"><MapaPlanoModule /></div>
      </div>
    );
  }

  return <CrudPageNuevo moduleKey={activeKey} onBack={() => onSelect('')} />;
}

// ── Acceso denegado ───────────────────────────────
function AccesoDenegado({ onBack, rolId }) {
  const { isDark } = useTheme();
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', height:'100%', gap:16, padding:32, textAlign:'center'
    }}>
      <div style={{
        width:80, height:80, borderRadius:24,
        background: isDark ? '#2d1515' : '#FFEBEE',
        display:'flex', alignItems:'center', justifyContent:'center'
      }}>
        <span className="material-icons" style={{ fontSize:40, color: isDark ? '#f87171' : '#8B2E2E' }}>lock</span>
      </div>
      <h2 style={{ fontSize:22, fontWeight:800, color: isDark ? '#e2e8f0' : '#1B4D2A' }}>Acceso restringido</h2>
      <p style={{ fontSize:13, color: isDark ? '#64748b' : '#8B6F47', maxWidth:360, lineHeight:1.6 }}>
        No tienes permisos para acceder a este módulo.
        {rolId === 3 && ' Los catálogos y configuraciones requieren rol de Administrador.'}
      </p>
      <button
        onClick={onBack} type="button"
        style={{
          background:'#14168b', color:'#fff', padding:'12px 24px',
          borderRadius:12, fontWeight:700, fontSize:13, cursor:'pointer',
          display:'flex', alignItems:'center', gap:8,
          boxShadow:'0 4px 14px rgba(90, 210, 240, 0.85)'
        }}
      >
        <span className="material-icons" style={{fontSize:18}}>arrow_back</span>
        Volver al inicio
      </button>
    </div>
  );
}

// ── Splash ────────────────────────────────────────
function Splash() {
  return (
    <div className="splashScreen">
      <div className="splashLogo">
        <span className="material-icons">park</span>
      </div>
      <p className="splashTitle">Gestión Árboles</p>
      <p className="splashSubtitle">Panel agrícola</p>
      <div className="splashBar"><div className="splashBarFill"/></div>
      <p className="splashText">Cargando sistema...</p>
    </div>
  );
}
