import { useEffect, useState, type FormEvent } from 'react';
import {
  getAccount,
  signIn,
  signOut,
  signUp,
  type Account,
} from '../services/authClient';
import { ExhibitionsPanel } from './ExhibitionsPanel';
import { LibraryPanel } from './LibraryPanel';

type PanelMode = 'closed' | 'sign-in' | 'sign-up';

/**
 * Minimal V3 account surface: sign up, sign in, see your workspace, sign out.
 * Deliberately quiet chrome — photography stays the loudest thing on screen.
 * Auth is not an exhibition interaction, so this talks to the service layer
 * directly rather than the intent bus.
 */
export function AccountPanel() {
  const [account, setAccount] = useState<Account | null>(null);
  const [checked, setChecked] = useState(false);
  const [mode, setMode] = useState<PanelMode>('closed');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [exhibitionsOpen, setExhibitionsOpen] = useState(false);

  useEffect(() => {
    void getAccount()
      .then(setAccount)
      .finally(() => setChecked(true));
  }, []);

  const refresh = async () => setAccount(await getAccount());

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '');
    const password = String(data.get('password') ?? '');
    const result =
      mode === 'sign-up'
        ? await signUp(String(data.get('name') ?? ''), email, password)
        : await signIn(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Something went wrong.');
      return;
    }
    await refresh();
    setMode('closed');
  };

  const onSignOut = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    setAccount(null);
  };

  if (!checked) return null;

  return (
    <>
      <div className="account-corner">
        {account ? (
          <div className="account-summary">
            <span className="account-name">{account.user.name}</span>
            {account.workspace && (
              <span className="account-workspace">{account.workspace.name}</span>
            )}
            <button
              type="button"
              className="text-button"
              onClick={() => setLibraryOpen(true)}
            >
              Photo library
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setExhibitionsOpen(true)}
            >
              Exhibitions
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => void onSignOut()}
              disabled={busy}
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="text-button"
            onClick={() => setMode('sign-in')}
          >
            Sign in
          </button>
        )}
      </div>

      {libraryOpen && account && <LibraryPanel onClose={() => setLibraryOpen(false)} />}
      {exhibitionsOpen && account && (
        <ExhibitionsPanel onClose={() => setExhibitionsOpen(false)} />
      )}

      {mode !== 'closed' && !account && (
        <div className="account-overlay" role="dialog" aria-modal="true" aria-label="Account">
          <div className="account-panel">
            <h2 className="account-title">
              {mode === 'sign-up' ? 'Create your account' : 'Welcome back'}
            </h2>
            <form onSubmit={(e) => void onSubmit(e)} className="account-form">
              {mode === 'sign-up' && (
                <label>
                  Name
                  <input name="name" type="text" required autoComplete="name" />
                </label>
              )}
              <label>
                Email
                <input name="email" type="email" required autoComplete="email" />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                />
              </label>
              {error && <p className="account-error">{error}</p>}
              <button type="submit" className="text-button" disabled={busy}>
                {busy ? 'Working…' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
              </button>
            </form>
            <div className="account-switch">
              {mode === 'sign-in' ? (
                <button type="button" className="link-button" onClick={() => setMode('sign-up')}>
                  New here? Create an account
                </button>
              ) : (
                <button type="button" className="link-button" onClick={() => setMode('sign-in')}>
                  Already have an account? Sign in
                </button>
              )}
              <button type="button" className="link-button" onClick={() => setMode('closed')}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
