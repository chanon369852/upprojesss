import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  RefreshCw, 
  Trash2, 
  Play, 
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { 
  getWebhookEvents, 
  replayWebhookEvent, 
  deleteWebhookEvent 
} from '../services/api';
import { WebhookEvent } from '../types/api';

// FLOW START: Webhook Events Page (EN)
// จุดเริ่มต้น: หน้า Webhook Events (TH)

const WebhookEvents: React.FC = () => {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    platform: '',
    type: '',
    limit: 50,
    offset: 0
  });

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getWebhookEvents(filters);
      setEvents(response.events);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load webhook events');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleReplay = async (eventId: string) => {
    try {
      await replayWebhookEvent(eventId);
      loadEvents(); // Reload to show updated status
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to replay event');
    }
  };

  const handleDelete = async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this webhook event?')) {
      try {
        await deleteWebhookEvent(eventId);
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      } catch (error: any) {
        setError(error.response?.data?.message || 'Failed to delete event');
      }
    }
  };

  const getPlatformColor = (platform: string) => {
    const colors = {
      facebook: 'bg-blue-100 text-blue-800',
      googleads: 'bg-green-100 text-green-800',
      line: 'bg-green-100 text-green-800',
      tiktok: 'bg-black text-white',
      shopee: 'bg-orange-100 text-orange-800'
    };
    return colors[platform as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (platform: string) => {
    // This could be expanded to show actual processing status
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading webhook events...</span>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#fdf6f0] p-6 lg:p-10 text-gray-800"
      style={
        {
          ['--theme-background' as any]: '#ffffff',
          ['--theme-surface' as any]: '#ffffff',
          ['--surface-muted' as any]: '#fff7ed',
          ['--theme-text' as any]: '#1f232c',
          ['--theme-muted' as any]: '#6b7280',
          ['--theme-border' as any]: 'rgba(15, 23, 42, 0.08)',
          ['--accent-color' as any]: '#3b82f6',
        } as React.CSSProperties
      }
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Webhook Events</h2>
          <Button onClick={loadEvents} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filters.platform}
              onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Platforms</option>
              <option value="facebook">Facebook</option>
              <option value="googleads">Google Ads</option>
              <option value="line">LINE</option>
              <option value="tiktok">TikTok</option>
              <option value="shopee">Shopee</option>
            </select>
            
            <input
              type="text"
              placeholder="Event type"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <select
              value={filters.limit}
              onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
            
            <Button onClick={() => setFilters({ ...filters, offset: 0 })}>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No webhook events found</p>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(event.platform)}
                      <Badge className={getPlatformColor(event.platform)}>
                        {event.platform}
                      </Badge>
                      <Badge variant="outline">{event.type}</Badge>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatDate(event.receivedAt)}
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <h4 className="font-medium mb-1">Event Data:</h4>
                      <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-auto max-h-32">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </div>
                    
                    {event.signature && (
                      <div className="mt-2">
                        <h4 className="font-medium mb-1">Signature:</h4>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {event.signature}
                        </code>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReplay(event.id)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Replay
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(event.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      </div>
    </div>
  );
};

// FLOW END: Webhook Events Page (EN)
// จุดสิ้นสุด: หน้า Webhook Events (TH)

export default WebhookEvents;
