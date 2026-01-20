import { useState, useEffect } from 'react';
import { Sun, Moon, Home, Activity, Zap, History, Database, Cpu, LayoutGrid, Radio, Signal } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { TopStatusBar } from './TopStatusBar';
import { useSystem } from '../context/SystemContext';
import { HurdlePanel } from './HurdlePanel';
import { InteractiveIndiaMap } from './InteractiveIndiaMap';
// import { RealtimeIntentPanel } from './RealtimeIntentPanel';

interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    highlight?: boolean;
    section?: string;
}

const NAV_ITEMS: NavItem[] = [
    // AI Intelligence Section (NEW - Cognitive Broadcasting)
    { id: 'cognitive', label: 'Cognitive Brain', icon: Cpu, highlight: true, section: 'AI Intelligence' },
    { id: 'knowledge', label: 'Knowledge Map', icon: LayoutGrid, section: 'AI Intelligence' },
    { id: 'learning', label: 'Learning Timeline', icon: History, section: 'AI Intelligence' },
    { id: 'bootstrap', label: 'Bootstrap Uncertainty', icon: Zap, section: 'AI Intelligence' },
    { id: 'celltowers', label: 'Cell Tower Data', icon: Radio, section: 'AI Intelligence' },
    { id: 'coverage', label: 'Broadcast Coverage', icon: Signal, highlight: true, section: 'AI Intelligence' },
    // Competition Features
    { id: 'training', label: 'Training Data', icon: Database, highlight: true, section: 'Competition' },
    { id: 'architecture', label: 'ITU Architecture', icon: LayoutGrid, highlight: true, section: 'Competition' },
    { id: 'benchmarks', label: 'AI vs Baseline', icon: Activity, highlight: true, section: 'Competition' },
    // Core Operations
    { id: 'overview', label: 'System Overview', icon: Home },
    { id: 'approval', label: 'Deployment Approval', icon: Activity, highlight: true },
    { id: 'telemetry', label: 'Broadcast Telemetry', icon: Zap },
    { id: 'explainability', label: 'AI Decisions', icon: History },
    { id: 'plp', label: 'PLP Visualization', icon: Radio },
    { id: 'kpi', label: 'KPI Dashboard', icon: Activity },
    { id: 'emergency', label: 'Emergency View', icon: Zap },
    { id: 'readiness', label: 'Readiness Checklist', icon: Activity },
    { id: 'capabilities', label: 'Capabilities & Limits', icon: History },
    { id: 'intent', label: 'Advanced Config', icon: Cpu },
];

interface LayoutProps {
    children: React.ReactNode;
    activePage: string;
    onNavigate: (pageId: string) => void;
}

export function Layout({ children, activePage, onNavigate }: LayoutProps) {
    const { logs, adaptationExplanation } = useSystem();
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('darkMode');
            return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });
    // const [selectedCity, setSelectedCity] = useState<string | null>(null);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
    }, [darkMode]);

    // Group nav items by section
    const groupedNavItems = NAV_ITEMS.reduce((acc, item) => {
        const section = item.section || 'Operations';
        if (!acc[section]) acc[section] = [];
        acc[section].push(item);
        return acc;
    }, {} as Record<string, NavItem[]>);

    return (
        <div className={cn(
            "flex flex-col h-screen overflow-hidden transition-colors duration-300",
            darkMode ? "bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900"
        )}>
            {/* Top Status Bar */}
            <TopStatusBar />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Sidebar - Premium Dark Theme */}
                <aside className={cn(
                    "w-64 border-r shadow-xl flex flex-col z-20 hidden md:flex transition-colors duration-300",
                    darkMode
                        ? "bg-slate-900/95 backdrop-blur-md border-slate-700/50"
                        : "bg-white border-slate-200"
                )}>
                    {/* Logo Area */}
                    <div className="p-5 border-b border-slate-700/30">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={cn(
                                "rounded-xl p-2 shadow-lg",
                                darkMode
                                    ? "bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/20"
                                    : "bg-blue-600 shadow-blue-500/30"
                            )}>
                                <Radio className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <span className={cn(
                                    "font-bold text-lg tracking-tight",
                                    darkMode ? "text-white" : "text-slate-900"
                                )}>BroadcastAI</span>
                                <div className={cn(
                                    "text-[10px] font-mono",
                                    darkMode ? "text-cyan-400" : "text-slate-400"
                                )}>
                                    CONTROL PLANE v2.0
                                </div>
                            </div>
                        </div>

                        {/* Dark mode toggle */}
                        <div className="flex items-center justify-end mt-2">
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className={cn(
                                    "p-2 rounded-lg transition-all duration-200 cursor-pointer",
                                    darkMode
                                        ? "bg-slate-800 hover:bg-slate-700 text-amber-400"
                                        : "bg-slate-100 hover:bg-slate-200 text-slate-500"
                                )}
                                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                            >
                                {darkMode ? (
                                    <Sun className="h-4 w-4" />
                                ) : (
                                    <Moon className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Navigation - Grouped by Section */}
                    <nav className="flex-1 p-3 overflow-y-auto">
                        {Object.entries(groupedNavItems).map(([section, items]) => (
                            <div key={section} className="mb-4">
                                <div className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider px-3 mb-2",
                                    darkMode ? "text-slate-500" : "text-slate-400"
                                )}>
                                    {section}
                                </div>
                                <div className="space-y-0.5">
                                    {items.map((item) => (
                                        <Button
                                            key={item.id}
                                            variant="ghost"
                                            className={cn(
                                                'w-full justify-start gap-3 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer',
                                                activePage === item.id
                                                    ? darkMode
                                                        ? 'bg-cyan-500/15 text-cyan-400 font-semibold border border-cyan-500/30'
                                                        : 'bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-200'
                                                    : darkMode
                                                        ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                                                item.highlight && activePage !== item.id && (darkMode ? 'text-cyan-400/70' : 'text-blue-600/70')
                                            )}
                                            onClick={() => onNavigate(item.id)}
                                        >
                                            <item.icon className={cn(
                                                "h-4 w-4",
                                                activePage === item.id
                                                    ? (darkMode ? "text-cyan-400" : "text-blue-600")
                                                    : (darkMode ? "text-slate-500" : "text-slate-400")
                                            )} />
                                            <span className="text-sm">{item.label}</span>
                                            {item.highlight && activePage !== item.id && (
                                                <span className={cn(
                                                    "ml-auto w-1.5 h-1.5 rounded-full",
                                                    darkMode ? "bg-cyan-400" : "bg-blue-500"
                                                )} />
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* Safety Shield Indicator */}
                    <div className={cn(
                        "p-3 border-t",
                        darkMode ? "border-slate-700/50 bg-slate-800/30" : "border-slate-100 bg-slate-50/50"
                    )}>
                        <div className={cn(
                            "rounded-lg p-3 border",
                            darkMode
                                ? "bg-slate-800/50 border-emerald-500/20"
                                : "bg-white border-slate-200 shadow-sm"
                        )}>
                            <div className="flex items-center justify-between mb-1">
                                <span className={cn(
                                    "text-xs font-bold",
                                    darkMode ? "text-slate-300" : "text-slate-700"
                                )}>SAFETY SHIELD</span>
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-medium",
                                    "bg-emerald-500/20 text-emerald-400"
                                )}>ACTIVE</span>
                            </div>
                            <div className={cn(
                                "text-[10px] leading-relaxed",
                                darkMode ? "text-slate-500" : "text-slate-500"
                            )}>
                                AI constraints enforced by autonomous safety layer.
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-auto relative scrollbar-hide">
                    {/* Background Backdrop - Centered India Map */}
                    <div className="fixed inset-0 z-0 flex items-center justify-center opacity-30 dark:opacity-20 pointer-events-none transition-opacity duration-1000">
                        <InteractiveIndiaMap className="w-[120%] h-[120%] pointer-events-none scale-110" />
                    </div>

                    {/* Content Overlay - Professional Glassmorphism */}
                    <div className={cn(
                        "relative z-10 mx-auto w-full max-w-7xl px-6 py-8 transition-all duration-500",
                        darkMode ? "bg-slate-950/40" : "bg-white/40"
                    )}>
                        {children}
                    </div>

                    {/* Broadcast Status Bar (Footer) */}
                    <div className="fixed bottom-0 left-64 right-0 h-8 bg-slate-950/80 backdrop-blur-md border-t border-slate-800/50 z-20 px-4 flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-emerald-500">System Nominal</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Signal className="h-3 w-3" />
                                <span>ITU FG-AINN COMPLIANT</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span>COGNITIVE CORE V4.2</span>
                            <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                                <Radio className="h-3 w-3" />
                                <span>802.11be Slicing Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Adaptation Explanation Toast */}
                    {adaptationExplanation && (
                        <div className="absolute inset-x-0 bottom-20 flex justify-center z-[60] px-4 pointer-events-none">
                            <div className="glass-card-dark text-white p-6 rounded-xl shadow-2xl max-w-2xl w-full animate-fade-in pointer-events-auto">
                                <div className="flex items-start gap-4">
                                    <div className="bg-cyan-500/20 p-2 rounded-lg">
                                        <Activity className="h-6 w-6 text-cyan-400 animate-pulse" />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Trigger Event (Hurdle)</h4>
                                            <p className="font-medium text-lg">{adaptationExplanation.changed}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700/50">
                                            <div>
                                                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1">AI Adaptation</h4>
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
                    <div className="fixed bottom-0 inset-x-0 h-9 bg-slate-950 border-t border-slate-800 flex items-center px-4 z-50">
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
