import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import SetupScreen from './screens/SetupScreen.tsx';
import { AuthProvider } from './lib/auth.tsx';
import { isFirebaseConfigured } from './lib/firebase.ts';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isFirebaseConfigured ? (
      <AuthProvider>
        <App />
      </AuthProvider>
    ) : (
      <SetupScreen />
    )}
  </StrictMode>
);
