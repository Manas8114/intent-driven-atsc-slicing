"""
spatial_model.py - Pre-Deployment Validation Layer (Digital Twin)

This simulation provides RISK REDUCTION before real broadcast changes:

PURPOSE:
- Models UHF propagation across a 10km x 10km rural coverage grid
- Validates coverage metrics before actual deployment
- Enables "what-if" analysis without touching real infrastructure
- Provides feedback to the AI optimization loop
- Supports MOBILE USERS (vehicles) with dynamic position updates

IMPORTANT NOTES:
- This is a SIMULATION for validation purposes
- Results inform configuration decisions but do NOT directly control hardware
- Coverage metrics are estimates based on simplified propagation models
- Real-world performance may vary due to terrain, multipath, and other factors

The simulation is part of the closed-loop control system:
    Intent → AI Engine → Spatial Validation (HERE) → Approval → (simulated) Deployment
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional
from .channel_model import received_power


@dataclass
class MobileUser:
    """Represents a mobile user (e.g., vehicle) with trajectory."""
    id: int
    x_km: float
    y_km: float
    velocity_kmh: float  # Speed in km/h
    heading_deg: float  # Direction of travel (0 = North, 90 = East)
    path_type: str = "linear"  # 'linear', 'circular', 'random'
    
    # Motion state
    time_elapsed_s: float = 0.0
    
    def update_position(self, dt_seconds: float, grid_size_km: float):
        """
        Update position based on velocity and heading.
        
        Args:
            dt_seconds: Time step in seconds
            grid_size_km: Size of the grid to wrap around
        """
        # Convert heading to radians (0 = North = +Y)
        heading_rad = np.radians(self.heading_deg)
        
        # Calculate displacement
        distance_km = (self.velocity_kmh / 3600.0) * dt_seconds
        
        # Update position
        dx = distance_km * np.sin(heading_rad)
        dy = distance_km * np.cos(heading_rad)
        
        self.x_km += dx
        self.y_km += dy
        self.time_elapsed_s += dt_seconds
        
        # Random path: occasionally change heading
        if self.path_type == "random" and np.random.random() < 0.01:
            self.heading_deg = np.random.uniform(0, 360)
        
        # Bounce off grid boundaries
        half_size = grid_size_km / 2
        if abs(self.x_km) > half_size:
            self.x_km = np.clip(self.x_km, -half_size, half_size)
            self.heading_deg = 180 - self.heading_deg  # Reflect
        if abs(self.y_km) > half_size:
            self.y_km = np.clip(self.y_km, -half_size, half_size)
            self.heading_deg = -self.heading_deg  # Reflect
            
    def get_position(self) -> Tuple[float, float]:
        """Get current (x, y) position."""
        return (self.x_km, self.y_km)
    
    def get_distance_from_tower(self) -> float:
        """Get distance from tower at origin."""
        return max(0.1, np.sqrt(self.x_km**2 + self.y_km**2))


class SpatialGrid:
    """
    Simulates a 10km x 10km area with distributed User Equipments (UEs).
    
    This is the "Digital Twin" component that validates proposed configurations
    before they would be deployed to real broadcast infrastructure.
    
    Supports both STATIC and MOBILE users for realistic rural/vehicle scenarios.
    
    DATA SOURCES:
    - Random generation (default): Uses uniform random placement
    - SUMO network (data-driven): Loads real road network from .net.xml files
    
    Used to calculate 'Coverage' as a spatial metric (percentage of area served)
    rather than a single point metric. Results are used by the AI engine to
    evaluate configuration quality and by engineers for approval decisions.
    """

    def __init__(self, size_km: float = 10.0, num_users: int = 100, 
                 num_mobile: int = 0, mobile_speed_range: Tuple[float, float] = (30.0, 80.0),
                 sumo_data_path: Optional[str] = None):
        """
        Initialize the spatial grid with static and mobile users.
        
        Args:
            size_km: Grid size in kilometers
            num_users: Number of static users
            num_mobile: Number of mobile users (vehicles)
            mobile_speed_range: (min, max) speed in km/h for mobile users
            sumo_data_path: Optional path to SUMO .net.xml file for data-driven mode
        """
        self.size_km = size_km
        self.num_users = num_users
        self.num_mobile = num_mobile
        self.mobile_speed_range = mobile_speed_range
        self.data_source = "random"  # Track data provenance
        
        # Try to load from SUMO data if path provided
        if sumo_data_path:
            self.ue_locations = self._load_sumo_locations(sumo_data_path, num_users)
            if self.ue_locations is not None:
                self.data_source = "sumo_network"
                self.num_users = len(self.ue_locations)
            else:
                # Fallback to random if SUMO load fails
                self.ue_locations = np.random.uniform(-size_km/2, size_km/2, (num_users, 2))
        else:
            # Generate random static UE locations (x, y) relative to tower at (0,0)
            self.ue_locations = np.random.uniform(-size_km/2, size_km/2, (num_users, 2))
        
        # Calculate distances once for static users
        self.distances = np.linalg.norm(self.ue_locations, axis=1)
        self.distances = np.maximum(self.distances, 0.1)
        
        # Initialize mobile users
        self.mobile_users: List[MobileUser] = []
        self._init_mobile_users()
        
        # Simulation time tracking
        self.simulation_time_s = 0.0
    
    def _load_sumo_locations(self, sumo_path: str, num_users: int) -> Optional[np.ndarray]:
        """
        Load user locations from a SUMO network file.
        
        Returns None if loading fails, allowing fallback to random generation.
        """
        try:
            from .sumo_loader import SumoNetworkParser, get_user_locations_from_network
            import os
            
            if not os.path.exists(sumo_path):
                print(f"[SpatialGrid] SUMO file not found: {sumo_path}")
                return None
            
            parser = SumoNetworkParser()
            network = parser.parse(sumo_path)
            
            if not network.junctions:
                print("[SpatialGrid] No junctions found in SUMO network")
                return None
            
            locations = get_user_locations_from_network(
                network, 
                num_users=num_users,
                normalize_to_km=True
            )
            
            print(f"[SpatialGrid] Loaded {len(locations)} user locations from SUMO network")
            print(f"[SpatialGrid] Network: {len(network.junctions)} junctions, {len(network.edges)} edges")
            
            return locations
            
        except ImportError as e:
            print(f"[SpatialGrid] Could not import sumo_loader: {e}")
            return None
        except Exception as e:
            print(f"[SpatialGrid] Error loading SUMO data: {e}")
            return None

        
    def _init_mobile_users(self):
        """Initialize mobile users with random positions and trajectories."""
        self.mobile_users = []
        
        for i in range(self.num_mobile):
            # Random position within grid
            x = np.random.uniform(-self.size_km/2, self.size_km/2)
            y = np.random.uniform(-self.size_km/2, self.size_km/2)
            
            # Random velocity within range
            min_speed, max_speed = self.mobile_speed_range
            velocity = np.random.uniform(min_speed, max_speed)
            
            # Random heading
            heading = np.random.uniform(0, 360)
            
            # Random path type
            path_type = np.random.choice(["linear", "random"], p=[0.7, 0.3])
            
            self.mobile_users.append(MobileUser(
                id=self.num_users + i,
                x_km=x,
                y_km=y,
                velocity_kmh=velocity,
                heading_deg=heading,
                path_type=path_type
            ))
            
    def add_mobile_users(self, count: int):
        """Add additional mobile users to the simulation."""
        start_id = self.num_users + len(self.mobile_users)
        min_speed, max_speed = self.mobile_speed_range
        
        for i in range(count):
            self.mobile_users.append(MobileUser(
                id=start_id + i,
                x_km=np.random.uniform(-self.size_km/2, self.size_km/2),
                y_km=np.random.uniform(-self.size_km/2, self.size_km/2),
                velocity_kmh=np.random.uniform(min_speed, max_speed),
                heading_deg=np.random.uniform(0, 360),
                path_type="linear"
            ))
        self.num_mobile = len(self.mobile_users)
            
    def set_mobile_ratio(self, ratio: float):
        """
        Set the ratio of mobile users to total users.
        
        Args:
            ratio: Fraction of users that should be mobile [0.0 - 1.0]
        """
        total_users = self.num_users + self.num_mobile
        target_mobile = int(total_users * ratio)
        
        if target_mobile > len(self.mobile_users):
            self.add_mobile_users(target_mobile - len(self.mobile_users))
        elif target_mobile < len(self.mobile_users):
            self.mobile_users = self.mobile_users[:target_mobile]
            self.num_mobile = target_mobile
            
    def update_mobile_positions(self, dt_seconds: float = 1.0):
        """
        Update positions of all mobile users.
        
        Args:
            dt_seconds: Time step in seconds
        """
        for user in self.mobile_users:
            user.update_position(dt_seconds, self.size_km)
        self.simulation_time_s += dt_seconds
            
    def get_mobile_distances(self) -> np.ndarray:
        """Get distances of all mobile users from tower."""
        if not self.mobile_users:
            return np.array([])
        return np.array([user.get_distance_from_tower() for user in self.mobile_users])
    
    def get_all_distances(self) -> np.ndarray:
        """Get distances of all users (static + mobile) from tower."""
        mobile_distances = self.get_mobile_distances()
        if len(mobile_distances) > 0:
            return np.concatenate([self.distances, mobile_distances])
        return self.distances
    
    def get_mobility_metrics(self) -> Dict[str, float]:
        """
        Get statistics about mobile users.
        
        Returns:
            Dict with mobile_user_ratio, average_velocity_kmh, etc.
        """
        total_users = self.num_users + self.num_mobile
        mobile_ratio = self.num_mobile / total_users if total_users > 0 else 0.0
        
        if self.mobile_users:
            avg_velocity = np.mean([u.velocity_kmh for u in self.mobile_users])
            max_velocity = np.max([u.velocity_kmh for u in self.mobile_users])
        else:
            avg_velocity = 0.0
            max_velocity = 0.0
            
        return {
            "mobile_user_ratio": float(mobile_ratio),
            "average_velocity_kmh": float(avg_velocity),
            "max_velocity_kmh": float(max_velocity),
            "num_mobile_users": self.num_mobile,
            "num_static_users": self.num_users,
            "simulation_time_s": float(self.simulation_time_s)
        }

    def calculate_grid_metrics(self, tx_power_dbm: float, frequency_mhz: float, min_snr_db: float, 
                             noise_floor_dbm: float = -100.0, channel_impairment_db: float = 0.0,
                             include_mobile: bool = True) -> Dict[str, float]:
        """
        Calculate coverage statistics for the grid including mobile users.
        
        Args:
            tx_power_dbm: Transmission power.
            frequency_mhz: Carrier frequency.
            min_snr_db: SNR threshold for successful reception.
            noise_floor_dbm: Thermal noise floor (default -100).
            channel_impairment_db: Additional loss (shadowing) to subtract from Rx power.
            include_mobile: Whether to include mobile users in metrics.
            
        Returns:
            Dict with coverage metrics for static and mobile users
        """
        # Calculate SNR for static users
        # Calculate SNR for static users (Vectorized)
        rx_pwr = received_power(tx_power_dbm, frequency_mhz, self.distances)
        rx_pwr -= channel_impairment_db
        static_snr_values = rx_pwr - noise_floor_dbm
        static_snr_values = np.array(static_snr_values)
        
        # Calculate SNR for mobile users (with velocity-based degradation)
        mobile_snr_values = []
        mobile_covered = 0
        
        if include_mobile and self.mobile_users:
            for user in self.mobile_users:
                d = user.get_distance_from_tower()
                rx_pwr = received_power(tx_power_dbm, frequency_mhz, d)
                rx_pwr -= channel_impairment_db
                
                # Mobility degradation: fast-moving users experience more fading
                # Doppler effect and handover overhead
                velocity_penalty_db = user.velocity_kmh * 0.03  # ~1.5dB at 50 km/h
                rx_pwr -= velocity_penalty_db
                
                snr = rx_pwr - noise_floor_dbm
                mobile_snr_values.append(snr)
                
                if snr >= min_snr_db:
                    mobile_covered += 1
                    
            mobile_snr_values = np.array(mobile_snr_values)
        
        # Static coverage
        static_covered = np.sum(static_snr_values >= min_snr_db)
        static_coverage_pct = (static_covered / self.num_users) * 100.0 if self.num_users > 0 else 100.0
        
        # Mobile coverage
        if self.num_mobile > 0 and include_mobile:
            mobile_coverage_pct = (mobile_covered / self.num_mobile) * 100.0
        else:
            mobile_coverage_pct = 100.0  # No mobile users = 100% by default
            
        # Combined metrics
        total_users = self.num_users + (self.num_mobile if include_mobile else 0)
        total_covered = static_covered + (mobile_covered if include_mobile else 0)
        overall_coverage_pct = (total_covered / total_users) * 100.0 if total_users > 0 else 100.0
        
        # Combine SNR values
        if include_mobile and len(mobile_snr_values) > 0:
            all_snr = np.concatenate([static_snr_values, mobile_snr_values])
        else:
            all_snr = static_snr_values
        
        return {
            "coverage_percent": float(overall_coverage_pct),
            "static_coverage_percent": float(static_coverage_pct),
            "mobile_coverage_percent": float(mobile_coverage_pct),
            "avg_snr_db": float(np.mean(all_snr)),
            "min_snr_db": float(np.min(all_snr)),
            "std_snr_db": float(np.std(all_snr)),
            "num_covered": int(total_covered),
            "num_total": int(total_users)
        }

    def get_ue_statuses(self, tx_power_dbm: float, frequency_mhz: float, min_snr_db: float, 
                        noise_floor_dbm: float = -100.0, channel_impairment_db: float = 0.0,
                        include_mobile: bool = True) -> List[Dict]:
        """
        Get detailed status for each UE (static and mobile).
        """
        statuses = []
        
        # Static users
        for i, (loc, dist) in enumerate(zip(self.ue_locations, self.distances)):
            rx_pwr = received_power(tx_power_dbm, frequency_mhz, dist)
            rx_pwr -= channel_impairment_db
            snr = rx_pwr - noise_floor_dbm
            
            is_connected = snr >= min_snr_db
            video_state = self._get_video_state(snr, min_snr_db)
            
            statuses.append({
                "id": i,
                "x_km": float(loc[0]),
                "y_km": float(loc[1]),
                "distance_km": float(dist),
                "rx_power_dbm": float(rx_pwr),
                "snr_db": float(snr),
                "connected": bool(is_connected),
                "video_state": video_state,
                "is_mobile": False,
                "velocity_kmh": 0.0
            })
        
        # Mobile users
        if include_mobile:
            for user in self.mobile_users:
                dist = user.get_distance_from_tower()
                rx_pwr = received_power(tx_power_dbm, frequency_mhz, dist)
                rx_pwr -= channel_impairment_db
                
                # Velocity penalty
                velocity_penalty_db = user.velocity_kmh * 0.03
                rx_pwr -= velocity_penalty_db
                
                snr = rx_pwr - noise_floor_dbm
                is_connected = snr >= min_snr_db
                video_state = self._get_video_state(snr, min_snr_db)
                
                statuses.append({
                    "id": user.id,
                    "x_km": float(user.x_km),
                    "y_km": float(user.y_km),
                    "distance_km": float(dist),
                    "rx_power_dbm": float(rx_pwr),
                    "snr_db": float(snr),
                    "connected": bool(is_connected),
                    "video_state": video_state,
                    "is_mobile": True,
                    "velocity_kmh": float(user.velocity_kmh),
                    "heading_deg": float(user.heading_deg)
                })
                
        return statuses
    
    def _get_video_state(self, snr: float, min_snr_db: float) -> str:
        """Determine video state based on SNR."""
        if snr >= 25:
            return "4K UHD"
        elif snr >= 15:
            return "1080p HD"
        elif snr >= 10:
            return "720p HD"
        elif snr >= min_snr_db:
            return "SD Stream"
        return "No Signal"
    
    def get_mobile_user_positions(self) -> List[Dict]:
        """Get current positions of all mobile users for visualization."""
        return [
            {
                "id": user.id,
                "x_km": user.x_km,
                "y_km": user.y_km,
                "velocity_kmh": user.velocity_kmh,
                "heading_deg": user.heading_deg
            }
            for user in self.mobile_users
        ]


# Quick test
if __name__ == "__main__":
    print("=== Spatial Grid with Mobility Test ===\n")
    
    # Create grid with 80 static + 20 mobile users
    grid = SpatialGrid(size_km=10.0, num_users=80, num_mobile=20, 
                       mobile_speed_range=(30.0, 80.0))
    
    # Get mobility metrics
    mob = grid.get_mobility_metrics()
    print(f"Mobility: {mob['num_mobile_users']} mobile users, avg speed {mob['average_velocity_kmh']:.1f} km/h")
    
    # Calculate coverage
    metrics = grid.calculate_grid_metrics(tx_power_dbm=35.0, frequency_mhz=600.0, min_snr_db=15.0)
    print(f"\nInitial Coverage:")
    print(f"  Overall: {metrics['coverage_percent']:.1f}%")
    print(f"  Static:  {metrics['static_coverage_percent']:.1f}%")
    print(f"  Mobile:  {metrics['mobile_coverage_percent']:.1f}%")
    
    # Simulate 60 seconds of movement
    for t in range(60):
        grid.update_mobile_positions(dt_seconds=1.0)
        
    metrics_after = grid.calculate_grid_metrics(tx_power_dbm=35.0, frequency_mhz=600.0, min_snr_db=15.0)
    print(f"\nAfter 60 seconds of movement:")
    print(f"  Overall: {metrics_after['coverage_percent']:.1f}%")
    print(f"  Mobile:  {metrics_after['mobile_coverage_percent']:.1f}%")
    
    # Get mobile user positions
    mobile_pos = grid.get_mobile_user_positions()
    print(f"\nMobile user positions (first 3):")
    for pos in mobile_pos[:3]:
        print(f"  User {pos['id']}: ({pos['x_km']:.2f}, {pos['y_km']:.2f}) km @ {pos['velocity_kmh']:.0f} km/h")
