import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorText: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorText: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorText: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('PARASIGHT ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 28, maxWidth: 680, margin: '40px auto' }}>
          <div className="card">
            <span className="eyebrow">APPLICATION DIAGNOSTIC NOTICE</span>
            <h2>An unexpected error occurred</h2>
            <pre
              className="mono"
              style={{
                padding: 12,
                borderRadius: 8,
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
              }}
            >
              {this.state.errorText}
            </pre>
            <button
              type="button"
              className="primary"
              onClick={() => this.setState({ hasError: false, errorText: '' })}
            >
              Resume Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
