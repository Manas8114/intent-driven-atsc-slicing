import React from 'react';
import { LayoutDashboard, Radio, Activity, FileText, AlertTriangle, Settings, CheckSquare, Info, ClipboardCheck, BarChart3, Brain, Map, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { TopStatusBar } from './TopStatusBar';
import { useSystem } from '../context/SystemContext';
import { HurdlePanel } from './HurdlePanel';

interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    highlight?: boolean;
    section?: string;
}

const NAV_ITEMS: NavItem[] = [
    // AI Intelligence Section (NEW - Cognitive Broadcasting)
    { id: 'cognitive', label: '🧠 Cognitive Brain', icon: Brain, highlight: true, section: 'AI Intelligence' },
    { id: 'knowledge', label: 'Knowledge Map', icon: Map, section: 'AI Intelligence' },
    { id: 'learning', label: 'Learning Timeline', icon: TrendingUp, section: 'AI Intelligence' },
    { id: 'bootstrap', label: 'Bootstrap Uncertainty', icon: BarChart3, section: 'AI Intelligence' },
    { id: 'celltowers', label: 'Cell Tower Data', icon: Radio, section: 'AI Intelligence' },
    // Core Operations
    { id: 'overview', label: 'System Overview', icon: LayoutDashboard },
    { id: 'approval', label: 'Deployment Approval', icon: CheckSquare, highlight: true },
    { id: 'telemetry', label: 'Broadcast Telemetry', icon: BarChart3 },
    { id: 'explainability', label: 'AI Decisions', icon: FileText },
    { id: 'plp', label: 'PLP Visualization', icon: Radio },
    { id: 'kpi', label: 'KPI Dashboard', icon: Activity },
    { id: 'emergency', label: 'Emergency View', icon: AlertTriangle },
    { id: 'readiness', label: 'Readiness Checklist', icon: ClipboardCheck },
    { id: 'capabilities', label: 'Capabilities & Limits', icon: Info },
    { id: 'intent', label: 'Advanced Config', icon: Settings },
];

interface LayoutProps {
    children: React.ReactNode;
    activePage: string;
    onNavigate: (pageId: string) => void;
}

export function Layout({ children, activePage, onNavigate }: LayoutProps) {
    const { logs, adaptationExplanation } = useSystem();

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden">
            {/* Top Status Bar (Always Visible) */}
            <TopStatusBar />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Sidebar */}
                <aside className="w-64 border-r border-slate-200 bg-white shadow-sm flex flex-col z-0 hidden md:flex">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-blue-600 rounded-lg p-1.5 shadow-lg shadow-blue-500/30">
                                <Radio className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-slate-900">BroadcastAI</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono pl-11">
                            CONTROL PLANE v1.2
                        </div>
                    </div>

                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {NAV_ITEMS.map((item) => (
                            <Button
                                key={item.id}
                                variant="ghost"
                                className={cn(
                                    'w-full justify-start gap-3 px-3 py-2.5 rounded-lg transition-all',
                                    activePage === item.id
                                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm ring-1 ring-blue-200'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                )}
                                onClick={() => onNavigate(item.id)}
                            >
                                <item.icon className={cn("h-5 w-5", activePage === item.id ? "text-blue-600" : "text-slate-400")} />
                                {item.label}
                            </Button>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <div className="bg-white rounded p-3 border border-slate-200 shadow-sm">
                            <div className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                                SAFETY SHIELD
                                <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px]">ACTIVE</span>
                            </div>
                            <div className="text-[10px] text-slate-500 leading-relaxed">
                                AI constraints enforced by autonomous safety layer.
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-auto bg-slate-50 relative">
                    <div className="mx-auto max-w-7xl p-8 pb-16">
                        {children}
                    </div>

                    {/* Adaptation Explanation Toast (Centered Overlay) */}
                    {adaptationExplanation && (
                        <div className="absolute inset-x-0 bottom-20 flex justify-center z-[60] px-4 pointer-events-none">
                            <div className="bg-slate-900/95 backdrop-blur text-white p-6 rounded-xl shadow-2xl border border-slate-700 max-w-2xl w-full animate-in slide-in-from-bottom-10 pointer-events-auto">
                                <div className="flex items-start gap-4">
                                    <div className="bg-indigo-500/20 p-2 rounded-lg">
                                        <Activity className="h-6 w-6 text-indigo-400 animate-pulse" />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Trigger Event (Hurdle)</h4>
                                            <p className="font-medium text-lg">{adaptationExplanation.changed}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700/50">
                                            <div>
                                                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">AI Adaptation</h4>
                                                <p className="text-sm text-slate-300 leading-relaxed">{adaptationExplanation.action}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Safety Outcome</h4>
                                                <p className="text-sm text-slate-300 leading-relaxed">{adaptationExplanation.safe}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Live Log Strip */}
                    <div className="fixed bottom-0 inset-x-0 h-8 bg-slate-950 border-t border-slate-800 flex items-center px-4 z-50">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-500 uppercase tracking-wider min-w-fit">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Live Feed
                        </div>
                        <div className="w-px h-4 bg-slate-800 mx-3" />
                        <div className="flex-1 overflow-hidden">
                            <div className="text-xs text-slate-400 font-mono truncate">
                                {logs[0] || "System initialized. Waiting for intent..."}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Right Side Hurdle Panel */}
                <HurdlePanel />
            </div>
        </div>
    );
}
