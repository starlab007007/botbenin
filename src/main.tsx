import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/waouh-responsive.css';
import './privatai-chat-promo';

createRoot(document.getElementById("root")!).render(<App />);
