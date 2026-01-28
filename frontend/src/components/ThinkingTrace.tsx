import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useWebSocket } from '../hooks/useWebSocket';
import { Brain, Cpu, Zap, Target, Signal, AlertTriangle, TrendingUp, Gauge, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

import type { AIDecision, PPOInternals, Interpretation } from '../types';

interface IntrospectionData {
    current_introspection: PPOInternals;
    interpretation: Interpretation;
    trace_entries: AIDecision[];
    data_source: string;
}

import { useSystem } from '../context/SystemContext'; // Added import

export function ThinkingTrace() {
    const { lastMessage } = useWebSocket();
    const { thoughtLog, addThought } = useSystem(); // Use persistent state

    // const [thoughtLog, setThoughtLog] = useState<AIDecision[]>([]); // Removed local state
    const [introspection, setIntrospection] = useState<IntrospectionData | null>(null);
    const [isRealData, setIsRealData] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch real PPO internals (Less frequent polling for stability)
    useEffect(() => {
        const fetchIntrospection = async () => {
            // Only fetch if we need PPO internals, trace comes via WebSocket mostly
            try {
                const res = await fetch('http://localhost:8000/ai/thinking-trace');
                if (res.ok) {
                    const data = await res.json();
                    // debounce/smooth update
                    setIntrospection(data);
                    setIsRealData(data.data_source === 'REAL_PPO_INTERNALS');

                    // Only fill initial history if empty
                    if (data.trace_entries && data.trace_entries.length > 0) {
                        data.trace_entries.forEach((e: AIDecision) => addThought(e));
                    }
                }
            } catch (err) {
                console.error('Failed to fetch AI introspection:', err);
            }
        };

        fetchIntrospection();
        const interval = setInterval(fetchIntrospection, 5000); // Slower poll to reduce jitter
        return () => clearInterval(interval);
    }, [addThought]);

    // Process incoming WebSocket messages
    useEffect(() => {
        if (lastMessage?.type === 'ai_decision') {
            const decision = lastMessage.data as unknown as AIDecision;
            addThought(decision);
        }
    }, [lastMessage, addThought]);

    // Auto-scroll to top
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [thoughtLog]);

    const latestThought = thoughtLog[0];
    // Find the latest decision that actually has metrics to prevent flickering "0.00" or missing graphs
    // when intermediate status updates arrive.
    const validDecision = thoughtLog.find(d => d.reward_components) || latestThought;

    const ppo = introspection?.current_introspection;
    const interpretation = introspection?.interpretation;

    return (
        <div className="flex flex-col gap-4 h-full w-full min-h-[500px]">
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

            {/* Decisions Container - Explicit Height for scrolling context */}
            <div className="flex flex-col gap-4">
                {/* Latest Thought (Fixed Height) */}
                <Card className="border-l-4 border-l-blue-500 bg-slate-900/50 backdrop-blur shrink-0">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-300">
                            <Brain className="w-4 h-4" />
                            AI Reasoning Engine
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {validDecision ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-slate-400">Current Focus</p>
                                        <p className="font-mono text-sm font-bold text-white uppercase">{validDecision.intent.replace('_', ' ')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400">Total Reward</p>
                                        <p className={cn(
                                            "font-mono text-lg font-bold",
                                            (validDecision.reward_signal || 0) > 0 ? "text-green-400" : "text-red-400"
                                        )}>
                                            {(validDecision.reward_signal || 0) > 0 ? '+' : ''}{(validDecision.reward_signal || 0).toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                {/* Reward Composition Chart */}
                                {validDecision.reward_components && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Reward Components</p>
                                        <div className="space-y-1">
                                            <RewardBar label="Coverage" value={validDecision.reward_components?.coverage || 0} max={2} color="bg-emerald-500" icon={<Signal className="w-3 h-3" />} />
                                            <RewardBar label="Reliability" value={validDecision.reward_components?.reliability || 0} max={1.5} color="bg-blue-500" icon={<AlertTriangle className="w-3 h-3" />} />
                                            <RewardBar label="Accuracy" value={validDecision.reward_components?.accuracy || 0} max={1} color="bg-purple-500" icon={<Target className="w-3 h-3" />} />
                                            <RewardBar label="Congestion" value={validDecision.reward_components?.congestion || 0} max={1} color="bg-orange-500" icon={<Zap className="w-3 h-3" />} />
                                        </div>
                                    </div>
                                )}

                                <div className="mt-3 p-2 bg-slate-900 rounded border border-slate-700">
                                    <p className="text-xs font-mono text-cyan-300">
                                        {'>'} {validDecision.learning_contribution}
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

                {/* Scrolled History List (Fixed Window) */}
                < Card className="h-[500px] bg-slate-900/30 flex flex-col border-slate-800 shrink-0" >
                    <CardHeader className="py-3 border-b border-white/5 bg-white/5">
                        <CardTitle className="text-xs font-medium uppercase text-slate-400 flex items-center justify-between">
                            <span>Decision Trace</span>
                            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-500">{thoughtLog.length} events</span>
                        </CardTitle>
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
                                    <div key={log.decision_id || `trace-${index}`} className="p-3 hover:bg-white/5 transition-colors group">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-mono text-slate-500 group-hover:text-slate-300 transition-colors">{timeStr}</span>
                                            <span className={cn(
                                                "text-xs font-bold px-1.5 py-0.5 rounded",
                                                (log.reward_signal || 0) >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                                            )}>
                                                {(log.reward_signal || 0).toFixed(2)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-300 mb-1 font-medium">{log.intent || "Unknown Intent"}</p>
                                        <p className="text-xs text-slate-500 line-clamp-2 group-hover:text-slate-400 transition-colors">{log.learning_contribution || "Processing decision rationale..."}</p>
                                    </div>
                                )
                            })}
                            {thoughtLog.length === 0 && (
                                <div className="p-8 text-center text-xs text-slate-600 flex flex-col items-center gap-2">
                                    <Activity className="w-5 h-5 opacity-20" />
                                    No history available
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card >
            </div >
        </div >
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

