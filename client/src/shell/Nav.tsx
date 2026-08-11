import { Link } from '@tanstack/react-router';

export function Nav() {
  return (
    <nav className="flex gap-4 border-b border-gray-200 p-4">
      <Link to="/" className="font-medium">
        Nee.3
      </Link>
    </nav>
  );
}
