import { useState } from 'react';
import { Pencil, Trash2, Plus, Search, Package } from 'lucide-react';
import { Modal } from '../components/Modal';
import { showToast } from '../components/Toast';

type PropStatus = 'Available' | 'In Use' | 'Damaged';

interface Prop {
  id: string;
  name: string;
  quantity: number;
  status: PropStatus;
}

const initial: Prop[] = [
  { id: 'P1',  name: 'Wooden Throne',        quantity: 2, status: 'Available' },
  { id: 'P2',  name: 'Silk Curtain (Red)',    quantity: 4, status: 'Available' },
  { id: 'P3',  name: 'Antique Sword Set',     quantity: 6, status: 'In Use' },
  { id: 'P4',  name: 'Golden Crown',          quantity: 1, status: 'Damaged' },
  { id: 'P5',  name: 'Crystal Chandelier',    quantity: 2, status: 'Available' },
  { id: 'P6',  name: 'Royal Scepter',         quantity: 3, status: 'In Use' },
  { id: 'P7',  name: 'Velvet Carpet (Blue)',  quantity: 1, status: 'Available' },
  { id: 'P8',  name: 'Candelabra Set',        quantity: 5, status: 'Damaged' },
  { id: 'P9',  name: 'Wooden Shield',         quantity: 4, status: 'Available' },
  { id: 'P10', name: 'Scroll Props',          quantity: 8, status: 'In Use' },
];

const statusClass: Record<PropStatus, string> = {
  'Available': 'badge-available',
  'In Use':    'badge-in-use',
  'Damaged':   'badge-damaged',
};

const blank = { name: '', quantity: 1, status: 'Available' as PropStatus };

export function Inventory() {
  const [props, setProps] = useState<Prop[]>(initial);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = props.filter(p =>
    [p.name, p.status, String(p.quantity)].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  function openAdd() { setForm(blank); setEditId(null); setModal(true); }
  function openEdit(p: Prop) { setForm({ name: p.name, quantity: p.quantity, status: p.status }); setEditId(p.id); setModal(true); }

  function save() {
    if (!form.name.trim() || form.quantity < 1) {
      showToast('Please fill in all required fields.', 'warning'); return;
    }
    if (editId) {
      setProps(prev => prev.map(p => p.id === editId ? { ...p, ...form } : p));
      showToast('Prop updated successfully!', 'success');
    } else {
      setProps(prev => [...prev, { id: `P${Date.now()}`, ...form }]);
      showToast('Prop added successfully!', 'success');
    }
    setModal(false);
  }

  function remove(id: string) {
    if (!confirm('Remove this prop?')) return;
    setProps(prev => prev.filter(p => p.id !== id));
    showToast('Prop removed.', 'success');
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
            <button className="btn-primary" onClick={openAdd}><Plus size={15} /> Add Prop</button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="naatya-table">
            <thead>
              <tr>
                <th>#</th><th>Prop Name</th><th>Quantity</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}>
                  <td className="text-muted text-xs">{i + 1}</td>
                  <td className="font-semibold">{p.name}</td>
                  <td>{p.quantity}</td>
                  <td><span className={`badge ${statusClass[p.status]}`}>{p.status}</span></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-action btn-edit" onClick={() => openEdit(p)} title="Edit"><Pencil size={13} /></button>
                      <button className="btn-action btn-del"  onClick={() => remove(p.id)}  title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--naatya-text-muted)' }}>No props found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
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
        </Modal>
      )}
    </div>
  );
}
