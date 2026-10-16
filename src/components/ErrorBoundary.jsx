import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="page error-page" role="alert">
          <header className="page-header">
            <p className="eyebrow">Error</p>
            <h1>Something went wrong</h1>
            <p className="page-lead">We encountered an error loading this page.</p>
            <div className="action-group">
              <button type="button" onClick={() => window.location.reload()} className="action-button">Reload page</button>
            </div>
          </header>
        </main>
      );
    }

    return this.props.children;
  }
}