import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Zap, Radio, AlertTriangle } from 'lucide-react';

interface PhysicsLog {
    timestamp: string;
    inputs: {
        tx_power_dbm: number;
        path_loss_exponent: number;
        path_loss_db: number;
        shadowing_db: number;
        noise_floor_dbm: number;
        thermal_noise_db: number;
        modulation: string;
        is_emergency: boolean;
    };
    outputs: {
        rx_power_dbm: number;
        snr_db: number;
        service_acquisition: number;
    };
    quality: 'good' | 'fair' | 'poor';
    hurdle?: string;
    scenario?: string;
}

interface LogEntry {
    id: string;
    timestamp: string;
    type: 'physics' | 'intent' | 'decision' | 'system';
    content: string;
    quality?: 'good' | 'fair' | 'poor';
}

const API_BASE = 'http://localhost:8000';

export const IntentLogTerminal: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLive, setIsLive] = useState(true);
    const terminalRef = useRef<HTMLDivElement>(null);
    const [lastPhysics, setLastPhysics] = useState<PhysicsLog | null>(null);

    const lastPhysicsRef = useRef<PhysicsLog | null>(null);

    // Fetch physics telemetry
    useEffect(() => {
        if (!isLive) return;

        const fetchPhysics = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/telemetry/physics`);
                const data = await res.json();

                if (data.physics_log && data.physics_log.timestamp) {
                    const physics = data.physics_log as PhysicsLog;
                    const prev = lastPhysicsRef.current;

                    // Only add if timestamp changed
                    if (!prev || physics.timestamp !== prev.timestamp) {
                        lastPhysicsRef.current = physics;
                        setLastPhysics(physics);

                        const newLog: LogEntry = {
                            id: `phy-${Date.now()}`,
                            timestamp: new Date().toLocaleTimeString(),
                            type: 'physics',
                            content: `TX:${physics.inputs.tx_power_dbm}dBm → PL:${physics.inputs.path_loss_db}dB → RX:${physics.outputs.rx_power_dbm}dBm | SNR:${physics.outputs.snr_db}dB | Mod:${physics.inputs.modulation}`,
                            quality: physics.quality,
                        };

                        setLogs(prevLogs => {
                            const updated = [...prevLogs, newLog];

                            // Check for System Events (Surges/Hazards)
                            if (physics.hurdle && physics.hurdle !== 'reset' && physics.scenario) {
                                const alertLog: LogEntry = {
                                    id: `alert-${Date.now()}`,
                                    timestamp: new Date().toLocaleTimeString(),
                                    type: 'system',
                                    content: `[ALERT] ${physics.scenario.toUpperCase()}`,
                                    quality: 'poor' // Red color
                                };
                                updated.push(alertLog);
                            }

                            // Keep last 50 entries
                            return updated.slice(-50);
                        });
                    }
                }
            } catch {
                // Silently fail - backend might be restarting
            }
        };

        const interval = setInterval(fetchPhysics, 1000);
        return () => clearInterval(interval);
    }, [isLive]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (terminalRef.current && isLive) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs, isLive]);

    const getQualityColor = (quality?: string) => {
        switch (quality) {
            case 'good': return 'text-green-400';
            case 'fair': return 'text-yellow-400';
            case 'poor': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'physics': return <Radio className="w-3 h-3" />;
            case 'intent': return <Zap className="w-3 h-3 text-purple-400" />;
            case 'decision': return <Terminal className="w-3 h-3 text-blue-400" />;
            default: return <AlertTriangle className="w-3 h-3 text-gray-400" />;
        }
    };

    return (
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-mono text-gray-200">Physics Telemetry Stream</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setLogs([])}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                        Clear
                    </button>
                    <button
                        onClick={() => setIsLive(!isLive)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${isLive ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                            }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-300 animate-pulse' : 'bg-gray-400'}`} />
                        {isLive ? 'LIVE' : 'PAUSED'}
                    </button>
                </div>
            </div>

            {/* Terminal Body */}
            <div
                ref={terminalRef}
                className="h-64 overflow-y-auto font-mono text-xs p-3 space-y-1"
                style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #111827 100%)' }}
            >
                {logs.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                        Waiting for physics telemetry...
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2 hover:bg-gray-800/50 px-1 rounded">
                            <span className="text-gray-600 w-16 flex-shrink-0">{log.timestamp}</span>
                            <span className="flex-shrink-0">{getTypeIcon(log.type)}</span>
                            <span className={`flex-1 ${getQualityColor(log.quality)}`}>
                                {log.content}
                            </span>
                            {log.quality && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${log.quality === 'good' ? 'bg-green-900/50 text-green-400' :
                                    log.quality === 'fair' ? 'bg-yellow-900/50 text-yellow-400' :
                                        'bg-red-900/50 text-red-400'
                                    }`}>
                                    {log.quality}
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Footer Stats */}
            {lastPhysics && (
                <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 flex items-center justify-between text-xs">
                    <div className="flex gap-4">
                        <span className="text-gray-400">
                            SNR: <span className={getQualityColor(lastPhysics.quality)}>{lastPhysics.outputs.snr_db} dB</span>
                        </span>
                        <span className="text-gray-400">
                            Acquisition: <span className="text-blue-400">{lastPhysics.outputs.service_acquisition}%</span>
                        </span>
                    </div>
                    <span className="text-gray-500">
                        {lastPhysics.inputs.is_emergency && (
                            <span className="text-red-400 font-bold mr-2">⚠ EMERGENCY</span>
                        )}
                        Mod: {lastPhysics.inputs.modulation}
                    </span>
                </div>
            )}
        </div>
    );
};

export default IntentLogTerminal;
