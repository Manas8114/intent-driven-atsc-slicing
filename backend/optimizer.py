"""
optimizer.py - ATSC 3.0 Spectrum Optimization Engine

This module provides mathematically rigorous resource allocation for ATSC 3.0 broadcasting:
- Convex optimization (Water-filling algorithm)
- Full A/322 ModCod table with 48 modes
- Shannon-Hartley capacity calculations
- Spectral efficiency optimization
"""

import numpy as np
from scipy.optimize import minimize
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


# ============================================================================
# ATSC 3.0 A/322 Complete ModCod Table
# Based on ATSC A/322:2020 Physical Layer Protocol
# ============================================================================

@dataclass
class ModCodEntry:
    """Single ModCod configuration with performance metrics"""
    modulation: str
    code_rate: str
    bits_per_symbol: int
    code_rate_numeric: float
    required_snr_db: float  # Required SNR for BER < 1e-6 (after LDPC)
    spectral_efficiency: float  # bits/s/Hz


# Full ATSC 3.0 A/322 ModCod Table
# Required SNR values are for AWGN channel, 64K LDPC, BER < 1e-6
ATSC3_MODCOD_TABLE: List[ModCodEntry] = [
    # QPSK (2 bits/symbol)
    ModCodEntry("QPSK", "2/15",  2, 2/15,  -0.30, 0.267),
    ModCodEntry("QPSK", "3/15",  2, 3/15,   1.40, 0.400),
    ModCodEntry("QPSK", "4/15",  2, 4/15,   2.70, 0.533),
    ModCodEntry("QPSK", "5/15",  2, 5/15,   3.80, 0.667),
    ModCodEntry("QPSK", "6/15",  2, 6/15,   4.80, 0.800),
    ModCodEntry("QPSK", "7/15",  2, 7/15,   5.70, 0.933),
    ModCodEntry("QPSK", "8/15",  2, 8/15,   6.60, 1.067),
    ModCodEntry("QPSK", "9/15",  2, 9/15,   7.50, 1.200),
    ModCodEntry("QPSK", "10/15", 2, 10/15,  8.40, 1.333),
    ModCodEntry("QPSK", "11/15", 2, 11/15,  9.40, 1.467),
    ModCodEntry("QPSK", "12/15", 2, 12/15, 10.50, 1.600),
    ModCodEntry("QPSK", "13/15", 2, 13/15, 11.80, 1.733),
    
    # 16QAM (4 bits/symbol)
    ModCodEntry("16QAM", "2/15",  4, 2/15,   2.30, 0.533),
    ModCodEntry("16QAM", "3/15",  4, 3/15,   4.10, 0.800),
    ModCodEntry("16QAM", "4/15",  4, 4/15,   5.60, 1.067),
    ModCodEntry("16QAM", "5/15",  4, 5/15,   6.90, 1.333),
    ModCodEntry("16QAM", "6/15",  4, 6/15,   8.10, 1.600),
    ModCodEntry("16QAM", "7/15",  4, 7/15,   9.20, 1.867),
    ModCodEntry("16QAM", "8/15",  4, 8/15,  10.30, 2.133),
    ModCodEntry("16QAM", "9/15",  4, 9/15,  11.30, 2.400),
    ModCodEntry("16QAM", "10/15", 4, 10/15, 12.40, 2.667),
    ModCodEntry("16QAM", "11/15", 4, 11/15, 13.60, 2.933),
    ModCodEntry("16QAM", "12/15", 4, 12/15, 15.00, 3.200),
    ModCodEntry("16QAM", "13/15", 4, 13/15, 16.60, 3.467),
    
    # 64QAM (6 bits/symbol)
    ModCodEntry("64QAM", "2/15",  6, 2/15,   4.80, 0.800),
    ModCodEntry("64QAM", "3/15",  6, 3/15,   6.80, 1.200),
    ModCodEntry("64QAM", "4/15",  6, 4/15,   8.50, 1.600),
    ModCodEntry("64QAM", "5/15",  6, 5/15,  10.00, 2.000),
    ModCodEntry("64QAM", "6/15",  6, 6/15,  11.30, 2.400),
    ModCodEntry("64QAM", "7/15",  6, 7/15,  12.50, 2.800),
    ModCodEntry("64QAM", "8/15",  6, 8/15,  13.60, 3.200),
    ModCodEntry("64QAM", "9/15",  6, 9/15,  14.80, 3.600),
    ModCodEntry("64QAM", "10/15", 6, 10/15, 16.00, 4.000),
    ModCodEntry("64QAM", "11/15", 6, 11/15, 17.30, 4.400),
    ModCodEntry("64QAM", "12/15", 6, 12/15, 18.80, 4.800),
    ModCodEntry("64QAM", "13/15", 6, 13/15, 20.50, 5.200),
    
    # 256QAM (8 bits/symbol)
    ModCodEntry("256QAM", "2/15",  8, 2/15,   7.40, 1.067),
    ModCodEntry("256QAM", "3/15",  8, 3/15,   9.60, 1.600),
    ModCodEntry("256QAM", "4/15",  8, 4/15,  11.50, 2.133),
    ModCodEntry("256QAM", "5/15",  8, 5/15,  13.10, 2.667),
    ModCodEntry("256QAM", "6/15",  8, 6/15,  14.50, 3.200),
    ModCodEntry("256QAM", "7/15",  8, 7/15,  15.80, 3.733),
    ModCodEntry("256QAM", "8/15",  8, 8/15,  17.00, 4.267),
    ModCodEntry("256QAM", "9/15",  8, 9/15,  18.20, 4.800),
    ModCodEntry("256QAM", "10/15", 8, 10/15, 19.50, 5.333),
    ModCodEntry("256QAM", "11/15", 8, 11/15, 20.80, 5.867),
    ModCodEntry("256QAM", "12/15", 8, 12/15, 22.30, 6.400),
    ModCodEntry("256QAM", "13/15", 8, 13/15, 23.80, 6.933),
]

# Create lookup dict for fast access
MODCOD_LOOKUP: Dict[Tuple[str, str], ModCodEntry] = {
    (entry.modulation, entry.code_rate): entry 
    for entry in ATSC3_MODCOD_TABLE
}


class OptimizationMode(Enum):
    """Optimization objective modes"""
    MAX_THROUGHPUT = "max_throughput"      # Maximize sum rate
    MAX_COVERAGE = "max_coverage"          # Maximize coverage area
    MAX_RELIABILITY = "max_reliability"    # Maximize reception probability
    BALANCED = "balanced"                  # Balance throughput and coverage


# ============================================================================
# Implementation Margins
# ============================================================================

# Additional SNR margin for practical implementation (dB)
# Accounts for: channel estimation errors, phase noise, non-ideal filters, etc.
IMPLEMENTATION_MARGIN_DB = 1.5

# Safety margin for emergency broadcasts
EMERGENCY_MARGIN_DB = 3.0


# ============================================================================
# Spectrum Optimizer Class
# ============================================================================

class SpectrumOptimizer:
    """
    Mathematical optimization engine for ATSC 3.0 resource allocation.
    
    Uses Shannon-Hartley theorem and Convex Optimization (Water-filling) 
    for scientifically optimal power and bandwidth allocation.
    
    Features:
    - Full A/322 ModCod table with 48 modes
    - Spectral efficiency optimization
    - Emergency mode with safety margins
    - Multi-objective optimization support
    """

    def __init__(
        self, 
        total_power_dbm: float = 40.0, 
        total_bandwidth_mhz: float = 6.0,
        implementation_margin_db: float = IMPLEMENTATION_MARGIN_DB,
    ):
        """
        Initialize the spectrum optimizer.
        
        Args:
            total_power_dbm: Total transmit power budget in dBm
            total_bandwidth_mhz: Total bandwidth budget in MHz
            implementation_margin_db: Additional margin for practical operation
        """
        self.total_power_dbm = total_power_dbm
        self.total_power_mw = 10 ** (total_power_dbm / 10.0)
        self.total_bandwidth = total_bandwidth_mhz
        self.implementation_margin = implementation_margin_db

    def optimize_allocation(
        self, 
        slices: List[Dict[str, Any]],
        mode: OptimizationMode = OptimizationMode.MAX_THROUGHPUT,
    ) -> List[Dict[str, Any]]:
        """
        Optimize Power (P_i) and Bandwidth (W_i) allocation across slices.
        
        Objective: Maximize Sum Rate = Sum( W_i * log2(1 + P_i * H_i / (N_0 * W_i)) )
        Subject to:
            Sum(P_i) <= P_total
            Sum(W_i) <= W_total
            P_i >= 0, W_i >= 0
        
        Args:
            slices: List of slice configurations with 'weight' and 'channel_gain'
            mode: Optimization objective mode
            
        Returns:
            List of optimized slice configurations
        """
        n = len(slices)
        if n == 0:
            return []

        # Extract parameters
        channel_gains = np.array([s.get('channel_gain', 1.0) for s in slices])
        weights = np.array([s.get('weight', 1.0) for s in slices])

        # Adjust weights based on optimization mode
        if mode == OptimizationMode.MAX_COVERAGE:
            # Favor lower power with more robust modulation
            weights = weights * np.array([1.0 / max(0.1, g) for g in channel_gains])
        elif mode == OptimizationMode.MAX_RELIABILITY:
            # Favor slices with better channel conditions
            weights = weights * channel_gains

        # Decision variables: [P_0, ..., P_n-1, W_0, ..., W_n-1]
        x0 = np.concatenate([
            np.full(n, self.total_power_mw / n),
            np.full(n, self.total_bandwidth / n)
        ])

        # Bounds
        bounds = [(0.1, self.total_power_mw)] * n + [(0.1, self.total_bandwidth)] * n

        # Capture for closure
        n_slices = n
        total_pwr = self.total_power_mw
        total_bw = self.total_bandwidth
        
        def power_constraint(x):
            return np.sum(x[:n_slices]) - total_pwr
        
        def bandwidth_constraint(x):
            return np.sum(x[n_slices:]) - total_bw
        
        constraints = [
            {'type': 'eq', 'fun': power_constraint},
            {'type': 'eq', 'fun': bandwidth_constraint}
        ]

        def objective(x):
            P = x[:n_slices]
            W = x[n_slices:]
            eps = 1e-10
            snr = (P * channel_gains) / np.maximum(W, eps)
            rates = W * np.log2(1 + snr + eps)
            return -np.sum(weights * rates)

        # Run optimization
        result = minimize(
            objective, x0, 
            bounds=bounds, 
            constraints=constraints, 
            method='SLSQP',
            options={'maxiter': 1000, 'ftol': 1e-9}
        )

        # Format results
        optimized_powers = result.x[:n]
        optimized_bandwidths = result.x[n:]
        
        output = []
        for i, s in enumerate(slices):
            power_mw = float(optimized_powers[i])
            power_dbm = 10 * np.log10(max(0.001, power_mw))
            
            # Calculate resulting SNR consistent with objective function
            # SNR = (P * H) / W
            bandwidth_mhz = float(optimized_bandwidths[i])
            gain = float(channel_gains[i])
            
            # Avoid division by zero
            safe_bw = max(1e-10, bandwidth_mhz)
            snr_linear = (power_mw * gain) / safe_bw
            snr_db = 10 * np.log10(max(1e-10, snr_linear))
            
            # Select optimal ModCod
            modulation, coding_rate = self.select_optimal_mcs(snr_db, is_emergency=s.get("is_emergency", False))
            modcod = MODCOD_LOOKUP.get((modulation, coding_rate))
            
            optimized_slice = s.copy()
            optimized_slice.update({
                'power_mw': power_mw,
                'power_dbm': power_dbm,
                'bandwidth_mhz': bandwidth_mhz,
                'snr_db': snr_db,
                'modulation': modulation,
                'coding_rate': coding_rate,
                'spectral_efficiency': modcod.spectral_efficiency if modcod else 0.0,
                'throughput_mbps': bandwidth_mhz * (modcod.spectral_efficiency if modcod else 0.0),
            })
            output.append(optimized_slice)

        return output

    def select_optimal_mcs(
        self, 
        snr_db: float, 
        is_emergency: bool = False,
    ) -> Tuple[str, str]:
        """
        Select optimal Modulation and Coding Scheme for given SNR.
        
        Uses the full A/322 ModCod table to find the highest spectral
        efficiency mode that can operate at the given SNR.
        
        Args:
            snr_db: Available SNR at receiver (dB)
            is_emergency: If True, applies additional safety margin
            
        Returns:
            Tuple of (modulation, code_rate)
        """
        margin = self.implementation_margin
        if is_emergency:
            margin += EMERGENCY_MARGIN_DB
        
        # Find all modes that can operate at this SNR
        valid_modes = [
            entry for entry in ATSC3_MODCOD_TABLE
            if entry.required_snr_db + margin <= snr_db
        ]
        
        if not valid_modes:
            # Fallback to most robust mode
            return "QPSK", "2/15"
        
        # Select mode with highest spectral efficiency
        best_mode = max(valid_modes, key=lambda e: e.spectral_efficiency)
        return best_mode.modulation, best_mode.code_rate

    def map_snr_to_mcs(self, snr_db: float) -> Tuple[str, str]:
        """
        Legacy method for backward compatibility.
        
        Args:
            snr_db: Available SNR at receiver (dB)
            
        Returns:
            Tuple of (modulation, code_rate)
        """
        return self.select_optimal_mcs(snr_db)

    def get_modcod_info(
        self, 
        modulation: str, 
        code_rate: str,
    ) -> Optional[ModCodEntry]:
        """
        Get detailed ModCod information.
        
        Args:
            modulation: Modulation type (QPSK, 16QAM, 64QAM, 256QAM)
            code_rate: LDPC code rate (e.g., "5/15")
            
        Returns:
            ModCodEntry or None if not found
        """
        return MODCOD_LOOKUP.get((modulation, code_rate))

    def calculate_spectral_efficiency(
        self, 
        modulation: str, 
        code_rate: str,
    ) -> float:
        """
        Calculate spectral efficiency for a ModCod combination.
        
        Spectral Efficiency = bits_per_symbol * code_rate
        
        Args:
            modulation: Modulation type
            code_rate: LDPC code rate
            
        Returns:
            Spectral efficiency in bits/s/Hz
        """
        entry = self.get_modcod_info(modulation, code_rate)
        if entry:
            return entry.spectral_efficiency
        
        # Calculate if not in table
        bits_per_symbol = {
            "QPSK": 2, "16QAM": 4, "64QAM": 6, "256QAM": 8
        }.get(modulation, 2)
        
        try:
            num, denom = code_rate.split('/')
            rate = int(num) / int(denom)
        except ValueError:
            rate = 0.5
        
        return bits_per_symbol * rate

    def calculate_required_snr(
        self, 
        modulation: str, 
        code_rate: str,
        include_margin: bool = True,
    ) -> float:
        """
        Calculate required SNR for a ModCod combination.
        
        Args:
            modulation: Modulation type
            code_rate: LDPC code rate
            include_margin: Whether to include implementation margin
            
        Returns:
            Required SNR in dB
        """
        entry = self.get_modcod_info(modulation, code_rate)
        if entry:
            snr = entry.required_snr_db
        else:
            # Estimate if not in table (rough approximation)
            bits_per_symbol = {
                "QPSK": 2, "16QAM": 4, "64QAM": 6, "256QAM": 8
            }.get(modulation, 2)
            snr = bits_per_symbol * 3.0  # Rough estimate
        
        if include_margin:
            snr += self.implementation_margin
        
        return snr

    def get_all_valid_modcods(
        self, 
        snr_db: float,
        is_emergency: bool = False,
    ) -> List[ModCodEntry]:
        """
        Get all ModCod entries that can operate at given SNR.
        
        Args:
            snr_db: Available SNR at receiver (dB)
            is_emergency: If True, applies additional safety margin
            
        Returns:
            List of valid ModCodEntry objects sorted by spectral efficiency
        """
        margin = self.implementation_margin
        if is_emergency:
            margin += EMERGENCY_MARGIN_DB
        
        valid = [
            entry for entry in ATSC3_MODCOD_TABLE
            if entry.required_snr_db + margin <= snr_db
        ]
        
        return sorted(valid, key=lambda e: e.spectral_efficiency, reverse=True)

    def get_modcod_table_summary(self) -> Dict[str, Any]:
        """Get summary of the ModCod table."""
        return {
            'total_modes': len(ATSC3_MODCOD_TABLE),
            'modulations': ['QPSK', '16QAM', '64QAM', '256QAM'],
            'code_rates': sorted(set(e.code_rate for e in ATSC3_MODCOD_TABLE)),
            'snr_range_db': (
                min(e.required_snr_db for e in ATSC3_MODCOD_TABLE),
                max(e.required_snr_db for e in ATSC3_MODCOD_TABLE),
            ),
            'spectral_efficiency_range': (
                min(e.spectral_efficiency for e in ATSC3_MODCOD_TABLE),
                max(e.spectral_efficiency for e in ATSC3_MODCOD_TABLE),
            ),
            'implementation_margin_db': self.implementation_margin,
        }


# ============================================================================
# Convenience Functions
# ============================================================================

def select_optimal_mcs(
    snr_db: float, 
    target_ber: float = 1e-6,
    is_emergency: bool = False,
) -> Tuple[str, str]:
    """
    Select optimal ModCod from ATSC 3.0 spec tables.
    
    Convenience function for direct access without optimizer instance.
    """
    optimizer = SpectrumOptimizer()
    return optimizer.select_optimal_mcs(snr_db, is_emergency)


def spectral_efficiency(modcod: Tuple[str, str]) -> float:
    """Calculate spectral efficiency for a (modulation, code_rate) tuple."""
    optimizer = SpectrumOptimizer()
    return optimizer.calculate_spectral_efficiency(modcod[0], modcod[1])


# ============================================================================
# Module Test
# ============================================================================

if __name__ == "__main__":
    optimizer = SpectrumOptimizer(total_power_dbm=40, total_bandwidth_mhz=6.0)
    
    print("ATSC 3.0 A/322 ModCod Table Summary:")
    summary = optimizer.get_modcod_table_summary()
    for key, value in summary.items():
        print(f"  {key}: {value}")
    
    print("\nModCod Selection Tests:")
    for snr in [-5, 0, 5, 10, 15, 20, 25]:
        mod, cr = optimizer.select_optimal_mcs(snr)
        eff = optimizer.calculate_spectral_efficiency(mod, cr)
        print(f"  SNR={snr:+3d} dB -> {mod:6s} {cr:5s} ({eff:.3f} bits/s/Hz)")
    
    print("\nOptimization Test:")
    slices = [
        {'name': 'Emergency', 'weight': 2.0, 'channel_gain': 0.8},
        {'name': 'Standard', 'weight': 1.0, 'channel_gain': 1.0},
        {'name': 'Background', 'weight': 0.5, 'channel_gain': 0.6},
    ]
    
    results = optimizer.optimize_allocation(slices)
    for r in results:
        print(f"  {r['name']:12s}: P={r['power_dbm']:5.1f}dBm, "
              f"BW={r['bandwidth_mhz']:4.2f}MHz, "
              f"{r['modulation']:6s} {r['coding_rate']:5s}, "
              f"Rate={r['throughput_mbps']:5.2f}Mbps")
