import '@fontsource-variable/dm-sans/wght.css';
import '@fontsource-variable/space-grotesk/wght.css';
import { createCryptoRandom } from '@tod/game-engine';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/app.js';
import { createGameStore } from './features/truth-or-dare/game-store.js';
import './index.css';
import { createQueryClient } from './shared/api/query-client.js';
import { createKeyValueStorage } from './shared/storage/key-value-storage.js';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

const store = createGameStore({
  random: createCryptoRandom(),
  storage: createKeyValueStorage('truth-or-dare-game'),
});

createRoot(root).render(
  <StrictMode>
    <App store={store} queryClient={createQueryClient()} />
  </StrictMode>,
);
