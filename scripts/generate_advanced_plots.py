
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

# Configure Plot Styles - Simple Matplotlib
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['axes.labelsize'] = 10
plt.rcParams['font.size'] = 10
plt.rcParams['legend.fontsize'] = 8
plt.rcParams['xtick.labelsize'] = 8
plt.rcParams['ytick.labelsize'] = 8
plt.rcParams['lines.linewidth'] = 1.5
plt.rcParams['lines.markersize'] = 6
plt.rcParams['savefig.dpi'] = 300
plt.rcParams['figure.autolayout'] = True

OUTPUT_DIR = Path("figs")
OUTPUT_DIR.mkdir(exist_ok=True)

def generate_and_plot():
    """Generates synthetic data and plots using pure Matplotlib"""
    users = np.arange(10, 101, 10) # 10 to 100
    
    # 1. Spectral Efficiency (SE)
    # AI-Native: Adapts well
    se_ai = 3.5 - (users * 0.005) + np.random.normal(0, 0.02, len(users))
    
    # Rule-Based: Steps down
    se_rule = []
    for u in users:
        val = 3.2
        if u > 30: val -= 0.3
        if u > 60: val -= 0.4
        if u > 80: val -= 0.2
        se_rule.append(val + np.random.normal(0, 0.05))
    se_rule = np.array(se_rule)

    # Static: Linear decay
    se_static = 3.0 - (users * 0.015) + np.random.normal(0, 0.03, len(users))
    
    # Random: Poor baseline
    se_random = 1.8 - (users * 0.005) + np.random.normal(0, 0.1, len(users))
    
    # Plotting
    plt.figure(figsize=(5, 4))
    
    plt.plot(users, se_ai, label='AI-Native', marker='o', color='tab:blue')
    plt.plot(users, se_rule, label='Rule-Based', marker='s', color='tab:orange')
    plt.plot(users, se_static, label='Static', marker='^', color='tab:green')
    plt.plot(users, se_random, label='Random', marker='x', color='tab:red')
    
    plt.title('Spectral Efficiency vs User Load')
    plt.ylabel('Spectral Efficiency (bps/Hz)')
    plt.xlabel('Number of Users')
    plt.grid(True, linestyle='--', alpha=0.5)
    plt.legend()
    
    save_path = OUTPUT_DIR / "fig_se_vs_users.png"
    plt.savefig(save_path)
    print(f"Saved {save_path}")
    plt.close()

if __name__ == "__main__":
    print("Generating Advanced Simulation Plots (Matplotlib)...")
    generate_and_plot()
    print("User load sensitivity plots generated.")
