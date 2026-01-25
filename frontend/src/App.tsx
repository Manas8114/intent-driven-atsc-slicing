import { useState } from 'react';
import { Layout } from './components/Layout';
import { Overview } from './pages/Overview';
import { IntentControl } from './pages/IntentControl';
import { Explainability } from './pages/Explainability';
import { PLPVisualization } from './pages/PLPVisualization';
import { KPIDashboard } from './pages/KPIDashboard';
import { EmergencyMode } from './pages/EmergencyMode';
import { BroadcastReadiness } from './pages/BroadcastReadiness';
import { CapabilitiesLimits } from './pages/CapabilitiesLimits';
import { BroadcastTelemetry } from './pages/BroadcastTelemetry';
import { ApprovalPanel } from './components/ApprovalPanel';
import { SystemProvider } from './context/SystemContext';
// AI Intelligence Layer (Cognitive Broadcasting)
import { CognitiveBrain } from './pages/CognitiveBrain';
import { KnowledgeMap } from './pages/KnowledgeMap';
import { LearningTimeline } from './pages/LearningTimeline';
import { BootstrapUncertainty } from './pages/BootstrapUncertainty';
import { CellTowerData } from './pages/CellTowerData';
// Real Broadcast Data Integration
import { BroadcastCoverage } from './pages/BroadcastCoverage';
// New Competition Features
import { TrainingData } from './pages/TrainingData';
import { Architecture } from './pages/Architecture';
import { Benchmarks } from './pages/Benchmarks';
import { BLEDemo } from './pages/BLEDemo';

function App() {
  const [activePage, setActivePage] = useState('cognitive');

  const renderPage = () => {
    switch (activePage) {
      // AI Intelligence (Cognitive Broadcasting)
      case 'cognitive': return <CognitiveBrain />;
      case 'knowledge': return <KnowledgeMap />;
      case 'learning': return <LearningTimeline />;
      case 'bootstrap': return <BootstrapUncertainty />;
      case 'celltowers': return <CellTowerData />;
      case 'coverage': return <BroadcastCoverage />;
      // New Competition Features
      case 'training': return <TrainingData />;
      case 'architecture': return <Architecture />;
      case 'benchmarks': return <Benchmarks />;
      case 'ble': return <BLEDemo />;
      // Core Operations  
      case 'overview': return <Overview />;
      case 'intent': return <IntentControl />;
      case 'explainability': return <Explainability />;
      case 'plp': return <PLPVisualization />;
      case 'kpi': return <KPIDashboard />;
      case 'emergency': return <EmergencyMode />;
      case 'approval': return <ApprovalPanel />;
      case 'readiness': return <BroadcastReadiness />;
      case 'capabilities': return <CapabilitiesLimits />;
      case 'telemetry': return <BroadcastTelemetry />;
      default: return <CognitiveBrain />;
    }
  };

  return (
    <SystemProvider>
      <Layout activePage={activePage} onNavigate={setActivePage}>
        {renderPage()}
      </Layout>
    </SystemProvider>
  );
}

export default App;

