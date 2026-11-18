import React, { useState } from 'react';
import {
  signInWithGooglePopup,
  signInWithFacebookPopup,
  signInWithGithubPopup,
  signInWithEmailPassword,
  signOutCurrentUser,
  FIREBASE_PROJECT_ID,
  type User,
} from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showProviderSetupGuide, setShowProviderSetupGuide] = useState(false);

  if (!isOpen) return null;

  const formatAuthError = (err: unknown, providerLabel: string): string => {
    const raw = err instanceof Error ? err.message : String(err);
    if (
      raw.includes('auth/operation-not-allowed') ||
      raw.includes('auth/configuration-not-found')
    ) {
      setShowProviderSetupGuide(true);
      return `${providerLabel} sign-in is not yet enabled in your Firebase project (${FIREBASE_PROJECT_ID}). Follow the quick setup guide below to enable ${providerLabel} in the Firebase Console, or sign in with Google (Gmail) right now.`;
    }
    if (raw.includes('auth/popup-closed-by-user')) {
      return `${providerLabel} sign-in popup was closed before completing authentication.`;
    }
    if (raw.includes('auth/popup-blocked')) {
      return `Your browser blocked the ${providerLabel} sign-in popup. Please allow popups for this site and try again.`;
    }
    if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (raw.includes('auth/email-already-in-use')) {
      return 'An account with this email already exists. Switch to "Sign In" above.';
    }
    if (raw.includes('auth/weak-password')) {
      return 'Password should be at least 6 characters long.';
    }
    return raw;
  };

  const handleProviderLogin = async (
    providerFn: () => Promise<User>,
    providerLabel: string
  ) => {
    setBusy(true);
    setErrorMsg('');
    try {
      await providerFn();
      onClose();
    } catch (err) {
      setErrorMsg(formatAuthError(err, providerLabel));
    } finally {
      setBusy(false);
    }
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
      setErrorMsg(formatAuthError(err, 'Email/Password'));
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    setErrorMsg('');
    try {
      await signOutCurrentUser();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const firebaseAuthConsoleUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/providers`;

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
              LABORATORY RESEARCHER ACCOUNT · FIREBASE AUTH
            </span>
            <h2 style={{ margin: 0, fontSize: 20 }}>
              {currentUser
                ? 'Signed-In Researcher Profile'
                : 'Sign In to PARASIGHT'}
            </h2>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              {currentUser
                ? 'Manage your authenticated laboratory session and cloud-synced slide analyses.'
                : 'Sign in with Gmail (Google), Facebook, GitHub, or Email & Password to sync your microscopic slide analyses across devices.'}
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
                      Provider: {currentUser.providerData?.[0]?.providerId || 'Firebase Auth'}
                    </span>
                    <span className="badge">
                      {currentUser.emailVerified ? '✓ Verified Account' : 'Unverified Email'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="notice">
                <b>Cloud Sync Active:</b> Your saved microscopic slide analyses are linked to your
                authenticated account (<code>{currentUser.uid.slice(0, 10)}…</code>) as well as
                stored for offline browser access.
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
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Social OAuth Providers: Google/Gmail, Facebook, GitHub */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <button
                  type="button"
                  className="primary"
                  onClick={() => handleProviderLogin(signInWithGooglePopup, 'Google (Gmail)')}
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
                    onClick={() => handleProviderLogin(signInWithFacebookPopup, 'Facebook')}
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
                    onClick={() => handleProviderLogin(signInWithGithubPopup, 'GitHub')}
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

              {/* Provider Console Setup Guide Toggle */}
              <div
                style={{
                  borderTop: '1px solid var(--line)',
                  paddingTop: 10,
                }}
              >
                <button
                  type="button"
                  className="tinybtn"
                  onClick={() => setShowProviderSetupGuide((v) => !v)}
                  style={{ width: '100%', textAlign: 'left' }}
                >
                  {showProviderSetupGuide ? '▾' : '▸'} How to enable Facebook, GitHub & Email
                  providers in Firebase Console
                </button>
                {showProviderSetupGuide && (
                  <div
                    className="smallprint"
                    style={{
                      marginTop: 8,
                      padding: 10,
                      borderRadius: 8,
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      lineHeight: 1.5,
                    }}
                  >
                    <b>Google (Gmail) Login is pre-configured and ready immediately.</b> To enable
                    additional providers (Facebook, GitHub, or Email/Password) in your Firebase
                    project (<code>{FIREBASE_PROJECT_ID}</code>):
                    <ol style={{ margin: '6px 0 6px 18px', padding: 0 }}>
                      <li>
                        Open the Firebase Authentication Sign-in Providers console:{' '}
                        <code>{firebaseAuthConsoleUrl}</code>
                      </li>
                      <li>
                        Click <b>Add new provider</b> and select <b>Facebook</b>, <b>GitHub</b>, or{' '}
                        <b>Email/Password</b>.
                      </li>
                      <li>
                        For Facebook/GitHub, toggle <b>Enable</b>, paste your App ID and App Secret
                        from Meta for Developers / GitHub Developer Settings, and copy the Firebase
                        OAuth redirect URI into your provider app settings.
                      </li>
                      <li>
                        If deploying on Vercel, add your <code>*.vercel.app</code> domain under{' '}
                        <b>Authentication → Settings → Authorized domains</b>.
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
