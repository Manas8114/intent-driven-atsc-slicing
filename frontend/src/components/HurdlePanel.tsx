import { useState } from 'react';
import {
    Car, Radio, AlertTriangle, CloudFog,
    ChevronLeft, ChevronRight, Activity,
    Brain, Zap, TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useSystem } from '../context/SystemContext';

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
    const [cognitiveEvents, setCognitiveEvents] = useState<CognitiveEvent[]>([]);
    const [lastTriggeredScenario, setLastTriggeredScenario] = useState<string | null>(null);

    const isBusy = phase !== 'idle' && phase !== 'broadcasting' && phase !== 'emergency';

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

        // Log cognitive stress event
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
            "fixed right-0 top-20 bottom-8 z-40 bg-white border-l border-slate-200 shadow-xl transition-all duration-300 flex flex-col",
            isOpen ? "w-96" : "w-12"
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
            <div className={cn("flex-1 overflow-y-auto", !isOpen && "hidden")}>
                {/* Scenario Buttons */}
                <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">
                        Trigger Scenario
                    </p>

                    {COGNITIVE_SCENARIOS.map((scenario) => (
                        <button
                            key={scenario.id}
                            disabled={isBusy}
                            onClick={() => handleScenarioTrigger(scenario)}
                            className={cn(
                                "w-full text-left p-3 rounded-lg border transition-all duration-200 flex flex-col gap-1 group relative",
                                activeHurdle === scenario.id ? "ring-2 ring-offset-1 ring-purple-400" : "",
                                scenario.color,
                                isBusy && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <div className="flex items-center gap-2 font-semibold text-sm">
                                <scenario.icon className="h-4 w-4" />
                                {scenario.label}
                            </div>
                            <div className="text-[10px] opacity-70 ml-6">
                                {scenario.desc}
                            </div>
                            {activeHurdle === scenario.id && (
                                <div className="absolute top-2 right-2 flex items-center gap-1">
                                    <span className="text-[9px] font-bold text-purple-700 uppercase">Active</span>
                                    <span className="flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                    </span>
                                </div>
                            )}
                        </button>
                    ))}

                    <div className="h-px bg-slate-200 my-4" />

                    {/* Emergency Button */}
                    <button
                        disabled={isBusy}
                        onClick={handleEmergencyEscalation}
                        className="w-full text-left p-4 rounded-lg border border-red-200 bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                    >
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <AlertTriangle className="h-5 w-5 animate-pulse" />
                            ESCALATE TO EMERGENCY
                        </div>
                        <p className="text-[10px] text-red-100 mt-1 ml-7">
                            Bypass approval for immediate public safety response
                        </p>
                    </button>
                </div>

                {/* Live AI Response */}
                {cognitiveEvents.length > 0 && (
                    <div className="border-t border-slate-100 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Live AI Response
                            </span>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {cognitiveEvents.map((event, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "p-3 rounded-lg border text-xs",
                                        i === 0 ? "bg-purple-50 border-purple-200 animate-in slide-in-from-top-2" : "bg-slate-50 border-slate-200"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-slate-800">{event.scenario}</span>
                                        <span className="text-slate-400">
                                            {event.timestamp.toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p className="text-purple-700 italic">{event.aiAction}</p>
                                    <div className="flex items-center gap-1 mt-1 text-slate-500">
                                        <TrendingUp className="h-3 w-3" />
                                        {event.kpiImpact}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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
