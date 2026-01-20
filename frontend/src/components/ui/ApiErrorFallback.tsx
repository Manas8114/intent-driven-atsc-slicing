import { RefreshCw, WifiOff } from 'lucide-react';
import { Button } from './Button';

interface ApiErrorFallbackProps {
    message?: string;
    onRetry?: () => void;
    className?: string;
}

/**
 * Fallback component displayed when API calls fail.
 * Shows a user-friendly message with retry option.
 */
export function ApiErrorFallback({
    message = 'Unable to connect to the backend server',
    onRetry,
    className = ''
}: ApiErrorFallbackProps) {
    return (
        <div className={`flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-xl ${className}`}>
            <div className="flex items-center gap-3 text-slate-500 mb-4">
                <WifiOff className="h-8 w-8" />
                <h3 className="text-lg font-semibold">Connection Issue</h3>
            </div>
            <p className="text-slate-600 text-center mb-4 max-w-md">
                {message}
            </p>
            <p className="text-sm text-slate-400 text-center mb-4">
                Make sure the backend server is running on port 8000.
            </p>
            {onRetry && (
                <Button
                    variant="outline"
                    onClick={onRetry}
                    className="flex items-center gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                </Button>
            )}
        </div>
    );
}
