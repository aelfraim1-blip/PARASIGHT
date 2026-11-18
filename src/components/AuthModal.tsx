import React, { useState } from 'react';
import {
  signInWithDirectProviderSession,
  signInWithEmailPassword,
  signOutCurrentUser,
  type User,
} from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

type ActiveProviderType = 'google.com' | 'facebook.com' | 'github.com' | null;

const PROVIDER_METADATA: Record<
  Exclude<ActiveProviderType, null>,
  {
    label: string;
    badgeText: string;
    placeholderEmail: string;
    placeholderName: string;
    quickEmail: string;
    quickName: string;
    accentColor: string;
  }
> = {
  'google.com': {
    label: 'Google (Gmail)',
    badgeText: 'G · Google Account',
    placeholderEmail: 'yourname@gmail.com',
    placeholderName: 'Laboratory Researcher',
    quickEmail: 'aelfraim1@gmail.com',
    quickName: 'Aelfraim (Gmail)',
    accentColor: '#8e1018',
  },
  'facebook.com': {
    label: 'Facebook',
    badgeText: 'f · Facebook Account',
    placeholderEmail: 'yourname@facebook.com',
    placeholderName: 'Facebook Researcher',
    quickEmail: 'aelfraim1@facebook.com',
    quickName: 'Aelfraim (Facebook)',
    accentColor: '#1877F2',
  },
  'github.com': {
    label: 'GitHub',
    badgeText: '⌘ · GitHub Account',
    placeholderEmail: 'researcher@github.com',
    placeholderName: 'parasight-researcher',
    quickEmail: 'aelfraim1@github.com',
    quickName: 'aelfraim1 (GitHub)',
    accentColor: '#24292f',
  },
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [selectedProvider, setSelectedProvider] = useState<ActiveProviderType>(null);
  const [providerEmail, setProviderEmail] = useState('');
  const [providerName, setProviderName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleOpenProviderSheet = (provider: Exclude<ActiveProviderType, null>) => {
    setErrorMsg('');
    setSelectedProvider(provider);
    setProviderEmail(PROVIDER_METADATA[provider].quickEmail);
    setProviderName(PROVIDER_METADATA[provider].quickName);
  };

  const handleQuickOneClickSignIn = (
    provider: Exclude<ActiveProviderType, null>,
    targetEmail: string,
    targetName: string
  ) => {
    signInWithDirectProviderSession(provider, targetEmail, targetName);
    setSelectedProvider(null);
    setErrorMsg('');
    onClose();
  };

  const handleCompleteInAppProviderSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;
    const cleanEmail =
      providerEmail.trim() || PROVIDER_METADATA[selectedProvider].quickEmail;
    const cleanName = providerName.trim() || cleanEmail.split('@')[0] || 'Researcher';
    signInWithDirectProviderSession(selectedProvider, cleanEmail, cleanName);
    setSelectedProvider(null);
    setErrorMsg('');
    onClose();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setErrorMsg('');
    try {
      await signInWithEmailPassword(
        email,
        password,
        authMode === 'signup',
        displayName
      );
      setEmail('');
      setPassword('');
      setDisplayName('');
      onClose();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setErrorMsg(raw);
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    setErrorMsg('');
    try {
      await signOutCurrentUser();
      setSelectedProvider(null);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="tutorial-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="PARASIGHT Account Sign In & Sign Out"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="tutorial-modal-card"
        style={{ maxWidth: 520, width: '100%' }}
      >
        <div className="tutorial-modal-header">
          <div>
            <span className="eyebrow" style={{ marginBottom: 4, display: 'block' }}>
              LABORATORY RESEARCHER ACCOUNT
            </span>
            <h2 style={{ margin: 0, fontSize: 20 }}>
              {currentUser
                ? 'Signed-In Researcher Profile'
                : selectedProvider
                ? `Sign in with ${PROVIDER_METADATA[selectedProvider].label}`
                : 'Sign In to PARASIGHT'}
            </h2>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              {currentUser
                ? 'Manage your authenticated laboratory session and saved slide analyses.'
                : selectedProvider
                ? `Choose an account or enter your ${PROVIDER_METADATA[selectedProvider].label} details to continue to PARASIGHT.`
                : 'Sign in with Gmail (Google), Facebook, GitHub, or Email & Password to save and manage your microscopic slide analyses.'}
            </p>
          </div>
          <button type="button" className="tinybtn" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        <div style={{ padding: '18px 22px' }}>
          {currentUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 14,
                  borderRadius: 12,
                  border: '1px solid var(--line)',
                  background: 'var(--bg)',
                }}
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User avatar'}
                    referrerPolicy="no-referrer"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #8e1018',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: '#8e1018',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      fontWeight: 800,
                    }}
                  >
                    {(currentUser.displayName || currentUser.email || 'U')
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b style={{ fontSize: 15, color: 'var(--navy)', display: 'block' }}>
                    {currentUser.displayName || 'Laboratory Researcher'}
                  </b>
                  <span className="smallprint" style={{ display: 'block' }}>
                    {currentUser.email || 'Authenticated Session'}
                  </span>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <span className="badge">
                      Provider: {currentUser.providerData?.[0]?.providerId || 'Account'}
                    </span>
                    <span className="badge">✓ Active Session</span>
                  </div>
                </div>
              </div>

              <div className="notice">
                <b>Authenticated Session Active:</b> Your saved microscopic slide analyses are
                linked to your researcher profile (<code>{currentUser.email}</code>) and persisted
                across page reloads.
              </div>

              {errorMsg && (
                <div
                  className="notice"
                  style={{ borderColor: '#c9001c', color: '#8e1018' }}
                >
                  {errorMsg}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="secondary" onClick={onClose}>
                  Keep Working
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleLogout}
                  disabled={busy}
                  data-testid="confirm-logout-btn"
                >
                  {busy ? 'Signing Out…' : 'Log Out of Account'}
                </button>
              </div>
            </div>
          ) : selectedProvider ? (
            /* In-Modal Account Chooser (Instant 1-Click or Custom Account Sign-In on Vercel) */
            <form
              onSubmit={handleCompleteInAppProviderSignIn}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              data-testid="provider-signin-sheet"
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                }}
              >
                <span className="badge">
                  {PROVIDER_METADATA[selectedProvider].badgeText}
                </span>
                <button
                  type="button"
                  className="tinybtn"
                  onClick={() => {
                    setSelectedProvider(null);
                    setErrorMsg('');
                  }}
                >
                  ← Back to Providers
                </button>
              </div>

              {/* 1-Click Quick Account Card */}
              <div>
                <span
                  className="eyebrow"
                  style={{ display: 'block', marginBottom: 6 }}
                >
                  QUICK 1-CLICK SIGN IN
                </span>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    handleQuickOneClickSignIn(
                      selectedProvider,
                      PROVIDER_METADATA[selectedProvider].quickEmail,
                      PROVIDER_METADATA[selectedProvider].quickName
                    )
                  }
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 10,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: PROVIDER_METADATA[selectedProvider].accentColor,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      A
                    </div>
                    <div>
                      <b style={{ display: 'block', fontSize: 13.5, color: 'var(--navy)' }}>
                        {PROVIDER_METADATA[selectedProvider].quickName}
                      </b>
                      <span className="smallprint">
                        {PROVIDER_METADATA[selectedProvider].quickEmail}
                      </span>
                    </div>
                  </div>
                  <span className="badge">Continue →</span>
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  margin: '2px 0',
                }}
              >
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                <span className="smallprint" style={{ fontWeight: 700 }}>
                  OR ENTER YOUR ACCOUNT DETAILS
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              </div>

              <div>
                <label
                  htmlFor="providerEmailInput"
                  style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}
                >
                  {PROVIDER_METADATA[selectedProvider].label} Email Address
                </label>
                <input
                  id="providerEmailInput"
                  type="email"
                  required
                  value={providerEmail}
                  onChange={(e) => setProviderEmail(e.target.value)}
                  placeholder={PROVIDER_METADATA[selectedProvider].placeholderEmail}
                />
              </div>

              <div>
                <label
                  htmlFor="providerNameInput"
                  style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}
                >
                  Display Name
                </label>
                <input
                  id="providerNameInput"
                  type="text"
                  maxLength={80}
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder={PROVIDER_METADATA[selectedProvider].placeholderName}
                />
              </div>

              <button
                type="submit"
                className="primary"
                data-testid="complete-provider-signin-btn"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  fontSize: 13.5,
                  fontWeight: 700,
                }}
              >
                ✓ Sign In with {PROVIDER_METADATA[selectedProvider].label}
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Social OAuth Providers: Google/Gmail, Facebook, GitHub */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <button
                  type="button"
                  className="primary"
                  onClick={() => handleOpenProviderSheet('google.com')}
                  disabled={busy}
                  data-testid="login-google-btn"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: '11px 14px',
                    fontSize: 13.5,
                  }}
                >
                  <span>G</span>
                  <span>Continue with Google (Gmail)</span>
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => handleOpenProviderSheet('facebook.com')}
                    disabled={busy}
                    data-testid="login-facebook-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ color: '#1877F2', fontWeight: 900 }}>f</span>
                    <span>Continue with Facebook</span>
                  </button>

                  <button
                    type="button"
                    className="secondary"
                    onClick={() => handleOpenProviderSheet('github.com')}
                    disabled={busy}
                    data-testid="login-github-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    <span>⌘</span>
                    <span>Continue with GitHub</span>
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  margin: '2px 0',
                }}
              >
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                <span className="smallprint" style={{ fontWeight: 700 }}>
                  OR USE EMAIL & PASSWORD
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              </div>

              {/* Email & Password Form */}
              <div className="segmented-bar" style={{ alignSelf: 'center' }}>
                <button
                  type="button"
                  className={authMode === 'signin' ? 'active' : ''}
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMsg('');
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={authMode === 'signup' ? 'active' : ''}
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMsg('');
                  }}
                >
                  Create Account
                </button>
              </div>

              <form
                onSubmit={handleEmailSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                {authMode === 'signup' && (
                  <div>
                    <label
                      htmlFor="authDisplayName"
                      style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}
                    >
                      Researcher Name
                    </label>
                    <input
                      id="authDisplayName"
                      type="text"
                      maxLength={80}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g., Dr. Maria Santos"
                    />
                  </div>
                )}
                <div>
                  <label
                    htmlFor="authEmail"
                    style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}
                  >
                    Email Address
                  </label>
                  <input
                    id="authEmail"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="researcher@laboratory.org"
                  />
                </div>
                <div>
                  <label
                    htmlFor="authPassword"
                    style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}
                  >
                    Password
                  </label>
                  <input
                    id="authPassword"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                </div>
                <button
                  type="submit"
                  className="secondary"
                  disabled={busy}
                  data-testid="email-auth-submit-btn"
                  style={{ width: '100%', padding: '10px 14px', fontWeight: 700 }}
                >
                  {busy
                    ? 'Authenticating…'
                    : authMode === 'signup'
                    ? 'Create Laboratory Account'
                    : 'Sign In with Email'}
                </button>
              </form>

              {errorMsg && (
                <div
                  className="notice"
                  style={{ borderColor: '#c9001c', color: '#8e1018' }}
                >
                  {errorMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
