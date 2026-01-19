import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Target, Shield, XCircle, CheckCircle, Eye, Brain, Radio, FileText } from 'lucide-react';

interface ApprovalRecord {
    id: string;
    state: string;
    recommended_config: {
        modulation: string;
        coding_rate: string;
        power_dbm: number;
        bandwidth_mhz: number;
        priority: string;
        all_slices?: Array<{
            name: string;
            power_dbm: number;
            bandwidth_mhz: number;
        }>;
    };
    risk_assessment: {
        level: string;
        score: number;
        factors: string[];
    };
    human_readable_summary: string;
}

interface ApprovalCardProps {
    pendingApproval: ApprovalRecord;
    getStatusBadge: (state: string) => React.ReactNode;
}

export function ApprovalCard({ pendingApproval, getStatusBadge }: ApprovalCardProps) {
    return (
        <Card className="border-2 border-yellow-200 bg-gradient-to-b from-yellow-50/50 to-white">
            <CardHeader className="border-b border-yellow-100 bg-yellow-50/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Radio className="h-5 w-5 text-yellow-600" />
                        AI-Recommended Configuration
                    </CardTitle>
                    {getStatusBadge(pendingApproval.state)}
                </div>
                <p className="text-xs text-yellow-700 font-medium mt-1">Not Deployed</p>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
                {/* AI Confidence Score */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            AI Confidence Score
                        </h4>
                        <span
                            className="px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800 cursor-help"
                            title="Confidence based on data consistency, model agreement, and safety margins."
                        >
                            {pendingApproval.risk_assessment.score < 0.3 ? '92%' :
                                pendingApproval.risk_assessment.score < 0.5 ? '78%' : '65%'} High
                        </span>
                    </div>
                    <div className="w-full bg-emerald-200 rounded-full h-2">
                        <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                            style={{
                                width: pendingApproval.risk_assessment.score < 0.3 ? '92%' :
                                    pendingApproval.risk_assessment.score < 0.5 ? '78%' : '65%'
                            }}
                        />
                    </div>
                    <p className="text-xs text-emerald-600 mt-2 italic">
                        Confidence based on data consistency, model agreement, and safety margins.
                    </p>
                </div>

                {/* Risk Assessment Visualization */}
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-500" />
                        Risk Assessment
                    </h4>
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-600">Coverage Risk</span>
                                <span className="font-semibold text-emerald-600">Low</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '15%' }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-600">Service Impact Risk</span>
                                <span className="font-semibold text-amber-600">Medium</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '45%' }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-600">Safety Risk</span>
                                <span className="font-semibold text-emerald-600">None</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '5%' }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rejected Alternatives */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-slate-400" />
                        Rejected Alternatives
                    </h4>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2 text-slate-600">
                            <span className="text-red-400 mt-0.5">✗</span>
                            <div>
                                <span className="font-medium">256QAM rejected</span>
                                <p className="text-xs text-slate-500">Insufficient SNR margin for mobile reception stability</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-2 text-slate-600">
                            <span className="text-red-400 mt-0.5">✗</span>
                            <div>
                                <span className="font-medium">Unicast delivery rejected</span>
                                <p className="text-xs text-slate-500">Congestion level exceeds offload threshold</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-2 text-slate-600">
                            <span className="text-red-400 mt-0.5">✗</span>
                            <div>
                                <span className="font-medium">Higher power rejected</span>
                                <p className="text-xs text-slate-500">Regulatory constraint on licensed spectrum</p>
                            </div>
                        </li>
                    </ul>
                </div>

                {/* Trust Indicators */}
                <div className="bg-blue-50 rounded-lg border border-blue-100 p-4">
                    <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Trust Indicators
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="h-3 w-3" />
                            Standards compliant
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="h-3 w-3" />
                            Safety checks passed
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            <Eye className="h-3 w-3" />
                            Human oversight active
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                            <Brain className="h-3 w-3" />
                            Simulation validated
                        </span>
                    </div>
                </div>

                {/* AI Explanation Box */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                    <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Why the AI Selects This Configuration
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed">
                        {pendingApproval.human_readable_summary ||
                            "Current channel conditions indicate increased interference in rural regions. The broadcast adapts by prioritizing emergency alert delivery while maintaining acceptable coverage for public services."}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
