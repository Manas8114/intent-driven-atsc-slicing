import React, { useState, useEffect, useCallback } from 'react';
import './BroadcastCoverage.css';

interface Station {
    call_sign: string;
    frequency_mhz: number;
    service_type: string;
    city: string;
    state: string;
    erp_kw: number;
    haat_m: number;
    latitude: number;
    longitude: number;
    licensee: string;
    distance_km?: number;
}

interface CoveragePoint {
    latitude: number;
    longitude: number;
    strongest_station: string | null;
    received_power_dbm: number;
    snr_db: number;
    distance_km: number;
    coverage_probability: number;
    stations_in_range: number;
}

interface BroadcastStats {
    total_stations: number;
    states_covered: number;
    average_erp_kw: number;
    max_erp_kw: number;
    data_source: string;
    is_real_data: boolean;
}

import { API_BASE } from '../lib/api';

const SERVICE_TYPES = ['All', 'FM', 'AM', 'TV'];
const PRESET_LOCATIONS = [
    { name: 'New York City', lat: 40.7128, lon: -74.0060 },
    { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
    { name: 'Chicago', lat: 41.8781, lon: -87.6298 },
    { name: 'Houston', lat: 29.7604, lon: -95.3698 },
    { name: 'Phoenix', lat: 33.4484, lon: -112.0740 },
    { name: 'Rural Montana', lat: 47.0, lon: -110.5 },
];

export const BroadcastCoverage: React.FC = () => {
    const [stats, setStats] = useState<BroadcastStats | null>(null);
    const [stations, setStations] = useState<Station[]>([]);
    const [coverage, setCoverage] = useState<CoveragePoint | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Search parameters
    const [selectedLocation, setSelectedLocation] = useState(PRESET_LOCATIONS[0]);
    const [radius, setRadius] = useState(50);
    const [serviceType, setServiceType] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Station[]>([]);

    // Fetch statistics on mount
    useEffect(() => {
        fetchStats();
        fetchStations();
    }, []);

    // Fetch when location changes
    useEffect(() => {
        fetchCoverage();
        fetchStations();
    }, [selectedLocation, radius, serviceType]);

    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_BASE}/broadcast/statistics`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    const fetchStations = async () => {
        setLoading(true);
        try {
            let url = `${API_BASE}/broadcast/stations/nearby?lat=${selectedLocation.lat}&lon=${selectedLocation.lon}&radius_km=${radius}&limit=50`;
            if (serviceType !== 'All') {
                url += `&service_type=${serviceType}`;
            }
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setStations(data);
                setError(null);
            }
        } catch (err) {
            setError('Failed to fetch stations');
        } finally {
            setLoading(false);
        }
    };

    const fetchCoverage = async () => {
        try {
            let url = `${API_BASE}/broadcast/coverage/point?lat=${selectedLocation.lat}&lon=${selectedLocation.lon}`;
            if (serviceType !== 'All') {
                url += `&service_type=${serviceType}`;
            }
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setCoverage(data);
            }
        } catch (err) {
            console.error('Failed to fetch coverage:', err);
        }
    };

    const searchStations = useCallback(async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        try {
            const response = await fetch(`${API_BASE}/broadcast/stations/search?query=${encodeURIComponent(searchQuery)}&limit=10`);
            if (response.ok) {
                const data = await response.json();
                setSearchResults(data.results);
            }
        } catch (err) {
            console.error('Search failed:', err);
        }
    }, [searchQuery]);

    useEffect(() => {
        const timer = setTimeout(searchStations, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, searchStations]);

    const getCoverageClass = (probability: number): string => {
        if (probability >= 0.95) return 'coverage-excellent';
        if (probability >= 0.8) return 'coverage-good';
        if (probability >= 0.5) return 'coverage-fair';
        return 'coverage-poor';
    };

    const getServiceTypeClass = (type: string): string => {
        switch (type) {
            case 'FM': return 'service-fm';
            case 'AM': return 'service-am';
            case 'TV': return 'service-tv';
            default: return 'service-default';
        }
    };

    return (
        <div className="broadcast-coverage">
            <header className="coverage-header">
                <div className="header-content">
                    <h1>📡 Real Broadcast Coverage</h1>
                    <p className="subtitle">Live FCC License Data Integration</p>
                </div>
                {stats && (
                    <div className="stats-banner">
                        <div className="stat-item">
                            <span className="stat-value">{stats.total_stations.toLocaleString()}</span>
                            <span className="stat-label">Stations</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{stats.states_covered}</span>
                            <span className="stat-label">States</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{stats.max_erp_kw.toFixed(0)} kW</span>
                            <span className="stat-label">Max Power</span>
                        </div>
                        <div className="stat-badge real-data">
                            ✓ Real FCC Data
                        </div>
                    </div>
                )}
            </header>

            <div className="controls-panel">
                <div className="control-group">
                    <label>Location</label>
                    <select
                        value={selectedLocation.name}
                        aria-label="Select location"
                        onChange={(e) => {
                            const loc = PRESET_LOCATIONS.find(l => l.name === e.target.value);
                            if (loc) setSelectedLocation(loc);
                        }}
                    >
                        {PRESET_LOCATIONS.map(loc => (
                            <option key={loc.name} value={loc.name}>{loc.name}</option>
                        ))}
                    </select>
                </div>

                <div className="control-group">
                    <label>Service Type</label>
                    <div className="button-group">
                        {SERVICE_TYPES.map(type => (
                            <button
                                key={type}
                                className={`type-button ${serviceType === type ? 'active' : ''}`}
                                onClick={() => setServiceType(type)}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="control-group">
                    <label>Radius: {radius} km</label>
                    <input
                        type="range"
                        min="10"
                        max="150"
                        value={radius}
                        aria-label="Search radius in kilometers"
                        title="Search radius"
                        onChange={(e) => setRadius(parseInt(e.target.value))}
                    />
                </div>

                <div className="control-group search-group">
                    <label>Search</label>
                    <input
                        type="text"
                        placeholder="Call sign or city..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchResults.length > 0 && (
                        <div className="search-results">
                            {searchResults.map((s, i) => (
                                <div key={i} className="search-result-item">
                                    <span className="call-sign">{s.call_sign}</span>
                                    <span className="freq">{s.frequency_mhz.toFixed(1)} MHz</span>
                                    <span className="city">{s.city}, {s.state}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {coverage && (
                <div className="coverage-summary">
                    <div className={`coverage-card primary ${getCoverageClass(coverage.coverage_probability)}`}>
                        <h3>Coverage at {selectedLocation.name}</h3>
                        <div className="coverage-metrics">
                            <div className="metric">
                                <span className={`metric-value ${getCoverageClass(coverage.coverage_probability)}`}>
                                    {(coverage.coverage_probability * 100).toFixed(1)}%
                                </span>
                                <span className="metric-label">Coverage</span>
                            </div>
                            <div className="metric">
                                <span className="metric-value">{coverage.snr_db.toFixed(1)}</span>
                                <span className="metric-label">SNR (dB)</span>
                            </div>
                            <div className="metric">
                                <span className="metric-value">{coverage.received_power_dbm.toFixed(1)}</span>
                                <span className="metric-label">Power (dBm)</span>
                            </div>
                            <div className="metric">
                                <span className="metric-value">{coverage.stations_in_range}</span>
                                <span className="metric-label">Stations</span>
                            </div>
                        </div>
                        {coverage.strongest_station && (
                            <div className="strongest-station">
                                Strongest: <strong>{coverage.strongest_station}</strong>
                                ({coverage.distance_km.toFixed(1)} km)
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="stations-section">
                <h2>Nearby Stations ({stations.length})</h2>
                {loading ? (
                    <div className="loading">Loading stations...</div>
                ) : error ? (
                    <div className="error">{error}</div>
                ) : (
                    <div className="stations-grid">
                        {stations.map((station, index) => (
                            <div key={index} className="station-card">
                                <div className="station-header">
                                    <span className={`service-badge ${getServiceTypeClass(station.service_type)}`}>
                                        {station.service_type}
                                    </span>
                                    <span className="call-sign">{station.call_sign}</span>
                                </div>
                                <div className="station-freq">
                                    {station.frequency_mhz.toFixed(1)} MHz
                                </div>
                                <div className="station-details">
                                    <div className="detail">
                                        <span className="label">Location</span>
                                        <span className="value">{station.city}, {station.state}</span>
                                    </div>
                                    <div className="detail">
                                        <span className="label">Power</span>
                                        <span className="value">{station.erp_kw.toFixed(1)} kW</span>
                                    </div>
                                    <div className="detail">
                                        <span className="label">Height</span>
                                        <span className="value">{station.haat_m.toFixed(0)} m</span>
                                    </div>
                                    {station.distance_km !== undefined && (
                                        <div className="detail distance">
                                            <span className="label">Distance</span>
                                            <span className="value">{station.distance_km.toFixed(1)} km</span>
                                        </div>
                                    )}
                                </div>
                                <div className="station-coordinates">
                                    {station.latitude.toFixed(4)}°, {station.longitude.toFixed(4)}°
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <footer className="coverage-footer">
                <div className="data-source">
                    Data Source: FCC License Database | Real Station Data
                </div>
                <div className="coordinates">
                    Current: {selectedLocation.lat.toFixed(4)}°N, {Math.abs(selectedLocation.lon).toFixed(4)}°W
                </div>
            </footer>
        </div>
    );
};

export default BroadcastCoverage;
