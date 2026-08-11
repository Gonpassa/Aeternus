import { Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from './AuthProvider.tsx';

export function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate({ to: '/' });
  };

  return (
    <nav className="flex items-center gap-4 border-b border-gray-200 p-4">
      <Link to="/" className="font-medium">
        Nee.3
      </Link>
      <div className="ml-auto flex items-center gap-4">
        {user ? (
          <>
            <span>{user.username}</span>
            <button type="button" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <Link to="/login">Log in</Link>
        )}
      </div>
    </nav>
  );
}
