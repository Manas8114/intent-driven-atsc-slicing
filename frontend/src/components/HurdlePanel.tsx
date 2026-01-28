import { useState, useEffect, useRef } from 'react';
import {
    Car, Radio, AlertTriangle, CloudFog,
    ChevronLeft, ChevronRight, Activity,
    Brain, Zap, TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useSystem } from '../context/SystemContext';
import { ThinkingTrace } from './ThinkingTrace';

// Cognitive stress scenarios aligned with Backend Chaos Director
const COGNITIVE_SCENARIOS = [
    {
        id: 'monsoon',
        label: '⛈️ Severe Monsoon',
        icon: CloudFog,
        desc: 'Signal attenuation (-15dB) across all sectors',
        impact: 'AI must boost power to compensate for rain fade',
        color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200',
        aiAction: 'The broadcast increases power and switches to robust modulation (QPSK)'
    },
    {
        id: 'flash_crowd',
        label: '👥 Flash Crowd',
        icon: Car,
        desc: '300% traffic surge in city center',
        impact: 'AI switches to broadcast mode to offload cellular',
        color: 'text-orange-600 bg-orange-50 hover:bg-orange-100 border-orange-200',
        aiAction: 'The system offloads traffic to broadcast to relieve congestion'
    },
    {
        id: 'tower_failure',
        label: '🗼 Tower Failure',
        icon: AlertTriangle,
        desc: 'Infrastructure failure in Sector A',
        impact: 'AI re-routes coverage from adjacent towers',
        color: 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200',
        aiAction: 'The AI reconfigures adjacent towers to cover the dead zone'
    },
    {
        id: 'mobility_surge',
        label: '🚄 High Mobility',
        icon: Radio,
        desc: '60% users moving at 75km/h',
        impact: 'AI switches to robust modulation for Doppler shift',
        color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
        aiAction: 'The AI increases coding robustness to handle Doppler shift'
    }
];

interface CognitiveEvent {
    timestamp: Date;
    scenario: string;
    aiAction: string;
    kpiImpact: string;
}

export function HurdlePanel() {
    const { triggerHurdle, triggerEmergency, phase, activeHurdle, addLog } = useSystem();
    const [isOpen, setIsOpen] = useState(true);
    // Keeping this state for legacy reasons/if we switch back, but primarily using ThinkingTrace now
    const [cognitiveEvents, setCognitiveEvents] = useState<CognitiveEvent[]>([]);
    const [lastTriggeredScenario, setLastTriggeredScenario] = useState<string | null>(null);
    const [isAutoPlay, setIsAutoPlay] = useState(false);
    const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isBusy = phase !== 'idle' && phase !== 'broadcasting' && phase !== 'emergency';

    // Auto-Play Logic


    const handleScenarioTrigger = async (scenario: typeof COGNITIVE_SCENARIOS[0]) => {
        // Only one hurdle at a time
        if (activeHurdle && activeHurdle !== scenario.id) {
            // Clear previous hurdle first
            triggerHurdle('clear');
            try {
                await fetch('http://localhost:8000/ai/inject-scenario', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scenario: 'clear' })
                });
            } catch (e) {
                console.error("Failed to clear scenario", e);
            }
        }

        // Log cognitive stress event (Legacy local log)
        const event: CognitiveEvent = {
            timestamp: new Date(),
            scenario: scenario.label,
            aiAction: scenario.aiAction,
            kpiImpact: scenario.impact
        };

        setCognitiveEvents(prev => [event, ...prev.slice(0, 4)]);
        setLastTriggeredScenario(scenario.id);

        // Add to system logs
        if (addLog) {
            addLog(`🧠 Chaos Director: Injecting ${scenario.label}`);
            addLog(`   Expected Response: ${scenario.aiAction}`);
        }

        // Call Backend API
        try {
            await fetch('http://localhost:8000/ai/inject-scenario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario: scenario.id })
            });
        } catch (e) {
            console.error("Failed to inject scenario", e);
            if (addLog) addLog(`❌ Failed to inject scenario: ${e}`);
        }

        // Trigger the internal frontend state (legacy/visuals)
        triggerHurdle(scenario.id);
    };

    // Auto-Play Logic
    useEffect(() => {
        if (isAutoPlay) {
            let index = 0;
            // Immediate trigger
            handleScenarioTrigger(COGNITIVE_SCENARIOS[0]);

            const interval = setInterval(() => {
                index = (index + 1) % COGNITIVE_SCENARIOS.length;
                handleScenarioTrigger(COGNITIVE_SCENARIOS[index]);
            }, 8000); // Cycle every 8 seconds

            autoPlayRef.current = interval;
        } else {
            if (autoPlayRef.current) {
                clearInterval(autoPlayRef.current);
                autoPlayRef.current = null;
            }
        }
        return () => {
            if (autoPlayRef.current) clearInterval(autoPlayRef.current);
        };
    }, [isAutoPlay]);

    const handleEmergencyEscalation = () => {
        const event: CognitiveEvent = {
            timestamp: new Date(),
            scenario: '🚨 EMERGENCY OVERRIDE',
            aiAction: 'The AI bypasses normal approval for public safety',
            kpiImpact: 'Emergency PLP takes priority over all services'
        };

        setCognitiveEvents(prev => [event, ...prev.slice(0, 4)]);

        if (addLog) {
            addLog('🚨 EMERGENCY OVERRIDE ACTIVATED - AI bypasses approval for public safety');
        }

        triggerEmergency();
    };

    return (
        <div className={cn(
            "fixed right-0 top-20 bottom-8 z-40 bg-white border-l border-slate-200 shadow-xl transition-all duration-300 flex flex-col origin-top-right",
            isOpen ? "w-[450px]" : "w-12"
        )}>
            {/* Toggle Handle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-slate-200 rounded-l-lg shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-600 z-50"
                title={isOpen ? "Collapse panel" : "Expand panel"}
            >
                {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            {/* Header */}
            <div className={cn("p-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-indigo-50", !isOpen && "justify-center")}>
                <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    {isOpen && (
                        <div>
                            <h3 className="font-bold text-slate-800">Cognitive Stress Testing</h3>
                            <p className="text-xs text-slate-500">Test AI adaptation under adverse conditions</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className={cn("flex-1 flex flex-col min-h-0", !isOpen && "hidden")}>
                {/* Scenario Buttons - Fixed Height Area */}
                <div className="p-4 space-y-2 flex-shrink-0 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                            Chaos Director
                        </p>
                        <button
                            onClick={() => setIsAutoPlay(!isAutoPlay)}
                            className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full border font-bold transition-all",
                                isAutoPlay
                                    ? "bg-emerald-500 text-white border-emerald-600 animate-pulse"
                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                            )}
                        >
                            {isAutoPlay ? '⏸ AUTO-PILOT ON' : '▶ ENABLE AUTO-PILOT'}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {COGNITIVE_SCENARIOS.map((scenario) => (
                            <button
                                key={scenario.id}
                                disabled={isBusy}
                                onClick={() => handleScenarioTrigger(scenario)}
                                className={cn(
                                    "text-left p-2 rounded-lg border transition-all duration-200 flex flex-col gap-1 relative",
                                    activeHurdle === scenario.id ? "ring-2 ring-purple-400 bg-white shadow-md" : "hover:bg-white hover:shadow-sm",
                                    scenario.color,
                                    isBusy && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <div className="flex items-center gap-1.5 font-bold text-xs">
                                    <scenario.icon className="h-3 w-3" />
                                    {scenario.label}
                                </div>
                                {activeHurdle === scenario.id && (
                                    <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"></span>
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Emergency Button */}
                    <button
                        disabled={isBusy}
                        onClick={handleEmergencyEscalation}
                        className="w-full text-left p-2 rounded-lg border border-red-200 bg-red-600 text-white hover:bg-red-700 transition-colors shadow shadow-red-500/20 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2 font-bold text-xs">
                            <AlertTriangle className="h-4 w-4 animate-pulse" />
                            EMERGENCY OVERRIDE
                        </div>
                        <p className="text-[10px] text-red-100 uppercase font-bold tracking-wider">
                            Safety Critical
                        </p>
                    </button>
                </div>

                {/* Thinking Trace - Flex Grow Area */}
                <div className="flex-1 min-h-0 bg-slate-900 overflow-hidden relative border-t border-slate-300">
                    <div className="absolute inset-0 p-4 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        <ThinkingTrace />
                    </div>
                </div>
            </div>

            {/* Collapsed State */}
            {!isOpen && (
                <div className="flex flex-col items-center gap-4 py-4">
                    <Brain className="h-4 w-4 text-purple-500" />
                    <div
                        className="text-xs font-mono text-slate-400 uppercase tracking-widest"
                        style={{ writingMode: 'vertical-rl' }}
                    >
                        Stress Test
                    </div>
                </div>
            )}
        </div>
    );
}
