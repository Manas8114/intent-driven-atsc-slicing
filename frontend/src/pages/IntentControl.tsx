import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Send, CheckCircle, Settings2, ShieldCheck, Signal, ArrowRight, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSystem } from '../context/SystemContext';

export function IntentControl() {
    const { phase, triggerIntent, activeIntent } = useSystem();
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [customJson, setCustomJson] = useState('{\n  "intent": "maximize_coverage",\n  "target": 0.95\n}');

    const isSystemBusy = phase !== 'idle' && phase !== 'broadcasting' && phase !== 'emergency';

    const PRESETS = [
        {
            label: 'Maximize Rural Coverage',
            intent: 'maximize_coverage',
            target: 0.95,
            icon: Signal,
            desc: 'Focus on reaching distant users with robust modulation.',
            impact: {
                positive: ['Rural Coverage +15%', 'Signal Penetration (Indoor)'],
                negative: ['Peak Throughput -4 Mbps', '4K Service Reduced to 1080p']
            }
        },
        {
            label: 'Emergency Reliability',
            intent: 'ensure_emergency_reliability',
            target: 0.99,
            icon: ShieldCheck,
            desc: 'Prioritize alert delivery with maximum redundancy.',
            impact: {
                positive: ['Alert Reliability > 99.9%', 'Hardened PLP 0'],
                negative: ['Commercial Services Preempted', 'Latency varies']
            }
        },
        {
            label: 'Optimize Spectrum',
            intent: 'optimize_spectrum',
            target: 0.90,
            icon: Settings2,
            desc: 'Maximize data throughput (bits/s/Hz) within constraints.',
            impact: {
                positive: ['Throughput +25%', 'Support for 4K HDR'],
                negative: ['Edge Coverage -5%']
            }
        },
    ];

    const handleSelect = (intent: string) => {
        if (isSystemBusy) return;
        setSelectedPreset(intent);
    };

    const handleConfirm = async () => {
        if (!selectedPreset) return;
        setSelectedPreset(null);
        await triggerIntent(selectedPreset);
    };

    const activePresetData = PRESETS.find(p => p.intent === selectedPreset);

    return (
        <div className="relative min-h-[600px]">
            {/* Blurring Overlay when System is Busy */}
            {isSystemBusy && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-500 rounded-xl border border-slate-100">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 flex flex-col items-center">
                        <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <h3 className="text-xl font-bold text-slate-900">System Reconfiguring</h3>
                        <p className="text-slate-500 mt-2">AI Engine calculating optimal slice parameters...</p>
                        <div className="mt-4 text-xs font-mono bg-slate-100 px-3 py-1 rounded">
                            Phase: {phase.toUpperCase()}
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Intent Control</h2>
                    <p className="text-slate-500 mt-2">Translate high-level objectives into technical network policies.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {PRESETS.map((preset) => (
                        <Card
                            key={preset.intent}
                            className={cn(
                                "transition-all cursor-pointer group relative overflow-hidden",
                                selectedPreset === preset.intent ? "ring-2 ring-blue-500 shadow-xl scale-105 bg-blue-50/50" : "hover:border-blue-300 hover:shadow-md",
                                isSystemBusy ? "opacity-50 grayscale" : ""
                            )}
                            onClick={() => handleSelect(preset.intent)}
                        >
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        selectedPreset === preset.intent ? "bg-blue-100 text-blue-700" : "bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600"
                                    )}>
                                        <preset.icon className="h-6 w-6" />
                                    </div>
                                    <CardTitle className="text-base">{preset.label}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-500 mb-4">{preset.desc}</p>
                                {/* Active Indicator */}
                                {activeIntent === preset.intent && (
                                    <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Impact Prediction Panel (Appears when selected) */}
                {selectedPreset && activePresetData && (
                    <div className="fixed inset-x-0 bottom-0 p-6 z-40 flex justify-center pointer-events-none">
                        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 w-full max-w-2xl pointer-events-auto animate-in slide-in-from-bottom-10">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Signal className="h-5 w-5 text-blue-500" />
                                        Predicted Impact Assessment
                                    </h3>
                                    <p className="text-sm text-slate-500">Based on current channel state estimation (CSI)</p>
                                </div>
                                <button onClick={() => setSelectedPreset(null)} className="text-slate-400 hover:text-slate-600" aria-label="Close">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-8 mb-6">
                                <div>
                                    <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2">Expected Benefits</h4>
                                    <ul className="space-y-1">
                                        {activePresetData.impact.positive.map((item, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-amber-600 uppercase mb-2">Trade-offs</h4>
                                    <ul className="space-y-1">
                                        {activePresetData.impact.negative.map((item, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                                <ArrowRight className="h-4 w-4 text-amber-500" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={() => setSelectedPreset(null)}>
                                    Cancel
                                </Button>
                                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30" onClick={handleConfirm}>
                                    Confirm & Apply Intent ({useMemo(() => Math.floor(Math.random() * 20 + 40), [selectedPreset])}ms latency)
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Custom Intent (JSON)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <textarea
                                aria-label="Custom Intent JSON"
                                placeholder='{ "intent": "maximize_coverage", "target": 0.95 }'
                                className="w-full h-32 font-mono text-sm bg-slate-50 border border-slate-200 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={customJson}
                                onChange={(e) => setCustomJson(e.target.value)}
                            />
                            <Button className="w-full" disabled={isSystemBusy}>
                                <Send className="h-4 w-4 mr-2" /> Submit Custom JSON
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
