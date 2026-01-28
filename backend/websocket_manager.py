"""
WebSocket Manager for Real-Time Updates

Enables real-time communication between the AI-Native Broadcast Intelligence Platform
and connected frontend clients. Broadcasts system state changes, AI decisions,
and alert notifications instantly.
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Set, Dict, Any
import asyncio
import json
from datetime import datetime


class ConnectionManager:
    """Manages WebSocket connections for real-time broadcasts."""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        print(f"🔗 WebSocket connected. Total connections: {len(self.active_connections)}")
    
    async def disconnect(self, websocket: WebSocket):
        """Remove a disconnected WebSocket."""
        async with self._lock:
            self.active_connections.discard(websocket)
        print(f"🔌 WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: Dict[str, Any]):
        """
        Broadcast a message to all connected clients.
        
        Args:
            message: Dictionary containing:
                - type: Event type (e.g., 'state_update', 'alert', 'decision')
                - data: Event-specific payload
        """
        if not self.active_connections:
            return
            
        message["timestamp"] = datetime.utcnow().isoformat()
        payload = json.dumps(message)
        
        # Send to all connections, removing any that fail
        disconnected = set()
        async with self._lock:
            for connection in self.active_connections:
                try:
                    await connection.send_text(payload)
                except Exception:
                    disconnected.add(connection)
            
            # Clean up failed connections
            self.active_connections -= disconnected
    
    async def send_personal(self, websocket: WebSocket, message: Dict[str, Any]):
        """Send a message to a specific client."""
        message["timestamp"] = datetime.utcnow().isoformat()
        await websocket.send_text(json.dumps(message))
    
    @property
    def connection_count(self) -> int:
        """Get current number of active connections."""
        return len(self.active_connections)


# Global connection manager instance
manager = ConnectionManager()


# Helper functions for broadcasting specific event types
async def broadcast_state_update(state: Dict[str, Any]):
    """Broadcast a system state update to all clients."""
    await manager.broadcast({
        "type": "state_update",
        "data": state
    })


async def broadcast_ai_decision(decision_id: str, intent: str, action: Dict[str, Any], explanation: str, learning_contribution: str = "", focus_region: str = None, metrics: Dict[str, Any] = None):
    """Broadcast an AI decision event."""
    data = {
        "decision_id": decision_id,
        "intent": intent,
        "action": action,
        "explanation": explanation,
        "learning_contribution": learning_contribution,
        "focus_region": focus_region
    }
    
    if metrics:
        data["metrics"] = metrics

    await manager.broadcast({
        "type": "ai_decision",
        "data": data
    })


async def broadcast_alert(alert_type: str, severity: str, message: str, details: Dict[str, Any] = None):
    """Broadcast an alert/notification."""
    await manager.broadcast({
        "type": "alert",
        "data": {
            "alert_type": alert_type,
            "severity": severity,
            "message": message,
            "details": details or {}
        }
    })


async def broadcast_kpi_update(kpis: Dict[str, float]):
    """Broadcast KPI metrics update."""
    await manager.broadcast({
        "type": "kpi_update",
        "data": kpis
    })


async def broadcast_hurdle_event(hurdle: str, response: Dict[str, Any]):
    """Broadcast when a hurdle is injected and the AI responds."""
    await manager.broadcast({
        "type": "hurdle_response",
        "data": {
            "hurdle": hurdle,
            "ai_response": response
        }
    })
