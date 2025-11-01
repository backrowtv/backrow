"use client";

import { Component, ReactNode } from "react";
import { FilmReel } from "@phosphor-icons/react";

interface CarouselErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
}

interface CarouselErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary specifically for carousel components.
 * Provides a graceful fallback when carousel rendering fails.
 */
export class CarouselErrorBoundary extends Component<
  CarouselErrorBoundaryProps,
  CarouselErrorBoundaryState
> {
  constructor(props: CarouselErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): CarouselErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error("Carousel error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center p-8 rounded-lg border"
          style={{
            backgroundColor: "var(--surface-1)",
            borderColor: "var(--border)",
            minHeight: 200,
          }}
        >
          <FilmReel className="w-12 h-12 mb-4" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
            {this.props.fallbackMessage || "Unable to load content"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 text-sm rounded-md transition-colors hover:opacity-80"
            style={{
              backgroundColor: "var(--surface-2)",
              color: "var(--text-primary)",
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
