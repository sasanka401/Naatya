import { Users, Package, CalendarDays, CheckCircle, Clock, Calendar } from 'lucide-react';

const activities = [
  { dot: 'dot-primary', text: <><strong>Arjun Mehta</strong> was assigned the role of Director</>, time: '2 hours ago' },
  { dot: 'dot-success', text: <><strong>Wooden Throne</strong> added to inventory (Qty: 2)</>, time: '5 hours ago' },
  { dot: 'dot-warning', text: <>Rehearsal for <strong>Act III – The Banquet</strong> scheduled</>, time: 'Yesterday' },
  { dot: 'dot-info',    text: <><strong>Priya Sharma</strong> updated availability to Free</>, time: 'Yesterday' },
  { dot: 'dot-primary', text: <><strong>Vikram Singh</strong> joined as Stage Manager</>, time: '2 days ago' },
  { dot: 'dot-success', text: <><strong>Silk Curtain</strong> marked as Available</>, time: '3 days ago' },
];

const upcoming = [
  { day: '15', month: 'Jun', title: 'Act I – The Opening',  meta: '10:00 AM · Main Stage' },
  { day: '18', month: 'Jun', title: 'Act II – The Conflict', meta: '2:00 PM · Rehearsal Hall B' },
  { day: '22', month: 'Jun', title: 'Act III – The Banquet', meta: '11:00 AM · Main Stage' },
  { day: '25', month: 'Jun', title: 'Full Run-Through',      meta: '9:00 AM · Main Stage' },
];

export function Dashboard() {
  return (
    <div className="content-area">
      <div className="stats-grid mb-6">
        <div className="stat-card c-primary">
          <div className="stat-icon"><Users size={22} /></div>
          <div className="stat-value">24</div>
          <div className="stat-label">Total Members</div>
        </div>
        <div className="stat-card c-success">
          <div className="stat-icon"><Package size={22} /></div>
          <div className="stat-value">67</div>
          <div className="stat-label">Total Props</div>
        </div>
        <div className="stat-card c-warning">
          <div className="stat-icon"><CalendarDays size={22} /></div>
          <div className="stat-value">8</div>
          <div className="stat-label">Upcoming Rehearsals</div>
        </div>
        <div className="stat-card c-info">
          <div className="stat-icon"><CheckCircle size={22} /></div>
          <div className="stat-value">42</div>
          <div className="stat-label">Available Props</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <h5><Clock size={16} className="text-primary" /> Recent Activities</h5>
          </div>
          <div className="card-body">
            {activities.map((a, i) => (
              <div className="activity-item" key={i}>
                <div className={`activity-dot ${a.dot}`} />
                <div>
                  <div className="activity-text">{a.text}</div>
                  <div className="activity-time">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h5><Calendar size={16} className="text-accent" /> Upcoming Rehearsals</h5>
          </div>
          <div className="card-body">
            {upcoming.map((r, i) => (
              <div className="rehearsal-item" key={i}>
                <div className="rehearsal-date-badge">
                  <span className="day">{r.day}</span>
                  <span className="month">{r.month}</span>
                </div>
                <div className="rehearsal-info">
                  <div className="rehearsal-title">{r.title}</div>
                  <div className="rehearsal-meta">{r.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
