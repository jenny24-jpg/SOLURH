import React from 'react';

export default function Sidebar({ resources, activeKey, onSelect }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">👥</div>
        <div>
          <h1>Gestión de Personal</h1>
          <p>CRUD colaborativo</p>
        </div>
      </div>
      <nav className="menu">
        {resources.map((resource) => (
          <button
            key={resource.key}
            className={resource.key === activeKey ? 'menu-item active' : 'menu-item'}
            onClick={() => onSelect(resource.key)}
          >
            {resource.title}
          </button>
        ))}
      </nav>
    </aside>
  );
}