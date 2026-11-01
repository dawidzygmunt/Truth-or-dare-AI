import { pl } from '../i18n/pl.js';

export function App() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-neutral-950 p-6 text-neutral-50">
      <h1 className="text-3xl font-bold">{pl.app.title}</h1>
      <p className="text-neutral-400">{pl.app.comingSoon}</p>
    </main>
  );
}
