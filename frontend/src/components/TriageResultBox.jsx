import { AlertTriangle, CheckCircle, Info, Zap } from 'lucide-react';

const ICONS = { EMERGENCY: AlertTriangle, HIGH: AlertTriangle, MEDIUM: Info, LOW: CheckCircle };
const COLORS = { EMERGENCY:'#ef4444', HIGH:'#f59e0b', MEDIUM:'#3b82f6', LOW:'#10b981' };
const LABELS = { EMERGENCY:'EMERGENCY — Immediate Care Required', HIGH:'HIGH Priority', MEDIUM:'MEDIUM Priority', LOW:'LOW Priority' };

export default function TriageResultBox({ triage }) {
  if (!triage) return null;
  const sev = triage.severity || triage.level || 'LOW';
  const Icon = ICONS[sev] || Info;
  const color = COLORS[sev];

  return (
    <div className={`triage-box triage-${sev}`}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
        <Icon size={20} color={color}/>
        <span style={{ fontWeight:700, color, fontSize:'15px' }}>{LABELS[sev]}</span>
        <span style={{ marginLeft:'auto', fontSize:'11px', color:'#6b7280' }}>Confidence: {triage.confidence}%</span>
      </div>
      {triage.detected_symptoms?.length > 0 && (
        <div style={{ marginBottom:'8px' }}>
          <span style={{ fontSize:'11px', fontWeight:600, color:'#6b7280' }}>DETECTED: </span>
          {triage.detected_symptoms.map((s,i) => (
            <span key={i} style={{ background:color+'22', color, padding:'2px 8px', borderRadius:'12px', fontSize:'11px', fontWeight:600, marginRight:'4px' }}>{s}</span>
          ))}
        </div>
      )}
      <div style={{ fontSize:'13px', fontWeight:600, color:'#374151' }}>
        <Zap size={13} style={{ display:'inline', marginRight:'4px', color }}/>
        {triage.recommended_action || triage.action}
      </div>
      {triage.additional_advice && (
        <div style={{ fontSize:'12px', color:'#6b7280', marginTop:'6px', fontStyle:'italic' }}>{triage.additional_advice}</div>
      )}
      {sev === 'EMERGENCY' && (
        <div style={{ marginTop:'10px', padding:'10px', background:'#fff', borderRadius:'8px', border:'1px solid #fecaca', fontSize:'12px', fontWeight:700, color:'#991b1b', textAlign:'center' }}>
          EMERGENCY DETECTED — Proceed to Emergency Room IMMEDIATELY or call emergency services
        </div>
      )}
    </div>
  );
}
