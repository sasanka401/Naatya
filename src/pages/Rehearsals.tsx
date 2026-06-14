import { useState } from 'react';
import { Pencil, Trash2, Plus, Search, CalendarDays } from 'lucide-react';
import { Modal } from '../components/Modal';
import { showToast } from '../components/Toast';

interface Rehearsal {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
}

const initial: Rehearsal[] = [
  { id: 'R1', title: 'Act I – The Opening',       date: '15 Jun 2026', time: '10:00 AM', venue: 'Main Stage' },
  { id: 'R2', title: 'Act II – The Conflict',      date: '18 Jun 2026', time: '2:00 PM',  venue: 'Rehearsal Hall B' },
  { id: 'R3', title: 'Act III – The Banquet',      date: '22 Jun 2026', time: '11:00 AM', venue: 'Main Stage' },
  { id: 'R4', title: 'Dance Sequence Practice',    date: '24 Jun 2026', time: '9:00 AM',  venue: 'Dance Studio' },
  { id: 'R5', title: 'Full Run-Through',           date: '25 Jun 2026', time: '9:00 AM',  venue: 'Main Stage' },
  { id: 'R6', title: 'Costume Fitting Session',    date: '27 Jun 2026', time: '3:00 PM',  venue: 'Costume Room' },
  { id: 'R7', title: 'Sound & Lighting Check',     date: '28 Jun 2026', time: '4:00 PM',  venue: 'Main Stage' },
  { id: 'R8', title: 'Dress Rehearsal',            date: '30 Jun 2026', time: '10:00 AM', venue: 'Main Stage' },
];

const blank = { title: '', date: '', time: '', venue: '' };

function formatDate(d: string) {
  if (!d) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

function formatTime(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function Rehearsals() {
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>(initial);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = rehearsals.filter(r =>
    [r.title, r.date, r.venue].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  function openAdd() { setForm(blank); setEditId(null); setModal(true); }
  function openEdit(r: Rehearsal) { setForm({ title: r.title, date: '', time: '', venue: r.venue }); setEditId(r.id); setModal(true); }

  function save() {
    if (!form.title.trim() || !form.venue.trim()) {
      showToast('Please fill in all required fields.', 'warning'); return;
    }
    const date = form.date ? formatDate(form.date) : (editId ? rehearsals.find(r => r.id === editId)?.date || '' : '');
    const time = form.time ? formatTime(form.time) : (editId ? rehearsals.find(r => r.id === editId)?.time || '' : '');

    if (editId) {
      setRehearsals(prev => prev.map(r => r.id === editId ? { ...r, title: form.title, date, time, venue: form.venue } : r));
      showToast('Rehearsal updated successfully!', 'success');
    } else {
      if (!form.date || !form.time) { showToast('Please enter date and time.', 'warning'); return; }
      setRehearsals(prev => [...prev, { id: `R${Date.now()}`, title: form.title, date, time, venue: form.venue }]);
      showToast('Rehearsal scheduled successfully!', 'success');
    }
    setModal(false);
  }

  function remove(id: string) {
    if (!confirm('Cancel this rehearsal?')) return;
    setRehearsals(prev => prev.filter(r => r.id !== id));
    showToast('Rehearsal cancelled.', 'success');
  }

  return (
    <div className="content-area">
      <div className="card">
        <div className="card-header">
          <h5><CalendarDays size={16} className="text-primary" /> Rehearsal Schedule</h5>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="search-wrap">
              <span className="search-icon"><Search size={14} /></span>
              <input placeholder="Search rehearsals..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={openAdd}><Plus size={15} /> Add Rehearsal</button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="naatya-table">
            <thead>
              <tr>
                <th>#</th><th>Title</th><th>Date</th><th>Time</th><th>Venue</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id}>
                  <td className="text-muted text-xs">{i + 1}</td>
                  <td className="font-semibold">{r.title}</td>
                  <td>{r.date}</td>
                  <td>{r.time}</td>
                  <td className="text-muted">{r.venue}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-action btn-edit" onClick={() => openEdit(r)} title="Edit"><Pencil size={13} /></button>
                      <button className="btn-action btn-del"  onClick={() => remove(r.id)}  title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--naatya-text-muted)' }}>No rehearsals found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={editId ? 'Edit Rehearsal' : 'Schedule New Rehearsal'} onClose={() => setModal(false)} onSave={save} saveLabel="Save Rehearsal">
          <div className="form-group">
            <label className="form-label">Rehearsal Title</label>
            <input className="form-input" placeholder="Enter title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Time</label>
            <input type="time" className="form-input" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Venue</label>
            <input className="form-input" placeholder="e.g. Main Stage, Rehearsal Hall B" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} />
          </div>
        </Modal>
      )}
    </div>
  );
}
