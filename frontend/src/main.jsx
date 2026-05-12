import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/index.css';
import 'leaflet/dist/leaflet.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: { background: '#1A1A1A', color: '#fff', borderRadius: '16px', fontWeight: '600', border: '1px solid rgba(255,255,255,0.08)' },
      }}
    />
  </BrowserRouter>
);
