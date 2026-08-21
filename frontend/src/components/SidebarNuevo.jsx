import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NAV_SECTIONS } from '../config/modulesNuevo';
import s from './SidebarNuevo.module.css';

const DEFAULT_OPEN = []; // Todas cerradas al iniciar

export default function SidebarNuevo({ activeKey, onSelect, mode = 'full' }) {
  const { logout, displayName, rolLabel, isAdmin, usuario } = useAuth();

  const visibleSections = useMemo(
    () => NAV_SECTIONS.filter(sec => !sec.adminOnly || isAdmin),
    [isAdmin]
  );

  const [openSections, setOpenSections] = useState(() => {
    const initial = {};
    NAV_SECTIONS.forEach(sec => {
      initial[sec.title] =
        DEFAULT_OPEN.includes(sec.title) ||
        sec.entries.some(entry => entry.key === activeKey);
    });
    return initial;
  });

  const allEntries = useMemo(
    () => visibleSections.flatMap(sec => sec.entries),
    [visibleSections]
  );

  const toggleSection = title => {
    setOpenSections(prev => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  if (mode === 'rail') {
    return (
      <nav className={s.rail}>
        <div className={s.railLogo}>
          <span className="material-icons">groups</span>
        </div>

        <button
          className={`${s.railBtn} ${activeKey === '' ? s.railActive : ''}`}
          title="Inicio"
          onClick={() => onSelect('')}
        >
          <span className="material-icons">dashboard</span>
        </button>

        <div className={s.railDiv} />

        {allEntries.map(entry => (
          <button
            key={entry.key}
            title={entry.label}
            className={`${s.railBtn} ${activeKey === entry.key ? s.railActive : ''}`}
            onClick={() => onSelect(entry.key)}
          >
            <span className="material-icons">{entry.icon}</span>
          </button>
        ))}

        <div className={s.railSpacer} />
        <div className={s.railDiv} />

        <button className={s.railBtn} title="Cerrar sesión" onClick={logout}>
          <span className="material-icons">logout</span>
        </button>
      </nav>
    );
  }

  return (
    <nav className={s.sidebar}>
      <div className={s.sidebarTop}>
        <div className={s.logo}>
          <div className={s.logoIcon}>
            <span className="material-icons">groups</span>
          </div>
          <div className={s.logoText}>
            <p className={s.logoTitle}>Gestión de Personal</p>
            <p className={s.logoSub}>Panel de RRHH</p>
          </div>
        </div>

        <button
          className={`${s.homeBtn} ${activeKey === '' ? s.homeBtnActive : ''}`}
          onClick={() => onSelect('')}
        >
          <span className="material-icons">dashboard</span>
          <div className={s.homeText}>
            <span>Inicio</span>
            <small>Resumen general</small>
          </div>
        </button>
      </div>

      <div className={s.nav}>
        {visibleSections.map(section => {
          const isOpen = openSections[section.title];
          const hasActive = section.entries.some(entry => entry.key === activeKey);

          return (
            <div key={section.title} className={s.group}>
              <button
                className={`${s.groupHeader} ${hasActive ? s.groupHeaderActive : ''}`}
                onClick={() => toggleSection(section.title)}
                type="button"
              >
                <span className={s.groupTitle}>{section.title}</span>
                <span className={`material-icons ${s.groupArrow} ${isOpen ? s.groupArrowOpen : ''}`}>
                  expand_more
                </span>
              </button>

              <div className={`${s.groupBody} ${isOpen ? s.groupBodyOpen : ''}`}>
                <div className={s.groupBodyInner}>
                  {section.entries.map(entry => (
                    <button
                      key={entry.key}
                      className={`${s.navItem} ${activeKey === entry.key ? s.navActive : ''}`}
                      onClick={() => onSelect(entry.key)}
                      type="button"
                    >
                      <span className={`material-icons ${s.navIcon}`}>{entry.icon}</span>
                      <span className={s.navText}>{entry.label}</span>
                      <span className={`material-icons ${s.navArrow}`}>chevron_right</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={s.footer}>
        {Number(usuario?.ROL_ID ?? usuario?.rol_id ?? 3) <= 2 && (
          <button
            className={`${s.adminBtn} ${activeKey === 'historial-cambios' ? s.adminBtnActive : ''}`}
            onClick={() => onSelect('historial-cambios')}
            type="button"
          >
            <span className="material-icons">history</span>
            <span>Historial de cambios</span>
          </button>
        )}
        {Number(usuario?.ROL_ID ?? usuario?.rol_id ?? 3) <= 2 && (
          <button
            className={`${s.adminBtn} ${activeKey === 'reporte-historial-estados' ? s.adminBtnActive : ''}`}
            onClick={() => onSelect('reporte-historial-estados')}
            type="button"
          >
            <span className="material-icons">timeline</span>
            <span>Reporte historial estados</span>
          </button>
        )}
        {(usuario?.ROL_ID === 1 || usuario?.rol_id === 1) && (
          <button
            className={`${s.adminBtn} ${activeKey === 'gestion-usuarios' ? s.adminBtnActive : ''}`}
            onClick={() => onSelect('gestion-usuarios')}
            type="button"
          >
            <span className="material-icons">admin_panel_settings</span>
            <span>Gestión de usuarios</span>
          </button>
        )}
        <button
          className={`${s.profileBtn} ${activeKey === 'perfil' ? s.profileBtnActive : ''}`}
          onClick={() => onSelect('perfil')}
          type="button"
        >
          <div className={s.avatar}>{displayName?.[0]?.toUpperCase() || 'U'}</div>
          <div className={s.userMeta}>
            <p className={s.userName}>{displayName}</p>
            <p className={s.userRole}>{rolLabel}</p>
          </div>
          <span className={`material-icons ${s.profileArrow}`}>manage_accounts</span>
        </button>

        <button className={s.logoutBtn} onClick={logout} type="button">
          <span className="material-icons">logout</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </nav>
  );
}