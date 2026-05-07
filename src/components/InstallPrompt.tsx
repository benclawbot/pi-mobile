import { useState, useEffect } from 'react';

declare global {
  interface Window {
    deferredPrompt: any;
  }
}

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Wait for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if previously dismissed
    if (localStorage.getItem('pi-mobile-install-dismissed')) {
      setDismissed(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!window.deferredPrompt) return;

    window.deferredPrompt.prompt();
    const { outcome } = await window.deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    window.deferredPrompt = null;
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pi-mobile-install-dismissed', 'true');
  };

  if (!showPrompt || dismissed) return null;

  return (
    <div className={`install-prompt ${showPrompt ? 'visible' : ''}`}>
      <button onClick={handleInstall}>Install Pi-Mobile</button>
      <button
        onClick={handleDismiss}
        style={{
          background: 'transparent',
          color: '#666',
          marginTop: '8px',
          fontSize: '14px'
        }}
      >
        Not now
      </button>
    </div>
  );
}
