import { Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from './AuthProvider.tsx';

export function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate({ to: '/' });
    }
  };

  return (
    <nav className="flex items-center gap-4 border-b border-line p-4">
      <Link to="/" className="font-display font-medium text-ink">
        Nee.3
      </Link>
      <div className="ml-auto flex items-center gap-4 font-mono text-xs uppercase">
        {user ? (
          <>
            <Link to="/journal" search={{ page: 1 }} className="text-ink-blue">
              Journal
            </Link>
            <span className="text-ink-soft">{user.username}</span>
            <button type="button" onClick={handleLogout} className="text-ink-blue">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-ink-blue">
              Log in
            </Link>
            <Link to="/register" className="text-ink-blue">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
