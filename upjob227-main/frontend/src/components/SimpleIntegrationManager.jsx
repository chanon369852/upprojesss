import React, { useState, useEffect } from 'react';

const SimpleIntegrationManager = () => {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/v1/integrations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const result = await response.json();
      setIntegrations(result.integrations || []);
    } catch (err) {
      setError('Failed to fetch integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (id) => {
    try {
      const response = await fetch(`/api/v1/integrations/${id}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        fetchIntegrations();
      }
    } catch (err) {
      setError('Failed to sync integration');
    }
  };

  const handleTest = async (id) => {
    try {
      const response = await fetch(`/api/v1/integrations/${id}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const result = await response.json();
      if (response.ok) {
        alert('Integration test successful');
      } else {
        alert('Integration test failed');
      }
    } catch (err) {
      setError('Failed to test integration');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Integration Manager</h1>
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Add Integration
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {integrations.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="text-gray-500 mb-4">
            No integrations configured
          </div>
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Add Your First Integration
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div key={integration.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">{integration.name}</h3>
                  <p className="text-sm text-gray-500">{integration.provider}</p>
                  <div className="flex items-center mt-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      integration.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {integration.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {integration.lastSyncAt && (
                      <span className="ml-4 text-xs text-gray-500">
                        Last sync: {new Date(integration.lastSyncAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                    onClick={() => handleTest(integration.id)}
                  >
                    Test
                  </button>
                  <button
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-400"
                    onClick={() => handleSync(integration.id)}
                    disabled={!integration.isActive}
                  >
                    Sync
                  </button>
                  <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                    Configure
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SimpleIntegrationManager;
