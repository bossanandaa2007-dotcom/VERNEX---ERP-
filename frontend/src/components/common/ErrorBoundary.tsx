import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled application error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md rounded border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Application Error</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">Something went wrong.</h1>
            <p className="mt-3 text-sm text-slate-600">Refresh the page or sign in again. If the problem continues, contact support.</p>
            <button
              type="button"
              onClick={() => window.location.assign('/login')}
              className="mt-6 rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Return to login
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
