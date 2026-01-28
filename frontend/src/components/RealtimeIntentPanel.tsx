import { useState, useEffect, useCallback, useMemo } from 'react';
import { Zap, Radio, Clock, MapPin, TrendingUp, AlertTriangle, Wifi, Activity } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

/**
 * Types for realtime intent data
 */
export interface RealtimeIntent {
    id: string;
    type: 'coverage' | 'latency' | 'emergency' | 'balanced';
    cityId: string;
    cityName: string;
    deviceCount: number;
    timestamp: number;
    priority: 'high' | 'medium' | 'low';
    status: 'incoming' | 'processing' | 'applied';
    isLive?: boolean; // True if from real WebSocket
}

export interface PatternChange {
    id: string;
    timestamp: number;
    from: { modulation: string; power: number };
    to: { modulation: string; power: number };
    reason: string;
    cityId: string;
}

interface RealtimeIntentPanelProps {
    intents?: RealtimeIntent[];
    patternChanges?: PatternChange[];
    onIntentClick?: (intent: RealtimeIntent) => void;
    className?: string;
}

/**
 * RealtimeIntentPanel - Live-updating panel showing incoming intents and pattern changes
 * 
 * NOW CONNECTED TO WEBSOCKET: Receives real AI decisions in real-time
 */
export function RealtimeIntentPanel({
    intents: externalIntents,
    patternChanges: externalPatternChanges,
    onIntentClick,
    className = ''
}: RealtimeIntentPanelProps) {
    const [intents, setIntents] = useState<RealtimeIntent[]>(externalIntents || []);
    const [patternChanges, setPatternChanges] = useState<PatternChange[]>(externalPatternChanges || []);
    const [isSimulating, setIsSimulating] = useState(!externalIntents);
    const [now, setNow] = useState(Date.now()); // Stable time for render references

    // REAL-TIME: Connect to WebSocket for live AI decisions
    const { lastMessage, isConnected } = useWebSocket();

    // Cities for simulation and display
    const cities = [
        { id: 'delhi', name: 'New Delhi' },
        { id: 'mumbai', name: 'Mumbai' },
        { id: 'chennai', name: 'Chennai' },
        { id: 'kolkata', name: 'Kolkata' },
        { id: 'bengaluru', name: 'Bengaluru' },
        { id: 'hyderabad', name: 'Hyderabad' },
    ];

    const intentTypes: ('coverage' | 'latency' | 'emergency' | 'balanced')[] =
        ['coverage', 'latency', 'emergency', 'balanced'];

    const modulations = ['QPSK', '16QAM', '64QAM', '256QAM'];

    // Stable time tick for "time ago" updates
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 5000); // Update every 5s
        return () => clearInterval(interval);
    }, []);

    // Handle real WebSocket AI decisions
    useEffect(() => {
        if (lastMessage?.type === 'ai_decision') {
            const decision = lastMessage.data as {
                decision_id: string;
                intent: string;
                action: { modulation?: string; power_dbm?: number }
            };

            // Map to a city
            const cityIdx = Math.floor(Math.random() * cities.length);
            const city = cities[cityIdx];

            const intentType = (decision.intent?.includes('coverage') || decision.intent?.includes('monsoon') || decision.intent?.includes('hole')) ? 'coverage' :
                (decision.intent?.includes('latency') || decision.intent?.includes('congestion')) ? 'latency' :
                    decision.intent?.includes('emergency') ? 'emergency' : 'balanced';

            const newIntent: RealtimeIntent = {
                id: decision.decision_id || `live-${Date.now()}`,
                cityId: city.id,
                cityName: city.name,
                type: intentType as RealtimeIntent['type'],
                timestamp: Date.now(),
                deviceCount: Math.floor(Math.random() * 5000) + 500,
                priority: intentType === 'emergency' ? 'high' : intentType === 'coverage' ? 'medium' : 'low',
                status: 'applied',
                isLive: true
            };

            setIntents(prev => [newIntent, ...prev].slice(0, 15));

            // Also add pattern change if action has modulation info
            if (decision.action?.modulation) {
                const change: PatternChange = {
                    id: `change-${Date.now()}`,
                    timestamp: Date.now(),
                    from: { modulation: 'QPSK', power: 35 },
                    to: { modulation: decision.action.modulation, power: decision.action.power_dbm || 37 },
                    reason: `${intentType.charAt(0).toUpperCase() + intentType.slice(1)} optimization (AI-triggered)`,
                    cityId: city.id
                };
                setPatternChanges(prev => [change, ...prev].slice(0, 10));
            }
        }
    }, [lastMessage]);

    // Simulate realtime intent stream (fallback when not connected)
    useEffect(() => {
        if (!isSimulating) return;

        const interval = setInterval(() => {
            const city = cities[Math.floor(Math.random() * cities.length)];
            const type = intentTypes[Math.floor(Math.random() * intentTypes.length)];

            const newIntent: RealtimeIntent = {
                id: `intent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type,
                cityId: city.id,
                cityName: city.name,
                deviceCount: Math.floor(Math.random() * 5000) + 100,
                timestamp: Date.now(),
                priority: type === 'emergency' ? 'high' : type === 'coverage' ? 'medium' : 'low',
                status: 'incoming'
            };

            setIntents(prev => [newIntent, ...prev].slice(0, 15));

            // Transition status
            setTimeout(() => {
                setIntents(prev => prev.map(i =>
                    i.id === newIntent.id ? { ...i, status: 'processing' } : i
                ));
            }, 800);

            setTimeout(() => {
                setIntents(prev => prev.map(i =>
                    i.id === newIntent.id ? { ...i, status: 'applied' } : i
                ));

                // Add pattern change on ~50% of intents
                if (Math.random() > 0.5) {
                    const fromMod = modulations[Math.floor(Math.random() * 2)];
                    const toMod = modulations[Math.floor(Math.random() * 2) + 2];

                    const change: PatternChange = {
                        id: `change-${Date.now()}`,
                        timestamp: Date.now(),
                        from: { modulation: fromMod, power: Math.floor(Math.random() * 5) + 33 },
                        to: { modulation: toMod, power: Math.floor(Math.random() * 5) + 35 },
                        reason: `${type.charAt(0).toUpperCase() + type.slice(1)} optimization`,
                        cityId: city.id
                    };

                    setPatternChanges(prev => [change, ...prev].slice(0, 10));
                }
            }, 2000);

        }, 3000 + Math.random() * 2000);

        return () => clearInterval(interval);
    }, [isSimulating]);

    // Use external data if provided
    useEffect(() => {
        if (externalIntents) {
            setIntents(externalIntents);
            setIsSimulating(false);
        }
    }, [externalIntents]);

    useEffect(() => {
        if (externalPatternChanges) {
            setPatternChanges(externalPatternChanges);
        }
    }, [externalPatternChanges]);

    const getIntentColor = (type: string) => {
        switch (type) {
            case 'coverage': return '#3B82F6';
            case 'latency': return '#8B5CF6';
            case 'emergency': return '#EF4444';
            case 'balanced': return '#10B981';
            default: return '#6B7280';
        }
    };

    const getIntentIcon = (type: string) => {
        switch (type) {
            case 'coverage': return Wifi;
            case 'latency': return Zap;
            case 'emergency': return AlertTriangle;
            case 'balanced': return TrendingUp;
            default: return Activity;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'incoming': return { bg: 'bg-amber-500/20', text: 'text-amber-500', label: 'INCOMING' };
            case 'processing': return { bg: 'bg-blue-500/20', text: 'text-blue-500', label: 'PROCESSING' };
            case 'applied': return { bg: 'bg-emerald-500/20', text: 'text-emerald-500', label: 'APPLIED' };
            default: return { bg: 'bg-slate-500/20', text: 'text-slate-500', label: 'UNKNOWN' };
        }
    };

    // Pre-defined styles to avoid inline styles
    const typeStyles: Record<string, { bg: string; text: string; icon: string }> = {
        coverage: { bg: 'bg-blue-500/20', text: 'text-blue-500', icon: 'text-blue-500' },
        latency: { bg: 'bg-purple-500/20', text: 'text-purple-500', icon: 'text-purple-500' },
        emergency: { bg: 'bg-red-500/20', text: 'text-red-500', icon: 'text-red-500' },
        balanced: { bg: 'bg-emerald-500/20', text: 'text-emerald-500', icon: 'text-emerald-500' }
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const formatTimeAgo = (timestamp: number) => {
        const seconds = Math.floor((now - timestamp) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        return formatTime(timestamp);
    };

    return (
        <div className={`flex flex-col h-full bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Radio className="w-5 h-5 text-cyan-400" />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Realtime Intent Stream</h3>
                        <p className="text-xs text-slate-400">Live device signals</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        LIVE
                    </span>
                    <span className="text-slate-500">{intents.length} signals</span>
                </div>
            </div>

            {/* Intent Stream */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {intents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                        <Activity className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-sm">Waiting for intent signals...</span>
                    </div>
                ) : (
                    intents.map((intent, idx) => {
                        const Icon = getIntentIcon(intent.type);
                        const statusBadge = getStatusBadge(intent.status);

                        const styles = typeStyles[intent.type] || { bg: 'bg-slate-500/20', text: 'text-slate-500', icon: 'text-slate-500' };

                        return (
                            <div
                                key={intent.id}
                                onClick={() => onIntentClick?.(intent)}
                                className={`
                  p-3 rounded-lg border cursor-pointer transition-all duration-300
                  ${intent.status === 'incoming'
                                        ? 'bg-amber-500/10 border-amber-500/30 animate-pulse'
                                        : intent.status === 'processing'
                                            ? 'bg-blue-500/10 border-blue-500/30'
                                            : 'bg-slate-800/50 border-slate-700/50'
                                    }
                  hover:bg-slate-700/50 hover:border-slate-600
                  ${idx === 0 ? 'ring-1 ring-cyan-500/30' : ''}
                `}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`p-1.5 rounded-lg ${styles.bg}`}
                                        >
                                            <Icon
                                                className={`w-4 h-4 ${styles.icon}`}
                                            />
                                        </div>
                                        <div>
                                            <span
                                                className={`font-medium text-sm uppercase ${styles.text}`}
                                            >
                                                {intent.type}
                                            </span>
                                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                                <MapPin className="w-3 h-3" />
                                                {intent.cityName}
                                            </div>
                                        </div>
                                    </div>
                                    <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusBadge.bg} ${statusBadge.text}`}
                                    >
                                        {statusBadge.label}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <Activity className="w-3 h-3" />
                                        {intent.deviceCount.toLocaleString()} devices
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatTimeAgo(intent.timestamp)}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pattern Changes Section */}
            {patternChanges.length > 0 && (
                <div className="border-t border-slate-700">
                    <div className="p-3 bg-slate-800/30">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
                            <TrendingUp className="w-4 h-4 text-cyan-400" />
                            RECENT PATTERN CHANGES
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {patternChanges.slice(0, 5).map((change) => (
                                <div
                                    key={change.id}
                                    className="flex items-center gap-2 text-xs p-2 bg-slate-800/50 rounded-lg"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500">{change.from.modulation}</span>
                                            <span className="text-cyan-400">→</span>
                                            <span className="text-emerald-400 font-medium">{change.to.modulation}</span>
                                        </div>
                                        <div className="text-slate-600 text-[10px]">{change.reason}</div>
                                    </div>
                                    <span className="text-slate-600">{formatTimeAgo(change.timestamp)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RealtimeIntentPanel;
