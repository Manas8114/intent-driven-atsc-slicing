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

import { BACKEND_URL } from './config';
import type { AIState, OperatorIntent, ManualOverrides, ConstellationPoint } from './types';
import { calculateRSSI, calculateBER, corruptPacket, generateConstellationPoints } from './PhysicsEngine';
import { decodeBLEPacket, deriveIntent } from './PacketDecoder';


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

    // NEW: Distance slider for realistic physics
    const [distance, setDistance] = useState(5); // meters

    // NEW: Constellation diagram points (I/Q coordinates)
    const [constellationPoints, setConstellationPoints] = useState<ConstellationPoint[]>([]);

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

    // ========================================================================
    // REAL PACKET PROCESSING (No more fetch('/ble/state') cheating!)
    // ========================================================================
    const processPacket = useCallback((packetHex: string) => {
        try {
            // 1. Calculate RSSI based on distance (REAL physics)
            const rssi = calculateRSSI(distance);
            setSignalStrength(rssi);

            // 2. Estimate SNR from RSSI (noise floor = -100 dBm)
            const noiseFloor = -100;
            const estimatedSnr = rssi - noiseFloor;

            // 3. Calculate BER from SNR (REAL AWGN model)
            const ber = calculateBER(estimatedSnr + overrides.snrOffset);

            // 4. Apply bit errors to packet (REAL corruption)
            const { corrupted, errorCount } = corruptPacket(packetHex, ber);

            // 5. DECODE THE PACKET LOCALLY (THE KEY CHANGE!)
            const decoded = decodeBLEPacket(corrupted);

            if (!decoded) {
                console.log('Failed to decode packet');
                return;
            }

            let decodedState = decoded.state;

            // Apply manual overrides
            if (overrides.forceEmergency) {
                decodedState.is_emergency = true;
            }
            if (overrides.forceMode) {
                decodedState.delivery_mode = overrides.forceMode;
            }

            // 6. Derive intent from state (REAL logic)
            const derivedIntent = deriveIntent(decodedState);

            // 7. Update UI
            setState(decodedState);
            setIntent(derivedIntent);
            setRawPacket(corrupted);
            setCrcValid(decoded.crcValid && errorCount === 0);
            setBitErrors(errorCount);
            setLastUpdate(new Date());
            setUpdateCount(prev => prev + 1);
            triggerPulse();

            // 8. Generate constellation diagram points (NEW!)
            const points = generateConstellationPoints(decodedState.modulation, estimatedSnr + overrides.snrOffset);
            setConstellationPoints(points);

            console.log(`Rx: Decoded packet | SNR: ${estimatedSnr.toFixed(1)}dB | BER: ${(ber * 100).toFixed(2)}% | Errors: ${errorCount} | CRC: ${decoded.crcValid ? 'OK' : 'FAIL'}`);

        } catch (e) {
            console.log('Packet processing error:', e);
        }
    }, [triggerPulse, overrides, distance]);

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

                                        {/* Distance Control - NEW! */}
                                        <View style={styles.controlRow}>
                                            <Text style={styles.controlLabel}>Distance: {distance}m</Text>
                                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                                <TouchableOpacity
                                                    style={[styles.miniBtn, styles.btnInactive]}
                                                    onPress={() => setDistance(Math.max(1, distance - 5))}
                                                >
                                                    <Text style={styles.miniBtnText}>-5m</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.miniBtn, styles.btnInactive]}
                                                    onPress={() => setDistance(Math.min(100, distance + 5))}
                                                >
                                                    <Text style={styles.miniBtnText}>+5m</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <Text style={styles.controlHint}>
                                            Distance affects RSSI (signal strength) → affects SNR → affects BER → affects packet corruption
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

                        {/* CONSTELLATION DIAGRAM - NEW! */}
                        <View style={styles.constellationSection}>
                            <Text style={styles.sectionHeader}>📊 I/Q CONSTELLATION DIAGRAM</Text>
                            <Text style={styles.constellationSubtitle}>
                                {state.modulation} • {constellationPoints.filter(p => p.isError).length} symbol errors
                            </Text>
                            <View style={styles.constellationContainer}>
                                {/* Grid lines */}
                                <View style={styles.constellationGridH} />
                                <View style={styles.constellationGridV} />

                                {/* Axis labels */}
                                <Text style={styles.constellationAxisI}>I</Text>
                                <Text style={styles.constellationAxisQ}>Q</Text>

                                {/* Constellation points */}
                                {constellationPoints.map((point, idx) => {
                                    // Convert -1..1 coordinates to 0..100%
                                    const x = ((point.x + 1.2) / 2.4) * 100;
                                    const y = ((1.2 - point.y) / 2.4) * 100; // Flip Y for screen coords
                                    return (
                                        <View
                                            key={idx}
                                            style={[
                                                styles.constellationPoint,
                                                point.isError ? styles.constellationPointError : styles.constellationPointOk,
                                                {
                                                    left: `${Math.max(0, Math.min(96, x))}%`,
                                                    top: `${Math.max(0, Math.min(96, y))}%`,
                                                }
                                            ]}
                                        />
                                    );
                                })}
                            </View>
                            <Text style={styles.constellationHint}>
                                Tight clusters = strong signal • Scattered = noisy channel
                            </Text>
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
    // Constellation Diagram Styles
    constellationSection: {
        marginTop: 16,
        backgroundColor: '#0f172a',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#1e3a5f',
    },
    constellationSubtitle: {
        color: '#64748b',
        fontSize: 11,
        textAlign: 'center',
        marginBottom: 8,
    },
    constellationContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#020617',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        position: 'relative',
        overflow: 'hidden',
    },
    constellationGridH: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        height: 1,
        backgroundColor: '#334155',
    },
    constellationGridV: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '50%',
        width: 1,
        backgroundColor: '#334155',
    },
    constellationAxisI: {
        position: 'absolute',
        right: 4,
        top: '50%',
        color: '#64748b',
        fontSize: 10,
        fontWeight: 'bold',
    },
    constellationAxisQ: {
        position: 'absolute',
        left: '50%',
        top: 4,
        color: '#64748b',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    constellationPoint: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    constellationPointOk: {
        backgroundColor: '#22d3d1',
        shadowColor: '#22d3d1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
    },
    constellationPointError: {
        backgroundColor: '#ef4444',
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
    },
    constellationHint: {
        color: '#475569',
        fontSize: 10,
        textAlign: 'center',
        marginTop: 8,
        fontStyle: 'italic',
    },
});
