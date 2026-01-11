import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallbackMessage?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch and gracefully handle React errors.
 * 
 * Prevents the entire app from crashing when a single component fails.
 * Shows a user-friendly fallback UI instead of blank screen.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });

        // Log to demo events (optional backend logging)
        try {
            fetch('http://localhost:8000/env/demo-events', {
                method: 'GET'
            }).catch(() => { });
        } catch (e) {
            // Ignore logging failures
        }
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-8 bg-amber-50 border border-amber-200 rounded-xl m-4">
                    <div className="flex items-center gap-3 text-amber-600 mb-4">
                        <AlertTriangle className="h-8 w-8" />
                        <h3 className="text-lg font-bold">Module Temporarily Unavailable</h3>
                    </div>
                    <p className="text-amber-700 text-center mb-4 max-w-md">
                        {this.props.fallbackMessage ||
                            "This component encountered an error. The rest of the system is still operational."}
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Retry
                    </button>
                    {this.state.error && (
                        <details className="mt-4 text-xs text-amber-600 max-w-lg">
                            <summary className="cursor-pointer">Technical Details</summary>
                            <pre className="mt-2 p-2 bg-white rounded border overflow-auto max-h-40">
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Wrapper hook for functional components to use error boundaries.
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export function withErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    fallbackMessage?: string
) {
    return function WithErrorBoundary(props: P) {
        return (
            <ErrorBoundary fallbackMessage={fallbackMessage}>
                <WrappedComponent {...props} />
            </ErrorBoundary>
        );
    };
}
