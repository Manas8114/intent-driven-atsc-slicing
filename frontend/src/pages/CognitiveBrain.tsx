import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { ThinkingTrace } from '../components/ui/ThinkingTrace';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useWebSocket } from '../hooks/useWebSocket';
import {
    Brain, Activity, Wifi, Radio, Zap, TrendingUp,
    AlertTriangle, CheckCircle, Gauge, Car,
    Lightbulb, Eye, Target, Clock, Timer
} from 'lucide-react';

// Types for cognitive state
interface CognitiveState {
    timestamp: number;
    environment: {
        active_hurdle: string | null;
        noise_floor_dbm: number;
        is_emergency: boolean;
        traffic_load: number;
    };
    mobility: {
        mobile_user_ratio: number;
        average_velocity_kmh?: number;
    };
    knowledge: {
        learning_maturity: string;
        total_observations: number;
        success_rate: number;
    };
    demand_prediction: {
        level: string;
        recommended_mode: string;
        emergency_likelihood: number;
    };
    learning: {
        total_decisions: number;
        reward_trend: string;
    };
    last_action: {
        modulation?: string;
        coding_rate?: string;
        delivery_mode?: string;
        delivery_mode_reasoning?: string;
        delivery_mode_confidence?: number;
    } | null;
    latency_metrics?: {
        ppo_inference_ms: number;
        digital_twin_validation_ms: number;
        optimization_ms: number;
        total_decision_cycle_ms: number;
        policy_type: string;
        real_time_capable: boolean;
        averages?: {
            avg_ppo_inference_ms: number;
            avg_digital_twin_ms: number;
            avg_total_cycle_ms: number;
            sample_count: number;
        };
    };
    decision_stages?: {
        quick_decision: {
            stage: string;
            description: string;
            latency_ms: number;
        };
        refined_decision: {
            stage: string;
            description: string;
            latency_ms: number;
        };
    };
    ai_native_label: string;
}

// Gauge component for visual indicators
function GaugeIndicator({
    label,
    value,
    max = 100,
    color = 'blue',
    icon: Icon
}: {
    label: string;
    value: number;
    max?: number;
    color?: string;
    icon?: React.ComponentType<{ className?: string }>;
}) {
    const percentage = Math.min((value / max) * 100, 100);
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-500',
        green: 'bg-emerald-500',
        yellow: 'bg-amber-500',
        red: 'bg-red-500',
        purple: 'bg-purple-500'
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4" />}
                    {label}
                </span>
                <span className="text-sm font-bold text-slate-900">{value.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colorClasses[color] || colorClasses.blue} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

// Status badge component
function StatusBadge({ status, label }: { status: 'good' | 'warning' | 'critical' | 'neutral'; label: string }) {
    const colors = {
        good: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-100 text-amber-700 border-amber-200',
        critical: 'bg-red-100 text-red-700 border-red-200',
        neutral: 'bg-slate-100 text-slate-700 border-slate-200'
    };

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors[status]}`}>
            {label}
        </span>
    );
}

export function CognitiveBrain() {
    const [cognitiveState, setCognitiveState] = useState<CognitiveState | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastWsUpdate, setLastWsUpdate] = useState<Date | null>(null);

    // REAL-TIME: WebSocket connection for instant updates
    const { lastMessage, isConnected } = useWebSocket();

    // Handle WebSocket state updates
    useEffect(() => {
        if (lastMessage?.type === 'state_update' && lastMessage.data) {
            const data = lastMessage.data as Record<string, unknown>;

            setCognitiveState(prev => {
                // Only update if we have a valid previous state (don't overwrite loading state)
                if (!prev) return prev;

                return {
                    ...prev,
                    learning: {
                        ...prev.learning,
                        total_decisions: (data.total_decisions as number) || prev.learning.total_decisions,
                        reward_trend: (data.reward_trend as string) || prev.learning.reward_trend,
                    }
                };
            });

            setLastWsUpdate(new Date());
        }
    }, [lastMessage]);

    // Fetch cognitive state every 2 seconds (REST fallback + full state)
    useEffect(() => {
        const fetchState = async () => {
            try {
                const response = await fetch('http://localhost:8000/ai/cognitive-state');
                if (!response.ok) throw new Error('Failed to fetch cognitive state');
                const data = await response.json();
                setCognitiveState(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchState();
        const interval = setInterval(fetchState, 2000);
        return () => clearInterval(interval);
    }, []);

    // Determine status colors based on state
    const getMaturityStatus = (maturity: string) => {
        switch (maturity) {
            case 'mature': return 'good';
            case 'learning': return 'warning';
            default: return 'neutral';
        }
    };

    const getDemandLevelColor = (level: string) => {
        switch (level) {
            case 'low': return 'green';
            case 'moderate': return 'blue';
            case 'high': return 'yellow';
            case 'surge': return 'red';
            default: return 'blue';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <Brain className="h-16 w-16 text-purple-500 animate-bounce" />
                    <span className="text-slate-500">Initializing Cognitive Brain...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <Card className="p-6 bg-red-50 border-red-200">
                    <div className="flex items-center gap-3 text-red-700">
                        <AlertTriangle className="h-6 w-6" />
                        <span>Error loading cognitive state: {error}</span>
                    </div>
                </Card>
            </div>
        );
    }

    const state = cognitiveState!;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header with AI-Native branding */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                        <Brain className="h-8 w-8 text-purple-600" />
                        Cognitive Brain Dashboard
                    </h2>
                    <p className="text-slate-500 mt-2 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        {state.ai_native_label}
                    </p>
                </div>
                <StatusBadge
                    status={state.environment.is_emergency ? 'critical' : 'good'}
                    label={state.environment.is_emergency ? 'EMERGENCY ACTIVE' : 'Normal Operation'}
                />
            </div>

            {/* AI Reasoning Snapshot - Main Panel */}
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-900">
                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                        AI Reasoning Snapshot
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Current Intent & Mode */}
                        <div className="space-y-4">
                            <div className="bg-white/80 p-4 rounded-lg border border-purple-100">
                                <h4 className="text-sm font-semibold text-slate-600 mb-2">Current Delivery Mode</h4>
                                <div className="flex items-center gap-3">
                                    <Radio className="h-8 w-8 text-purple-600" />
                                    <div>
                                        <p className="text-2xl font-bold text-purple-900 capitalize">
                                            {state.last_action?.delivery_mode || 'broadcast'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {state.last_action?.delivery_mode_confidence
                                                ? `${(state.last_action.delivery_mode_confidence * 100).toFixed(0)}% confidence`
                                                : 'AI selected'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/80 p-4 rounded-lg border border-purple-100">
                                <h4 className="text-sm font-semibold text-slate-600 mb-2">Mode Reasoning</h4>
                                <p className="text-sm text-slate-700 italic">
                                    "{state.last_action?.delivery_mode_reasoning || 'Standard broadcast mode for optimal coverage'}"
                                </p>
                            </div>
                        </div>

                        {/* Demand & Context */}
                        <div className="space-y-4">
                            <div className="bg-white/80 p-4 rounded-lg border border-purple-100">
                                <h4 className="text-sm font-semibold text-slate-600 mb-2">Predicted Demand</h4>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-lg font-bold capitalize" style={{
                                        color: getDemandLevelColor(state.demand_prediction.level) === 'green' ? '#059669' :
                                            getDemandLevelColor(state.demand_prediction.level) === 'yellow' ? '#d97706' :
                                                getDemandLevelColor(state.demand_prediction.level) === 'red' ? '#dc2626' : '#3b82f6'
                                    }}>
                                        {state.demand_prediction.level}
                                    </span>
                                    <Gauge className="h-5 w-5 text-slate-400" />
                                </div>
                                <p className="text-xs text-slate-500">
                                    Recommended: <span className="font-semibold capitalize">{state.demand_prediction.recommended_mode}</span>
                                </p>
                            </div>

                            <div className="bg-white/80 p-4 rounded-lg border border-purple-100">
                                <h4 className="text-sm font-semibold text-slate-600 mb-2">Emergency Likelihood</h4>
                                <GaugeIndicator
                                    label=""
                                    value={state.demand_prediction.emergency_likelihood * 100}
                                    color={state.demand_prediction.emergency_likelihood > 0.3 ? 'red' :
                                        state.demand_prediction.emergency_likelihood > 0.15 ? 'yellow' : 'green'}
                                />
                            </div>
                        </div>

                        {/* Mobility & Traffic */}
                        <div className="space-y-4">
                            <div className="bg-white/80 p-4 rounded-lg border border-purple-100">
                                <h4 className="text-sm font-semibold text-slate-600 mb-3">Mobility Status</h4>
                                <GaugeIndicator
                                    label="Mobile Users"
                                    value={(state.mobility.mobile_user_ratio || 0) * 100}
                                    icon={Car}
                                    color={state.mobility.mobile_user_ratio > 0.4 ? 'yellow' : 'blue'}
                                />
                                {state.mobility.average_velocity_kmh !== undefined && (
                                    <p className="text-xs text-slate-500 mt-2">
                                        Avg. speed: {state.mobility.average_velocity_kmh.toFixed(1)} km/h
                                    </p>
                                )}
                            </div>

                            <div className="bg-white/80 p-4 rounded-lg border border-purple-100">
                                <h4 className="text-sm font-semibold text-slate-600 mb-3">Congestion</h4>
                                <GaugeIndicator
                                    label="Traffic Load"
                                    value={(state.environment.traffic_load / 2) * 100}
                                    icon={Activity}
                                    color={state.environment.traffic_load > 1.5 ? 'red' :
                                        state.environment.traffic_load > 1.0 ? 'yellow' : 'green'}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Learning Status Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Knowledge Maturity */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                            <Brain className="h-4 w-4 text-purple-500" />
                            Learning Maturity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-slate-900 capitalize">
                                {state.knowledge.learning_maturity}
                            </span>
                            <StatusBadge
                                status={getMaturityStatus(state.knowledge.learning_maturity)}
                                label={state.knowledge.total_observations.toLocaleString() + ' observations'}
                            />
                        </div>
                        <div className="mt-3">
                            <GaugeIndicator
                                label="Success Rate"
                                value={state.knowledge.success_rate * 100}
                                color={state.knowledge.success_rate > 0.8 ? 'green' :
                                    state.knowledge.success_rate > 0.6 ? 'yellow' : 'red'}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Decision Quality */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                            <Target className="h-4 w-4 text-blue-500" />
                            Decision Quality
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl font-bold text-slate-900">
                                {state.learning.total_decisions}
                            </span>
                            <span className="text-sm text-slate-500">total decisions</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <TrendingUp className={`h-5 w-5 ${state.learning.reward_trend === 'improving' ? 'text-emerald-500' :
                                state.learning.reward_trend === 'declining' ? 'text-red-500' : 'text-slate-400'
                                }`} />
                            <span className="text-sm font-medium capitalize">{state.learning.reward_trend}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Current Configuration */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-orange-500" />
                            Active Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {state.last_action ? (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Modulation</span>
                                    <span className="font-semibold">{state.last_action.modulation || 'QPSK'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Coding Rate</span>
                                    <span className="font-semibold">{state.last_action.coding_rate || '1/2'}</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm">No active configuration</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Real-Time Performance Benchmarking */}
            <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-cyan-900">
                            <Timer className="h-5 w-5 text-cyan-600" />
                            Real-Time Performance Benchmarks
                        </span>
                        {state.latency_metrics?.policy_type === 'pre_computed' && (
                            <span className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                                <CheckCircle className="h-3 w-3" />
                                Pre-Computed Policy
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {/* PPO Inference */}
                        <div className="text-center p-4 bg-white/80 rounded-lg border border-cyan-100">
                            <Clock className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 mb-1">PPO Inference</p>
                            <p className="text-2xl font-bold text-purple-700">
                                {state.latency_metrics?.ppo_inference_ms?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-xs text-slate-400">ms</p>
                        </div>

                        {/* Optimization */}
                        <div className="text-center p-4 bg-white/80 rounded-lg border border-cyan-100">
                            <Clock className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 mb-1">Optimization</p>
                            <p className="text-2xl font-bold text-blue-700">
                                {state.latency_metrics?.optimization_ms?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-xs text-slate-400">ms</p>
                        </div>

                        {/* Digital Twin */}
                        <div className="text-center p-4 bg-white/80 rounded-lg border border-cyan-100">
                            <Clock className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 mb-1">Digital Twin</p>
                            <p className="text-2xl font-bold text-emerald-700">
                                {state.latency_metrics?.digital_twin_validation_ms?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-xs text-slate-400">ms</p>
                        </div>

                        {/* Total Cycle */}
                        <div className={`text-center p-4 rounded-lg border ${state.latency_metrics?.real_time_capable
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-amber-50 border-amber-200'
                            }`}>
                            <Timer className={`h-6 w-6 mx-auto mb-2 ${state.latency_metrics?.real_time_capable ? 'text-emerald-600' : 'text-amber-600'
                                }`} />
                            <p className="text-xs text-slate-500 mb-1">Total Cycle</p>
                            <p className={`text-2xl font-bold ${state.latency_metrics?.real_time_capable ? 'text-emerald-700' : 'text-amber-700'
                                }`}>
                                {state.latency_metrics?.total_decision_cycle_ms?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-xs text-slate-400">ms</p>
                        </div>
                    </div>

                    {/* Anytime Decision Stages */}
                    {state.decision_stages && (
                        <div className="border-t border-cyan-100 pt-4">
                            <h4 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                                <Zap className="h-4 w-4 text-orange-500" />
                                Anytime Decision Pipeline
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Quick Decision */}
                                <div className="p-4 bg-white/80 rounded-lg border border-purple-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-purple-700">
                                            ⚡ Quick Decision
                                        </span>
                                        <span className="text-lg font-bold text-purple-600">
                                            {state.decision_stages.quick_decision.latency_ms.toFixed(2)} ms
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {state.decision_stages.quick_decision.description}
                                    </p>
                                </div>

                                {/* Refined Decision */}
                                <div className="p-4 bg-white/80 rounded-lg border border-emerald-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-emerald-700">
                                            ✅ Refined Decision
                                        </span>
                                        <span className="text-lg font-bold text-emerald-600">
                                            {state.decision_stages.refined_decision.latency_ms.toFixed(2)} ms
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {state.decision_stages.refined_decision.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Average Performance */}
                    {state.latency_metrics?.averages && state.latency_metrics.averages.sample_count > 0 && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-lg text-center">
                            <p className="text-xs text-slate-500">
                                Average over {state.latency_metrics.averages.sample_count} decisions:
                                <span className="font-semibold ml-2">
                                    PPO {state.latency_metrics.averages.avg_ppo_inference_ms.toFixed(2)} ms
                                </span>
                                <span className="mx-2">•</span>
                                <span className="font-semibold">
                                    Total {state.latency_metrics.averages.avg_total_cycle_ms.toFixed(2)} ms
                                </span>
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* AI Thinking Trace - Live Terminal */}
            <ErrorBoundary fallbackMessage="AI Thinking Trace temporarily unavailable">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                            <Brain className="h-4 w-4 text-purple-500" />
                            Live AI Reasoning
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ThinkingTrace />
                    </CardContent>
                </Card>
            </ErrorBoundary>

            {/* Environment Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wifi className="h-5 w-5 text-blue-500" />
                        Environment Context
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">Active Hurdle</p>
                            <p className="font-semibold text-slate-900">
                                {state.environment.active_hurdle || 'None'}
                            </p>
                        </div>
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">Noise Floor</p>
                            <p className="font-semibold text-slate-900">
                                {state.environment.noise_floor_dbm.toFixed(1)} dBm
                            </p>
                        </div>
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">Emergency Mode</p>
                            <p className={`font-semibold ${state.environment.is_emergency ? 'text-red-600' : 'text-emerald-600'}`}>
                                {state.environment.is_emergency ? 'ACTIVE' : 'Inactive'}
                            </p>
                        </div>
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">Last Update</p>
                            <p className="font-semibold text-slate-900">
                                {new Date(state.timestamp * 1000).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Footer note */}
            <div className="text-center text-xs text-slate-400 py-4">
                Intent → Policy → Action → Feedback • Human-Governed AI • Simulation-First Validation
            </div>
        </div>
    );
}
