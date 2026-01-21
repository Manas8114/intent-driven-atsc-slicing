import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { ArrowRight, Check, ShieldAlert, Loader2, XCircle } from 'lucide-react';
import { useSystem } from '../context/SystemContext';

export function Explainability() {
    const { phase } = useSystem();
    const isThinking = phase === 'parsing' || phase === 'optimizing' || phase === 'safety_check';

    // Mock decision history (Historic)
    const decisions = [
        {
            id: 101,
            trigger: "Intent: Ensure Emergency Reliability ≥ 99%",
            timestamp: "10:32:05 AM",
            type: "Safety Critical",
            before: { modulation: "16QAM", codeRate: "3/4", power: "70 dBm", plp: "PLP0" },
            after: { modulation: "QPSK", codeRate: "1/2", power: "76 dBm", plp: "PLP0" },
            reasoning: "Validation indicated that 16QAM 3/4 provided only 92% reliability in rural fading channels. Safety Shield enforced QPSK 1/2.",
            impact: "Coverage probability increased from 92% to 99.9%."
        },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">AI Decision Explainability</h2>
                <p className="text-slate-500 mt-2">Transparent reasoning for autonomous network changes.</p>
            </div>

            {/* LIVE THINKING VIEW */}
            {(isThinking || phase === 'reconfiguring') && (
                <Card className="border-blue-500 border-2 shadow-xl animate-in zoom-in-95">
                    <CardHeader className="bg-blue-50/50 pb-2">
                        <CardTitle className="flex items-center gap-3 text-blue-700">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            AI Engine Assessment
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        {/* Phase 1: Optimization Candidates */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase text-slate-400">Evaluating Candidates</h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded opacity-50">
                                    <span className="text-sm font-mono text-slate-500">Option A: 64QAM 3/4 (Maximize Throughput)</span>
                                    <span className="text-xs text-red-400 flex items-center gap-1"><XCircle className="h-3 w-3" /> Reliability &lt; 90% (Rejected)</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white border-2 border-emerald-500 rounded shadow-sm">
                                    <span className="text-sm font-mono text-slate-800 font-bold">Option B: QPSK 1/2 (Maximize Robustness)</span>
                                    {phase === 'safety_check' ? (
                                        <span className="text-xs text-blue-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Validating...</span>
                                    ) : (
                                        <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="h-3 w-3" /> Selected Target</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Phase 2: Safety Shield */}
                        {phase === 'safety_check' && (
                            <div className="animate-in slide-in-from-right duration-500 flex items-center gap-4 bg-red-50 p-4 rounded-lg border border-red-200">
                                <ShieldAlert className="h-8 w-8 text-red-600 animate-pulse" />
                                <div>
                                    <h4 className="font-bold text-red-700">Safety Shield Validation</h4>
                                    <p className="text-sm text-red-600">Verifying config against FCC coverage mandates...</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6">
                {decisions.map((decision) => (
                    <Card key={decision.id} className="overflow-hidden border-l-4 border-l-blue-600 opacity-80 hover:opacity-100 transition-opacity">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ShieldAlert className="h-5 w-5 text-red-600" />
                                    <span className="font-semibold text-slate-700">{decision.trigger}</span>
                                    <span className="text-xs text-slate-400 font-mono">{decision.timestamp}</span>
                                </div>
                                <span className="text-xs px-2 py-1 rounded-full font-medium border bg-red-50 text-red-700 border-red-200">
                                    Safety Critical
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Transition</h4>
                                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <div className="font-mono text-sm">{decision.before.modulation} <ArrowRight className="inline h-3 w-3 mx-1" /> {decision.after.modulation}</div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">AI Reasoning</h4>
                                    <p className="text-sm text-slate-700 leading-relaxed bg-blue-50/50 p-4 rounded-lg border border-blue-100 italic">
                                        "{decision.reasoning}"
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
