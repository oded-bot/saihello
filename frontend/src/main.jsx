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
        style: { background: '#FE3C72', color: '#fff', borderRadius: '12px', fontWeight: '500' },
      }}
    />
  </BrowserRouter>
);
