import { PropsWithChildren } from 'react';
import { Nav } from './Nav.tsx';

export function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <main className="p-4">{children}</main>
    </div>
  );
}
