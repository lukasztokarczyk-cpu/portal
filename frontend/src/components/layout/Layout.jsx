import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '🏠', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/stages', label: 'Harmonogram', icon: '📋', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/guests', label: 'Goście', icon: '👥', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/tables', label: 'Plan stołów', icon: '🪑', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/menu', label: 'Menu', icon: '🍽️', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/payments', label: 'Płatności', icon: '💳', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/documents', label: 'Dokumenty', icon: '📄', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/chat', label: 'Wiadomości', icon: '💬', roles: ['admin', 'coordinator', 'couple'] },
  { to: '/admin', label: 'Zarządzanie', icon: '⚙️', roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleNav = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-rose-700">Perła Pienin</h1>
          <p className="text-xs text-gray-500 mt-0.5">Strefa Pary Młodej</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-rose-50 text-rose-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role === 'couple' ? 'Para Młoda' : user?.role === 'coordinator' ? 'Koordynator' : 'Administrator'}</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
            <span>🚪</span> Wyloguj się
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
