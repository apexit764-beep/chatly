import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { getBasename } from './utils/mode';
import { ConfirmProvider } from './components/ui';
import './styles/global.css';

const savedFontSize = localStorage.getItem('qhub_font_size');
if (savedFontSize === 'small') document.documentElement.style.fontSize = '14px';
else if (savedFontSize === 'large') document.documentElement.style.fontSize = '18px';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename={getBasename()}>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </BrowserRouter>
  </React.StrictMode>
);
