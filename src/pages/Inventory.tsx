import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Search, Package, StickyNote, Download, Printer } from 'lucide-react';
import { Modal } from '../components/Modal';
import { NotesModal } from '../components/NotesModal';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { useProduction } from '../lib/production-context';
import { logActivity } from '../lib/activity';
import { exportToCsv } from '../lib/export';
import type { Prop, PropStatus } from '../lib/types';

const statusClass: Record<PropStatus, string> = {
  'Available': 'badge-available',
  'In Use':    'badge-in-use',
  'Damaged':   'badge-damaged',
};

const blank: Omit<Prop, 'id'> = { name: '', quantity: 1, status: 'Available', act_scene: '' };

export function Inventory() {
  const { isDirector, user } = useAuth();
  const { selectedId, isAll, productions } = useProduction();
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Omit<Prop, 'id'>>(blank);
  const [editId, setEditId] = useState<string | null>(null);
  const [notesFor, setNotesFor] = useState<Prop | null>(null);

  useEffect(() => {
    loadProps();
  }, [selectedId]);

  async function loadProps() {
    setLoading(true);
    let query = supabase.from('inventory').select('*').order('created_at', { ascending: true });
    if (!isAll) query = query.eq('production_id', selectedId);
    const { data, error } = await query;

    if (error) {
      showToast(`Failed to load inventory: ${error.message}`, 'danger');
    } else {
      setProps(data as Prop[]);
    }
    setLoading(false);
  }

  const filtered = props.filter(p =>
    [p.name, p.status, String(p.quantity), p.act_scene ?? ''].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  function exportCsv() {
    exportToCsv('inventory.csv', filtered.map(p => ({
      Prop: p.name, Quantity: p.quantity, Status: p.status, 'Act/Scene': p.act_scene ?? '',
    })));
  }

  function openAdd() { setForm(blank); setEditId(null); setModal(true); }
  function openEdit(p: Prop) { setForm({ name: p.name, quantity: p.quantity, status: p.status, act_scene: p.act_scene ?? '' }); setEditId(p.id); setModal(true); }

  async function save() {
    if (!form.name.trim() || form.quantity < 1) {
      showToast('Please fill in all required fields.', 'warning'); return;
    }

    if (editId) {
      const { error } = await supabase.from('inventory').update(form).eq('id', editId);
      if (error) { showToast(`Update failed: ${error.message}`, 'danger'); return; }
      showToast('Prop updated successfully!', 'success');
      logActivity(`${user?.email ?? 'Someone'} updated ${form.name} (Qty: ${form.quantity}, ${form.status})`);
    } else {
      const payload = { ...form, production_id: isAll ? (productions[0]?.id ?? null) : selectedId };
      const { error } = await supabase.from('inventory').insert(payload);
      if (error) { showToast(`Add failed: ${error.message}`, 'danger'); return; }
      showToast('Prop added successfully!', 'success');
      logActivity(`${user?.email ?? 'Someone'} added ${form.name} to inventory (Qty: ${form.quantity})`);
    }
    setModal(false);
    loadProps();
  }

  async function remove(id: string) {
    if (!confirm('Remove this prop?')) return;
    const prop = props.find(p => p.id === id);
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) { showToast(`Delete failed: ${error.message}`, 'danger'); return; }
    showToast('Prop removed.', 'success');
    logActivity(`${user?.email ?? 'Someone'} removed ${prop?.name ?? 'a prop'} from inventory`);
    loadProps();
  }

  return (
    <div className="content-area">
      <div className="card">
        <div className="card-header">
          <h5><Package size={16} className="text-primary" /> Props &amp; Inventory</h5>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="search-wrap">
              <span className="search-icon"><Search size={14} /></span>
              <input placeholder="Search props..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn-ghost" onClick={exportCsv} title="Export CSV"><Download size={15} /> Export</button>
            <button className="btn-ghost" onClick={() => window.print()} title="Print"><Printer size={15} /> Print</button>
            {isDirector && (
              <button className="btn-primary" onClick={openAdd}><Plus size={15} /> Add Prop</button>
            )}
          </div>
        </div>
        <div className="table-wrap">
          <table className="naatya-table">
            <thead>
              <tr>
                <th>#</th><th>Prop Name</th><th>Quantity</th><th>Status</th><th>Act/Scene</th><th>Notes</th>{isDirector && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--naatya-text-muted)' }}>Loading...</td></tr>
              )}
              {!loading && filtered.map((p, i) => (
                <tr key={p.id}>
                  <td className="text-muted text-xs">{i + 1}</td>
                  <td className="font-semibold">{p.name}</td>
                  <td>{p.quantity}</td>
                  <td><span className={`badge ${statusClass[p.status]}`}>{p.status}</span></td>
                  <td className="text-muted">{p.act_scene || '—'}</td>
                  <td>
                    <button className="btn-action btn-edit" onClick={() => setNotesFor(p)} title="Notes"><StickyNote size={13} /></button>
                  </td>
                  {isDirector && (
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-action btn-edit" onClick={() => openEdit(p)} title="Edit"><Pencil size={13} /></button>
                      <button className="btn-action btn-del"  onClick={() => remove(p.id)}  title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </td>
                  )}
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--naatya-text-muted)' }}>No props found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && isDirector && (
        <Modal title={editId ? 'Edit Prop' : 'Add New Prop'} onClose={() => setModal(false)} onSave={save} saveLabel="Save Prop">
          <div className="form-group">
            <label className="form-label">Prop Name</label>
            <input className="form-input" placeholder="Enter prop name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input type="number" className="form-input" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PropStatus }))}>
              <option>Available</option>
              <option>In Use</option>
              <option>Damaged</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Act / Scene (optional)</label>
            <input className="form-input" placeholder="e.g. Act II, Scene 3" value={form.act_scene ?? ''} onChange={e => setForm(f => ({ ...f, act_scene: e.target.value }))} />
          </div>
        </Modal>
      )}

      {notesFor && (
        <NotesModal
          entityType="prop"
          entityId={notesFor.id}
          entityLabel={notesFor.name}
          onClose={() => setNotesFor(null)}
        />
      )}
    </div>
  );
}
