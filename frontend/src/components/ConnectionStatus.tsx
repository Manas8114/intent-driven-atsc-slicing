import { WifiOff, RefreshCw } from 'lucide-react';

interface ConnectionStatusProps {
    isConnected: boolean;
    connectionError: string | null;
    onReconnect: () => void;
}

export function ConnectionStatus({ isConnected, connectionError, onReconnect }: ConnectionStatusProps) {
    if (isConnected) return null;

    return (
        <div className="connection-status-banner">
            <WifiOff size={16} />
            <span>{connectionError || 'Connection lost — real-time updates paused'}</span>
            <button onClick={onReconnect} className="reconnect-btn">
                <RefreshCw size={14} />
                Reconnect
            </button>
        </div>
    );
}
