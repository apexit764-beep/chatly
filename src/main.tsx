import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { getBasename } from './utils/mode';
import { ConfirmProvider } from './components/ui';
// الخط مستضاف محلياً لا من Google Fonts: الطلب الخارجي يفشل خلف أي شبكة
// تحجبه، فيتعرّض التطبيق كلّه بخط احتياطي دون أن يُنبّه أحد.
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import './styles/global.css';
console.info('[Qhub] v2');

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
