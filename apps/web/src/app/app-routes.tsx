import { Navigate, Route, Routes } from 'react-router';
import { CatalogScreen } from '../features/catalog/catalog-screen.js';
import { InstallScreen } from '../features/install/install-screen.js';
import { SetupScreen } from '../features/session-setup/setup-screen.js';
import { GameScreen } from '../features/truth-or-dare/game-screen.js';

export function AppRoutes() {
  return (
    <Routes>
      <Route index element={<CatalogScreen />} />
      <Route path="setup/:editionSlug" element={<SetupScreen />} />
      <Route path="game" element={<GameScreen />} />
      <Route path="install" element={<InstallScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
