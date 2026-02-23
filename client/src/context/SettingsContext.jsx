import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    axios.get('/api/settings')
      .then(res => setSettings(res.data))
      .catch(() => {});
  }, []);

  const refresh = () => {
    axios.get('/api/settings').then(res => setSettings(res.data)).catch(() => {});
  };

  return (
    <SettingsContext.Provider value={{ settings, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
