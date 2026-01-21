import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { API_BASE } from '../lib/api';

export type SystemPhase = 'idle' | 'parsing' | 'optimizing' | 'safety_check' | 'reconfiguring' | 'broadcasting' | 'emergency';

export interface SystemState {
    phase: SystemPhase;
    activeIntent: string | null;
    activeHurdle: string | null;
    adaptationExplanation: { changed: string, action: string, safe: string } | null;
    lastDecisionTime: number | null;
    safetyLock: boolean;
    receiversReached: number;
    kpiHistory: any[];
}

interface SystemContextType extends SystemState {
    triggerIntent: (intent: string) => Promise<void>;
    triggerHurdle: (hurdle: string) => Promise<void>;
    triggerEmergency: () => Promise<void>;
    cancelEmergency: () => void;
    addLog: (msg: string) => void;
    logs: string[];
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export function SystemProvider({ children }: { children: React.ReactNode }) {
    const [phase, setPhase] = useState<SystemPhase>('idle');
    const [activeIntent, setActiveIntent] = useState<string | null>(null);
    const [activeHurdle, setActiveHurdle] = useState<string | null>(null);
    const [adaptationExplanation, setAdaptationExplanation] = useState<{ changed: string, action: string, safe: string } | null>(null);

    const [lastDecisionTime, setLastDecisionTime] = useState<number | null>(Date.now());
    const [safetyLock, setSafetyLock] = useState(false);
    const [receiversReached, setReceiversReached] = useState(12000);
    const [logs, setLogs] = useState<string[]>([]);
    const [kpiHistory, setKpiHistory] = useState<any[]>([]);

    const addLog = useCallback((msg: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50));
    }, []);

    // Simulation Loop for "Aliveness"
    useEffect(() => {
        if (phase === 'emergency') {
            const interval = setInterval(() => {
                setReceiversReached(prev => Math.min(prev + Math.floor(Math.random() * 50), 25000));
            }, 500);
            return () => clearInterval(interval);
        }
    }, [phase]);

    const triggerHurdle = async (hurdle: string) => {
        if (hurdle === 'reset') {
            try {
                await fetch(`${API_BASE}/env/reset`, { method: 'POST' });
                setActiveHurdle(null);
                setAdaptationExplanation(null);
                addLog("Environment Reset: Conditions normalized.");
                triggerIntent(activeIntent || 'maximize_coverage'); // Re-optimize
            } catch (e) {
                console.error(e);
            }
            return;
        }

        setActiveHurdle(hurdle);
        addLog(`HURDLE INJECTED: ${hurdle.replace('_', ' ').toUpperCase()}`);

        // 1. Tell Backend to Change Environment
        setPhase('parsing'); // "Sensing"
        let data: any = null;
        try {
            const res = await fetch(`${API_BASE}/env/hurdle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hurdle: hurdle })
            });
            data = await res.json();
            addLog(`Environment: ${data.environment_change}`);
        } catch (e) {
            console.error("Failed to inject hurdle", e);
            addLog("Error injecting hurdle.");
            setPhase('idle');
            return;
        }

        await new Promise(r => setTimeout(r, 600));

        // 2. Trigger AI Reaction (Re-evaluating based on new Env)
        setPhase('optimizing');
        addLog("AI Engine: Detecting signal degradation...");

        try {
            // Re-run decision with current intent (or specific reaction logic)
            // Ideally we'd have a specific "react" endpoint, but "decision" works if it reads Env.
            // Re-run decision with current intent (or specific reaction logic)
            // Ideally we'd have a specific "react" endpoint, but "decision" works if it reads Env.
            const decisionRes = await fetch(`${API_BASE}/ai/decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    policy: {
                        type: activeIntent || 'maximize_coverage',
                        target: 0.95
                    }
                })
            });
            const decision = await decisionRes.json();

            setPhase('safety_check');
            await new Promise(r => setTimeout(r, 500));

            setPhase('reconfiguring');

            // Extract Explanation
            // We parse the generated explanation or construct one from the returned action
            // For the demo specific wording requested:
            let specificExpl = {
                changed: data?.environment_change || "Environment changed.",
                action: decision.explanation, // The AI engine returns a summary
                safe: "Reliability maintained > 99%."
            };

            // Override with cleaner text for specific known hurdles if needed, 
            // or trust the AI engine's dynamic string. 
            // Let's trust the AI engine string for 'action', but format it nicely.

            setAdaptationExplanation(specificExpl);
            addLog(`ADAPTATION: AI adjusted parameters.`);
            await new Promise(r => setTimeout(r, 800));

            setPhase('broadcasting');
            setLastDecisionTime(Date.now());
            addLog("System Stabilized under stress.");

            // Auto-clear explanation
            setTimeout(() => setAdaptationExplanation(null), 12000);

        } catch (e) {
            console.error(e);
            addLog("AI Adaptation Failed.");
            setPhase('idle');
        }
    };

    const triggerIntent = async (intent: string) => {
        addLog(`Intent received: ${intent}`);
        setActiveIntent(intent);

        setPhase('parsing');
        await new Promise(r => setTimeout(r, 800));

        setPhase('optimizing');
        addLog("AI Engine evaluating candidates...");
        await new Promise(r => setTimeout(r, 1500));

        setPhase('safety_check');
        addLog("Safety Shield validating configuration...");
        await new Promise(r => setTimeout(r, 800));

        setPhase('reconfiguring');
        addLog("ATSC 3.0 Core: Applying PLP changes...");
        await new Promise(r => setTimeout(r, 1200));

        setPhase('broadcasting');
        setLastDecisionTime(Date.now());
        addLog("Broadcast Active. Telemetry confirmed.");

        setTimeout(() => setPhase('idle'), 3000);
    };

    const triggerEmergency = async () => {
        addLog("CRITICAL: Emergency Mode Requested");
        setPhase('parsing');
        await new Promise(r => setTimeout(r, 400));

        setPhase('safety_check');
        setSafetyLock(true);
        addLog("Safety Shield: IMMEDIATE OVERRIDE granted");
        await new Promise(r => setTimeout(r, 400));

        setPhase('emergency');
        setActiveIntent('EMERGENCY_ALERT');
        setLastDecisionTime(Date.now());
        setReceiversReached(12000);
        addLog("Emergency PLP 0 is now PRIMARY. Preempting services.");
    };

    const cancelEmergency = () => {
        setPhase('reconfiguring');
        setSafetyLock(false);
        setActiveHurdle(null); // Clear hurdle if any
        addLog("Emergency cancelled. Restoring standard profile...");
        setTimeout(() => {
            setPhase('idle');
            setActiveIntent(null);
        }, 1500);
    };

    return (
        <SystemContext.Provider value={{
            phase,
            activeIntent,
            activeHurdle,
            adaptationExplanation,
            lastDecisionTime,
            safetyLock,
            receiversReached,
            kpiHistory,
            triggerIntent,
            triggerHurdle,
            triggerEmergency,
            cancelEmergency,
            addLog,
            logs
        }}>
            {children}
        </SystemContext.Provider>
    );
}

export function useSystem() {
    const context = useContext(SystemContext);
    if (context === undefined) {
        throw new Error('useSystem must be used within a SystemProvider');
    }
    return context;
}
