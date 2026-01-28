import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useWebSocket } from '../hooks/useWebSocket';
import { Brain, Cpu, Zap, Target, Signal, AlertTriangle, TrendingUp, Gauge, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface RewardComponents {
    coverage: number;
    accuracy: number;
    reliability: number;
    congestion: number;
    stability: number;
}

interface PPOInternals {
    value_estimate: number;
    confidence_pct: number;
    action_log_prob: number;
    action_mean?: number[];
    action_std?: number[];
}

interface Interpretation {
    value_insight: string;
    confidence_insight: string;
    action_insight: string;
    advantage_insight: string;
    source: string;
}

interface AIDecision {
    decision_id: string;
    timestamp: string;
    intent: string;
    action_taken: any;
    reward_signal: number;
    reward_components?: RewardComponents;
    learning_contribution: string;
    ppo_internals?: PPOInternals;
}

interface IntrospectionData {
    current_introspection: PPOInternals;
    interpretation: Interpretation;
    trace_entries: AIDecision[];
    data_source: string;
}

export function ThinkingTrace() {
    const { lastMessage } = useWebSocket();
    const [thoughtLog, setThoughtLog] = useState<AIDecision[]>([]);
    const [introspection, setIntrospection] = useState<IntrospectionData | null>(null);
    const [isRealData, setIsRealData] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch real PPO internals from the new endpoint
    useEffect(() => {
        const fetchIntrospection = async () => {
            try {
                const res = await fetch('http://localhost:8000/ai/thinking-trace');
                if (res.ok) {
                    const data = await res.json();
                    setIntrospection(data);
                    setIsRealData(data.data_source === 'REAL_PPO_INTERNALS');

                    // Merge trace entries if available
                    if (data.trace_entries && data.trace_entries.length > 0) {
                        setThoughtLog(prev => {
                            const newEntries = data.trace_entries.filter(
                                (e: AIDecision) => !prev.some(p => p.decision_id === e.decision_id)
                            );
                            return [...newEntries, ...prev].slice(0, 50);
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to fetch AI introspection:', err);
            }
        };

        fetchIntrospection();
        const interval = setInterval(fetchIntrospection, 3000); // Poll every 3s
        return () => clearInterval(interval);
    }, []);

    // Process incoming WebSocket messages
    useEffect(() => {
        if (lastMessage?.type === 'ai_decision') {
            const decision = lastMessage.data as unknown as AIDecision;
            setThoughtLog(prev => {
                const filtered = prev.filter(d => d.decision_id !== decision.decision_id);
                return [decision, ...filtered].slice(0, 50);
            });
        }
    }, [lastMessage]);

    // Auto-scroll to top
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [thoughtLog]);

    const latestThought = thoughtLog[0];
    const ppo = introspection?.current_introspection;
    const interpretation = introspection?.interpretation;

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Real PPO Internals Section */}
            <Card className="border-l-4 border-l-purple-500 bg-slate-900/50 backdrop-blur">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-300">
                        <Activity className="w-4 h-4" />
                        PPO Policy Internals
                        {isRealData && (
                            <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                                REAL DATA
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {ppo ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                                {/* Value Estimate */}
                                <div className="bg-slate-800/50 rounded p-2 text-center">
                                    <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-1">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>Value V(s)</span>
                                    </div>
                                    <p className={cn(
                                        "font-mono text-lg font-bold",
                                        (ppo.value_estimate || 0) > 0 ? "text-green-400" : "text-red-400"
                                    )}>
                                        {(ppo.value_estimate || 0) > 0 ? '+' : ''}{(ppo.value_estimate ?? 0).toFixed(2)}
                                    </p>
                                </div>

                                {/* Confidence */}
                                <div className="bg-slate-800/50 rounded p-2 text-center">
                                    <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-1">
                                        <Gauge className="w-3 h-3" />
                                        <span>Confidence</span>
                                    </div>
                                    <p className={cn(
                                        "font-mono text-lg font-bold",
                                        (ppo.confidence_pct || 0) > 70 ? "text-green-400" :
                                            (ppo.confidence_pct || 0) > 40 ? "text-yellow-400" : "text-red-400"
                                    )}>
                                        {(ppo.confidence_pct ?? 0).toFixed(0)}%
                                    </p>
                                </div>

                                {/* Log Probability */}
                                <div className="bg-slate-800/50 rounded p-2 text-center">
                                    <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-1">
                                        <Brain className="w-3 h-3" />
                                        <span>Log Prob</span>
                                    </div>
                                    <p className="font-mono text-lg font-bold text-cyan-400">
                                        {(ppo.action_log_prob ?? 0).toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            {/* Interpretation */}
                            {interpretation && (
                                <div className="space-y-1 text-xs">
                                    <p className="text-emerald-300">{interpretation.value_insight}</p>
                                    <p className="text-yellow-300">{interpretation.confidence_insight}</p>
                                    <p className="text-cyan-300 font-mono">{interpretation.action_insight}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-slate-500">
                            <Cpu className="w-6 h-6 mx-auto mb-2 opacity-50 animate-pulse" />
                            <p className="text-xs">Loading PPO internals...</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Latest Thought / Reward Breakdown */}
            <Card className="border-l-4 border-l-blue-500 bg-slate-900/50 backdrop-blur">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-300">
                        <Brain className="w-4 h-4" />
                        AI Reasoning Engine
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {latestThought ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-400">Current Focus</p>
                                    <p className="font-mono text-sm font-bold text-white uppercase">{latestThought.intent.replace('_', ' ')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400">Total Reward</p>
                                    <p className={cn(
                                        "font-mono text-lg font-bold",
                                        (latestThought.reward_signal || 0) > 0 ? "text-green-400" : "text-red-400"
                                    )}>
                                        {(latestThought.reward_signal || 0) > 0 ? '+' : ''}{(latestThought.reward_signal || 0).toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            {/* Reward Composition Chart */}
                            {latestThought.reward_components && (
                                <div className="space-y-2">
                                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Reward Components</p>
                                    <div className="space-y-1">
                                        <RewardBar label="Coverage" value={latestThought.reward_components?.coverage || 0} max={2} color="bg-emerald-500" icon={<Signal className="w-3 h-3" />} />
                                        <RewardBar label="Reliability" value={latestThought.reward_components?.reliability || 0} max={1.5} color="bg-blue-500" icon={<AlertTriangle className="w-3 h-3" />} />
                                        <RewardBar label="Accuracy" value={latestThought.reward_components?.accuracy || 0} max={1} color="bg-purple-500" icon={<Target className="w-3 h-3" />} />
                                        <RewardBar label="Congestion" value={latestThought.reward_components?.congestion || 0} max={1} color="bg-orange-500" icon={<Zap className="w-3 h-3" />} />
                                    </div>
                                </div>
                            )}

                            <div className="mt-3 p-2 bg-slate-900 rounded border border-slate-700">
                                <p className="text-xs font-mono text-cyan-300">
                                    {'>'} {latestThought.learning_contribution}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            <Cpu className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
                            <p className="text-sm">Waiting for AI decision...</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="flex-1 min-h-0 bg-slate-900/30 flex flex-col">
                <CardHeader className="py-3 border-b border-white/10">
                    <CardTitle className="text-xs font-medium uppercase text-slate-500">Decision Trace</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <div className="divide-y divide-white/5">
                        {thoughtLog.map((log, index) => {
                            let timeStr = "--:--:--";
                            try {
                                if (log.timestamp) {
                                    const d = new Date(log.timestamp);
                                    if (!isNaN(d.getTime())) {
                                        timeStr = d.toLocaleTimeString();
                                    }
                                }
                            } catch (e) { /* ignore date error */ }

                            return (
                                <div key={log.decision_id || `trace-${index}`} className="p-3 hover:bg-white/5 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-mono text-slate-500">{timeStr}</span>
                                        <span className={cn(
                                            "text-xs font-bold px-1.5 py-0.5 rounded",
                                            (log.reward_signal || 0) >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                                        )}>
                                            {(log.reward_signal || 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-1">{log.intent || "Unknown Intent"}</p>
                                    <p className="text-xs text-slate-500 line-clamp-2">{log.learning_contribution}</p>
                                </div>
                            )
                        })}
                        {thoughtLog.length === 0 && (
                            <div className="p-4 text-center text-xs text-slate-600">
                                No history available
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function RewardBar({ label, value, max, color, icon }: { label: string, value: number, max: number, color: string, icon: React.ReactNode }) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className="flex items-center gap-2 group">
            <div className="w-24 flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                {icon}
                <span>{label}</span>
            </div>
            <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 w-full opacity-10 bg-white"></div>
                <div
                    className={cn("h-full rounded-full transition-all duration-500", color, value < 0 ? "bg-red-500" : "")}
                    style={{ width: `${value < 0 ? 10 : percentage}%` }}
                />
            </div>
            <div className="w-8 text-right text-xs font-mono text-slate-300 tabular-nums">
                {value.toFixed(1)}
            </div>
        </div>
    );
}

