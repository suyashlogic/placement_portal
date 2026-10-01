import { useState, useEffect } from 'react';
import api from './services/api';
import StatusCard from './components/StatusCard';

function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await api.get('/health');
        setHealth(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Cannot reach the API server');
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, []);

  return (
    <div className="container py-5">
      <h1 className="mb-1">
        <i className="bi bi-mortarboard-fill text-primary me-2"></i>
        Placement Cell Portal
      </h1>
      <p className="text-muted mb-4">Phase 1: connection check</p>

      {loading && (
        <div className="d-flex align-items-center">
          <div className="spinner-border spinner-border-sm me-2" role="status"></div>
          Checking connection...
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {health && (
        <div className="row g-3">
          <StatusCard label="API" value={health.api} ok={health.api === 'running'} />
          <StatusCard label="Database" value={health.database} ok={health.database === 'connected'} />
        </div>
      )}
    </div>
  );
}

export default App;