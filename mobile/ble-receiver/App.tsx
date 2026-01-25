import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    Animated,
    Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Backend URL - change this to your server IP for direct polling mode
const BACKEND_URL = 'http://192.168.1.40:8000';

interface AIState {
    delivery_mode: string;
    coverage_percent: number;
    snr_db: number;
    modulation: string;
    power_dbm: number;
    coding_rate: string;
    is_emergency: boolean;
    active_hurdle: string | null;
}

interface OperatorIntent {
    intent: string;
    intent_code: number;
    display_name: string;
    description: string;
    auto_adjustments: {
        priority: string;
        power_mode: string;
        modulation: string;
        behavior: string;
    };
}

// Manual Override Controls for "Packet Injection" Simulation
interface ManualOverrides {
    forceEmergency: boolean;
    snrOffset: number;
    forceMode: string | null;
}

export default function App() {
    const [isScanning, setIsScanning] = useState(false);
    const [state, setState] = useState<AIState | null>(null);
    const [intent, setIntent] = useState<OperatorIntent | null>(null);
    const [rawPacket, setRawPacket] = useState<string | null>(null);
    const [crcValid, setCrcValid] = useState<boolean>(true);
    const [bitErrors, setBitErrors] = useState<number>(0);
    const [signalStrength, setSignalStrength] = useState(-80);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [updateCount, setUpdateCount] = useState(0);

    // Manual Overrides State
    const [showControls, setShowControls] = useState(false);
    const [overrides, setOverrides] = useState<ManualOverrides>({
        forceEmergency: false,
        snrOffset: 0,
        forceMode: null
    });
    const [ws, setWs] = useState<WebSocket | null>(null);

    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse animation when receiving update
    const triggerPulse = useCallback(() => {
        Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1.2,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
    }, [pulseAnim]);

    // Process Received Packet (Replaces Polling)
    const processPacket = useCallback(async (packetHex: string) => {
        try {
            // In a real app, we would decode the hex bits here locally.
            // For demo, we verify the packet against the backend to get the decoded object
            // This ensures our UI shows the correct decoded values

            // 1. Get Decoded Data (Simulating local decoding)
            const [stateRes, intentRes] = await Promise.all([
                fetch(`${BACKEND_URL}/ble/state`),
                fetch(`${BACKEND_URL}/ble/intent`),
            ]);

            if (stateRes.ok && intentRes.ok) {
                let stateData = await stateRes.json();
                const intentData = await intentRes.json();

                // APPLY MANUAL OVERRIDES (Packet Injection Simulation)
                if (overrides.forceEmergency) {
                    stateData.is_emergency = true;
                    intentData.intent = 'emergency_response';
                    intentData.display_name = 'EMERGENCY RESPONSE';
                    intentData.description = 'Override all - emergency broadcast';
                    intentData.auto_adjustments.priority = 'EMERGENCY';
                    intentData.auto_adjustments.power_mode = 'MAXIMUM';
                }
                if (overrides.snrOffset !== 0) stateData.snr_db += overrides.snrOffset;
                if (overrides.forceMode) stateData.delivery_mode = overrides.forceMode;

                // --- REALISTIC PHYSICS SIMULATION ---
                // 1. Bit Error Rate (BER) Simulation based on SNR
                // If SNR is low (< 10dB), probability of bit flip increases
                let simulatedPacket = packetHex;
                let errorCount = 0;
                let isCrcPass = true;

                // Calculate Effective SNR (Signal + Noise + Injection)
                const effectiveSnr = stateData.snr_db;

                if (effectiveSnr < 10) {
                    // Low SNR -> High BER
                    const berProbability = Math.max(0, (10 - effectiveSnr) / 50); // Scale: 0% at 10dB, 20% at 0dB

                    // Convert hex to byte array for manipulation
                    const bytes = [];
                    for (let i = 0; i < packetHex.length; i += 2) {
                        bytes.push(parseInt(packetHex.substr(i, 2), 16));
                    }

                    // Randomly flip bits
                    const corruptedBytes = bytes.map(byte => {
                        let warpedByte = byte;
                        for (let bit = 0; bit < 8; bit++) {
                            if (Math.random() < berProbability) {
                                warpedByte ^= (1 << bit); // Flip bit
                                errorCount++;
                            }
                        }
                        return warpedByte;
                    });

                    // Reconstruct hex
                    simulatedPacket = corruptedBytes.map(b => b.toString(16).padStart(2, '0')).join('');
                }

                // 2. CRC Verification Checks
                // We check the LAST 2 BYTES against the CRC16 of the REST
                // Note: Since we don't have the backend lib in JS, we simulate the verify:
                // IF we injected errors -> CRC FAILS.
                // IF SNR is good -> CRC PASSES.
                if (errorCount > 0) {
                    isCrcPass = false;
                }

                setState(stateData);
                setIntent(intentData);
                setRawPacket(simulatedPacket);
                setCrcValid(isCrcPass);
                setBitErrors(errorCount);

                setLastUpdate(new Date());
                setUpdateCount((prev: number) => prev + 1);
                setSignalStrength(-50 + Math.random() * 20); // Simulated RSSI
                triggerPulse();
            }
        } catch (e) {
            // Packet drop
        }
    }, [triggerPulse, overrides]);

    // WebSocket Connection & Real-Time Reception
    useEffect(() => {
        if (!isScanning) {
            if (ws) {
                ws.close();
                setWs(null);
            }
            return;
        }

        const socket = new WebSocket(BACKEND_URL.replace('http', 'ws') + '/ws');

        socket.onopen = () => {
            console.log('Receiver: Tuned into Broadcast Frequency');
            setWs(socket);
        };

        socket.onmessage = async (e) => {
            try {
                const message = JSON.parse(e.data);

                // Real-Time Packet Reception
                if (message.type === 'air_interface_packet') {
                    // Packet Arrived!
                    const packetHex = message.data; // Hex string from Advertiser

                    // Decode & Process (Simulating RF Demodulation)
                    await processPacket(packetHex);
                }
            } catch (err) {
                console.log('Rx Error:', err);
            }
        };

        socket.onclose = () => {
            console.log('Receiver: Signal Lost');
            setWs(null);
        };

        return () => {
            socket.close();
        };
    }, [isScanning, processPacket]);

    // Start/Stop scanning
    const toggleScanning = async () => {
        if (!isScanning) {
            if (Platform.OS === 'android') {
                Alert.alert(
                    'BLE Permissions',
                    'Make sure Bluetooth and Location are enabled for BLE scanning.',
                    [{ text: 'OK' }]
                );
            }
            setIsScanning(true);
        } else {
            setIsScanning(false);
            setState(null);
        }
    };

    // Get delivery mode color
    const getModeColor = (mode: string) => {
        switch (mode) {
            case 'broadcast':
                return '#22c55e';
            case 'multicast':
                return '#3b82f6';
            case 'unicast':
                return '#f97316';
            default:
                return '#6b7280';
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>📱 BLE Receiver</Text>
                <Text style={styles.subtitle}>Receiving AI Broadcast Configuration</Text>
            </View>

            {/* Signal Indicator */}
            <Animated.View
                style={[
                    styles.signalContainer,
                    isScanning && styles.signalActive,
                    { transform: [{ scale: pulseAnim }] },
                ]}
            >
                {isScanning ? (
                    <>
                        <Text style={styles.signalIcon}>📡</Text>
                        <Text style={styles.signalText}>Signal: {signalStrength.toFixed(0)} dBm</Text>
                        <Text style={styles.updateCount}>Updates: {updateCount}</Text>
                    </>
                ) : (
                    <>
                        <Text style={styles.signalIcon}>📴</Text>
                        <Text style={styles.signalText}>Not Scanning</Text>
                    </>
                )}
            </Animated.View>

            {/* Main Button */}
            <TouchableOpacity
                style={[styles.mainButton, isScanning ? styles.stopButton : styles.startButton]}
                onPress={toggleScanning}
            >
                <Text style={styles.mainButtonText}>
                    {isScanning ? '⏹ STOP SCANNING' : '🔍 START SCANNING'}
                </Text>
            </TouchableOpacity>

            {/* State Display */}
            <ScrollView style={styles.stateContainer} contentContainerStyle={styles.stateContent}>
                {state ? (
                    <>
                        {/* INTENT Display - The Received GOAL */}
                        {intent ? (
                            <View style={styles.intentContainer}>
                                <View style={styles.intentHeader}>
                                    <Text style={styles.intentLabel}>🎯 RECEIVED INTENT</Text>
                                    <View style={styles.liveIndicator}>
                                        <View style={styles.liveDot} />
                                        <Text style={styles.liveText}>LIVE</Text>
                                    </View>
                                </View>
                                <Text style={styles.intentValue}>{intent.display_name}</Text>
                                <Text style={styles.intentDescription}>"{intent.description}"</Text>

                                <View style={styles.autoActionBanner}>
                                    <Text style={styles.autoActionTitle}>⚡ AUTO-ADJUSTING RECEIVER:</Text>
                                    <Text style={styles.autoActionText}>
                                        Set priority to {intent.auto_adjustments.priority} &
                                        {intent.auto_adjustments.power_mode === 'MAXIMUM' ? ' boosting gain' : ' optimizing power'}
                                    </Text>
                                </View>
                            </View>
                        ) : null}

                        {/* PACKET INSPECTOR & INJECTION CONTROLS */}
                        {rawPacket && (
                            <View style={styles.packetSection}>
                                <Text style={styles.sectionHeader}>📦 RAW PACKET INSPECTOR</Text>
                                <View style={[styles.packetContainer, !crcValid && styles.packetContainerError]}>
                                    <Text style={[styles.packetHex, !crcValid && styles.packetHexError]}>
                                        {rawPacket}
                                    </Text>
                                    <View style={styles.packetFooter}>
                                        <Text style={[styles.packetMeta, !crcValid && styles.packetMetaError]}>
                                            Length: 20 bytes • Protocol v1
                                        </Text>
                                        <View style={[styles.crcBadge, crcValid ? styles.crcSuccess : styles.crcFail]}>
                                            <Text style={styles.crcText}>{crcValid ? 'Shield VALID' : 'CRC FAIL'}</Text>
                                        </View>
                                    </View>
                                    {!crcValid && (
                                        <Text style={styles.bitErrorText}>
                                            ⚠️ CORRUPTION DETECTED: {bitErrors} bit errors
                                        </Text>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={styles.overrideToggle}
                                    onPress={() => setShowControls(!showControls)}
                                >
                                    <Text style={styles.overrideToggleText}>
                                        {showControls ? '🔽 SIMULATE LOCAL PACKET INJECTION' : '▶ SIMULATE LOCAL PACKET INJECTION'}
                                    </Text>
                                </TouchableOpacity>

                                {showControls && (
                                    <View style={styles.controlsContainer}>
                                        <Text style={styles.controlHeader}>Modify Received Data Locally</Text>

                                        {/* Emergency Override */}
                                        <View style={styles.controlRow}>
                                            <Text style={styles.controlLabel}>Force Emergency Flag</Text>
                                            <Switch
                                                value={overrides.forceEmergency}
                                                onValueChange={(val) => setOverrides({ ...overrides, forceEmergency: val })}
                                                trackColor={{ false: "#767577", true: "#ef4444" }}
                                            />
                                        </View>

                                        {/* SNR Offset */}
                                        <View style={styles.controlRow}>
                                            <Text style={styles.controlLabel}>Inject Noise (SNR -10dB)</Text>
                                            <TouchableOpacity
                                                style={[styles.miniBtn, overrides.snrOffset === -10 ? styles.btnActive : styles.btnInactive]}
                                                onPress={() => setOverrides({ ...overrides, snrOffset: overrides.snrOffset === -10 ? 0 : -10 })}
                                            >
                                                <Text style={styles.miniBtnText}>{overrides.snrOffset === -10 ? 'ACTIVE' : 'OFF'}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Mode Override */}
                                        <View style={styles.controlRow}>
                                            <Text style={styles.controlLabel}>Force Broadcast Mode</Text>
                                            <TouchableOpacity
                                                style={[styles.miniBtn, overrides.forceMode === 'broadcast' ? styles.btnActive : styles.btnInactive]}
                                                onPress={() => setOverrides({ ...overrides, forceMode: overrides.forceMode === 'broadcast' ? null : 'broadcast' })}
                                            >
                                                <Text style={styles.miniBtnText}>{overrides.forceMode ? 'FORCED' : 'OFF'}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <Text style={styles.controlHint}>
                                            Adjustments above simulate modifying the packet bytes before processing
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Large Delivery Mode Display */}
                        <View
                            style={[
                                styles.modeContainer,
                                { backgroundColor: getModeColor(state.delivery_mode) + '20' },
                            ]}
                        >
                            <Text style={[styles.modeLabel, { color: getModeColor(state.delivery_mode) }]}>
                                {state.delivery_mode.toUpperCase()}
                            </Text>
                            <Text style={styles.modeSubtitle}>Delivery Mode</Text>
                        </View>

                        {/* Stats Grid */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{state.coverage_percent.toFixed(1)}%</Text>
                                <Text style={styles.statLabel}>Coverage</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{state.snr_db.toFixed(1)}</Text>
                                <Text style={styles.statLabel}>SNR (dB)</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{state.modulation}</Text>
                                <Text style={styles.statLabel}>Modulation</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{state.power_dbm.toFixed(1)}</Text>
                                <Text style={styles.statLabel}>Power (dBm)</Text>
                            </View>
                        </View>

                        {/* Emergency Banner */}
                        {state.is_emergency && (
                            <View style={styles.emergencyBanner}>
                                <Text style={styles.emergencyText}>⚠️ EMERGENCY MODE ACTIVE</Text>
                                <Text style={styles.emergencySubtext}>Priority broadcast enabled</Text>
                            </View>
                        )}

                        {/* Active Hurdle */}
                        {state.active_hurdle && (
                            <View style={styles.hurdleBanner}>
                                <Text style={styles.hurdleLabel}>Active Stress Test</Text>
                                <Text style={styles.hurdleValue}>{state.active_hurdle.replace(/_/g, ' ')}</Text>
                            </View>
                        )}
                    </>
                ) : isScanning ? (
                    <View style={styles.scanningContainer}>
                        <Text style={styles.scanningEmoji}>🔄</Text>
                        <Text style={styles.scanningText}>Scanning for broadcast signal...</Text>
                        <Text style={styles.scanningSubtext}>
                            Looking for BLE advertisements from AI tower
                        </Text>
                    </View>
                ) : (
                    <View style={styles.idleContainer}>
                        <Text style={styles.idleEmoji}>💤</Text>
                        <Text style={styles.idleText}>Tap "Start Scanning" to receive broadcasts</Text>
                    </View>
                )}
            </ScrollView>

            {/* Last Update */}
            {lastUpdate && isScanning && (
                <View style={styles.lastUpdateContainer}>
                    <Text style={styles.lastUpdateText}>
                        Last update: {lastUpdate.toLocaleTimeString()}
                    </Text>
                </View>
            )}

            {/* Footer Disclaimer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Demo: Simulating BLE reception via backend polling
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        paddingTop: 60,
    },
    header: {
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
    },
    signalContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        marginHorizontal: 20,
        borderRadius: 16,
        backgroundColor: '#1e293b',
        marginBottom: 16,
    },
    signalActive: {
        backgroundColor: '#14532d',
    },
    signalIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    signalText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    updateCount: {
        color: '#22c55e',
        fontSize: 12,
        marginTop: 4,
    },
    mainButton: {
        marginHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    startButton: {
        backgroundColor: '#2563eb',
    },
    stopButton: {
        backgroundColor: '#dc2626',
    },
    mainButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    stateContainer: {
        flex: 1,
        marginHorizontal: 20,
    },
    stateContent: {
        paddingBottom: 20,
    },
    // Intent Styles
    intentContainer: {
        backgroundColor: '#14532d',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#22c55e',
    },
    intentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    intentLabel: {
        color: '#86efac',
        fontSize: 12,
        fontWeight: 'bold',
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#22c55e30',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22c55e',
        marginRight: 4,
    },
    liveText: {
        color: '#22c55e',
        fontSize: 10,
        fontWeight: 'bold',
    },
    intentValue: {
        color: '#22c55e',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    intentDescription: {
        color: '#bbf7d0',
        fontSize: 14,
        fontStyle: 'italic',
        marginBottom: 12,
    },
    autoActionBanner: {
        backgroundColor: '#0f3d1c',
        padding: 12,
        borderRadius: 12,
    },
    autoActionTitle: {
        color: '#fbbf24',
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    autoActionText: {
        color: '#d1fae5',
        fontSize: 12,
    },
    // Packet Inspector Styles
    packetSection: {
        marginBottom: 16,
    },
    sectionHeader: {
        color: '#94a3b8',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 1,
    },
    packetContainer: {
        backgroundColor: '#1e293b',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    packetContainerError: {
        backgroundColor: '#450a0a',
        borderColor: '#dc2626',
        borderWidth: 1,
    },
    packetHex: {
        color: '#22d3ee',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 10,
        marginBottom: 4,
    },
    packetHexError: {
        color: '#fca5a5',
        textDecorationLine: 'line-through',
    },
    packetFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    packetMeta: {
        color: '#64748b',
        fontSize: 10,
    },
    packetMetaError: {
        color: '#991b1b',
    },
    crcBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    crcSuccess: {
        backgroundColor: '#059669',
    },
    crcFail: {
        backgroundColor: '#dc2626',
    },
    crcText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    bitErrorText: {
        color: '#ef4444',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4,
    },
    overrideToggle: {
        backgroundColor: '#334155',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    overrideToggleText: {
        color: '#cbd5e1',
        fontSize: 12,
        fontWeight: 'bold',
    },
    controlsContainer: {
        backgroundColor: '#1e293b',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    controlHeader: {
        color: '#e2e8f0',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    controlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    controlLabel: {
        color: '#cbd5e1',
        fontSize: 12,
    },
    miniBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    btnActive: {
        backgroundColor: '#ef4444',
    },
    btnInactive: {
        backgroundColor: '#475569',
    },
    miniBtnText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    controlHint: {
        color: '#64748b',
        fontSize: 10,
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 4,
    },
    modeContainer: {
        alignItems: 'center',
        paddingVertical: 24,
        borderRadius: 16,
        marginBottom: 16,
    },
    modeLabel: {
        fontSize: 28,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    modeSubtitle: {
        color: '#94a3b8',
        fontSize: 12,
        marginTop: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    statBox: {
        width: '48%',
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#64748b',
        fontSize: 11,
        marginTop: 4,
        textTransform: 'uppercase',
    },
    emergencyBanner: {
        backgroundColor: '#7f1d1d',
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
        alignItems: 'center',
    },
    emergencyText: {
        color: '#fca5a5',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emergencySubtext: {
        color: '#f87171',
        fontSize: 12,
        marginTop: 4,
    },
    hurdleBanner: {
        backgroundColor: '#78350f',
        padding: 12,
        borderRadius: 12,
        marginTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    hurdleLabel: {
        color: '#fbbf24',
        fontSize: 12,
    },
    hurdleValue: {
        color: '#fcd34d',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
    scanningContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    scanningEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    scanningText: {
        color: '#94a3b8',
        fontSize: 16,
    },
    scanningSubtext: {
        color: '#475569',
        fontSize: 12,
        marginTop: 8,
    },
    idleContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    idleEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    idleText: {
        color: '#64748b',
        fontSize: 14,
        textAlign: 'center',
    },
    lastUpdateContainer: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    lastUpdateText: {
        color: '#475569',
        fontSize: 10,
    },
    footer: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
    },
    footerText: {
        color: '#475569',
        fontSize: 10,
        textAlign: 'center',
    },
});
