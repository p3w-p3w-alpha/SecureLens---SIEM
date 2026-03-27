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
  const [intelResult, setIntelResult] = useState(null);
  const [enriching, setEnriching] = useState(false);
  const [triage, setTriage] = useState(null);
  const [triaging, setTriaging] = useState(false);

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

      {/* Threat Intel Enrichment */}
      <div className="bg-white border border-gray-200 rounded p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Threat Intelligence</h2>
        {!intelResult && (
          <button
            onClick={async () => {
              setEnriching(true);
              try {
                const res = await api.post(`/api/v1/intel/enrich-alert/${id}`);
                setIntelResult(res.data);
              } catch (err) { console.error(err); }
              finally { setEnriching(false); }
            }}
            disabled={enriching || !alert.sourceIp}
            className="px-3 py-1.5 text-sm rounded border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 disabled:opacity-40"
          >
            {enriching ? 'Enriching...' : !alert.sourceIp ? 'No source IP to enrich' : 'Enrich with Threat Intel'}
          </button>
        )}
        {intelResult && (
          <div>
            <div className={`inline-block rounded px-3 py-1 mb-3 ${intelResult.overallRiskScore <= 30 ? 'bg-green-100 text-green-700' : intelResult.overallRiskScore <= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
              Overall Risk: <span className="font-bold">{intelResult.overallRiskScore}/100</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {intelResult.providers.map((p, i) => (
                <div key={i} className="border border-gray-100 rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{p.provider}</span>
                    {!p.available && <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Unavailable</span>}
                  </div>
                  {p.available ? (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                        <div className={`h-1.5 rounded-full ${p.riskScore <= 30 ? 'bg-green-500' : p.riskScore <= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${p.riskScore}%` }} />
                      </div>
                      <p className="text-xs text-gray-600">{p.summary}</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">{p.summary}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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

      {/* AI Triage */}
      <div className="bg-white border border-gray-200 rounded p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">AI Triage (Mistral)</h2>

        {!triage && !alert.aiTriageResult && !triaging && (
          <div>
            <p className="text-gray-400 text-sm mb-3">Not yet analyzed</p>
            <button
              onClick={async () => {
                setTriaging(true);
                try {
                  const res = await api.post(`/api/v1/alerts/${id}/triage`);
                  setTriage(res.data);
                } catch (err) { console.error(err); }
                finally { setTriaging(false); }
              }}
              className="px-3 py-1.5 text-sm rounded border border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100"
            >
              Run AI Triage
            </button>
          </div>
        )}

        {triaging && (
          <div className="text-center py-4">
            <p className="text-purple-600 text-sm">Analyzing alert with Mistral AI...</p>
          </div>
        )}

        {(triage || alert.aiTriageResult) && !triaging && (() => {
          let data = triage;
          if (!data && alert.aiTriageResult) {
            try { data = JSON.parse(alert.aiTriageResult); } catch { data = null; }
          }
          if (!data) return <p className="text-gray-400 text-sm">{alert.aiTriageResult}</p>;

          const fpColor = { LOW: 'bg-green-100 text-green-700', MEDIUM: 'bg-yellow-100 text-yellow-800', HIGH: 'bg-red-100 text-red-700' };

          return (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Severity Assessment</span>
                <p className="text-sm mt-1">{data.severityAssessment}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Attack Context</span>
                <p className="text-sm mt-1">{data.attackContext}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Recommended Actions</span>
                <ol className="list-decimal list-inside text-sm mt-1 space-y-1">
                  {(data.recommendedActions || []).map((a, i) => <li key={i}>{a}</li>)}
                </ol>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">False Positive Likelihood: </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${fpColor[data.falsePositiveLikelihood] || 'bg-gray-200 text-gray-600'}`}>
                  {data.falsePositiveLikelihood}
                </span>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Reasoning</span>
                <p className="text-sm mt-1">{data.reasoning}</p>
              </div>
              {data.relatedIndicators && data.relatedIndicators.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Related Indicators</span>
                  <ul className="list-disc list-inside text-sm mt-1">
                    {data.relatedIndicators.map((ind, i) => <li key={i} className="font-mono text-xs">{ind}</li>)}
                  </ul>
                </div>
              )}
              <button
                onClick={async () => {
                  setTriaging(true); setTriage(null);
                  try {
                    const res = await api.post(`/api/v1/alerts/${id}/triage`);
                    setTriage(res.data);
                  } catch (err) { console.error(err); }
                  finally { setTriaging(false); }
                }}
                className="px-3 py-1.5 text-sm rounded border border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100"
              >
                Re-triage
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
