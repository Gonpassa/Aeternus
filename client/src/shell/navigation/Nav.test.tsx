import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const mockUseMediaQuery = vi.fn();
const mockUseAuth = vi.fn();
const mockNavigate = vi.fn();
const mockLogout = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, onClick }: { to: string; children: ReactNode; onClick?: () => void }) => (
    <a href={to} onClick={onClick}>
      {children}
    </a>
  ),
  useMatchRoute: () => () => false,
  useNavigate: () => mockNavigate,
}));

vi.mock('../AuthProvider.tsx', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../styling/useMediaQuery.ts', () => ({
  useMediaQuery: () => mockUseMediaQuery(),
}));

const { Nav } = await import('./Nav.tsx');

const loggedInUser = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  createdAt: '',
  updatedAt: '',
};

describe('Nav', () => {
  beforeEach(() => {
    mockUseMediaQuery.mockReset();
    mockUseAuth.mockReset();
    mockNavigate.mockReset();
    mockLogout.mockReset();
    mockUseAuth.mockReturnValue({ user: loggedInUser, logout: mockLogout });
  });

  describe('below the mobile breakpoint', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(true);
    });

    it('shows only the wordmark and hamburger toggle by default', () => {
      render(<Nav />);

      expect(screen.getByRole('link', { name: 'Aeternus' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Journal' })).not.toBeInTheDocument();
      expect(screen.queryByText('alice')).not.toBeInTheDocument();
    });

    it('opens the drawer on hamburger click, revealing links and the account block', async () => {
      render(<Nav />);

      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Journal' })).toBeInTheDocument();
      });
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument();
    });

    it('closes the drawer when the toggle is clicked again', async () => {
      render(<Nav />);

      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Journal' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));

      await waitFor(() => {
        expect(screen.queryByRole('link', { name: 'Journal' })).not.toBeInTheDocument();
      });
    });

    it('closes the drawer when a nav link inside it is clicked', async () => {
      render(<Nav />);

      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Journal' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('link', { name: 'Journal' }));

      await waitFor(() => {
        expect(screen.queryByRole('link', { name: 'Journal' })).not.toBeInTheDocument();
      });
    });

    it('shows the dev-only UI components link, gated the same way as today', async () => {
      render(<Nav />);

      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'UI components' })).toBeInTheDocument();
      });
    });

    it('shows username and log out for a logged-in user', async () => {
      render(<Nav />);

      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

      await waitFor(() => {
        expect(screen.getByText('alice')).toBeInTheDocument();
      });
      expect(screen.getByRole('link', { name: 'Log out' })).toBeInTheDocument();
    });

    it('shows log in and register links for a logged-out user', async () => {
      mockUseAuth.mockReturnValue({ user: null, logout: mockLogout });
      render(<Nav />);

      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
      });
      expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Journal' })).not.toBeInTheDocument();
    });
  });

  describe('at or above the mobile breakpoint', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(false);
    });

    // Notes itself is a heading, not a destination: the module has no landing page, so the
    // rail leads straight to Read.
    it('files Read under a Notes heading rather than linking Notes itself', () => {
      render(<Nav />);

      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Notes' })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Read' })).toHaveAttribute('href', '/notes/read');
    });

    it('renders the full desktop rail with no hamburger', () => {
      render(<Nav />);

      expect(screen.getByRole('link', { name: /Aeternus/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Journal' })).toBeInTheDocument();
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument();
    });
  });
});
