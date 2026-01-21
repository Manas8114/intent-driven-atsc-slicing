import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
    TrendingUp, Clock, Target, Award,
    CheckCircle, ArrowUpRight,
    ArrowDownRight, Minus, RefreshCw
} from 'lucide-react';
import { API_BASE } from '../lib/api';

// Types
interface LearningTimeline {
    kpi_timeline: Array<{
        timestamp: string;
        coverage_pct: number;
        alert_reliability_pct: number;
        spectral_efficiency: number;
        decision_quality_score: number;
    }>;
    milestones: Array<{
        timestamp: string;
        milestone_type: string;
        description: string;
        improvement_pct: number;
    }>;
    total_decisions: number;
    learning_active: boolean;
}

interface ImprovementStats {
    total_decisions: number;
    successful_decisions: number;
    success_rate: number;
    avg_reward: number;
    reward_trend: string;
    best_performing_intent: string;
    worst_performing_intent: string;
    total_milestones: number;
}

interface BeforeAfter {
    available: boolean;
    improvements?: {
        coverage_pct?: { before: number; after: number; change_pct: number };
        alert_reliability_pct?: { before: number; after: number; change_pct: number };
        decision_quality_score?: { before: number; after: number; change_pct: number };
    };
    summary?: string;
}

// Trend icon component
function TrendIcon({ trend }: { trend: string }) {
    if (trend === 'improving') {
        return <ArrowUpRight className="h-5 w-5 text-emerald-500" />;
    } else if (trend === 'declining') {
        return <ArrowDownRight className="h-5 w-5 text-red-500" />;
    } else {
        return <Minus className="h-5 w-5 text-slate-400" />;
    }
}

// Simple line chart component
function SimpleLineChart({
    data,
    dataKey,
    color
}: {
    data: Array<{ [key: string]: number | string }>;
    dataKey: string;
    color: string;
}) {
    if (!data || data.length === 0) {
        return (
            <div className="h-32 flex items-center justify-center text-slate-400">
                No data yet - run simulations to see trends
            </div>
        );
    }

    const values = data.map(d => d[dataKey] as number);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    return (
        <div className="h-32 flex items-end gap-1">
            {data.slice(-30).map((point, i) => {
                const value = point[dataKey] as number;
                const height = ((value - min) / range) * 100;
                return (
                    <div
                        key={i}
                        className={`flex-1 ${color} rounded-t transition-all hover:opacity-80`}
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${value.toFixed(1)}%`}
                    />
                );
            })}
        </div>
    );
}

export function LearningTimeline() {
    const [timeline, setTimeline] = useState<LearningTimeline | null>(null);
    const [stats, setStats] = useState<ImprovementStats | null>(null);
    const [beforeAfter, setBeforeAfter] = useState<BeforeAfter | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [timelineRes, statsRes, compareRes] = await Promise.all([
                fetch(`${API_BASE}/learning/timeline`),
                fetch(`${API_BASE}/learning/improvements`),
                fetch(`${API_BASE}/learning/before-after`)
            ]);

            setTimeline(await timelineRes.json());
            setStats(await statsRes.json());
            setBeforeAfter(await compareRes.json());
        } catch (err) {
            console.error('Failed to fetch learning data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <TrendingUp className="h-16 w-16 text-emerald-500 animate-bounce" />
                    <span className="text-slate-500">Loading Learning Progress...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-emerald-600" />
                        Learning Timeline
                    </h2>
                    <p className="text-slate-500 mt-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Tracking AI improvement over time
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                    title="Refresh learning data"
                >
                    <RefreshCw className="h-5 w-5 text-slate-600" />
                </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Total Decisions</p>
                            <p className="text-2xl font-bold">{stats?.total_decisions || 0}</p>
                        </div>
                        <Target className="h-8 w-8 text-blue-500" />
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Success Rate</p>
                            <p className="text-2xl font-bold">
                                {stats ? (stats.success_rate * 100).toFixed(1) : 0}%
                            </p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-emerald-500" />
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Reward Trend</p>
                            <p className="text-2xl font-bold capitalize">{stats?.reward_trend || 'N/A'}</p>
                        </div>
                        <TrendIcon trend={stats?.reward_trend || ''} />
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Milestones</p>
                            <p className="text-2xl font-bold">{stats?.total_milestones || 0}</p>
                        </div>
                        <Award className="h-8 w-8 text-yellow-500" />
                    </div>
                </Card>
            </div>

            {/* Before/After Comparison */}
            {beforeAfter?.available && beforeAfter.improvements && (
                <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-emerald-900">
                            <Award className="h-5 w-5 text-yellow-500" />
                            Learning Impact: Before vs. After
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {beforeAfter.improvements.coverage_pct && (
                                <div className="bg-white/80 p-4 rounded-lg">
                                    <p className="text-sm text-slate-500 mb-2">Coverage</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-slate-400 line-through">
                                            {beforeAfter.improvements.coverage_pct.before.toFixed(1)}%
                                        </span>
                                        <span className="text-xl font-bold text-emerald-600">
                                            {beforeAfter.improvements.coverage_pct.after.toFixed(1)}%
                                        </span>
                                        <span className={`text-sm font-semibold ${beforeAfter.improvements.coverage_pct.change_pct >= 0
                                            ? 'text-emerald-500' : 'text-red-500'
                                            }`}>
                                            {beforeAfter.improvements.coverage_pct.change_pct >= 0 ? '+' : ''}
                                            {beforeAfter.improvements.coverage_pct.change_pct.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            )}
                            {beforeAfter.improvements.alert_reliability_pct && (
                                <div className="bg-white/80 p-4 rounded-lg">
                                    <p className="text-sm text-slate-500 mb-2">Alert Reliability</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-slate-400 line-through">
                                            {beforeAfter.improvements.alert_reliability_pct.before.toFixed(1)}%
                                        </span>
                                        <span className="text-xl font-bold text-emerald-600">
                                            {beforeAfter.improvements.alert_reliability_pct.after.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            )}
                            {beforeAfter.improvements.decision_quality_score && (
                                <div className="bg-white/80 p-4 rounded-lg">
                                    <p className="text-sm text-slate-500 mb-2">Decision Quality</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-slate-400 line-through">
                                            {beforeAfter.improvements.decision_quality_score.before.toFixed(1)}%
                                        </span>
                                        <span className="text-xl font-bold text-emerald-600">
                                            {beforeAfter.improvements.decision_quality_score.after.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        {beforeAfter.summary && (
                            <p className="mt-4 text-sm text-emerald-700 font-medium text-center">
                                {beforeAfter.summary}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* KPI Trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-slate-600">
                            Coverage Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SimpleLineChart
                            data={timeline?.kpi_timeline || []}
                            dataKey="coverage_pct"
                            color="bg-blue-500"
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-slate-600">
                            Decision Quality Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SimpleLineChart
                            data={timeline?.kpi_timeline || []}
                            dataKey="decision_quality_score"
                            color="bg-emerald-500"
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Milestones */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-yellow-500" />
                        Learning Milestones
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {timeline?.milestones && timeline.milestones.length > 0 ? (
                        <div className="space-y-3">
                            {timeline.milestones.slice(-10).reverse().map((milestone, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                                >
                                    <div className={`p-2 rounded-full ${milestone.milestone_type === 'improvement'
                                        ? 'bg-emerald-100'
                                        : 'bg-blue-100'
                                        }`}>
                                        {milestone.milestone_type === 'improvement'
                                            ? <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                                            : <Target className="h-4 w-4 text-blue-600" />
                                        }
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-900">{milestone.description}</p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(milestone.timestamp).toLocaleString()}
                                            {milestone.improvement_pct > 0 && (
                                                <span className="ml-2 text-emerald-600 font-semibold">
                                                    +{milestone.improvement_pct.toFixed(1)}%
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400">
                            <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No milestones yet</p>
                            <p className="text-sm">Run simulations to trigger learning events</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center text-xs text-slate-400 py-4">
                Decision → Outcome → Reward → Improved Decision • Explicit Learning Loop
            </div>
        </div>
    );
}
