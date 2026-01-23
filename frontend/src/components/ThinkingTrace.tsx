import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useWebSocket } from '../hooks/useWebSocket';
import { Brain, Cpu, Zap, Target, Signal, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils'; // Assuming this utility exists

interface RewardComponents {
    coverage: number;
    accuracy: number;
    reliability: number;
    congestion: number;
    stability: number;
}

interface AIDecision {
    decision_id: string;
    timestamp: string;
    intent: string;
    action_taken: any;
    reward_signal: number;
    reward_components?: RewardComponents;
    learning_contribution: string;
}

export function ThinkingTrace() {
    const { lastMessage } = useWebSocket();
    const [thoughtLog, setThoughtLog] = useState<AIDecision[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Process incoming WebSocket messages
    useEffect(() => {
        if (lastMessage?.type === 'ai_decision') {
            const decision = lastMessage.data as unknown as AIDecision;
            setThoughtLog(prev => {
                // Deduplicate by decision_id to prevent duplicate keys
                const filtered = prev.filter(d => d.decision_id !== decision.decision_id);
                return [decision, ...filtered].slice(0, 50); // Keep last 50
            });
        }
    }, [lastMessage]);

    // Auto-scroll to top (since we prepend new items)
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [thoughtLog]);

    const latestThought = thoughtLog[0];

    return (
        <div className="flex flex-col gap-4 h-full">
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
                            // Date Validation
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
    // Normalize width (allow negatives to show as small red bars or handled differently)
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className="flex items-center gap-2 group">
            <div className="w-24 flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                {icon}
                <span>{label}</span>
            </div>
            <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden relative">
                {/* Background track line */}
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
