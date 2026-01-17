# Project References

## 1. Standards & Regulations

### ATSC 3.0 (Advanced Television Systems Committee)

* **[A/300:2024](https://www.atsc.org/atsc-documents/type/300-system/)** - *ATSC 3.0 System Standard*.
  * Defines the overall architecture of the Next Gen TV system.
* **[A/322:2024](https://www.atsc.org/atsc-documents/type/322-physical-layer/)** - *Physical Layer Protocol*.
  * **Usage**: The 'Spectrum Optimizer' and 'AI Engine' in this project use the ModCod / PLP parameters defined in this standard (e.g., LDM, constellation sizes 4QAM-4096QAM).
* **[A/321:2023](https://www.atsc.org/atsc-documents/type/321-system-discovery-and-signaling/)** - *System Discovery and Signaling*.
  * **Usage**: The Bootstrap and Preamble generation references this.

### ITU-T (International Telecommunication Union)

* **[FG-AINN](https://www.itu.int/en/ITU-T/focusgroups/ainn/Pages/default.aspx)** - *Focus Group on AI-Native for Telecommunication Networks*.
  * **Context**: This project is a Proof of Concept (PoC-042, Provisional) submitted to the FG-AINN Build-a-thon 4.0.
  * **Relevant WG**: Working Group 4 (PoC).

---

## 2. Artificial Intelligence & Algorithms

### Reinforcement Learning

* **Proximal Policy Optimization (PPO)**
  * *Reference*: Schulman, J., Wolski, F., Dhariwal, P., Radford, A., & Klimov, O. (2017). "Proximal Policy Optimization Algorithms". *arXiv preprint arXiv:1707.06347*.
  * **Usage**: The `RLAgent` class (`backend/rl_agent.py`) uses PPO to optimize PLP weights and offload ratios.

### Optimization

* **Water-Filling Algorithm**
  * *Reference*: Cover, T. M., & Thomas, J. A. (2006). *Elements of Information Theory*. John Wiley & Sons.
  * **Usage**: Used in `backend/optimizer.py` (simulated via convex solvers) to allocate power and bandwidth efficiently typically found in broadcast spectrum planning.

---

## 3. Propagation & Simulation

### RF Propagation Models

* **Log-Distance Path Loss & Shadow Fading**
  * *Reference*: Rappaport, T. S. (2002). *Wireless Communications: Principles and Practice*. Prentice Hall.
  * **Usage**: `sim/channel_model.py` implements these standard propagation models for the 10x10km digital twin.

### Mobility Simulation

* **SUMO (Simulation of Urban MObility)**
  * *Reference*: Lopez, P. A., et al. (2018). "Microscopic Traffic Simulation using SUMO". *IEEE Intelligent Transportation Systems Conference (ITSC)*.
  * **Usage**: Used for generating realistic vehicle traces in the "Mobility Surge" scenarios (`sim/sumo_loader.py` logic).

---

## 4. Technology Stack (Open Source)

| Component | Library/Tool | Version | License |
|-----------|--------------|---------|---------|
| **AI Framework** | [Stable Baselines3](https://stable-baselines3.readthedocs.io/) | 2.2.1+ | MIT |
| **Environment** | [Gymnasium](https://gymnasium.farama.org/) | 0.29+ | MIT |
| **Backend** | [FastAPI](https://fastapi.tiangolo.com/) | 0.110+ | MIT |
| **Frontend** | [React](https://react.dev/) | 18.2 | MIT |
| **Build Tool** | [Vite](https://vitejs.dev/) | 5.0+ | MIT |
| **ATSC Parsing** | [libatsc3](https://github.com/jjustman/libatsc3) | N/A | MIT/BSD |

---

## 5. Project Documents

* **FG-AINN-PoC-Submission.md**: Establishing the official submission context.
* **stage2_proposal.md**: Technical implementation details.
