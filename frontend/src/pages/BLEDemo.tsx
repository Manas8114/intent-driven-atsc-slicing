import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    Bluetooth, Smartphone, Radio, Wifi, Signal,
    Play, Square, AlertTriangle, CheckCircle,
    Download, QrCode, Zap, Activity
} from 'lucide-react';

interface BLEState {
    delivery_mode: string;
    coverage_percent: number;
    snr_db: number;
    modulation: string;
    power_dbm: number;
    coding_rate: string;
    is_emergency: boolean;
    active_hurdle: string | null;
    timestamp: number;
}

interface BLEPacket {
    hex_string: string;
    base64: string;
    size_bytes: number;
    version: number;
    decoded: Record<string, unknown>;
    service_uuid: string;
}

// Animated phone component that shows receiving updates
function PhoneSimulator({
    id,
    state,
    isReceiving,
    delay
}: {
    id: number;
    state: BLEState | null;
    isReceiving: boolean;
    delay: number;
}) {
    const [showUpdate, setShowUpdate] = useState(false);

    useEffect(() => {
        if (isReceiving) {
            const timer = setTimeout(() => {
                setShowUpdate(true);
                setTimeout(() => setShowUpdate(false), 500);
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [isReceiving, delay, state?.timestamp]);

    return (
        <div className={`
            relative bg-slate-900 rounded-3xl p-2 w-32 h-48 
            shadow-xl border-4 border-slate-700
            transition-all duration-300
            ${showUpdate ? 'ring-4 ring-blue-400 scale-105' : ''}
        `}>
            {/* Phone notch */}
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-12 h-2 bg-slate-800 rounded-full" />

            {/* Screen */}
            <div className={`
                bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl h-full p-2
                flex flex-col items-center justify-center text-center
                ${state?.is_emergency ? 'from-red-900 to-red-950' : ''}
            `}>
                <Smartphone className={`h-4 w-4 mb-1 ${isReceiving ? 'text-green-400' : 'text-slate-500'}`} />
                <span className="text-[10px] text-slate-400">Receiver {id}</span>

                {state ? (
                    <>
                        <div className={`
                            text-xs font-bold mt-2 px-2 py-0.5 rounded-full
                            ${state.delivery_mode === 'broadcast' ? 'bg-green-500/20 text-green-400' :
                                state.delivery_mode === 'multicast' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-orange-500/20 text-orange-400'}
                        `}>
                            {state.delivery_mode.toUpperCase()}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                            {state.coverage_percent.toFixed(0)}% • {state.modulation}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                            {state.power_dbm.toFixed(0)} dBm
                        </div>
                        {state.is_emergency && (
                            <div className="text-[9px] text-red-400 mt-1 animate-pulse">
                                ⚠️ EMERGENCY
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-[10px] text-slate-500 mt-2">
                        Scanning...
                    </div>
                )}
            </div>

            {/* Signal indicator */}
            {isReceiving && (
                <div className="absolute -top-2 -right-2">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75" />
                        <Wifi className="h-4 w-4 text-blue-400 relative z-10" />
                    </div>
                </div>
            )}
        </div>
    );
}

// Packet visualization component
function PacketVisualizer({ packet }: { packet: BLEPacket | null }) {
    if (!packet) return null;

    const bytes = packet.hex_string.match(/.{2}/g) || [];

    const fieldColors: Record<number, string> = {
        0: 'bg-purple-500', // Version
        1: 'bg-blue-500',   // Delivery mode
        2: 'bg-green-500',  // Coverage
        3: 'bg-cyan-500',   // SNR
        4: 'bg-yellow-500', // Modulation
        5: 'bg-orange-500', // Power
        6: 'bg-pink-500',   // Coding rate
        7: 'bg-red-500',    // Emergency
    };

    return (
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs">
            <div className="text-slate-400 mb-2">BLE Packet ({packet.size_bytes} bytes)</div>
            <div className="flex flex-wrap gap-1">
                {bytes.map((byte, i) => (
                    <div
                        key={i}
                        className={`
                            px-1.5 py-1 rounded text-white text-[10px]
                            ${fieldColors[i] || 'bg-slate-700'}
                        `}
                        title={`Byte ${i}`}
                    >
                        {byte}
                    </div>
                ))}
            </div>
            <div className="mt-3 text-[10px] text-slate-500 flex flex-wrap gap-2">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-500 rounded" /> Version</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded" /> Mode</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded" /> Coverage</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-cyan-500 rounded" /> SNR</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded" /> Mod</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded" /> Power</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded" /> Emergency</span>
            </div>
        </div>
    );
}

export function BLEDemo() {
    const [state, setState] = useState<BLEState | null>(null);
    const [packet, setPacket] = useState<BLEPacket | null>(null);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    // Fetch BLE state from backend
    const fetchState = async () => {
        try {
            const [stateRes, packetRes] = await Promise.all([
                fetch('http://localhost:8000/ble/state'),
                fetch('http://localhost:8000/ble/packet')
            ]);

            if (stateRes.ok && packetRes.ok) {
                const stateData = await stateRes.json();
                const packetData = await packetRes.json();
                setState(stateData);
                setPacket(packetData);
                setLastUpdate(new Date());
                setError(null);
            }
        } catch (e) {
            setError('Failed to fetch BLE state');
        }
    };

    // Poll for updates when broadcasting
    useEffect(() => {
        fetchState();

        if (isBroadcasting) {
            const interval = setInterval(fetchState, 2000);
            return () => clearInterval(interval);
        }
    }, [isBroadcasting]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-3">
                        <Bluetooth className="h-8 w-8 text-blue-600" />
                        BLE Mobile Demo
                    </h2>
                    <p className="text-slate-500 mt-2 flex items-center gap-2">
                        <Radio className="h-4 w-4" />
                        Control-plane signaling demonstration via Bluetooth Low Energy
                    </p>
                </div>
                <Button
                    onClick={() => setIsBroadcasting(!isBroadcasting)}
                    className={isBroadcasting
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }
                >
                    {isBroadcasting ? (
                        <><Square className="h-4 w-4 mr-2" /> Stop Demo</>
                    ) : (
                        <><Play className="h-4 w-4 mr-2" /> Start Demo</>
                    )}
                </Button>
            </div>

            {/* Disclaimer Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-amber-800">Demo Framing</h4>
                    <p className="text-sm text-amber-700">
                        "We&apos;re using Bluetooth as a <strong>control-plane signaling demo</strong> to show how
                        AI-optimized broadcast configurations would propagate to receivers.
                        This is <strong>NOT</strong> RF transmission — it&apos;s a visual demonstration of the AI decision layer."
                    </p>
                </div>
            </div>

            {/* Main Demo Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Broadcast Tower Simulation */}
                <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-blue-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Signal className="h-5 w-5 text-blue-600" />
                            Broadcast Tower (Advertiser)
                            {isBroadcasting && (
                                <span className="ml-auto flex items-center gap-1 text-xs text-green-600">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    LIVE
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Tower visualization */}
                        <div className="text-center mb-6">
                            <div className="relative inline-block">
                                <Radio className={`h-20 w-20 ${isBroadcasting ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`} />
                                {isBroadcasting && (
                                    <>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-32 h-32 border-2 border-blue-300 rounded-full animate-ping opacity-25" />
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-24 h-24 border-2 border-blue-400 rounded-full animate-ping opacity-50" style={{ animationDelay: '0.5s' }} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Current State Display */}
                        {state && (
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-white rounded-lg p-3 border">
                                    <span className="text-slate-500 text-xs">Delivery Mode</span>
                                    <div className="font-bold text-lg capitalize">{state.delivery_mode}</div>
                                </div>
                                <div className="bg-white rounded-lg p-3 border">
                                    <span className="text-slate-500 text-xs">Coverage</span>
                                    <div className="font-bold text-lg">{state.coverage_percent.toFixed(1)}%</div>
                                </div>
                                <div className="bg-white rounded-lg p-3 border">
                                    <span className="text-slate-500 text-xs">Modulation</span>
                                    <div className="font-bold text-lg">{state.modulation}</div>
                                </div>
                                <div className="bg-white rounded-lg p-3 border">
                                    <span className="text-slate-500 text-xs">Power</span>
                                    <div className="font-bold text-lg">{state.power_dbm.toFixed(1)} dBm</div>
                                </div>
                            </div>
                        )}

                        {/* Packet visualization */}
                        <div className="mt-4">
                            <PacketVisualizer packet={packet} />
                        </div>
                    </CardContent>
                </Card>

                {/* Right: Mobile Receivers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5 text-slate-600" />
                            Mobile Receivers (Simulators)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-center gap-4 flex-wrap py-4">
                            <PhoneSimulator id={1} state={state} isReceiving={isBroadcasting} delay={100} />
                            <PhoneSimulator id={2} state={state} isReceiving={isBroadcasting} delay={300} />
                            <PhoneSimulator id={3} state={state} isReceiving={isBroadcasting} delay={500} />
                        </div>

                        {lastUpdate && (
                            <div className="text-center text-xs text-slate-400 mt-4">
                                Last update: {lastUpdate.toLocaleTimeString()}
                            </div>
                        )}

                        {/* Status indicators */}
                        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Connection Status</span>
                                <span className={`flex items-center gap-1 ${isBroadcasting ? 'text-green-600' : 'text-slate-400'}`}>
                                    {isBroadcasting ? (
                                        <><CheckCircle className="h-4 w-4" /> Broadcasting</>
                                    ) : (
                                        <><Square className="h-4 w-4" /> Idle</>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-2">
                                <span className="text-slate-600">Update Interval</span>
                                <span className="text-slate-500">2 seconds</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-2">
                                <span className="text-slate-600">Packet Size</span>
                                <span className="text-slate-500">{packet?.size_bytes || 20} bytes</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Mobile App Download Section */}
            <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-purple-600" />
                        Mobile Apps for Physical Demo
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="text-center p-4 bg-white rounded-lg border">
                            <QrCode className="h-16 w-16 text-purple-400 mx-auto mb-2" />
                            <h4 className="font-semibold">BLE Advertiser</h4>
                            <p className="text-xs text-slate-500 mt-1">
                                Run on one Android phone as "Broadcast Tower"
                            </p>
                            <p className="text-[10px] text-slate-400 mt-2">
                                Scan QR or run: <code className="bg-slate-100 px-1 rounded">cd mobile/ble-advertiser && npx expo start</code>
                            </p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border">
                            <QrCode className="h-16 w-16 text-indigo-400 mx-auto mb-2" />
                            <h4 className="font-semibold">BLE Receiver</h4>
                            <p className="text-xs text-slate-500 mt-1">
                                Run on multiple phones as receivers
                            </p>
                            <p className="text-[10px] text-slate-400 mt-2">
                                Scan QR or run: <code className="bg-slate-100 px-1 rounded">cd mobile/ble-receiver && npx expo start</code>
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* How It Works */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500" />
                        How It Works
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-4">
                            <div className="text-2xl font-bold text-blue-600 mb-2">1</div>
                            <Activity className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                            <h4 className="font-semibold text-sm">AI Decides</h4>
                            <p className="text-xs text-slate-500">AI optimizes broadcast config based on conditions</p>
                        </div>
                        <div className="text-center p-4">
                            <div className="text-2xl font-bold text-purple-600 mb-2">2</div>
                            <Bluetooth className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                            <h4 className="font-semibold text-sm">BLE Encodes</h4>
                            <p className="text-xs text-slate-500">State packed into 20-byte BLE packet</p>
                        </div>
                        <div className="text-center p-4">
                            <div className="text-2xl font-bold text-green-600 mb-2">3</div>
                            <Radio className="h-8 w-8 text-green-500 mx-auto mb-2" />
                            <h4 className="font-semibold text-sm">Tower Broadcasts</h4>
                            <p className="text-xs text-slate-500">Advertiser app broadcasts via BLE</p>
                        </div>
                        <div className="text-center p-4">
                            <div className="text-2xl font-bold text-cyan-600 mb-2">4</div>
                            <Smartphone className="h-8 w-8 text-cyan-500 mx-auto mb-2" />
                            <h4 className="font-semibold text-sm">Receivers Update</h4>
                            <p className="text-xs text-slate-500">Multiple phones display live state</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Error display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                    {error}
                </div>
            )}
        </div>
    );
}
