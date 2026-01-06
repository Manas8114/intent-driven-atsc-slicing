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

function App() {
  const [activePage, setActivePage] = useState('overview');

  const renderPage = () => {
    switch (activePage) {
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
      default: return <Overview />;
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


