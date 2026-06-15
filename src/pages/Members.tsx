import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Search, Users, StickyNote, Download, Printer } from 'lucide-react';
import { Modal } from '../components/Modal';
import { NotesModal } from '../components/NotesModal';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { useProduction } from '../lib/production-context';
import { logActivity } from '../lib/activity';
import { exportToCsv } from '../lib/export';
import type { Member, MemberStatus } from '../lib/types';

const statusClass: Record<MemberStatus, string> = {
  Free: 'badge-free',
  Busy: 'badge-busy',
  'On Leave': 'badge-on-leave',
};

const blank: Omit<Member, 'id'> = { name: '', role: '', phone: '', status: 'Free' };

export function Members() {
  const { isDirector, user } = useAuth();
  const { selectedId, isAll, productions } = useProduction();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Omit<Member, 'id'>>(blank);
  const [editId, setEditId] = useState<string | null>(null);
  const [notesFor, setNotesFor] = useState<Member | null>(null);

  useEffect(() => {
    loadMembers();
  }, [selectedId]);

  async function loadMembers() {
    setLoading(true);
    let query = supabase.from('members').select('*').order('created_at', { ascending: true });
    if (!isAll) query = query.eq('production_id', selectedId);
    const { data, error } = await query;

    if (error) {
      showToast(`Failed to load members: ${error.message}`, 'danger');
    } else {
      setMembers(data as Member[]);
    }
    setLoading(false);
  }

  const filtered = members.filter(m =>
    [m.name, m.role, m.phone, m.status].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  function exportCsv() {
    exportToCsv('cast-and-crew.csv', filtered.map(m => ({
      Name: m.name, Role: m.role, Phone: m.phone, Status: m.status,
    })));
  }

  function openAdd() { setForm(blank); setEditId(null); setModal(true); }
  function openEdit(m: Member) { setForm({ name: m.name, role: m.role, phone: m.phone, status: m.status }); setEditId(m.id); setModal(true); }

  async function save() {
    if (!form.name.trim() || !form.role.trim() || !form.phone.trim()) {
      showToast('Please fill in all required fields.', 'warning'); return;
    }

    if (editId) {
      const { error } = await supabase.from('members').update(form).eq('id', editId);
      if (error) { showToast(`Update failed: ${error.message}`, 'danger'); return; }
      showToast('Member updated successfully!', 'success');
      logActivity(`${user?.email ?? 'Someone'} updated ${form.name}'s details`);
    } else {
      const payload = { ...form, production_id: isAll ? (productions[0]?.id ?? null) : selectedId };
      const { error } = await supabase.from('members').insert(payload);
      if (error) { showToast(`Add failed: ${error.message}`, 'danger'); return; }
      showToast('Member added successfully!', 'success');
      logActivity(`${user?.email ?? 'Someone'} added ${form.name} as ${form.role}`);
    }
    setModal(false);
    loadMembers();
  }

  async function remove(id: string) {
    if (!confirm('Remove this member?')) return;
    const member = members.find(m => m.id === id);
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) { showToast(`Delete failed: ${error.message}`, 'danger'); return; }
    showToast('Member removed.', 'success');
    logActivity(`${user?.email ?? 'Someone'} removed ${member?.name ?? 'a member'} from the cast & crew`);
    loadMembers();
  }

  return (
    <div className="content-area">
      <div className="card">
        <div className="card-header">
          <h5><Users size={16} className="text-primary" /> Cast &amp; Crew Members</h5>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="search-wrap">
              <span className="search-icon"><Search size={14} /></span>
              <input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn-ghost" onClick={exportCsv} title="Export CSV"><Download size={15} /> Export</button>
            <button className="btn-ghost" onClick={() => window.print()} title="Print"><Printer size={15} /> Print</button>
            {isDirector && (
              <button className="btn-primary" onClick={openAdd}><Plus size={15} /> Add Member</button>
            )}
          </div>
        </div>
        <div className="table-wrap">
          <table className="naatya-table">
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Role</th><th>Phone</th><th>Status</th><th>Notes</th>{isDirector && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--naatya-text-muted)' }}>Loading...</td></tr>
              )}
              {!loading && filtered.map((m, i) => (
                <tr key={m.id}>
                  <td className="text-muted text-xs">{i + 1}</td>
                  <td className="font-semibold">{m.name}</td>
                  <td className="text-muted">{m.role}</td>
                  <td>{m.phone}</td>
                  <td><span className={`badge ${statusClass[m.status]}`}>{m.status}</span></td>
                  <td>
                    <button className="btn-action btn-edit" onClick={() => setNotesFor(m)} title="Notes"><StickyNote size={13} /></button>
                  </td>
                  {isDirector && (
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-action btn-edit" onClick={() => openEdit(m)} title="Edit"><Pencil size={13} /></button>
                      <button className="btn-action btn-del"  onClick={() => remove(m.id)} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </td>
                  )}
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--naatya-text-muted)' }}>No members found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && isDirector && (
        <Modal title={editId ? 'Edit Member' : 'Add New Member'} onClose={() => setModal(false)} onSave={save} saveLabel="Save Member">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" placeholder="Enter full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <input className="form-input" placeholder="e.g. Director, Actor" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Availability Status</label>
            <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as MemberStatus }))}>
              <option>Free</option>
              <option>Busy</option>
              <option>On Leave</option>
            </select>
          </div>
        </Modal>
      )}

      {notesFor && (
        <NotesModal
          entityType="member"
          entityId={notesFor.id}
          entityLabel={notesFor.name}
          onClose={() => setNotesFor(null)}
        />
      )}
    </div>
  );
}
