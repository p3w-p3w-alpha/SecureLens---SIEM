import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const SEVERITY_COLORS = {
  INFO: 'bg-gray-200 text-gray-700',
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const STATUS_COLORS = {
  NEW: 'bg-red-100 text-red-700',
  INVESTIGATING: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-700',
  FALSE_POSITIVE: 'bg-gray-200 text-gray-600',
};

export default function AlertDetailPage() {
  const { id } = useParams();
  const [alert, setAlert] = useState(null);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    api.get(`/api/v1/alerts/${id}`)
      .then((res) => setAlert(res.data))
      .catch(() => {});
  }, [id]);

  const updateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      await api.patch(`/api/v1/alerts/${id}/status`, { status: newStatus });
      setAlert((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setUpdating(false);
    }
  };

  const formatMetadata = (metadata) => {
    if (!metadata) return 'No metadata';
    try { return JSON.stringify(JSON.parse(metadata), null, 2); }
    catch { return metadata; }
  };

  if (!alert) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/alerts" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">← Back to Alerts</Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">{alert.ruleName}</h1>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${SEVERITY_COLORS[alert.severity]}`}>{alert.severity}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[alert.status]}`}>{alert.status}</span>
      </div>

      <div className="flex gap-2 mb-6">
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{alert.mitreTactic}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{alert.mitreTechnique}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{alert.ruleId}</span>
      </div>

      {/* Alert Info */}
      <div className="bg-white border border-gray-200 rounded p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Description</h2>
        <p className="text-sm whitespace-pre-wrap mb-4">{alert.description}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Source IP:</span> <span className="font-mono">{alert.sourceIp || '-'}</span></div>
          <div><span className="text-gray-500">User:</span> <span className="font-mono">{alert.userIdField || '-'}</span></div>
          <div><span className="text-gray-500">Created:</span> {new Date(alert.createdAt).toLocaleString()}</div>
          <div><span className="text-gray-500">Updated:</span> {new Date(alert.updatedAt).toLocaleString()}</div>
          {alert.resolvedBy && <div><span className="text-gray-500">Resolved by:</span> {alert.resolvedBy}</div>}
        </div>
      </div>

      {/* Status Update */}
      <div className="bg-white border border-gray-200 rounded p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Update Status</h2>
        <div className="flex gap-2">
          <button onClick={() => updateStatus('INVESTIGATING')} disabled={updating || alert.status === 'INVESTIGATING'}
            className="px-3 py-1.5 text-sm rounded border border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 disabled:opacity-40">
            Mark Investigating
          </button>
          <button onClick={() => updateStatus('RESOLVED')} disabled={updating || alert.status === 'RESOLVED'}
            className="px-3 py-1.5 text-sm rounded border border-green-300 bg-green-50 text-green-800 hover:bg-green-100 disabled:opacity-40">
            Resolve
          </button>
          <button onClick={() => updateStatus('FALSE_POSITIVE')} disabled={updating || alert.status === 'FALSE_POSITIVE'}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-40">
            Mark False Positive
          </button>
        </div>
      </div>

      {/* Evidence Logs */}
      <div className="bg-white border border-gray-200 rounded p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
          Evidence Logs ({alert.evidenceLogs?.length || 0})
        </h2>
        {alert.evidenceLogs && alert.evidenceLogs.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-1.5 font-medium">Timestamp</th>
                <th className="px-3 py-1.5 font-medium">Event Type</th>
                <th className="px-3 py-1.5 font-medium">Source IP</th>
                <th className="px-3 py-1.5 font-medium">Severity</th>
                <th className="px-3 py-1.5 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {alert.evidenceLogs.map((log) => (
                <tbody key={log.id}>
                  <tr onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <td className="px-3 py-1.5 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-3 py-1.5">{log.eventType}</td>
                    <td className="px-3 py-1.5 font-mono text-xs">{log.sourceIp}</td>
                    <td className="px-3 py-1.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${SEVERITY_COLORS[log.severity] || ''}`}>{log.severity}</span>
                    </td>
                    <td className="px-3 py-1.5 text-gray-600">{log.rawMessage?.substring(0, 60)}...</td>
                  </tr>
                  {expandedLogId === log.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="mb-2">
                          <span className="font-medium text-xs text-gray-500 uppercase">Full Message</span>
                          <p className="mt-1 text-sm whitespace-pre-wrap">{log.rawMessage}</p>
                        </div>
                        <div>
                          <span className="font-medium text-xs text-gray-500 uppercase">Metadata</span>
                          <pre className="mt-1 text-xs bg-white border border-gray-200 rounded p-2 overflow-x-auto">
                            {formatMetadata(log.metadata)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400 text-sm">No evidence logs available</p>
        )}
      </div>

      {/* AI Triage Placeholder */}
      <div className="bg-white border border-gray-200 rounded p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">AI Triage</h2>
        <p className="text-gray-400 text-sm mb-3">{alert.aiTriageResult || 'Not yet analyzed'}</p>
        <button disabled className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed">
          Run AI Triage
        </button>
      </div>
    </div>
  );
}
