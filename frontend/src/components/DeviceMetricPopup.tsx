import React, { useState, useEffect } from 'react';
import { Signal, Wifi, WifiOff } from 'lucide-react';

interface PhysicsData {
    snr_db: number;
    rx_power_dbm: number;
    quality: 'good' | 'fair' | 'poor';
    service_acquisition: number;
}

interface DeviceMetricPopupProps {
    deviceId: string;
    deviceName: string;
    position: { x: number; y: number };
    onClose: () => void;
}

const API_BASE = 'http://localhost:8000';

export const DeviceMetricPopup: React.FC<DeviceMetricPopupProps> = ({
    deviceId,
    deviceName,
    position,
    onClose,
}) => {
    const [physics, setPhysics] = useState<PhysicsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/telemetry/physics`);
                const data = await res.json();
                if (data.physics_log) {
                    setPhysics({
                        snr_db: data.physics_log.outputs?.snr_db || 0,
                        rx_power_dbm: data.physics_log.outputs?.rx_power_dbm || 0,
                        quality: data.physics_log.quality || 'fair',
                        service_acquisition: data.physics_log.outputs?.service_acquisition || 0,
                    });
                }
            } catch (err) {
                console.error('Failed to fetch physics data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 1000);
        return () => clearInterval(interval);
    }, [deviceId]);

    const getQualityColor = (quality: string) => {
        switch (quality) {
            case 'good': return 'bg-green-500';
            case 'fair': return 'bg-yellow-500';
            case 'poor': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getQualityBorder = (quality: string) => {
        switch (quality) {
            case 'good': return 'border-green-500';
            case 'fair': return 'border-yellow-500';
            case 'poor': return 'border-red-500';
            default: return 'border-gray-500';
        }
    };

    return (
        <div
            className={`absolute z-50 bg-gray-900/95 backdrop-blur-sm rounded-lg border-2 ${physics ? getQualityBorder(physics.quality) : 'border-gray-600'} shadow-2xl p-4 min-w-64`}
            style={{
                left: position.x + 20,
                top: position.y - 50,
                transform: 'translateY(-50%)',
            }}
            onMouseLeave={onClose}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    {physics?.quality === 'good' ? (
                        <Wifi className="w-4 h-4 text-green-400" />
                    ) : physics?.quality === 'poor' ? (
                        <WifiOff className="w-4 h-4 text-red-400" />
                    ) : (
                        <Signal className="w-4 h-4 text-yellow-400" />
                    )}
                    <span className="font-semibold text-white text-sm">{deviceName}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${physics ? getQualityColor(physics.quality) : 'bg-gray-500'} text-white`}>
                    {physics?.quality || 'LOADING'}
                </span>
            </div>

            {loading ? (
                <div className="text-gray-400 text-sm animate-pulse">Loading metrics...</div>
            ) : physics ? (
                <div className="space-y-2">
                    {/* SNR */}
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">Signal-to-Noise (SNR)</span>
                        <span className={`font-mono text-sm ${physics.snr_db > 15 ? 'text-green-400' : physics.snr_db > 8 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                            {physics.snr_db.toFixed(1)} dB
                        </span>
                    </div>

                    {/* RX Power */}
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">Received Power</span>
                        <span className="font-mono text-sm text-blue-400">
                            {physics.rx_power_dbm.toFixed(1)} dBm
                        </span>
                    </div>

                    {/* Service Acquisition */}
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">Service Acquisition</span>
                        <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${physics.service_acquisition > 90 ? 'bg-green-500' :
                                            physics.service_acquisition > 60 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                    style={{ width: `${physics.service_acquisition}%` }}
                                />
                            </div>
                            <span className="font-mono text-sm text-white">
                                {physics.service_acquisition.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-red-400 text-sm">No data available</div>
            )}

            {/* Footer */}
            <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-500">
                Device ID: {deviceId}
            </div>
        </div>
    );
};

export default DeviceMetricPopup;
