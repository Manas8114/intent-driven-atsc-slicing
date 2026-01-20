import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
    Layers, Brain, RefreshCw, Cpu, Network,
    Radio, Database, Shield, ExternalLink
} from 'lucide-react';

export function Architecture() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                        <Layers className="h-8 w-8 text-blue-600" />
                        ITU FG-AINN Architecture
                    </h2>
                    <p className="text-slate-500 mt-2 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Conforming to ITU-T FG-AINN-I-116-R2 Standards
                    </p>
                </div>
            </div>

            {/* Compliance Badge */}
            <Card className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-white/20 rounded-xl">
                        <Shield className="h-12 w-12" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-2xl">ITU FG-AINN Compliant</h3>
                        <p className="text-blue-100 mt-1">
                            This system implements the AI-Native Network Architecture framework
                            as defined by ITU Focus Group on AI for Future Networks.
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-blue-200">Reference</p>
                        <p className="font-mono text-lg">FG-AINN-I-116-R2</p>
                    </div>
                </div>
            </Card>

            {/* Three-Layer Architecture */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-blue-500" />
                        Layered AI-Native Network Architecture
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Management Layer */}
                        <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border-2 border-purple-200">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-purple-500 rounded-lg">
                                    <Brain className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-purple-900">Management & Orchestration Layer</h4>
                                    <p className="text-sm text-purple-600">Intent interpretation, policy optimization, governance</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                                <div className="p-2 bg-white rounded-lg text-center text-xs font-mono text-purple-700">ai_engine.py</div>
                                <div className="p-2 bg-white rounded-lg text-center text-xs font-mono text-purple-700">optimizer.py</div>
                                <div className="p-2 bg-white rounded-lg text-center text-xs font-mono text-purple-700">intent_service.py</div>
                                <div className="p-2 bg-white rounded-lg text-center text-xs font-mono text-purple-700">approval_engine.py</div>
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex justify-center">
                            <div className="w-0.5 h-6 bg-slate-300"></div>
                        </div>

                        {/* Network Function Layer */}
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-500 rounded-lg">
                                    <Cpu className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-blue-900">Network Function Layer</h4>
                                    <p className="text-sm text-blue-600">AI models, digital twin, learning loop</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                                <div className="p-2 bg-white rounded-lg text-center text-xs font-mono text-blue-700">rl_agent.py (PPO)</div>
                                <div className="p-2 bg-white rounded-lg text-center text-xs font-mono text-blue-700">spatial_model.py</div>
                                <div className="p-2 bg-white rounded-lg text-center text-xs font-mono text-blue-700">learning_loop.py</div>
                                <div className="p-2 bg-white rounded-lg text-center text-xs font-mono text-blue-700">demand_predictor.py</div>
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex justify-center">
                            <div className="w-0.5 h-6 bg-slate-300"></div>
                        </div>

                        {/* Infrastructure Layer */}
                        <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border-2 border-emerald-200">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-emerald-500 rounded-lg">
                                    <Radio className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-emerald-900">Infrastructure Layer</h4>
                                    <p className="text-sm text-emerald-600">Data sources, RF abstraction, telemetry</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                                <div className="p-2 bg-white rounded-lg text-center text-xs font-mono text-emerald-700">rf_adapter.py</div>
                                <div className="p-2 bg-white rounded-lg text-center text-xs font-mono text-emerald-700">baseband_interface.py</div>
                                <div className="p-2 bg-white rounded-lg text-center text-xs font-mono text-emerald-700">FCC Data</div>
                                <div className="p-2 bg-white rounded-lg text-center text-xs font-mono text-emerald-700">Cell Tower Data</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Agentic AI Framework */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-violet-500" />
                        Agentic AI Framework
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Memory */}
                        <div className="p-4 bg-violet-50 rounded-xl border border-violet-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Database className="h-5 w-5 text-violet-600" />
                                <h4 className="font-bold text-violet-900">Memory</h4>
                            </div>
                            <ul className="text-sm text-violet-700 space-y-1">
                                <li>• Experience Buffer (State/Action/Reward)</li>
                                <li>• KPI History (SQLite)</li>
                                <li>• Decision Audit Trail</li>
                                <li>• Learning Milestones</li>
                            </ul>
                        </div>

                        {/* LLM / Agent */}
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Brain className="h-5 w-5 text-blue-600" />
                                <h4 className="font-bold text-blue-900">AI Agent (PPO)</h4>
                            </div>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• Proximal Policy Optimization</li>
                                <li>• Multi-objective Optimization</li>
                                <li>• Intent → Policy Translation</li>
                                <li>• Reward Shaping</li>
                            </ul>
                        </div>

                        {/* Tools */}
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Network className="h-5 w-5 text-emerald-600" />
                                <h4 className="font-bold text-emerald-900">Tools</h4>
                            </div>
                            <ul className="text-sm text-emerald-700 space-y-1">
                                <li>• Digital Twin Simulator</li>
                                <li>• Coverage Calculator</li>
                                <li>• ModCod Selector</li>
                                <li>• Congestion Analyzer</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Model Lifecycle */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-amber-500" />
                        Model Lifecycle Management (LCM)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        {/* Training */}
                        <div className="flex-1 min-w-32 p-3 bg-amber-50 rounded-lg text-center border border-amber-200">
                            <p className="text-xs text-amber-600 font-medium">Training</p>
                            <p className="text-sm font-bold text-amber-900">PPO Agent</p>
                        </div>
                        <div className="text-slate-300">→</div>
                        {/* Validation */}
                        <div className="flex-1 min-w-32 p-3 bg-blue-50 rounded-lg text-center border border-blue-200">
                            <p className="text-xs text-blue-600 font-medium">Validation</p>
                            <p className="text-sm font-bold text-blue-900">Digital Twin</p>
                        </div>
                        <div className="text-slate-300">→</div>
                        {/* Deployment */}
                        <div className="flex-1 min-w-32 p-3 bg-emerald-50 rounded-lg text-center border border-emerald-200">
                            <p className="text-xs text-emerald-600 font-medium">Deployment</p>
                            <p className="text-sm font-bold text-emerald-900">Human Approval</p>
                        </div>
                        <div className="text-slate-300">→</div>
                        {/* Monitoring */}
                        <div className="flex-1 min-w-32 p-3 bg-violet-50 rounded-lg text-center border border-violet-200">
                            <p className="text-xs text-violet-600 font-medium">Monitoring</p>
                            <p className="text-sm font-bold text-violet-900">KPI Tracking</p>
                        </div>
                        <div className="text-slate-300">→</div>
                        {/* Retraining */}
                        <div className="flex-1 min-w-32 p-3 bg-rose-50 rounded-lg text-center border border-rose-200">
                            <p className="text-xs text-rose-600 font-medium">Retraining</p>
                            <p className="text-sm font-bold text-rose-900">Experience Buffer</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* References */}
            <Card className="bg-slate-50">
                <CardContent className="p-4">
                    <h4 className="font-bold text-slate-700 mb-2">References</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                        <li className="flex items-center gap-2">
                            <ExternalLink className="h-3 w-3" />
                            ITU-T FG-AINN-I-116-R2: AI-Native Network Architecture
                        </li>
                        <li className="flex items-center gap-2">
                            <ExternalLink className="h-3 w-3" />
                            ITU-T FG-AINN-I-139: Agentic AI Framework and Model LCM
                        </li>
                        <li className="flex items-center gap-2">
                            <ExternalLink className="h-3 w-3" />
                            ATSC A/322: Physical Layer Protocol
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
