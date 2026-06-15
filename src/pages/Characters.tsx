import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Drama } from 'lucide-react';
import { Modal } from '../components/Modal';
import { showToast } from '../components/Toast';
import { logActivity } from '../lib/activity';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { useProduction } from '../lib/production-context';
import type { Character, Member } from '../lib/types';

const blank = { name: '', description: '', member_id: '' };

export function Characters() {
  const { isDirector, user } = useAuth();
  const { selectedId, isAll, productions } = useProduction();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [selectedId]);

  async function load() {
    setLoading(true);

    let charQuery = supabase.from('characters').select('*').order('created_at', { ascending: true });
    let memQuery = supabase.from('members').select('*').order('name', { ascending: true });
    if (!isAll) {
      charQuery = charQuery.eq('production_id', selectedId);
      memQuery = memQuery.eq('production_id', selectedId);
    }

    const [charRes, memRes] = await Promise.all([charQuery, memQuery]);

    if (charRes.error) showToast(`Failed to load characters: ${charRes.error.message}`, 'danger');
    else setCharacters(charRes.data as Character[]);

    if (!memRes.error) setMembers(memRes.data as Member[]);
    setLoading(false);
  }

  function memberName(id: string | null) {
    if (!id) return null;
    return members.find(m => m.id === id)?.name ?? null;
  }

  function openAdd() { setForm(blank); setEditId(null); setModal(true); }
  function openEdit(c: Character) {
    setForm({ name: c.name, description: c.description ?? '', member_id: c.member_id ?? '' });
    setEditId(c.id);
    setModal(true);
  }

  async function save() {
    if (!form.name.trim()) { showToast('Please enter a character name.', 'warning'); return; }

    const payload = {
      name: form.name,
      description: form.description || null,
      member_id: form.member_id || null,
      production_id: isAll ? (productions[0]?.id ?? null) : selectedId,
    };

    if (editId) {
      const { error } = await supabase.from('characters').update(payload).eq('id', editId);
      if (error) { showToast(`Update failed: ${error.message}`, 'danger'); return; }
      showToast('Character updated!', 'success');
      logActivity(`${user?.email ?? 'Someone'} updated character "${form.name}"`);
    } else {
      const { error } = await supabase.from('characters').insert(payload);
      if (error) { showToast(`Add failed: ${error.message}`, 'danger'); return; }
      showToast('Character added!', 'success');
      const actor = memberName(form.member_id);
      logActivity(`${user?.email ?? 'Someone'} added character "${form.name}"${actor ? ` (played by ${actor})` : ''}`);
    }
    setModal(false);
    load();
  }

  async function remove(c: Character) {
    if (!confirm(`Delete character "${c.name}"?`)) return;
    const { error } = await supabase.from('characters').delete().eq('id', c.id);
    if (error) { showToast(`Delete failed: ${error.message}`, 'danger'); return; }
    showToast('Character removed.', 'success');
    logActivity(`${user?.email ?? 'Someone'} removed character "${c.name}"`);
    load();
  }

  return (
    <div className="content-area">
      <div className="card">
        <div className="card-header">
          <h5><Drama size={16} className="text-primary" /> Characters &amp; Casting</h5>
          {isDirector && (
            <button className="btn-primary" onClick={openAdd}><Plus size={15} /> Add Character</button>
          )}
        </div>
        <div className="card-body">
          {loading && <p className="text-muted text-sm">Loading...</p>}
          {!loading && characters.length === 0 && (
            <p className="text-muted text-sm">No characters defined yet.</p>
          )}

          {!loading && characters.length > 0 && (
            <div className="char-grid">
              {characters.map(c => {
                const actor = memberName(c.member_id);
                return (
                  <div className="char-card" key={c.id}>
                    <h6>{c.name}</h6>
                    {c.description && <p className="text-muted text-sm">{c.description}</p>}
                    <span className={`char-actor${actor ? '' : ' unassigned'}`}>
                      {actor ? `Played by ${actor}` : 'Unassigned'}
                    </span>
                    {isDirector && (
                      <div className="flex gap-2 mt-2">
                        <button className="btn-action btn-edit" onClick={() => openEdit(c)} title="Edit"><Pencil size={13} /></button>
                        <button className="btn-action btn-del" onClick={() => remove(c)} title="Delete"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {modal && isDirector && (
        <Modal title={editId ? 'Edit Character' : 'Add Character'} onClose={() => setModal(false)} onSave={save} saveLabel="Save Character">
          <div className="form-group">
            <label className="form-label">Character Name</label>
            <input className="form-input" placeholder="e.g. Rani, King Lear" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <input className="form-input" placeholder="Short description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Assign Actor</label>
            <select className="form-select" value={form.member_id} onChange={e => setForm(f => ({ ...f, member_id: e.target.value }))}>
              <option value="">— Unassigned —</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
              ))}
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
