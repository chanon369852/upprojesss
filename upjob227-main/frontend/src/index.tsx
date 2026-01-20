import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import App from './App';

// FLOW START: Frontend Entry (EN)
// จุดเริ่มต้น: เริ่ม React App (TH)

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

// FLOW END: Frontend Entry (EN)
// จุดสิ้นสุด: เริ่ม React App (TH)
