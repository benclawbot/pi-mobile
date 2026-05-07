import { useState, useEffect } from 'react';
import MobileLayout from './components/MobileLayout';
import TailscaleBadge from './components/TailscaleBadge';

declare global {
  interface Window {
    howcodeLoaded: boolean;
  }
}

function App() {
  const [howcodeReady, setHowcodeReady] = useState(false);

  useEffect(() => {
    // Listen for howcode to load
    const checkHowcode = setInterval(() => {
      if (window.howcodeLoaded) {
        setHowcodeReady(true);
        clearInterval(checkHowcode);
      }
    }, 100);

    // Timeout after 30s
    setTimeout(() => clearInterval(checkHowcode), 30000);

    return () => clearInterval(checkHowcode);
  }, []);

  return (
    <MobileLayout>
      <TailscaleBadge />
      <div className="loading-container">
        {!howcodeReady ? (
          <div className="loading">
            <div className="spinner" />
            <p>Loading Pi...</p>
          </div>
        ) : (
          <div id="howcode-container" />
        )}
      </div>
    </MobileLayout>
  );
}

export default App;
