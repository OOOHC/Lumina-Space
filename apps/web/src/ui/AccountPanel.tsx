import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  getAccount,
  signIn,
  signOut,
  signUp,
  type Account,
} from '../services/authClient';
import {
  createExhibition,
  listExhibitions,
  type ExhibitionListItem,
} from '../services/exhibitions';
import { photoViewUrl } from '../services/photoLibrary';
import { ExhibitionsPanel } from './ExhibitionsPanel';
import { LibraryPanel } from './LibraryPanel';

type PanelMode = 'closed' | 'sign-in' | 'sign-up';

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * The creator's real workspace: private exhibition drafts are the primary
 * objects. Public and draft-preview gallery experiences remain separate.
 */
export function AccountPanel() {
  const [account, setAccount] = useState<Account | null>(null);
  const [checked, setChecked] = useState(false);
  const [mode, setMode] = useState<PanelMode>('closed');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [exhibitionsOpen, setExhibitionsOpen] = useState(false);
  const [selectedExhibitionId, setSelectedExhibitionId] = useState<string | null>(null);
  const [exhibitions, setExhibitions] = useState<ExhibitionListItem[] | null>(null);
  const [exhibitionsError, setExhibitionsError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newExhibitionTitle, setNewExhibitionTitle] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    void getAccount()
      .then(setAccount)
      .finally(() => setChecked(true));
  }, []);

  const refreshExhibitions = useCallback(async () => {
    setExhibitionsError(false);
    const result = await listExhibitions();
    if (result === null) {
      setExhibitionsError(true);
      setExhibitions([]);
      return;
    }
    setExhibitions(result);
  }, []);

  useEffect(() => {
    if (!account) {
      setExhibitions(null);
      return;
    }
    void refreshExhibitions();
  }, [account, refreshExhibitions]);

  const refreshAccount = async () => setAccount(await getAccount());

  const openExhibitions = (id: string) => {
    setSelectedExhibitionId(id);
    setExhibitionsOpen(true);
  };

  const onCreateExhibition = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newExhibitionTitle.trim();
    if (!title) return;
    setCreateBusy(true);
    setCreateError(null);
    const created = await createExhibition(title);
    setCreateBusy(false);
    if (!created) {
      setCreateError('The exhibition could not be created. Try again.');
      return;
    }
    setCreating(false);
    setNewExhibitionTitle('');
    await refreshExhibitions();
    openExhibitions(created.id);
  };

  const closeExhibitions = () => {
    setExhibitionsOpen(false);
    setSelectedExhibitionId(null);
    void refreshExhibitions();
  };

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
    await refreshAccount();
    setMode('closed');
  };

  const onSignOut = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    setAccount(null);
  };

  if (!checked) {
    return (
      <main className="creator-home creator-home-loading" aria-busy="true">
        <p className="creator-wordmark">Lumina Space</p>
        <p className="status-message">Preparing your workspace...</p>
      </main>
    );
  }

  return (
    <>
      <main className="creator-home">
        <header className="creator-header">
          <p className="creator-wordmark">Lumina Space</p>
          {account && (
            <nav className="workspace-utilities" aria-label="Account and assets">
              <button
                type="button"
                className="link-button"
                onClick={() => setLibraryOpen(true)}
              >
                Photo library
              </button>
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setCreateError(null);
                  setCreating(true);
                }}
              >
                New exhibition
              </button>
              <button
                type="button"
                className="link-button workspace-sign-out"
                onClick={() => void onSignOut()}
                disabled={busy}
              >
                Sign out
              </button>
            </nav>
          )}
        </header>

        {account ? (
          <section className="creator-workspace" aria-labelledby="workspace-title">
            <header className="workspace-heading">
              <div>
                <p className="creator-eyebrow">
                  {account.workspace?.name ?? 'Photographer workspace'}
                </p>
                <h1 id="workspace-title" className="workspace-title">Exhibitions</h1>
              </div>
              {exhibitions && (
                <p className="workspace-count" aria-live="polite">
                  {exhibitions.length} exhibition{exhibitions.length === 1 ? '' : 's'}
                </p>
              )}
            </header>

            {creating && (
              <form className="workspace-create" onSubmit={(event) => void onCreateExhibition(event)}>
                <label htmlFor="new-exhibition-title">Name your new exhibition</label>
                <div className="workspace-create-row">
                  <input
                    id="new-exhibition-title"
                    type="text"
                    value={newExhibitionTitle}
                    onChange={(event) => setNewExhibitionTitle(event.target.value)}
                    autoFocus
                    required
                  />
                  <button type="submit" className="text-button" disabled={createBusy}>
                    {createBusy ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => {
                      setCreating(false);
                      setNewExhibitionTitle('');
                      setCreateError(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
                {createError && <p className="account-error" role="alert">{createError}</p>}
              </form>
            )}

            {exhibitions === null ? (
              <p className="workspace-status" aria-live="polite">Loading your exhibitions...</p>
            ) : exhibitionsError ? (
              <div className="workspace-status" role="alert">
                <p>Your exhibitions could not be loaded.</p>
                <button type="button" className="text-button" onClick={() => void refreshExhibitions()}>
                  Try again
                </button>
              </div>
            ) : exhibitions.length === 0 ? (
              <div className="workspace-empty">
                <p>No exhibitions yet.</p>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setCreating(true)}
                >
                  Create your first exhibition
                </button>
              </div>
            ) : (
              <ul className="workspace-exhibition-grid">
                {exhibitions.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="workspace-exhibition"
                      onClick={() => openExhibitions(item.id)}
                    >
                      <span className="workspace-cover">
                        {item.coverPhotoId ? (
                          <img
                            src={photoViewUrl(item.coverPhotoId, 'preview')}
                            alt={`${item.title} cover`}
                          />
                        ) : (
                          <span className="workspace-cover-empty">
                            {item.photoCount === 0 ? 'Add photographs' : 'Choose a cover'}
                          </span>
                        )}
                      </span>
                      <span className="workspace-exhibition-meta">
                        <strong>{item.title}</strong>
                        <span>
                          {item.status === 'archived'
                            ? 'Archived'
                            : item.publicationStatus === 'published'
                              ? 'Published'
                              : item.publicationStatus === 'unpublished'
                                ? 'Unpublished'
                                : 'Draft'}
                          {' · '}
                          {item.photoCount} photograph{item.photoCount === 1 ? '' : 's'}
                          {' · Updated '}
                          {DATE_FORMAT.format(new Date(item.updatedAt))}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section className="creator-welcome" aria-labelledby="welcome-title">
            <p className="creator-eyebrow">Photography, experienced spatially</p>
            <h1 id="welcome-title" className="creator-title">
              Create exhibitions that invite people to look longer.
            </h1>
            <p className="creator-intro">
              Build, publish, and share immersive photography exhibitions from one
              browser-first workspace.
            </p>
            <div className="creator-auth-actions">
              <button
                type="button"
                className="text-button creator-primary-action"
                onClick={() => setMode('sign-in')}
              >
                Sign in
              </button>
              <button type="button" className="link-button" onClick={() => setMode('sign-up')}>
                Create an account
              </button>
            </div>
          </section>
        )}
      </main>

      {libraryOpen && account && <LibraryPanel onClose={() => setLibraryOpen(false)} />}
      {exhibitionsOpen && account && (
        <ExhibitionsPanel
          initialExhibitionId={selectedExhibitionId}
          onClose={closeExhibitions}
        />
      )}

      {mode !== 'closed' && !account && (
        <div className="account-overlay" role="dialog" aria-modal="true" aria-label="Account">
          <div className="account-panel">
            <h2 className="account-title">
              {mode === 'sign-up' ? 'Create your account' : 'Welcome back'}
            </h2>
            <form onSubmit={(event) => void onSubmit(event)} className="account-form">
              {mode === 'sign-up' && (
                <label>
                  Name
                  <input name="name" type="text" required autoComplete="name" />
                </label>
              )}
              <label>
                Email
                <input name="email" type="email" required autoComplete="email" autoFocus />
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
              {error && <p className="account-error" role="alert">{error}</p>}
              <button type="submit" className="text-button" disabled={busy}>
                {busy ? 'Working...' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
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
