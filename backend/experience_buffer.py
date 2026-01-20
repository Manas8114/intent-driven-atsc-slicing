"""
experience_buffer.py - Training Experience Storage for Continuous Learning

This module provides:
- Persistent storage of RL training experiences (state, action, reward, next_state)
- Export to JSON/pickle for offline retraining
- Experience replay buffer management

Used by the LearningLoopTracker to prove "continuous learning" capability.
"""

import json
import pickle
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# Storage paths
DATA_DIR = Path(__file__).parent / "training_data"
EXPERIENCES_JSON = DATA_DIR / "experiences.json"
REPLAY_BUFFER_PKL = DATA_DIR / "replay_buffer.pkl"


# ============================================================================
# Data Models
# ============================================================================

@dataclass
class Experience:
    """Single training experience tuple."""
    timestamp: float
    state: List[float]          # [coverage, snr, weights, congestion, mobility]
    action: List[float]         # [delta_emerg, delta_cov, offload_ratio]
    reward: float
    next_state: List[float]
    done: bool
    info: Dict[str, Any]        # Additional metadata


class ExperienceRecord(BaseModel):
    """API model for experience storage."""
    state: List[float]
    action: List[float]
    reward: float
    next_state: List[float]
    done: bool = False
    info: Dict[str, Any] = {}


class BufferStats(BaseModel):
    """Statistics about the experience buffer."""
    total_experiences: int
    buffer_size_mb: float
    oldest_timestamp: Optional[float]
    newest_timestamp: Optional[float]
    avg_reward: float
    total_episodes: int


# ============================================================================
# Experience Buffer Manager
# ============================================================================

class ExperienceBuffer:
    """
    Persistent experience buffer for offline RL training.
    
    Stores (state, action, reward, next_state, done) tuples to disk
    for later retraining of the PPO model.
    """
    
    def __init__(self, max_size: int = 100000):
        self.max_size = max_size
        self.buffer: List[Experience] = []
        self._ensure_data_dir()
        self._load_from_disk()
    
    def _ensure_data_dir(self) -> None:
        """Ensure training data directory exists."""
        DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    def _load_from_disk(self) -> None:
        """Load existing experiences from disk."""
        if EXPERIENCES_JSON.exists():
            try:
                with open(EXPERIENCES_JSON, 'r') as f:
                    data = json.load(f)
                    self.buffer = [
                        Experience(**exp) for exp in data.get('experiences', [])
                    ]
            except (json.JSONDecodeError, KeyError):
                self.buffer = []
    
    def add(
        self,
        state: List[float],
        action: List[float],
        reward: float,
        next_state: List[float],
        done: bool = False,
        info: Optional[Dict[str, Any]] = None
    ) -> None:
        """Add a new experience to the buffer."""
        exp = Experience(
            timestamp=time.time(),
            state=state,
            action=action,
            reward=reward,
            next_state=next_state,
            done=done,
            info=info or {}
        )
        self.buffer.append(exp)
        
        # Trim if over max size (FIFO)
        if len(self.buffer) > self.max_size:
            self.buffer = self.buffer[-self.max_size:]
        
        # Auto-save every 100 experiences
        if len(self.buffer) % 100 == 0:
            self.save_to_disk()
    
    def save_to_disk(self) -> None:
        """Save all experiences to JSON file."""
        self._ensure_data_dir()
        data = {
            'version': '1.0',
            'saved_at': time.time(),
            'count': len(self.buffer),
            'experiences': [asdict(exp) for exp in self.buffer]
        }
        with open(EXPERIENCES_JSON, 'w') as f:
            json.dump(data, f, indent=2)
    
    def export_replay_buffer(self) -> Path:
        """Export buffer as pickle for direct use in training."""
        self._ensure_data_dir()
        
        # Convert to format expected by stable-baselines3
        replay_data = {
            'observations': [exp.state for exp in self.buffer],
            'actions': [exp.action for exp in self.buffer],
            'rewards': [exp.reward for exp in self.buffer],
            'next_observations': [exp.next_state for exp in self.buffer],
            'dones': [exp.done for exp in self.buffer],
        }
        
        with open(REPLAY_BUFFER_PKL, 'wb') as f:
            pickle.dump(replay_data, f)
        
        return REPLAY_BUFFER_PKL
    
    def get_stats(self) -> Dict[str, Any]:
        """Get buffer statistics."""
        if not self.buffer:
            return {
                'total_experiences': 0,
                'buffer_size_mb': 0.0,
                'oldest_timestamp': None,
                'newest_timestamp': None,
                'avg_reward': 0.0,
                'total_episodes': 0
            }
        
        rewards = [exp.reward for exp in self.buffer]
        episodes = sum(1 for exp in self.buffer if exp.done)
        
        return {
            'total_experiences': len(self.buffer),
            'buffer_size_mb': EXPERIENCES_JSON.stat().st_size / (1024 * 1024) if EXPERIENCES_JSON.exists() else 0.0,
            'oldest_timestamp': self.buffer[0].timestamp,
            'newest_timestamp': self.buffer[-1].timestamp,
            'avg_reward': sum(rewards) / len(rewards),
            'total_episodes': episodes
        }
    
    def get_recent(self, n: int = 100) -> List[Dict[str, Any]]:
        """Get n most recent experiences."""
        return [asdict(exp) for exp in self.buffer[-n:]]
    
    def clear(self) -> None:
        """Clear all experiences (use with caution)."""
        self.buffer = []
        if EXPERIENCES_JSON.exists():
            EXPERIENCES_JSON.unlink()
        if REPLAY_BUFFER_PKL.exists():
            REPLAY_BUFFER_PKL.unlink()


# Global buffer instance
_buffer: Optional[ExperienceBuffer] = None


def get_buffer() -> ExperienceBuffer:
    """Get or create the global experience buffer."""
    global _buffer
    if _buffer is None:
        _buffer = ExperienceBuffer()
    return _buffer


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/record")
async def record_experience(exp: ExperienceRecord) -> Dict[str, str]:
    """Record a new training experience."""
    buffer = get_buffer()
    buffer.add(
        state=exp.state,
        action=exp.action,
        reward=exp.reward,
        next_state=exp.next_state,
        done=exp.done,
        info=exp.info
    )
    return {"status": "recorded", "total": len(buffer.buffer)}


@router.get("/stats", response_model=BufferStats)
async def get_buffer_stats() -> Dict[str, Any]:
    """Get experience buffer statistics."""
    buffer = get_buffer()
    return buffer.get_stats()


@router.get("/recent")
async def get_recent_experiences(n: int = 100) -> List[Dict[str, Any]]:
    """Get n most recent experiences."""
    buffer = get_buffer()
    return buffer.get_recent(n)


@router.post("/save")
async def save_experiences() -> Dict[str, str]:
    """Force save all experiences to disk."""
    buffer = get_buffer()
    buffer.save_to_disk()
    return {"status": "saved", "path": str(EXPERIENCES_JSON)}


@router.post("/export")
async def export_replay_buffer() -> Dict[str, str]:
    """Export experiences as pickle for training."""
    buffer = get_buffer()
    path = buffer.export_replay_buffer()
    return {"status": "exported", "path": str(path)}


@router.delete("/clear")
async def clear_buffer() -> Dict[str, str]:
    """Clear all experiences (dangerous!)."""
    buffer = get_buffer()
    buffer.clear()
    return {"status": "cleared"}
