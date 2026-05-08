import { useState, useRef, useEffect } from 'react';
import BridgeStatus from './BridgeStatus';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'files', label: 'Files', icon: '📁' },
  { id: 'git', label: 'Git', icon: '🔀' },
  { id: 'ai', label: 'AI Chat', icon: '🤖' },
  { id: 'terminal', label: 'Terminal', icon: '💻' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function MobileLayout({ children }: MobileLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('home');
  const [swipeStart, setSwipeStart] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Handle swipe gestures
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartX.current !== null && !sidebarOpen) {
        const deltaX = e.touches[0].clientX - touchStartX.current;
        if (deltaX > 100 && e.touches[0].clientX < 50) {
          setSidebarOpen(true);
        }
      }
    };

    const handleTouchEnd = () => {
      touchStartX.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [sidebarOpen]);

  const handleNavClick = (id: string) => {
    setActiveItem(id);
    setSidebarOpen(false);
  };

  return (
    <div className="mobile-layout">
      {/* Hamburger button */}
      <button
        className={`hamburger ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        <span />
      </button>

      {/* Sidebar overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar drawer */}
      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid #333', marginBottom: 8 }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Pi</h2>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Mobile</p>
        </div>
        {menuItems.map((item) => (
          <a
            key={item.id}
            className={`menu-item ${activeItem === item.id ? 'active' : ''}`}
            onClick={() => handleNavClick(item.id)}
          >
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      {/* Swipe indicator */}
      {!sidebarOpen && <div className="swipe-indicator" />}

      {/* Main content */}
      <main className="main-content">{children}</main>

      {/* Bridge status */}
      <BridgeStatus />

      {/* Status bar */}
      <footer className="status-bar">
        {menuItems.slice(0, 5).map((item) => (
          <a
            key={item.id}
            className={`status-item ${activeItem === item.id ? 'active' : ''}`}
            onClick={() => handleNavClick(item.id)}
          >
            <span style={{ fontSize: '24px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </footer>
    </div>
  );
}
