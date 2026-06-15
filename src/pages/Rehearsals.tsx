import { useState, useEffect } from 'react';
import {
  Pencil, Trash2, Plus, Search, CalendarDays, List, CalendarRange,
  ChevronLeft, ChevronRight, StickyNote, Download, Printer,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { NotesModal } from '../components/NotesModal';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { useProduction } from '../lib/production-context';
import { logActivity } from '../lib/activity';
import { exportToCsv } from '../lib/export';
import type { Rehearsal, Attendance, AttendanceStatus } from '../lib/types';

const blank = { title: '', rehearsal_date: '', rehearsal_time: '', venue: '' };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

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
  const { isDirector, user, profile } = useAuth();
  const { selectedId, isAll, productions } = useProduction();
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'table' | 'calendar'>('table');
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState<string | null>(null);
  const [notesFor, setNotesFor] = useState<Rehearsal | null>(null);

  useEffect(() => {
    load();
  }, [selectedId]);

  async function load() {
    setLoading(true);
    let query = supabase.from('rehearsals').select('*')
      .order('rehearsal_date', { ascending: true })
      .order('rehearsal_time', { ascending: true });
    if (!isAll) query = query.eq('production_id', selectedId);

    const [rehearsalRes, attendanceRes] = await Promise.all([
      query,
      supabase.from('rehearsal_attendance').select('*'),
    ]);

    if (rehearsalRes.error) showToast(`Failed to load rehearsals: ${rehearsalRes.error.message}`, 'danger');
    else setRehearsals(rehearsalRes.data as Rehearsal[]);

    if (!attendanceRes.error) setAttendance(attendanceRes.data as Attendance[]);
    setLoading(false);
  }

  const filtered = rehearsals.filter(r =>
    [r.title, formatDate(r.rehearsal_date), r.venue].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  function exportCsv() {
    exportToCsv('rehearsals.csv', filtered.map(r => ({
      Title: r.title, Date: r.rehearsal_date, Time: r.rehearsal_time, Venue: r.venue,
    })));
  }

  // ---- Attendance helpers ----
  function myRsvp(rehearsalId: string): AttendanceStatus | null {
    if (!profile) return null;
    return attendance.find(a => a.rehearsal_id === rehearsalId && a.profile_id === profile.id)?.status ?? null;
  }

  function counts(rehearsalId: string) {
    const list = attendance.filter(a => a.rehearsal_id === rehearsalId);
    return {
      yes: list.filter(a => a.status === 'Attending').length,
      no: list.filter(a => a.status === 'Not Attending').length,
      maybe: list.filter(a => a.status === 'Maybe').length,
    };
  }

  async function setRsvp(rehearsalId: string, status: AttendanceStatus) {
    if (!profile) return;
    const existing = attendance.find(a => a.rehearsal_id === rehearsalId && a.profile_id === profile.id);

    if (existing) {
      const { error } = await supabase.from('rehearsal_attendance').update({ status }).eq('id', existing.id);
      if (error) { showToast(`RSVP failed: ${error.message}`, 'danger'); return; }
      setAttendance(prev => prev.map(a => a.id === existing.id ? { ...a, status } : a));
    } else {
      const { data, error } = await supabase.from('rehearsal_attendance')
        .insert({ rehearsal_id: rehearsalId, profile_id: profile.id, status })
        .select().single();
      if (error) { showToast(`RSVP failed: ${error.message}`, 'danger'); return; }
      setAttendance(prev => [...prev, data as Attendance]);
    }
    showToast(`Marked "${status}".`, 'success');
  }

  function openAdd() { setForm(blank); setEditId(null); setModal(true); }
  function openEdit(r: Rehearsal) { setForm({ title: r.title, rehearsal_date: r.rehearsal_date, rehearsal_time: r.rehearsal_time, venue: r.venue }); setEditId(r.id); setModal(true); }

  async function save() {
    if (!form.title.trim() || !form.venue.trim() || !form.rehearsal_date || !form.rehearsal_time) {
      showToast('Please fill in all required fields.', 'warning'); return;
    }

    if (editId) {
      const { error } = await supabase.from('rehearsals').update(form).eq('id', editId);
      if (error) { showToast(`Update failed: ${error.message}`, 'danger'); return; }
      showToast('Rehearsal updated successfully!', 'success');
      logActivity(`${user?.email ?? 'Someone'} updated rehearsal "${form.title}"`);
    } else {
      const payload = { ...form, production_id: isAll ? (productions[0]?.id ?? null) : selectedId };
      const { error } = await supabase.from('rehearsals').insert(payload);
      if (error) { showToast(`Schedule failed: ${error.message}`, 'danger'); return; }
      showToast('Rehearsal scheduled successfully!', 'success');
      logActivity(`${user?.email ?? 'Someone'} scheduled "${form.title}" at ${form.venue}`);
    }
    setModal(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Cancel this rehearsal?')) return;
    const rehearsal = rehearsals.find(r => r.id === id);
    const { error } = await supabase.from('rehearsals').delete().eq('id', id);
    if (error) { showToast(`Delete failed: ${error.message}`, 'danger'); return; }
    showToast('Rehearsal cancelled.', 'success');
    logActivity(`${user?.email ?? 'Someone'} cancelled rehearsal "${rehearsal?.title ?? ''}"`);
    load();
  }

  // ---- Calendar building ----
  function buildCalendar() {
    const { y, m } = calMonth;
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }

  function eventsOn(day: number) {
    const { y, m } = calMonth;
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return rehearsals.filter(r => r.rehearsal_date === dateStr);
  }

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === calMonth.y && today.getMonth() === calMonth.m && today.getDate() === day;

  function prevMonth() { setCalMonth(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }); }
  function nextMonth() { setCalMonth(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }); }

  return (
    <div className="content-area">
      <div className="card">
        <div className="card-header">
          <h5><CalendarDays size={16} className="text-primary" /> Rehearsal Schedule</h5>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="view-toggle">
              <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><List size={14} /> Table</button>
              <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}><CalendarRange size={14} /> Calendar</button>
            </div>
            {view === 'table' && (
              <div className="search-wrap">
                <span className="search-icon"><Search size={14} /></span>
                <input placeholder="Search rehearsals..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            )}
            <button className="btn-ghost" onClick={exportCsv} title="Export CSV"><Download size={15} /> Export</button>
            <button className="btn-ghost" onClick={() => window.print()} title="Print"><Printer size={15} /> Print</button>
            {isDirector && (
              <button className="btn-primary" onClick={openAdd}><Plus size={15} /> Add Rehearsal</button>
            )}
          </div>
        </div>

        {view === 'table' && (
          <div className="table-wrap">
            <table className="naatya-table">
              <thead>
                <tr>
                  <th>#</th><th>Title</th><th>Date</th><th>Time</th><th>Venue</th><th>My RSVP</th><th>Going</th><th>Notes</th>{isDirector && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--naatya-text-muted)' }}>Loading...</td></tr>
                )}
                {!loading && filtered.map((r, i) => {
                  const mine = myRsvp(r.id);
                  const c = counts(r.id);
                  return (
                    <tr key={r.id}>
                      <td className="text-muted text-xs">{i + 1}</td>
                      <td className="font-semibold">{r.title}</td>
                      <td>{formatDate(r.rehearsal_date)}</td>
                      <td>{formatTime(r.rehearsal_time)}</td>
                      <td className="text-muted">{r.venue}</td>
                      <td>
                        <div className="rsvp-row">
                          <button className={`rsvp-btn${mine === 'Attending' ? ' active-yes' : ''}`} onClick={() => setRsvp(r.id, 'Attending')}>Yes</button>
                          <button className={`rsvp-btn${mine === 'Maybe' ? ' active-maybe' : ''}`} onClick={() => setRsvp(r.id, 'Maybe')}>Maybe</button>
                          <button className={`rsvp-btn${mine === 'Not Attending' ? ' active-no' : ''}`} onClick={() => setRsvp(r.id, 'Not Attending')}>No</button>
                        </div>
                      </td>
                      <td className="text-muted text-xs">✅ {c.yes} · ❓ {c.maybe} · ❌ {c.no}</td>
                      <td>
                        <button className="btn-action btn-edit" onClick={() => setNotesFor(r)} title="Notes"><StickyNote size={13} /></button>
                      </td>
                      {isDirector && (
                      <td>
                        <div className="flex gap-2">
                          <button className="btn-action btn-edit" onClick={() => openEdit(r)} title="Edit"><Pencil size={13} /></button>
                          <button className="btn-action btn-del"  onClick={() => remove(r.id)}  title="Delete"><Trash2 size={13} /></button>
                        </div>
                      </td>
                      )}
                    </tr>
                  );
                })}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--naatya-text-muted)' }}>No rehearsals found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {view === 'calendar' && (
          <div className="card-body">
            <div className="calendar-header">
              <button className="calendar-nav-btn" onClick={prevMonth}><ChevronLeft size={16} /></button>
              <h4>{MONTHS[calMonth.m]} {calMonth.y}</h4>
              <button className="calendar-nav-btn" onClick={nextMonth}><ChevronRight size={16} /></button>
            </div>
            <div className="calendar-grid">
              {DOW.map(d => <div className="calendar-dow" key={d}>{d}</div>)}
              {buildCalendar().map((day, i) => (
                <div key={i} className={`calendar-cell${day === null ? ' empty' : ''}${day !== null && isToday(day) ? ' today' : ''}`}>
                  {day !== null && (
                    <>
                      <div className="calendar-daynum">{day}</div>
                      {eventsOn(day).map(e => (
                        <div className="calendar-event" key={e.id} title={`${e.title} · ${formatTime(e.rehearsal_time)} · ${e.venue}`}>
                          {formatTime(e.rehearsal_time)} {e.title}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modal && isDirector && (
        <Modal title={editId ? 'Edit Rehearsal' : 'Schedule New Rehearsal'} onClose={() => setModal(false)} onSave={save} saveLabel="Save Rehearsal">
          <div className="form-group">
            <label className="form-label">Rehearsal Title</label>
            <input className="form-input" placeholder="Enter title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={form.rehearsal_date} onChange={e => setForm(f => ({ ...f, rehearsal_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Time</label>
            <input type="time" className="form-input" value={form.rehearsal_time} onChange={e => setForm(f => ({ ...f, rehearsal_time: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Venue</label>
            <input className="form-input" placeholder="e.g. Main Stage, Rehearsal Hall B" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} />
          </div>
        </Modal>
      )}

      {notesFor && (
        <NotesModal
          entityType="rehearsal"
          entityId={notesFor.id}
          entityLabel={notesFor.title}
          onClose={() => setNotesFor(null)}
        />
      )}
    </div>
  );
}
