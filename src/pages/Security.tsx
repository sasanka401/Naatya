import { MousePointerClick, Scissors, Terminal, EyeOff, KeyRound, Database, ShieldCheck, Code } from 'lucide-react';

const features = [
  {
    icon: <MousePointerClick size={24} />,
    title: 'Right-Click Disabled',
    desc: 'Context menu is blocked across all pages to prevent users from accessing "Save As", "View Source", or "Inspect Element" through right-click actions.',
  },
  {
    icon: <Scissors size={24} />,
    title: 'Copy / Cut Blocked',
    desc: 'Clipboard operations (copy and cut) are intercepted and blocked to prevent unauthorized duplication of scripts, member details, and proprietary content.',
  },
  {
    icon: <Terminal size={24} />,
    title: 'Developer Tools Blocked',
    desc: 'Keyboard shortcuts for developer tools (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U) are intercepted and disabled to prevent code inspection.',
  },
  {
    icon: <EyeOff size={24} />,
    title: 'Blur on Tab Switch',
    desc: 'When the user switches to another browser tab, the application content is hidden, preventing visual data leakage via screenshots or observation.',
  },
  {
    icon: <KeyRound size={24} />,
    title: 'Authentication Required',
    desc: 'All dashboard pages require authentication. Unauthenticated users are redirected to the login page. Session management protects against unauthorized access.',
  },
  {
    icon: <Database size={24} />,
    title: 'Input Sanitization',
    desc: 'All user inputs are sanitized to prevent XSS (Cross-Site Scripting) attacks. Dynamic content insertion uses safe React rendering methods.',
  },
];

const tableData = [
  { feature: 'Right-Click Disabled',        method: 'contextmenu preventDefault()',   event: 'contextmenu' },
  { feature: 'Copy Blocked',                method: 'copy preventDefault()',           event: 'copy' },
  { feature: 'Cut Blocked',                 method: 'cut preventDefault()',            event: 'cut' },
  { feature: 'Dev Tools (F12)',             method: 'keydown preventDefault()',        event: 'keydown (F12)' },
  { feature: 'Dev Tools (Ctrl+Shift+I/J)', method: 'keydown preventDefault()',        event: 'keydown (combo)' },
  { feature: 'View Source (Ctrl+U)',        method: 'keydown preventDefault()',        event: 'keydown (combo)' },
  { feature: 'Tab Switch Blur',             method: 'visibilitychange listener',       event: 'visibilitychange' },
  { feature: 'XSS Prevention',             method: 'React JSX safe rendering',        event: 'All dynamic content' },
];

export function Security() {
  return (
    <div className="content-area">
      <div className="card mb-6">
        <div className="card-header">
          <h5><ShieldCheck size={16} className="text-primary" /> Security Features Overview</h5>
        </div>
        <div className="card-body">
          <p className="text-muted text-sm">
            NAATYA implements multiple client-side security measures to protect sensitive production data,
            scripts, and intellectual property. These features safeguard against unauthorized access,
            data theft, and content duplication.
          </p>
        </div>
      </div>

      <div className="security-grid mb-6">
        {features.map((f, i) => (
          <div className="sec-card" key={i}>
            <div className="sec-icon">{f.icon}</div>
            <h6>{f.title}</h6>
            <p>{f.desc}</p>
            <span className="sec-status">&#10003; Active</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h5><Code size={16} className="text-accent" /> Implementation Details</h5>
        </div>
        <div className="table-wrap">
          <table className="naatya-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Method</th>
                <th>Event / Trigger</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((r, i) => (
                <tr key={i}>
                  <td className="font-semibold">{r.feature}</td>
                  <td className="text-muted text-sm">{r.method}</td>
                  <td className="text-sm">{r.event}</td>
                  <td><span className="badge badge-available">Enabled</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
