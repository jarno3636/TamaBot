// components/ErrorBoundary.tsx
"use client";

import React from "react";

type Props = { children: React.ReactNode };

type State = { hasError: boolean; message?: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message:
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Unknown runtime error",
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("Runtime error in app:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-red-200 flex items-center justify-center p-4">
          <div className="max-w-md text-center">
            <h1 className="text-lg font-semibold mb-2">
              Something went wrong loading Basebots.
            </h1>
            <p className="text-sm mb-2">{this.state.message}</p>
            <p className="text-xs text-red-300/80">
              If this only happens in a dapp browser, it&apos;s likely an
              unsupported feature (BigInt, CSP, or wallet provider). Try a
              modern browser like Chrome/Safari while we harden the embed.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
