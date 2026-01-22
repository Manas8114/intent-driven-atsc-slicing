import { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity, SignalHigh } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { DeviceMetricPopup } from './DeviceMetricPopup';

/**
 * City data with position and broadcast metadata
 */
interface City {
    id: string;
    name: string;
    x: number;
    y: number;
    major: boolean;
    population: string;
    towers: number;
    coverage: number;
    signalStrength: 'strong' | 'medium' | 'weak';
}

/**
 * Realtime intent signal
 */
interface IntentSignal {
    id: string;
    cityId: string;
    type: 'coverage' | 'latency' | 'emergency' | 'balanced';
    timestamp: number;
    deviceCount: number;
}

interface InteractiveIndiaMapProps {
    onCitySelect?: (city: City | null) => void;
    selectedCityId?: string | null;
    activeIntents?: IntentSignal[];
    className?: string;
}

const CITIES: City[] = [
    { id: 'delhi', name: 'New Delhi', x: 290, y: 180, major: true, population: '32M', towers: 1240, coverage: 98, signalStrength: 'strong' },
    { id: 'mumbai', name: 'Mumbai', x: 180, y: 450, major: true, population: '22M', towers: 980, coverage: 95, signalStrength: 'strong' },
    { id: 'bengaluru', name: 'Bengaluru', x: 280, y: 620, major: true, population: '15M', towers: 850, coverage: 94, signalStrength: 'medium' },
    { id: 'kolkata', name: 'Kolkata', x: 520, y: 350, major: true, population: '16M', towers: 720, coverage: 92, signalStrength: 'medium' },
    { id: 'chennai', name: 'Chennai', x: 350, y: 640, major: true, population: '12M', towers: 680, coverage: 96, signalStrength: 'strong' },
    { id: 'hyderabad', name: 'Hyderabad', x: 300, y: 500, major: false, population: '11M', towers: 550, coverage: 93, signalStrength: 'medium' },
    { id: 'ahmedabad', name: 'Ahmedabad', x: 160, y: 320, major: false, population: '9M', towers: 420, coverage: 90, signalStrength: 'weak' },
    { id: 'pune', name: 'Pune', x: 200, y: 470, major: false, population: '7M', towers: 380, coverage: 91, signalStrength: 'medium' },
    { id: 'jaipur', name: 'Jaipur', x: 250, y: 250, major: false, population: '4M', towers: 290, coverage: 88, signalStrength: 'weak' },
    { id: 'lucknow', name: 'Lucknow', x: 350, y: 230, major: false, population: '4M', towers: 310, coverage: 89, signalStrength: 'medium' }
];

// Pre-computed network connections (avoid Math.random in render)
const NETWORK_CONNECTIONS = [
    { source: 'delhi', target: 'jaipur' },
    { source: 'delhi', target: 'lucknow' },
    { source: 'mumbai', target: 'pune' },
    { source: 'mumbai', target: 'ahmedabad' },
    { source: 'bengaluru', target: 'chennai' },
    { source: 'bengaluru', target: 'hyderabad' },
    { source: 'kolkata', target: 'delhi' },
    { source: 'hyderabad', target: 'chennai' },
    { source: 'pune', target: 'hyderabad' },
];

/**
 * InteractiveIndiaMap - Premium NOC Mode with Device Metrics
 */
export function InteractiveIndiaMap({
    onCitySelect,
    selectedCityId,
    activeIntents: externalIntents = [],
    className = ''
}: InteractiveIndiaMapProps) {
    const [hoveredCity, setHoveredCity] = useState<string | null>(null);
    const [hoveredPosition, setHoveredPosition] = useState<{ x: number; y: number } | null>(null);
    const { lastMessage } = useWebSocket();
    const [liveIntents, setLiveIntents] = useState<IntentSignal[]>([]);
    const [aiFocusRegion, setAiFocusRegion] = useState<string | null>(null);

    // Memoize city lookup
    const cityMap = useMemo(() => {
        const map = new Map<string, City>();
        CITIES.forEach(city => map.set(city.id, city));
        return map;
    }, []);

    // Process WebSocket for visual flair & Digital Twin Sync
    useEffect(() => {
        if (lastMessage?.type === 'ai_decision') {
            const decision = lastMessage.data as any;

            // Sync with AI's reported focus
            if (decision.focus_region) {
                setAiFocusRegion(decision.focus_region);
            } else {
                setAiFocusRegion(null);
            }

            const majorCities = ['delhi', 'mumbai', 'chennai', 'kolkata', 'bengaluru', 'hyderabad'];
            const cityId = majorCities[Math.floor(Math.random() * majorCities.length)];

            const intentType = decision.intent?.includes('coverage') ? 'coverage' :
                decision.intent?.includes('latency') ? 'latency' :
                    decision.intent?.includes('emergency') ? 'emergency' : 'balanced';

            const newIntent: IntentSignal = {
                id: `live-${Date.now()}`,
                cityId: decision.focus_region || cityId,
                type: intentType,
                timestamp: Date.now(),
                deviceCount: Math.floor(Math.random() * 5000) + 500
            };
            setLiveIntents(prev => [newIntent, ...prev].slice(0, 5));
        }
    }, [lastMessage]);

    const handleCityClick = useCallback(async (city: City) => {
        if (onCitySelect) onCitySelect(city);

        try {
            await fetch('http://localhost:8000/ai/focus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ region_id: city.id })
            });
        } catch (e) {
            console.error("Failed to set AI focus", e);
        }
    }, [onCitySelect]);

    const handleCityHover = useCallback((city: City | null, event?: React.MouseEvent) => {
        if (city && event) {
            const rect = (event.currentTarget as SVGElement).closest('svg')?.getBoundingClientRect();
            if (rect) {
                setHoveredPosition({
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top
                });
            }
        }
        setHoveredCity(city?.id || null);
    }, []);

    // Merge intents
    const displayIntents = useMemo(() => [...externalIntents, ...liveIntents], [externalIntents, liveIntents]);

    // Memoize active intent lookup
    const activeIntentMap = useMemo(() => {
        const map = new Map<string, IntentSignal>();
        displayIntents.forEach(intent => {
            if (!map.has(intent.cityId)) {
                map.set(intent.cityId, intent);
            }
        });
        return map;
    }, [displayIntents]);

    return (
        <div className={`relative w-full h-full overflow-hidden ${className}`}>
            {/* Use basic SVG map for structure, but style it heavily */}
            <svg
                viewBox="0 0 700 800"
                className="w-full h-full filter drop-shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                style={{ background: 'transparent' }}
            >
                <defs>
                    <radialGradient id="cityGlow" cx="0.5" cy="0.5" r="0.8">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="emergencyGlow" cx="0.5" cy="0.5" r="0.8">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#991b1b" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="focusGlow" cx="0.5" cy="0.5" r="0.8">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#7e22ce" stopOpacity="0" />
                    </radialGradient>
                    <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(34, 211, 238, 0.05)" strokeWidth="1" />
                    </pattern>
                </defs>

                {/* Grid Background */}
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Rough India Outline (simplified polygon for style) */}
                <path
                    d="M 280 50 L 350 100 L 450 120 L 550 200 L 500 400 L 550 450 L 400 750 L 300 750 L 250 550 L 100 400 L 100 300 L 200 200 L 280 50 Z"
                    fill="rgba(15, 23, 42, 0.4)"
                    stroke="#0891b2"
                    strokeWidth="1.5"
                    strokeDasharray="5,5"
                />

                {/* Connections (Network Topology) - Pre-computed for performance */}
                <g className="opacity-30">
                    {NETWORK_CONNECTIONS.map((conn) => {
                        const source = cityMap.get(conn.source);
                        const target = cityMap.get(conn.target);
                        if (!source || !target) return null;

                        const isActive = activeIntentMap.has(conn.source) || activeIntentMap.has(conn.target);
                        return (
                            <line
                                key={`${conn.source}-${conn.target}`}
                                x1={source.x} y1={source.y}
                                x2={target.x} y2={target.y}
                                stroke={isActive ? "#22d3ee" : "#1e293b"}
                                strokeWidth={isActive ? 2 : 0.5}
                            />
                        );
                    })}
                </g>

                {/* Cities */}
                {CITIES.map(city => {
                    const activeIntent = activeIntentMap.get(city.id);
                    const isHovered = hoveredCity === city.id;
                    const isSelected = selectedCityId === city.id;
                    const isAiFocused = aiFocusRegion === city.id;

                    return (
                        <g
                            key={city.id}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={(e) => handleCityHover(city, e)}
                            onMouseLeave={() => handleCityHover(null)}
                            onClick={() => handleCityClick(city)}
                        >
                            {/* Pulse Effect for Active/Major/Focused - Reduced animation */}
                            {(activeIntent || isAiFocused) && (
                                <circle
                                    cx={city.x} cy={city.y}
                                    r={activeIntent ? 30 : 40}
                                    fill={activeIntent?.type === 'emergency' ? "url(#emergencyGlow)" : "url(#focusGlow)"}
                                    opacity="0.6"
                                />
                            )}

                            {/* Target Reticle for AI Focus */}
                            {isAiFocused && (
                                <g>
                                    <circle cx={city.x} cy={city.y} r="22" fill="none" stroke="#a855f7" strokeWidth="1" strokeDasharray="4,4" />
                                    <line x1={city.x - 25} y1={city.y} x2={city.x - 10} y2={city.y} stroke="#a855f7" strokeWidth="1" />
                                    <line x1={city.x + 10} y1={city.y} x2={city.x + 25} y2={city.y} stroke="#a855f7" strokeWidth="1" />
                                    <line x1={city.x} y1={city.y - 25} x2={city.x} y2={city.y - 10} stroke="#a855f7" strokeWidth="1" />
                                    <line x1={city.x} y1={city.y + 10} x2={city.x} y2={city.y + 25} stroke="#a855f7" strokeWidth="1" />
                                </g>
                            )}

                            {/* City Dot */}
                            <circle
                                cx={city.x} cy={city.y}
                                r={city.major ? 6 : 4}
                                fill={activeIntent?.type === 'emergency' ? "#ef4444" : isAiFocused ? "#a855f7" : "#06b6d4"}
                                stroke="#fff"
                                strokeWidth={isSelected || isAiFocused ? 2 : 1}
                                className="transition-all duration-300"
                            />

                            {/* Label */}
                            {(isHovered || city.major) && (
                                <g transform={`translate(${city.x + 10}, ${city.y - 10})`}>
                                    <rect x="-5" y="-15" width="100" height="25" rx="4" fill="rgba(15, 23, 42, 0.8)" stroke="#334155" strokeWidth="1" />
                                    <text x="5" y="2" fill="#fff" fontSize="12" fontWeight="bold" fontFamily="monospace">
                                        {city.name.toUpperCase()}
                                    </text>
                                </g>
                            )}

                            {/* Active Intent Popup */}
                            {activeIntent && (
                                <g transform={`translate(${city.x - 40}, ${city.y + 25})`}>
                                    <rect width="80" height="20" rx="2" fill={activeIntent.type === 'emergency' ? "#991b1b" : "#06b6d4"} />
                                    <text x="40" y="14" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                                        {activeIntent.type.toUpperCase()}
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}

                {/* Scanning Line Effect (CSS Assisted) */}
                <line
                    x1="0" y1="0"
                    x2="700" y2="0"
                    stroke="rgba(34, 211, 238, 0.1)"
                    strokeWidth="2"
                    style={{
                        pointerEvents: 'none',
                        animation: 'scanline 4s linear infinite'
                    }}
                >
                    <style>{`
                        @keyframes scanline {
                            0% { transform: translateY(0px); }
                            100% { transform: translateY(800px); }
                        }
                    `}</style>
                </line>
            </svg>

            {/* Device Metric Popup on Hover */}
            {hoveredCity && hoveredPosition && (
                <DeviceMetricPopup
                    deviceId={hoveredCity}
                    deviceName={cityMap.get(hoveredCity)?.name || hoveredCity}
                    position={hoveredPosition}
                    onClose={() => setHoveredCity(null)}
                />
            )}

            {/* Overlay Info (Top Right) */}
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur p-4 rounded-lg border border-slate-700 shadow-2xl">
                <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-slate-300 uppercase">Live Network Status</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="text-slate-500">Active Nodes</div>
                    <div className="text-right text-white">1,240</div>
                    <div className="text-slate-500">Traffic Load</div>
                    <div className="text-right text-emerald-400">42 TB/s</div>
                    <div className="text-slate-500">Signal Integrity</div>
                    <div className="text-right text-cyan-400">99.8%</div>
                </div>
            </div>
        </div>
    );
}

