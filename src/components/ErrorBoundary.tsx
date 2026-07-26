"use client";

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Custom Fallback UI for our native ErrorBoundary
function SimpleErrorFallback({ error, onReset }: { error: Error | null, onReset: () => void }) {
    const errorMessage = error?.message || String(error) || "Үл мэдэгдэх алдаа";

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#121212] border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8 text-primary" />
                </div>

                <h2 className="text-2xl font-black text-white mb-2">Алдаа гарлаа</h2>
                <p className="text-muted mb-4 text-sm opacity-60">
                    Уучлаарай, ямар нэг зүйл буруу болсон байна.
                </p>

                <details className="mb-6 text-left border border-white/10 rounded-xl p-3 bg-black/40">
                    <summary className="cursor-pointer text-xs text-muted hover:text-white transition-colors select-none font-semibold">
                        Алдааны дэлгэрэнгүй харах
                    </summary>
                    <pre className="mt-2 text-[11px] bg-black p-3 rounded-lg overflow-auto max-h-40 text-red-400 font-mono border border-red-500/20 whitespace-pre-wrap break-all">
                        {errorMessage}
                    </pre>
                </details>

                <div className="flex gap-3">
                    <button
                        onClick={onReset}
                        className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-xs hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Дахин ачаалах
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="flex-1 bg-white/5 text-white py-3 rounded-xl font-bold text-xs hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                    >
                        <Home className="w-4 h-4" />
                        Нүүр
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper to check if error is a Next.js internal control-flow exception or unmount animation error
function isNextInternalError(error: any): boolean {
  if (!error) return false;
  const digest = String(error.digest || '');
  const message = String(error.message || error || '').toLowerCase();
  const name = String(error.name || '').toLowerCase();

  return (
    digest.includes('NEXT_REDIRECT') ||
    digest.includes('NEXT_NOT_FOUND') ||
    message.includes('next_redirect') ||
    message.includes('next_not_found') ||
    name === 'next_redirect' ||
    message.includes('parentnode') ||
    message.includes('getboundingclientrect') ||
    message.includes('load failed') ||
    message.includes('failed to fetch') ||
    message.includes('react error #300') ||
    message.includes('minified react error') ||
    name === 'aborterror'
  );
}

// Native React Class Boundary (The most reliable way to catch errors)
export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    if (isNextInternalError(error)) {
      // Do NOT catch Next.js redirect or notFound control flow exceptions
      return { hasError: false, error: null };
    }
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isNextInternalError(error)) {
      return;
    }
    // Log the error to an error reporting service if needed
    console.error('Error caught by GlobalErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Resetting usually involves redirecting or clearing state
    window.location.reload();
  };

  render() {
    if (this.state.hasError && !isNextInternalError(this.state.error)) {
      return (
        <SimpleErrorFallback 
            error={this.state.error} 
            onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
