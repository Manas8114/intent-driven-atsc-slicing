"""
Simulation Validation Script
---------------------------

Runs a quick end‑to‑end sanity check of the digital‑twin simulation stack:

1. Builds a sample PLP configuration using the ATSC adapter.
2. Evaluates the action with the simulator (coverage, alert reliability, latency,
   spectral efficiency).
3. Checks that the emergency‑alert reliability meets the hard constraint
   (≥ 0.99) and that the total bandwidth does not exceed the channel limit.
4. Prints a human‑readable summary and any assertion failures.

Execute with:
    python sim/validation.py
"""

import sys
from pathlib import Path

# Ensure project root is on PYTHONPATH
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_ROOT))

from backend.atsc_adapter import configure_plp
from backend.simulator import evaluate_action
from sim.interference_simulator import check_spectrum_constraint


def main() -> None:
    # Sample PLP configuration (emergency‑critical PLP)
    sample_action = configure_plp(
        plp_id=0,
        modulation="QPSK",
        coding_rate="1/2",
        power_dbm=73,
        bandwidth_mhz=6,
        priority="high",
    )

    # Evaluate KPIs via the digital‑twin
    kpis = evaluate_action(sample_action)

    # Verify hard constraints
    assert kpis["alert_reliability"] >= 0.99, (
        f"Emergency reliability {kpis['alert_reliability']:.4f} does not meet the ≥ 0.99 requirement."
    )

    # Spectrum check – we only have one PLP in this simple test
    spectrum_ok = check_spectrum_constraint([sample_action])
    assert spectrum_ok, "Allocated bandwidth exceeds the 6 MHz channel limit."

    # Print concise report
    print("\n=== Simulation Validation Report ===")
    print(f"Coverage probability          : {kpis['coverage']:.4f}")
    print(f"Emergency alert reliability   : {kpis['alert_reliability']:.4f}")
    print(f"Latency (ms)                  : {kpis['latency_ms']:.1f}")
    print(f"Spectral efficiency (bits/Hz): {kpis['spectral_efficiency']:.2f}")
    print(f"Spectrum constraint satisfied : {spectrum_ok}")
    print("All validation checks passed ✅\n")


if __name__ == "__main__":
    main()
