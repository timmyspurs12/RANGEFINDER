import '../ui/tokens.css';
import '../ui/app.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameApp } from '../ui/GameApp.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');

createRoot(root).render(
  <StrictMode>
    <GameApp />
  </StrictMode>
);
