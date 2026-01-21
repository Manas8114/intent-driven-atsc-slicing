import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Map, Layers, Users, Car, Radio, RefreshCw, Info } from 'lucide-react';

// Types for heatmap data
interface HeatmapData {
    grid_size: number;
    snr_map: number[][];
    density_map: number[][];
    coverage_map: number[][];
    observation_count_map: number[][];
    generated_at: string;
    observation_count: number;
    label: string;
}

// Color scale for heatmap cells - Enhanced for visibility in both themes
function getSnrColor(snr: number): string {
    if (snr <= 0) return 'bg-slate-300 dark:bg-slate-700';
    if (snr < 10) return 'bg-rose-500 dark:bg-rose-600';
    if (snr < 15) return 'bg-orange-500 dark:bg-orange-600';
    if (snr < 20) return 'bg-amber-400 dark:bg-amber-500';
    if (snr < 25) return 'bg-lime-500 dark:bg-lime-600';
    return 'bg-emerald-500 dark:bg-emerald-600';
}

function getDensityColor(count: number): string {
    if (count === 0) return 'bg-slate-200 dark:bg-slate-700';
    if (count < 5) return 'bg-cyan-300 dark:bg-cyan-700';
    if (count < 10) return 'bg-cyan-400 dark:bg-cyan-600';
    if (count < 20) return 'bg-cyan-500 dark:bg-cyan-500';
    if (count < 50) return 'bg-cyan-600 dark:bg-cyan-400';
    return 'bg-cyan-700 dark:bg-cyan-300';
}

// Heatmap grid component
function HeatmapGrid({
    data,
    getColor,
    title
}: {
    data: number[][];
    getColor: (value: number) => string;
    title: string;
}) {
    return (
        <div className="space-y-2">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200">{title}</h4>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}>
                {data.map((row, i) => (
                    row.map((value, j) => (
                        <div
                            key={`${i}-${j}`}
                            className={`aspect-square rounded ${getColor(value)} border border-white/50 
                                       transition-all hover:scale-110 hover:z-10 cursor-pointer`}
                            title={`(${i}, ${j}): ${value.toFixed(1)}`}
                        />
                    ))
                ))}
            </div>
        </div>
    );
}

export function KnowledgeMap() {
    const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeLayer, setActiveLayer] = useState<'snr' | 'density' | 'coverage'>('snr');

    const fetchData = async () => {
        try {
            const response = await fetch('http://localhost:8000/knowledge/heatmap');
            if (!response.ok) throw new Error('Failed to fetch knowledge map');
            const data = await response.json();
            setHeatmapData(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
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
                    <Map className="h-16 w-16 text-blue-500 animate-spin" />
                    <span className="text-slate-500">Loading Knowledge Map...</span>
                </div>
            </div>
        );
    }

    if (error || !heatmapData) {
        return (
            <div className="flex items-center justify-center h-96">
                <Card className="p-6 bg-amber-50 border-amber-200">
                    <div className="flex flex-col items-center gap-3">
                        <Info className="h-8 w-8 text-amber-600" />
                        <p className="text-amber-700">Knowledge map initializing...</p>
                        <p className="text-sm text-amber-600">Run some simulations to populate data</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-3">
                        <Map className="h-8 w-8 text-blue-600" />
                        Broadcast Knowledge Map
                    </h2>
                    <p className="text-slate-500 mt-2 flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        {heatmapData.label}
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="h-5 w-5 text-slate-600" />
                </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <Radio className="h-8 w-8 text-purple-500" />
                        <div>
                            <p className="text-sm text-slate-500">Observations</p>
                            <p className="text-xl font-bold">{heatmapData.observation_count.toLocaleString()}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <Users className="h-8 w-8 text-blue-500" />
                        <div>
                            <p className="text-sm text-slate-500">Grid Size</p>
                            <p className="text-xl font-bold">{heatmapData.grid_size}×{heatmapData.grid_size} km</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <Car className="h-8 w-8 text-orange-500" />
                        <div>
                            <p className="text-sm text-slate-500">Generated</p>
                            <p className="text-xl font-bold">{new Date(heatmapData.generated_at).toLocaleTimeString()}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50">
                    <div className="text-center">
                        <p className="text-sm text-slate-500">AI-Generated</p>
                        <p className="text-lg font-bold text-purple-700">Continuous Learning</p>
                    </div>
                </Card>
            </div>

            {/* Layer selector */}
            <div className="flex gap-2">
                {[
                    { id: 'snr', label: 'SNR Distribution', icon: Radio },
                    { id: 'density', label: 'User Density', icon: Users },
                    { id: 'coverage', label: 'Coverage Probability', icon: Layers }
                ].map(layer => (
                    <button
                        key={layer.id}
                        onClick={() => setActiveLayer(layer.id as 'snr' | 'density' | 'coverage')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeLayer === layer.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        <layer.icon className="h-4 w-4" />
                        {layer.label}
                    </button>
                ))}
            </div>

            {/* Main heatmap */}
            <Card className="p-6">
                <CardContent>
                    <div className="max-w-xl mx-auto">
                        {activeLayer === 'snr' && (
                            <HeatmapGrid
                                data={heatmapData.snr_map}
                                getColor={getSnrColor}
                                title="Learned SNR Distribution (dB)"
                            />
                        )}
                        {activeLayer === 'density' && (
                            <HeatmapGrid
                                data={heatmapData.density_map}
                                getColor={getDensityColor}
                                title="Observed User Density"
                            />
                        )}
                        {activeLayer === 'coverage' && (
                            <HeatmapGrid
                                data={heatmapData.coverage_map}
                                getColor={(v) => v > 0.8 ? 'bg-emerald-500 dark:bg-emerald-600' : v > 0.5 ? 'bg-amber-400 dark:bg-amber-500' : 'bg-rose-500 dark:bg-rose-600'}
                                title="Coverage Success Probability"
                            />
                        )}
                    </div>

                    {/* Legend */}
                    <div className="mt-6 flex justify-center">
                        {activeLayer === 'snr' && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <span>Poor</span>
                                <div className="flex gap-1">
                                    <div className="w-4 h-4 bg-rose-500 dark:bg-rose-600 rounded" />
                                    <div className="w-4 h-4 bg-orange-500 dark:bg-orange-600 rounded" />
                                    <div className="w-4 h-4 bg-amber-400 dark:bg-amber-500 rounded" />
                                    <div className="w-4 h-4 bg-lime-500 dark:bg-lime-600 rounded" />
                                    <div className="w-4 h-4 bg-emerald-500 dark:bg-emerald-600 rounded" />
                                </div>
                                <span>Excellent</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center text-xs text-slate-400 py-4">
                Generated by AI from Broadcast Feedback • Cognitive Broadcasting
            </div>
        </div>
    );
}
