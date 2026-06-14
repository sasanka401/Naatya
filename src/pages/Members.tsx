import { useState } from 'react';
import { Pencil, Trash2, Plus, Search, Users } from 'lucide-react';
import { Modal } from '../components/Modal';
import { showToast } from '../components/Toast';

type Status = 'Free' | 'Busy' | 'On Leave';

interface Member {
  id: string;
  name: string;
  role: string;
  phone: string;
  status: Status;
}

const initial: Member[] = [
  { id: 'M1', name: 'Arjun Mehta',    role: 'Director',            phone: '+91 98765 43210', status: 'Free' },
  { id: 'M2', name: 'Priya Sharma',   role: 'Lead Actress',         phone: '+91 87654 32109', status: 'Free' },
  { id: 'M3', name: 'Vikram Singh',   role: 'Stage Manager',        phone: '+91 76543 21098', status: 'Busy' },
  { id: 'M4', name: 'Neha Gupta',     role: 'Costume Designer',     phone: '+91 65432 10987', status: 'Free' },
  { id: 'M5', name: 'Rahul Joshi',    role: 'Lighting Technician',  phone: '+91 54321 09876', status: 'On Leave' },
  { id: 'M6', name: 'Ananya Reddy',   role: 'Supporting Actress',   phone: '+91 43210 98765', status: 'Free' },
  { id: 'M7', name: 'Karan Patel',    role: 'Sound Engineer',       phone: '+91 32109 87654', status: 'Busy' },
  { id: 'M8', name: 'Deepika Nair',   role: 'Makeup Artist',        phone: '+91 21098 76543', status: 'Free' },
];

const statusClass: Record<Status, string> = {
  Free: 'badge-free',
  Busy: 'badge-busy',
  'On Leave': 'badge-on-leave',
};

const blank: Omit<Member, 'id'> = { name: '', role: '', phone: '', status: 'Free' };

export function Members() {
  const [members, setMembers] = useState<Member[]>(initial);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Omit<Member, 'id'>>(blank);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = members.filter(m =>
    [m.name, m.role, m.phone, m.status].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  function openAdd() { setForm(blank); setEditId(null); setModal(true); }
  function openEdit(m: Member) { setForm({ name: m.name, role: m.role, phone: m.phone, status: m.status }); setEditId(m.id); setModal(true); }

  function save() {
    if (!form.name.trim() || !form.role.trim() || !form.phone.trim()) {
      showToast('Please fill in all required fields.', 'warning'); return;
    }
    if (editId) {
      setMembers(prev => prev.map(m => m.id === editId ? { ...m, ...form } : m));
      showToast('Member updated successfully!', 'success');
    } else {
      setMembers(prev => [...prev, { id: `M${Date.now()}`, ...form }]);
      showToast('Member added successfully!', 'success');
    }
    setModal(false);
  }

  function remove(id: string) {
    if (!confirm('Remove this member?')) return;
    setMembers(prev => prev.filter(m => m.id !== id));
    showToast('Member removed.', 'success');
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
            <button className="btn-primary" onClick={openAdd}><Plus size={15} /> Add Member</button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="naatya-table">
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Role</th><th>Phone</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id}>
                  <td className="text-muted text-xs">{i + 1}</td>
                  <td className="font-semibold">{m.name}</td>
                  <td className="text-muted">{m.role}</td>
                  <td>{m.phone}</td>
                  <td><span className={`badge ${statusClass[m.status]}`}>{m.status}</span></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-action btn-edit" onClick={() => openEdit(m)} title="Edit"><Pencil size={13} /></button>
                      <button className="btn-action btn-del"  onClick={() => remove(m.id)} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--naatya-text-muted)' }}>No members found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
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
            <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}>
              <option>Free</option>
              <option>Busy</option>
              <option>On Leave</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
