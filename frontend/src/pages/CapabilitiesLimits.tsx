import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
    CheckCircle,
    XCircle,
    Info,
    AlertTriangle,
    Cpu,
    Radio,
    Zap,
    Server,
    Shield,
    Users,
    Settings
} from 'lucide-react';

interface Capability {
    title: string;
    description: string;
    status: 'can' | 'cannot';
    details: string[];
    icon: React.ElementType;
}

const CAPABILITIES: Capability[] = [
    // What the system CAN do
    {
        title: 'AI-Driven Optimization',
        description: 'Computes optimal ATSC 3.0 configurations using reinforcement learning',
        status: 'can',
        icon: Cpu,
        details: [
            'PPO agent dynamically adjusts slice weights',
            'Water-filling algorithm for power/bandwidth allocation',
            'Real-time adaptation to environmental conditions'
        ]
    },
    {
        title: 'Encoder-Ready Configurations',
        description: 'Generates structured configuration data ready for broadcast encoders',
        status: 'can',
        icon: Settings,
        details: [
            'Full A/322 ModCod table (48 modes)',
            'Valid PLP structures with FEC parameters',
            'JSON export format for encoder APIs'
        ]
    },
    {
        title: 'Pre-Deployment Simulation',
        description: 'Validates configurations through digital twin modeling',
        status: 'can',
        icon: Server,
        details: [
            '10km x 10km spatial grid coverage model',
            'UHF propagation simulation',
            'Interference and shadowing modeling'
        ]
    },
    {
        title: 'Human Approval Workflow',
        description: 'Ensures engineer oversight for all configuration changes',
        status: 'can',
        icon: Users,
        details: [
            'AI recommendations require approval',
            'Full audit trail of decisions',
            'Emergency override with logging'
        ]
    },
    {
        title: 'Emergency Alert Handling',
        description: 'AEAT-compliant emergency prioritization per A/331',
        status: 'can',
        icon: Zap,
        details: [
            'Automatic escalation to robust modulation',
            'Priority resource allocation',
            'CAP-compliant alert formatting'
        ]
    },
    {
        title: 'Safety Constraints',
        description: 'Enforces valid operating boundaries',
        status: 'can',
        icon: Shield,
        details: [
            'Power level validation',
            'Modulation selection based on SNR',
            'Regulatory constraint awareness'
        ]
    },
    // What the system CANNOT do
    {
        title: 'RF Waveform Generation',
        description: 'Does NOT generate actual ATSC 3.0 physical layer signals',
        status: 'cannot',
        icon: Radio,
        details: [
            'No LDPC/BCH encoding',
            'No OFDM modulation',
            'No I/Q sample generation for transmission'
        ]
    },
    {
        title: 'Licensed Spectrum Transmission',
        description: 'Does NOT transmit on FCC-licensed frequencies',
        status: 'cannot',
        icon: Radio,
        details: [
            'No RF output capability',
            'No antenna connection',
            'No broadcast license required for operation'
        ]
    },
    {
        title: 'Certified Encoder Replacement',
        description: 'Does NOT replace professional broadcast encoding equipment',
        status: 'cannot',
        icon: Server,
        details: [
            'Vendor encoders still required (e.g., Harmonic, TeamCast)',
            'FCC certification handled by encoder vendors',
            'This is a control layer, not transmission equipment'
        ]
    },
];

export function CapabilitiesLimits() {
    const canDo = CAPABILITIES.filter(c => c.status === 'can');
    const cannotDo = CAPABILITIES.filter(c => c.status === 'cannot');

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Capabilities & Limits
                </h2>
                <p className="text-slate-500 mt-2 max-w-2xl">
                    Complete transparency about system capabilities. Explicit honesty prevents overclaiming
                    and increases credibility with real broadcast operators.
                </p>
            </div>

            {/* Important Notice */}
            <Card className="bg-amber-50 border-amber-200">
                <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
                        <div>
                            <h3 className="font-bold text-amber-900">Important Clarification</h3>
                            <p className="text-sm text-amber-800 mt-1">
                                This system is an <strong>AI control and optimization layer</strong> for broadcast operations.
                                It computes configurations but does not generate or transmit RF signals.
                                All simulation data is for validation and visualization purposes only.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* What We CAN Do */}
            <div>
                <h3 className="text-xl font-bold text-emerald-700 mb-4 flex items-center gap-2">
                    <CheckCircle className="h-6 w-6" />
                    What This System CAN Do
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                    {canDo.map((capability, index) => (
                        <Card key={index} className="border-emerald-100 hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-100 p-2 rounded-lg">
                                        <capability.icon className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <CardTitle className="text-base">{capability.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 mb-3">{capability.description}</p>
                                <ul className="space-y-1">
                                    {capability.details.map((detail, i) => (
                                        <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                                            <CheckCircle className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* What We CANNOT Do */}
            <div>
                <h3 className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
                    <XCircle className="h-6 w-6" />
                    What This System CANNOT Do
                </h3>
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        {cannotDo.map((capability, index) => (
                            <div key={index} className="bg-white rounded-lg p-4 border border-red-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <XCircle className="h-5 w-5 text-red-500" />
                                    <h4 className="font-semibold text-slate-900">{capability.title}</h4>
                                </div>
                                <p className="text-sm text-slate-600 mb-3">{capability.description}</p>
                                <ul className="space-y-1">
                                    {capability.details.map((detail, i) => (
                                        <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
                                            <span className="text-red-300">✕</span>
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Correct Terminology */}
            <Card className="bg-slate-900 text-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-400" />
                        Correct Terminology
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                                <XCircle className="h-4 w-4" />
                                DO NOT SAY
                            </h4>
                            <ul className="space-y-1 text-sm text-slate-300">
                                <li>"We transmit ATSC 3.0 signals"</li>
                                <li>"We generate RF waveforms"</li>
                                <li>"We replace broadcast encoders"</li>
                                <li>"We are a certified broadcast system"</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                ALWAYS SAY
                            </h4>
                            <ul className="space-y-1 text-sm text-slate-300">
                                <li>"We compute encoder-ready configurations"</li>
                                <li>"We simulate baseband behavior"</li>
                                <li>"We act as a control and optimization layer"</li>
                                <li>"We require vendor encoders for actual broadcast"</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Integration Path */}
            <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader>
                    <CardTitle className="text-blue-900">Future Integration Path</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-blue-800 mb-4">
                        The system is architecturally prepared for real broadcast integration:
                    </p>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-white rounded-lg p-3 border border-blue-100">
                            <h5 className="font-semibold text-blue-900">Baseband Interface</h5>
                            <p className="text-blue-700 text-xs mt-1">
                                Ready to connect to encoder APIs (Harmonic, TeamCast, etc.)
                            </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-blue-100">
                            <h5 className="font-semibold text-blue-900">RF Adapter</h5>
                            <p className="text-blue-700 text-xs mt-1">
                                Stubbed for SDR (USRP, LimeSDR) and commercial exciter integration
                            </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-blue-100">
                            <h5 className="font-semibold text-blue-900">Approval Workflow</h5>
                            <p className="text-blue-700 text-xs mt-1">
                                Ready for production deployment with full audit compliance
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
