import { useState, useCallback, useMemo, useEffect } from 'react';
import { Radio, Wifi, Zap, Users } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

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

/**
 * InteractiveIndiaMap - A stunning, interactive broadcast-themed India map
 * Features: Clickable cities, tooltips, zoom, broadcast signals, realtime intents
 * 
 * NOW CONNECTED TO WEBSOCKET: Receives real-time AI decision updates
 */
export function InteractiveIndiaMap({
    onCitySelect,
    selectedCityId,
    activeIntents: externalIntents = [],
    className = ''
}: InteractiveIndiaMapProps) {
    const [hoveredCity, setHoveredCity] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    // REAL-TIME: Connect to WebSocket for live AI decision updates
    const { lastMessage, isConnected } = useWebSocket();
    const [liveIntents, setLiveIntents] = useState<IntentSignal[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Process incoming WebSocket messages
    useEffect(() => {
        if (lastMessage?.type === 'ai_decision') {
            const decision = lastMessage.data as { decision_id: string; intent: string; action: Record<string, unknown> };

            // Map intent to a random major city for demo visualization
            const majorCities = ['delhi', 'mumbai', 'chennai', 'kolkata', 'bengaluru', 'hyderabad'];
            const cityId = majorCities[Math.floor(Math.random() * majorCities.length)];

            const intentType = decision.intent?.includes('coverage') ? 'coverage' :
                decision.intent?.includes('latency') ? 'latency' :
                    decision.intent?.includes('emergency') ? 'emergency' : 'balanced';

            const newIntent: IntentSignal = {
                id: decision.decision_id || `live-${Date.now()}`,
                cityId,
                type: intentType as IntentSignal['type'],
                timestamp: Date.now(),
                deviceCount: Math.floor(Math.random() * 5000) + 500
            };

            setLiveIntents(prev => [newIntent, ...prev].slice(0, 10));
            setLiveIntents(prev => [newIntent, ...prev].slice(0, 10));
        }

        // CHAOS DIRECTOR: Immediate refresh on scenario injection
        if (lastMessage?.type === 'scenario_event') {
            console.log("Scenario active, refreshing map...", lastMessage.data);
            // Small delay to allow backend state to update
            setTimeout(() => setRefreshTrigger(prev => prev + 1), 500);
        }
    }, [lastMessage]);

    // Combine external and live intents
    const activeIntents = useMemo(() =>
        [...liveIntents, ...externalIntents].slice(0, 15),
        [liveIntents, externalIntents]
    );

    // Per-city AI state from backend
    interface CityAIState {
        id: string;
        coverage_pct: number;
        signal_quality: string;
        active_intent: string;
        current_modulation: string;
        device_count: number;
    }
    const [cityStates, setCityStates] = useState<Record<string, CityAIState>>({});

    // Fetch per-city AI state every 5 seconds
    useEffect(() => {
        const fetchCityStates = async () => {
            try {
                const response = await fetch('http://localhost:8000/ai/city-state');
                if (response.ok) {
                    const data = await response.json();
                    const stateMap: Record<string, CityAIState> = {};
                    data.cities?.forEach((city: CityAIState) => {
                        stateMap[city.id] = city;
                    });
                    setCityStates(stateMap);
                }
            } catch (e) {
                // Silent fail - use static data as fallback
            }
        };

        fetchCityStates();
        fetchCityStates();
        const interval = setInterval(fetchCityStates, 5000);
        return () => clearInterval(interval);
    }, [refreshTrigger]);

    // Major Indian cities with broadcast data (enhanced with live AI state)
    const cities: City[] = useMemo(() => {
        const baseCities = [
            { id: 'delhi', name: 'New Delhi', x: 280, y: 155, major: true, population: '32.9M', towers: 245, coverage: 98.5, signalStrength: 'strong' as const },
            { id: 'mumbai', name: 'Mumbai', x: 175, y: 340, major: true, population: '21.0M', towers: 189, coverage: 97.2, signalStrength: 'strong' as const },
            { id: 'chennai', name: 'Chennai', x: 275, y: 470, major: true, population: '11.2M', towers: 134, coverage: 95.8, signalStrength: 'strong' as const },
            { id: 'kolkata', name: 'Kolkata', x: 385, y: 270, major: true, population: '14.8M', towers: 156, coverage: 94.5, signalStrength: 'strong' as const },
            { id: 'bengaluru', name: 'Bengaluru', x: 240, y: 450, major: true, population: '13.2M', towers: 167, coverage: 96.3, signalStrength: 'strong' as const },
            { id: 'hyderabad', name: 'Hyderabad', x: 255, y: 385, major: true, population: '10.5M', towers: 123, coverage: 93.7, signalStrength: 'strong' as const },
            { id: 'ahmedabad', name: 'Ahmedabad', x: 170, y: 260, major: false, population: '8.4M', towers: 89, coverage: 91.2, signalStrength: 'medium' as const },
            { id: 'pune', name: 'Pune', x: 195, y: 365, major: false, population: '6.8M', towers: 78, coverage: 90.5, signalStrength: 'medium' as const },
            { id: 'jaipur', name: 'Jaipur', x: 230, y: 195, major: false, population: '4.1M', towers: 56, coverage: 88.3, signalStrength: 'medium' as const },
            { id: 'lucknow', name: 'Lucknow', x: 315, y: 200, major: false, population: '3.6M', towers: 48, coverage: 86.7, signalStrength: 'medium' as const },
            { id: 'bhopal', name: 'Bhopal', x: 255, y: 280, major: false, population: '2.4M', towers: 34, coverage: 84.2, signalStrength: 'medium' as const },
            { id: 'patna', name: 'Patna', x: 360, y: 225, major: false, population: '2.5M', towers: 32, coverage: 82.5, signalStrength: 'weak' as const },
            { id: 'chandigarh', name: 'Chandigarh', x: 260, y: 135, major: false, population: '1.2M', towers: 28, coverage: 89.1, signalStrength: 'medium' as const },
            { id: 'guwahati', name: 'Guwahati', x: 445, y: 215, major: false, population: '1.1M', towers: 24, coverage: 78.3, signalStrength: 'weak' as const },
            { id: 'kochi', name: 'Kochi', x: 220, y: 510, major: false, population: '2.1M', towers: 45, coverage: 91.8, signalStrength: 'medium' as const },
            { id: 'visakhapatnam', name: 'Vizag', x: 325, y: 395, major: false, population: '2.0M', towers: 38, coverage: 85.4, signalStrength: 'medium' as const },
        ];

        // Merge with live AI state
        return baseCities.map(city => {
            const aiState = cityStates[city.id];
            if (aiState) {
                return {
                    ...city,
                    coverage: aiState.coverage_pct,
                    signalStrength: (aiState.signal_quality === 'excellent' || aiState.signal_quality === 'good' ? 'strong' :
                        aiState.signal_quality === 'moderate' ? 'medium' : 'weak') as City['signalStrength']
                };
            }
            return city;
        });
    }, [cityStates]);

    // Network connections between cities
    const connections = useMemo(() => [
        ['delhi', 'mumbai'], ['delhi', 'kolkata'], ['delhi', 'jaipur'],
        ['delhi', 'lucknow'], ['delhi', 'chandigarh'], ['mumbai', 'chennai'],
        ['mumbai', 'bengaluru'], ['mumbai', 'pune'], ['mumbai', 'ahmedabad'],
        ['chennai', 'bengaluru'], ['chennai', 'hyderabad'], ['chennai', 'kochi'],
        ['kolkata', 'patna'], ['kolkata', 'guwahati'], ['bengaluru', 'hyderabad'],
        ['bhopal', 'delhi'], ['bhopal', 'mumbai'], ['hyderabad', 'visakhapatnam'],
    ], []);

    const getCityById = useCallback((id: string) => cities.find(c => c.id === id), [cities]);

    const handleCityClick = useCallback((city: City) => {
        onCitySelect?.(selectedCityId === city.id ? null : city);
    }, [onCitySelect, selectedCityId]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.min(2, Math.max(0.5, prev + delta)));
    }, []);

    const getSignalColor = (strength: string) => {
        switch (strength) {
            case 'strong': return '#10B981';
            case 'medium': return '#F59E0B';
            case 'weak': return '#EF4444';
            default: return '#6B7280';
        }
    };

    const getIntentColor = (type: string) => {
        switch (type) {
            case 'coverage': return '#3B82F6';
            case 'latency': return '#8B5CF6';
            case 'emergency': return '#EF4444';
            case 'balanced': return '#10B981';
            default: return '#6B7280';
        }
    };

    return (
        <div
            className={`relative overflow-hidden ${className}`}
            onWheel={handleWheel}
        >
            {/* Premium gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

            {/* Animated grid pattern */}
            <div className="absolute inset-0 opacity-20 india-map-grid" />

            {/* Radial glow effects */}
            <div className="absolute inset-0 india-map-glow" />

            {/* Main SVG Map */}
            <svg
                viewBox="0 0 500 600"
                className="absolute inset-0 w-full h-full transition-transform duration-300"
                style={{
                    transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                    transformOrigin: 'center'
                }}
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    {/* Enhanced gradients */}
                    <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.7" />
                        <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.3" />
                    </linearGradient>

                    <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.3" />
                    </linearGradient>

                    <filter id="broadcastGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Animated dash pattern */}
                    <pattern id="dataFlow" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1.5" fill="#3B82F6" opacity="0.6">
                            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                    </pattern>
                </defs>

                {/* India outline - more detailed shape */}
                <path
                    d="M 255 55 
             C 290 50, 330 65, 355 90 
             L 380 115 L 410 145 L 435 175 L 445 210
             L 450 235 L 445 260 L 440 290
             L 420 280 L 400 275 L 395 295
             L 400 320 L 395 350 L 385 380
             L 375 410 L 355 445 L 335 475
             L 315 500 L 290 520 L 265 535
             L 240 530 L 215 515 L 195 495
             L 180 470 L 170 440 L 165 410
             L 155 380 L 150 350 L 152 320
             L 155 290 L 160 260 L 162 230
             L 168 200 L 175 175 L 188 150
             L 205 125 L 225 100 L 245 75
             L 255 55"
                    fill="url(#mapGradient)"
                    stroke="url(#connectionGradient)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="india-outline"
                />

                {/* State boundaries (simplified) */}
                <g className="state-lines opacity-20">
                    <path d="M 220 280 Q 250 300 280 280" stroke="#0EA5E9" strokeWidth="0.5" fill="none" />
                    <path d="M 180 350 Q 220 380 260 350" stroke="#0EA5E9" strokeWidth="0.5" fill="none" />
                    <path d="M 300 200 L 350 230" stroke="#0EA5E9" strokeWidth="0.5" fill="none" />
                </g>

                {/* Network connections with animated signal pulses */}
                {connections.map(([from, to], idx) => {
                    const fromCity = getCityById(from);
                    const toCity = getCityById(to);
                    if (!fromCity || !toCity) return null;

                    const isActive = selectedCityId === from || selectedCityId === to ||
                        hoveredCity === from || hoveredCity === to;

                    return (
                        <g key={`connection-${idx}`}>
                            {/* Base connection */}
                            <line
                                x1={fromCity.x}
                                y1={fromCity.y}
                                x2={toCity.x}
                                y2={toCity.y}
                                stroke={isActive ? '#0EA5E9' : 'rgba(14, 165, 233, 0.2)'}
                                strokeWidth={isActive ? 2 : 1}
                                strokeDasharray={isActive ? 'none' : '4,4'}
                                className="transition-all duration-300"
                            />

                            {/* Signal Wave Animation */}
                            <circle
                                r={isActive ? 3 : 2}
                                fill={isActive ? '#22D3EE' : '#0EA5E9'}
                                filter="url(#broadcastGlow)"
                            >
                                <animateMotion
                                    dur={`${2 + (idx % 3) * 0.5}s`}
                                    repeatCount="indefinite"
                                    path={`M ${fromCity.x},${fromCity.y} L ${toCity.x},${toCity.y}`}
                                />
                                <animate
                                    attributeName="opacity"
                                    values="0.8;0.2;0.8"
                                    dur="2s"
                                    repeatCount="indefinite"
                                />
                            </circle>
                        </g>
                    );
                })}

                {/* Broadcast coverage zones */}
                {cities.filter(c => c.major).map((city, idx) => (
                    <g key={`coverage-${city.id}`}>
                        {[1, 2, 3, 4].map((ring) => (
                            <circle
                                key={`ring-${city.id}-${ring}`}
                                cx={city.x}
                                cy={city.y}
                                r="8"
                                fill="none"
                                stroke={getSignalColor(city.signalStrength)}
                                strokeWidth="1.5"
                                opacity="0"
                            >
                                <animate
                                    attributeName="r"
                                    values="8;50;70"
                                    dur="4s"
                                    begin={`${ring * 0.8 + idx * 0.4}s`}
                                    repeatCount="indefinite"
                                />
                                <animate
                                    attributeName="opacity"
                                    values="0.5;0.15;0"
                                    dur="4s"
                                    begin={`${ring * 0.8 + idx * 0.4}s`}
                                    repeatCount="indefinite"
                                />
                            </circle>
                        ))}
                    </g>
                ))}

                {/* Active intent pulses */}
                {activeIntents.map((intent) => {
                    const city = getCityById(intent.cityId);
                    if (!city) return null;

                    return (
                        <g key={intent.id}>
                            <circle
                                cx={city.x}
                                cy={city.y}
                                r="10"
                                fill={getIntentColor(intent.type)}
                                opacity="0"
                            >
                                <animate
                                    attributeName="r"
                                    values="10;60;80"
                                    dur="2s"
                                    repeatCount="1"
                                />
                                <animate
                                    attributeName="opacity"
                                    values="0.8;0.3;0"
                                    dur="2s"
                                    repeatCount="1"
                                />
                            </circle>
                        </g>
                    );
                })}

                {/* City nodes - Interactive */}
                {cities.map((city) => {
                    const isSelected = selectedCityId === city.id;
                    const isHovered = hoveredCity === city.id;
                    const isHighlighted = isSelected || isHovered;

                    return (
                        <g
                            key={city.id}
                            className="cursor-pointer transition-all duration-200"
                            onClick={() => handleCityClick(city)}
                            onMouseEnter={() => setHoveredCity(city.id)}
                            onMouseLeave={() => setHoveredCity(null)}
                            style={{ pointerEvents: 'auto' }}
                        >
                            {/* Selection ring */}
                            {isSelected && (
                                <circle
                                    cx={city.x}
                                    cy={city.y}
                                    r={city.major ? 22 : 16}
                                    fill="none"
                                    stroke="#0EA5E9"
                                    strokeWidth="2"
                                    strokeDasharray="4,2"
                                    filter="url(#glow)"
                                >
                                    <animateTransform
                                        attributeName="transform"
                                        type="rotate"
                                        from={`0 ${city.x} ${city.y}`}
                                        to={`360 ${city.x} ${city.y}`}
                                        dur="10s"
                                        repeatCount="indefinite"
                                    />
                                </circle>
                            )}

                            {/* Outer glow */}
                            <circle
                                cx={city.x}
                                cy={city.y}
                                r={city.major ? 16 : 10}
                                fill={`${getSignalColor(city.signalStrength)}15`}
                                stroke={`${getSignalColor(city.signalStrength)}40`}
                                strokeWidth="1"
                                className="transition-all duration-200"
                                filter={isHighlighted ? 'url(#glow)' : 'none'}
                            >
                                <animate
                                    attributeName="r"
                                    values={city.major ? "16;19;16" : "10;12;10"}
                                    dur="3s"
                                    repeatCount="indefinite"
                                />
                            </circle>

                            {/* Core dot */}
                            <circle
                                cx={city.x}
                                cy={city.y}
                                r={isHighlighted ? (city.major ? 8 : 5) : (city.major ? 6 : 4)}
                                fill={getSignalColor(city.signalStrength)}
                                className="transition-all duration-200"
                            >
                                <animate
                                    attributeName="opacity"
                                    values="1;0.7;1"
                                    dur="2s"
                                    repeatCount="indefinite"
                                />
                            </circle>

                            {/* Tower icon for major cities */}
                            {city.major && (
                                <g transform={`translate(${city.x - 5}, ${city.y - 22})`} opacity={isHighlighted ? 1 : 0.7}>
                                    <path
                                        d="M 5 18 L 5 8 M 2 10 L 5 5 L 8 10 M 0 6 L 5 0 L 10 6"
                                        fill="none"
                                        stroke="#0EA5E9"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </g>
                            )}

                            {/* City label */}
                            <text
                                x={city.x}
                                y={city.y + (city.major ? 32 : 22)}
                                textAnchor="middle"
                                className="select-none"
                                fill={isHighlighted ? '#F0F9FF' : '#94A3B8'}
                                fontSize={city.major ? 10 : 8}
                                fontFamily="monospace"
                                fontWeight={isHighlighted ? 600 : 400}
                            >
                                {city.name.toUpperCase()}
                            </text>
                        </g>
                    );
                })}

                {/* Decorative frame corners */}
                <g className="opacity-50">
                    <path d="M 25 25 L 25 55 M 25 25 L 55 25" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 475 25 L 475 55 M 475 25 L 445 25" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 25 575 L 25 545 M 25 575 L 55 575" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 475 575 L 475 545 M 475 575 L 445 575" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" />
                </g>

                {/* Footer label */}
                <text
                    x="250"
                    y="590"
                    textAnchor="middle"
                    fill="#475569"
                    fontSize="9"
                    fontFamily="monospace"
                    letterSpacing="0.2em"
                >
                    ATSC 3.0 BROADCAST COVERAGE NETWORK • INDIA
                </text>
            </svg>

            {/* Hover tooltip - Control Room Style */}
            {hoveredCity && !selectedCityId && (
                <div
                    className="absolute z-50 glass-card-dark border-cyan-500/30 p-4 shadow-2xl pointer-events-none min-w-[200px]"
                    style={{
                        left: `${(getCityById(hoveredCity)?.x || 0) / 5 + 5}%`,
                        top: `${(getCityById(hoveredCity)?.y || 0) / 6 + 2}%`,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    {(() => {
                        const city = getCityById(hoveredCity);
                        if (!city) return null;
                        return (
                            <>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                                        <span className="font-bold text-slate-100 tracking-tight">{city.name.toUpperCase()}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">ID: {city.id.slice(0, 4)}</span>
                                </div>
                                <div className="space-y-2 text-[10px] font-mono">
                                    <div className="flex justify-between border-b border-slate-800 pb-1 text-slate-400">
                                        <span>SIGNAL</span>
                                        <span style={{ color: getSignalColor(city.signalStrength) }}>{city.signalStrength.toUpperCase()}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-800 pb-1 text-slate-400">
                                        <span>COVERAGE</span>
                                        <span className="text-cyan-400">{city.coverage}%</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                        <span>TOWERS</span>
                                        <span className="text-slate-200">{city.towers}</span>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Selected city detail panel */}
            {selectedCityId && (
                <div className="absolute right-4 top-4 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-2xl z-50">
                    {(() => {
                        const city = getCityById(selectedCityId);
                        if (!city) return null;
                        return (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full animate-pulse"
                                            style={{ backgroundColor: getSignalColor(city.signalStrength) }}
                                        />
                                        <h3 className="font-bold text-lg text-white">{city.name}</h3>
                                    </div>
                                    <button
                                        onClick={() => onCitySelect?.(null)}
                                        className="text-slate-400 hover:text-white transition-colors p-1"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <Users className="w-4 h-4 text-cyan-400" />
                                            <span>Population</span>
                                        </div>
                                        <span className="font-semibold text-white">{city.population}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <Radio className="w-4 h-4 text-cyan-400" />
                                            <span>Broadcast Towers</span>
                                        </div>
                                        <span className="font-semibold text-white">{city.towers}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <Wifi className="w-4 h-4 text-cyan-400" />
                                            <span>Coverage</span>
                                        </div>
                                        <span className="font-semibold text-white">{city.coverage}%</span>
                                    </div>

                                    <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <Zap className="w-4 h-4 text-cyan-400" />
                                            <span>Signal Quality</span>
                                        </div>
                                        <span
                                            className="font-semibold uppercase text-sm px-2 py-0.5 rounded"
                                            style={{
                                                backgroundColor: `${getSignalColor(city.signalStrength)}20`,
                                                color: getSignalColor(city.signalStrength)
                                            }}
                                        >
                                            {city.signalStrength}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-700">
                                    <div className="text-xs text-slate-400 mb-2">ACTIVE INTENTS</div>
                                    {activeIntents.filter(i => i.cityId === city.id).length > 0 ? (
                                        <div className="space-y-1">
                                            {activeIntents.filter(i => i.cityId === city.id).map(intent => (
                                                <div
                                                    key={intent.id}
                                                    className="flex items-center gap-2 text-sm p-1.5 rounded"
                                                    style={{ backgroundColor: `${getIntentColor(intent.type)}15` }}
                                                >
                                                    <div
                                                        className="w-2 h-2 rounded-full animate-pulse"
                                                        style={{ backgroundColor: getIntentColor(intent.type) }}
                                                    />
                                                    <span style={{ color: getIntentColor(intent.type) }}>
                                                        {intent.type.toUpperCase()}
                                                    </span>
                                                    <span className="text-slate-500 ml-auto">
                                                        {intent.deviceCount} devices
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-slate-500 text-sm">No active intents</div>
                                    )}
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Zoom controls - Control Room Vertical Bar */}
            <div className="absolute bottom-12 left-6 flex flex-col gap-1 z-50">
                <div className="glass-card-dark flex flex-col p-1 gap-1 border-slate-800">
                    <button
                        onClick={() => setZoom(prev => Math.min(2, prev + 0.2))}
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-all cursor-pointer rounded-lg font-bold"
                        title="Zoom in"
                    >
                        +
                    </button>
                    <div className="h-px bg-slate-800 mx-2" />
                    <button
                        onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-all cursor-pointer rounded-lg font-bold"
                        title="Zoom out"
                    >
                        −
                    </button>
                    <div className="h-px bg-slate-800 mx-2" />
                    <button
                        onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-all cursor-pointer rounded-lg text-[10px] font-bold"
                        title="Reset view"
                    >
                        RST
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg p-3 z-50">
                <div className="text-xs font-semibold text-slate-400 mb-2">SIGNAL STRENGTH</div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }} />
                        <span className="text-slate-300">Strong (&gt;90%)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                        <span className="text-slate-300">Medium (80-90%)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                        <span className="text-slate-300">Weak (&lt;80%)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InteractiveIndiaMap;
