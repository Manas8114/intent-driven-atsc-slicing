import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
    Database, Download, RefreshCw, HardDrive,
    TrendingUp, Clock, Activity
} from 'lucide-react';

// Types
interface BufferStats {
    total_experiences: number;
    buffer_size_mb: number;
    oldest_timestamp: number | null;
    newest_timestamp: number | null;
    avg_reward: number;
    total_episodes: number;
}

interface Experience {
    timestamp: number;
    state: number[];
    action: number[];
    reward: number;
    next_state: number[];
    done: boolean;
    info: Record<string, unknown>;
}

export function TrainingData() {
    const [stats, setStats] = useState<BufferStats | null>(null);
    const [recentExperiences, setRecentExperiences] = useState<Experience[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const fetchData = async () => {
        try {
            const [statsRes, recentRes] = await Promise.all([
                fetch('http://localhost:8000/experiences/stats'),
                fetch('http://localhost:8000/experiences/recent?n=20')
            ]);
            setStats(await statsRes.json());
            setRecentExperiences(await recentRes.json());
        } catch (err) {
            console.error('Failed to fetch training data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await fetch('http://localhost:8000/experiences/export', {
                method: 'POST'
            });
            const data = await res.json();
            alert(`Replay buffer exported to: ${data.path}`);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed. Check console for details.');
        } finally {
            setExporting(false);
        }
    };

    const handleSave = async () => {
        try {
            await fetch('http://localhost:8000/experiences/save', { method: 'POST' });
            alert('Experiences saved to disk.');
        } catch (err) {
            console.error('Save failed:', err);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <Database className="h-16 w-16 text-violet-500 animate-bounce" />
                    <span className="text-slate-500">Loading Training Data...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                        <Database className="h-8 w-8 text-violet-600" />
                        Training Data Buffer
                    </h2>
                    <p className="text-slate-500 mt-2 flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        Continuous learning experience storage
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                        title="Refresh data"
                    >
                        <RefreshCw className="h-5 w-5 text-slate-600" />
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 font-medium transition-colors cursor-pointer"
                    >
                        Save to Disk
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                        <Download className="h-4 w-4" />
                        {exporting ? 'Exporting...' : 'Export Replay Buffer'}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-violet-600 font-medium">Experiences Stored</p>
                            <p className="text-3xl font-bold text-violet-900">
                                {stats?.total_experiences.toLocaleString() || 0}
                            </p>
                        </div>
                        <Database className="h-10 w-10 text-violet-500 opacity-80" />
                    </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 font-medium">Storage Size</p>
                            <p className="text-3xl font-bold text-blue-900">
                                {stats?.buffer_size_mb.toFixed(2) || 0} MB
                            </p>
                        </div>
                        <HardDrive className="h-10 w-10 text-blue-500 opacity-80" />
                    </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-emerald-600 font-medium">Avg Reward</p>
                            <p className="text-3xl font-bold text-emerald-900">
                                {stats?.avg_reward.toFixed(2) || 0}
                            </p>
                        </div>
                        <TrendingUp className="h-10 w-10 text-emerald-500 opacity-80" />
                    </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-amber-600 font-medium">Episodes</p>
                            <p className="text-3xl font-bold text-amber-900">
                                {stats?.total_episodes || 0}
                            </p>
                        </div>
                        <Activity className="h-10 w-10 text-amber-500 opacity-80" />
                    </div>
                </Card>
            </div>

            {/* Info Banner */}
            <Card className="p-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white border-none">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                        <Database className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Continuous Learning Active</h3>
                        <p className="text-violet-100 text-sm">
                            Every AI decision is recorded as (State, Action, Reward, Next State) tuples.
                            Export the replay buffer to retrain the PPO model offline.
                        </p>
                    </div>
                </div>
            </Card>

            {/* Recent Experiences */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-violet-500" />
                        Recent Training Experiences
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {recentExperiences.length > 0 ? (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {recentExperiences.slice().reverse().map((exp, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg font-mono text-xs hover:bg-slate-100 transition-colors"
                                >
                                    <div className={`px-2 py-1 rounded ${exp.reward >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        R: {exp.reward.toFixed(2)}
                                    </div>
                                    <div className="flex-1 text-slate-600 truncate">
                                        <span className="text-violet-600">State:</span> [{exp.state.map(s => s.toFixed(2)).join(', ')}]
                                    </div>
                                    <div className="text-slate-600 truncate">
                                        <span className="text-blue-600">Action:</span> [{exp.action.map(a => a.toFixed(2)).join(', ')}]
                                    </div>
                                    <div className="text-slate-400">
                                        {new Date(exp.timestamp * 1000).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400">
                            <Database className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No experiences recorded yet</p>
                            <p className="text-sm mt-2">
                                Run simulations and make AI decisions to accumulate training data
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center text-xs text-slate-400 py-4">
                Experience Buffer • Stores (s, a, r, s') tuples for offline PPO retraining
            </div>
        </div>
    );
}
