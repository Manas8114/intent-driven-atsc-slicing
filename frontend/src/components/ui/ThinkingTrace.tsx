import { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface ThinkingStep {
    timestamp: string;
    type: 'intent' | 'policy' | 'reward' | 'config' | 'approval';
    message: string;
}

const typeColors = {
    intent: 'text-blue-400',
    policy: 'text-purple-400',
    reward: 'text-amber-400',
    config: 'text-emerald-400',
    approval: 'text-cyan-400'
};

const typeLabels = {
    intent: 'INTENT',
    policy: 'POLICY',
    reward: 'REWARD',
    config: 'CONFIG',
    approval: 'APPROVE'
};

export function ThinkingTrace() {
    const [steps, setSteps] = useState<ThinkingStep[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Simulate thinking steps based on AI decisions
    useEffect(() => {
        const fetchThinkingSteps = async () => {
            try {
                // Fetch current cognitive state
                const response = await fetch('http://localhost:8000/ai/cognitive-state');
                const state = await response.json();

                const now = new Date();
                const time = now.toLocaleTimeString('en-US', { hour12: false });

                const newSteps: ThinkingStep[] = [];

                // Generate thinking trace based on state
                if (state.environment?.is_emergency) {
                    newSteps.push({
                        timestamp: time,
                        type: 'intent',
                        message: `Emergency mode detected → Priority: CRITICAL`
                    });
                    newSteps.push({
                        timestamp: time,
                        type: 'policy',
                        message: `Policy selected: Maximum Robustness (QPSK 1/2)`
                    });
                }

                if (state.demand_prediction) {
                    newSteps.push({
                        timestamp: time,
                        type: 'intent',
                        message: `Demand level: ${state.demand_prediction.level.toUpperCase()}`
                    });
                    newSteps.push({
                        timestamp: time,
                        type: 'policy',
                        message: `Recommended mode: ${state.demand_prediction.recommended_mode}`
                    });
                }

                if (state.last_action) {
                    newSteps.push({
                        timestamp: time,
                        type: 'config',
                        message: `Executing: ${state.last_action.modulation || 'QPSK'} ${state.last_action.coding_rate || '1/2'}`
                    });
                }

                if (state.latency_metrics) {
                    newSteps.push({
                        timestamp: time,
                        type: 'reward',
                        message: `Decision cycle: ${state.latency_metrics.total_decision_cycle_ms?.toFixed(2) || '0'}ms`
                    });
                }

                if (state.knowledge) {
                    newSteps.push({
                        timestamp: time,
                        type: 'approval',
                        message: `Success rate: ${(state.knowledge.success_rate * 100).toFixed(1)}% (${state.knowledge.total_observations} obs)`
                    });
                }

                // Keep last 20 steps
                setSteps(prev => [...prev, ...newSteps].slice(-20));

            } catch (err) {
                console.error('Failed to fetch thinking steps:', err);
            }
        };

        fetchThinkingSteps();
        const interval = setInterval(fetchThinkingSteps, 3000);
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [steps]);

    return (
        <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-mono text-slate-300">AI Thinking Trace</span>
                <div className="ml-auto flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-slate-500">LIVE</span>
                </div>
            </div>

            {/* Terminal content */}
            <div
                ref={containerRef}
                className="p-4 h-64 overflow-y-auto font-mono text-sm scrollbar-thin scrollbar-thumb-slate-700"
            >
                {steps.length === 0 ? (
                    <div className="text-slate-500 text-center py-8">
                        <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Waiting for AI decisions...</p>
                    </div>
                ) : (
                    steps.map((step, i) => (
                        <div key={i} className="flex gap-2 mb-1 hover:bg-slate-800/50 px-1 rounded">
                            <span className="text-slate-500 flex-shrink-0">
                                [{step.timestamp}]
                            </span>
                            <span className={`flex-shrink-0 ${typeColors[step.type]}`}>
                                [{typeLabels[step.type]}]
                            </span>
                            <span className="text-slate-300">
                                {step.message}
                            </span>
                        </div>
                    ))
                )}
                <div className="text-emerald-400 animate-pulse">▋</div>
            </div>
        </div>
    );
}
