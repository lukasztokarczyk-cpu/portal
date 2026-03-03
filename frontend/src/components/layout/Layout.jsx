import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

const navItems = [
  { to: '/', label: 'Przygotowania', icon: '💍', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/guests', label: 'Goście', icon: '👥', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/tables', label: 'Plan stołów', icon: '🪑', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/menu', label: 'Menu', icon: '🍽️', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/payments', label: 'Płatności', icon: '💳', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/accommodation', label: 'Noclegi', icon: '🛏️', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/summary', label: 'Podsumowanie', icon: '📊', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/wedding-plan', label: 'Plan wesela', icon: '📅', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/venue', label: 'Wizualizacja sali', icon: '🌹', roles: ['admin'], logins: ['test'] },
  { to: '/chat', label: 'Wiadomości', icon: '💬', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/admin', label: 'Zarządzanie', icon: '⚙️', roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleNav = navItems.filter(item =>
    item.roles.includes(user?.role) ||
    (item.logins && item.logins.includes(user?.login))
  );

  const roleName = user?.role === 'couple' ? 'Para Młoda' : user?.role === 'coordinator' ? 'Koordynator' : 'Administrator';

  const sidebarStyles = {
    sidebar: { background: '#0a0e1a', borderRight: '1px solid rgba(176,138,80,.15)' },
    header:  { borderBottom: '1px solid rgba(176,138,80,.15)', padding: '24px 20px 20px' },
    title:   { fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 400, color: '#f0ebe0', letterSpacing: '1px' },
    sub:     { fontSize: '10px', color: 'rgba(176,138,80,.9)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '3px' },
    goldLine:{ height: '1px', background: 'linear-gradient(90deg, transparent, #b08a50 40%, #b08a50 60%, transparent)', opacity: .4, margin: '0 20px' },
    navItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', margin: '1px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 300, color: 'rgba(240,235,224,.65)', letterSpacing: '.3px', transition: 'all .15s', cursor: 'pointer', textDecoration: 'none' },
    navActive:{ background: 'rgba(176,138,80,.12)', color: '#f0ebe0', borderLeft: '2px solid #b08a50', paddingLeft: '14px' },
    navHover: { background: 'rgba(255,255,255,.04)', color: 'rgba(240,235,224,.9)' },
    footer:  { borderTop: '1px solid rgba(176,138,80,.15)', padding: '16px 8px' },
    userName:{ fontSize: '13px', color: '#f0ebe0', fontWeight: 400, padding: '4px 16px' },
    userRole:{ fontSize: '10px', color: 'rgba(176,138,80,.85)', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '0 16px 8px' },
    logout:  { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 16px', margin: '0 0', borderRadius: '4px', fontSize: '12px', color: 'rgba(240,235,224,.45)', letterSpacing: '1px', textTransform: 'uppercase', transition: 'all .15s', cursor: 'pointer', background: 'none', border: 'none' },
  };

  const NavItem = ({ item, showLabel = true }) => (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={() => setMobileOpen(false)}
      style={({ isActive }) => ({ ...sidebarStyles.navItem, ...(isActive ? sidebarStyles.navActive : {}) })}
      onMouseEnter={e => { if (!e.currentTarget.style.borderLeft) { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.color = 'rgba(240,235,224,.9)'; }}}
      onMouseLeave={e => { if (!e.currentTarget.style.borderLeft) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(240,235,224,.65)'; }}}
    >
      <span style={{ fontSize: '15px', flexShrink: 0 }}>{item.icon}</span>
      {showLabel && <span>{item.label}</span>}
    </NavLink>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8f6f3' }}>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex flex-col shrink-0" style={{ ...sidebarStyles.sidebar, width: '220px' }}>
        {/* Logo / Tytuł */}
        <div style={{ padding: '28px 20px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(176,138,80,.15)' }}>
          <div style={{ width: '80%', height: '1px', background: 'linear-gradient(90deg,transparent,#b08a50 30%,#b08a50 70%,transparent)', opacity: .85 }} />
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 300, color: '#f0ebe0', letterSpacing: '3px', textAlign: 'center', textTransform: 'uppercase' }}>
            Perła <span style={{ fontStyle: 'italic', color: '#b08a50' }}>Pienin</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '65%' }}>
            <div style={{ flex: 1, height: '1px', background: '#b08a50', opacity: .5 }} />
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#b08a50', flexShrink: 0 }} />
            <div style={{ flex: 1, height: '1px', background: '#b08a50', opacity: .5 }} />
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '13px', color: 'rgba(240,235,224,.78)', letterSpacing: '1px', textAlign: 'center' }}>
            Strefa Pary Młodej
          </div>
          <div style={{ width: '80%', height: '1px', background: 'linear-gradient(90deg,transparent,#b08a50 30%,#b08a50 70%,transparent)', opacity: .85 }} />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {visibleNav.map(item => <NavItem key={item.to} item={item} />)}
        </nav>

        {/* Złota linia + user */}
        <div style={sidebarStyles.goldLine} />
        <div style={sidebarStyles.footer}>
          <div style={sidebarStyles.userName}>{user?.name}</div>
          <div style={sidebarStyles.userRole}>{roleName}</div>
          <button onClick={handleLogout} style={sidebarStyles.logout}
            onMouseEnter={e => { e.currentTarget.style.color = '#b08a50'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(240,235,224,.45)'; }}>
            <span>🚪</span> Wyloguj się
          </button>
        </div>
      </aside>

      {/* ── MOBILE SIDEBAR ── */}
      <aside className="md:hidden flex flex-col shrink-0 z-30"
        style={{ ...sidebarStyles.sidebar, width: mobileOpen ? '200px' : '56px', transition: 'width .2s ease' }}>

        <button onClick={() => setMobileOpen(o => !o)}
          style={{ height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(176,138,80,.15)', color: '#b08a50', fontSize: '18px', background: 'none', border: 'none', borderBottom: '1px solid rgba(176,138,80,.15)', cursor: 'pointer', width: '100%' }}>
          {mobileOpen ? '✕' : '☰'}
        </button>

        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {visibleNav.map(item => <NavItem key={item.to} item={item} showLabel={mobileOpen} />)}
        </nav>

        <div style={{ borderTop: '1px solid rgba(176,138,80,.15)', padding: '8px 0' }}>
          {mobileOpen && (
            <>
              <div style={{ ...sidebarStyles.userName, fontSize: '12px' }}>{user?.name}</div>
              <div style={{ ...sidebarStyles.userRole, fontSize: '9px' }}>{roleName}</div>
            </>
          )}
          <button onClick={handleLogout}
            style={{ ...sidebarStyles.logout, justifyContent: mobileOpen ? 'flex-start' : 'center' }}>
            <span style={{ fontSize: '15px' }}>🚪</span>
            {mobileOpen && <span>Wyloguj</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        {/* Górny pasek */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e4e0da', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: '120px', height: '1px', background: 'linear-gradient(90deg, #b08a50, transparent)', opacity: .4 }} />
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '13px', fontStyle: 'italic', color: '#9a9590', letterSpacing: '1px' }}>
            {user?.name}
          </div>
          <div style={{ width: '120px', height: '1px', background: 'linear-gradient(270deg, #b08a50, transparent)', opacity: .4 }} />
        </div>

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 32px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
