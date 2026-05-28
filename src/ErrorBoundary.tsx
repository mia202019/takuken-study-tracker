import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App runtime error:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ marginBottom: '12px' }}>画面の読み込みでエラーが発生しました</h1>
        <p style={{ marginBottom: '8px' }}>再読み込みしても直らない場合は、localStorageのデータ互換エラーの可能性があります。</p>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f7f7f7', padding: '12px', borderRadius: '8px' }}>
          {this.state.message || 'Unknown runtime error'}
        </pre>
      </main>
    );
  }
}

