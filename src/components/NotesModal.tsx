import { useState, useEffect } from 'react';
import { X, Send, Trash2, StickyNote } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { showToast } from './Toast';
import type { Note, NoteEntity } from '../lib/types';

interface Props {
  entityType: NoteEntity;
  entityId: string;
  entityLabel: string;
  onClose: () => void;
}

export function NotesModal({ entityType, entityId, entityLabel, onClose }: Props) {
  const { user, isDirector } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) showToast(`Failed to load notes: ${error.message}`, 'danger');
    else setNotes(data as Note[]);
    setLoading(false);
  }

  async function add() {
    if (!body.trim()) return;
    const { error } = await supabase.from('notes').insert({
      entity_type: entityType,
      entity_id: entityId,
      body: body.trim(),
      author_email: user?.email ?? null,
    });
    if (error) { showToast(`Failed to add note: ${error.message}`, 'danger'); return; }
    setBody('');
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) { showToast(`Delete failed: ${error.message}`, 'danger'); return; }
    load();
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-header">
          <h5><StickyNote size={16} /> Notes — {entityLabel}</h5>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="flex gap-2 mb-4">
            <input
              className="form-input"
              placeholder="Add a note..."
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') add(); }}
            />
            <button className="btn-primary" onClick={add}><Send size={14} /></button>
          </div>

          {loading && <p className="text-muted text-sm">Loading...</p>}
          {!loading && notes.length === 0 && <p className="text-muted text-sm">No notes yet.</p>}

          <div className="notes-list">
            {notes.map(n => (
              <div className="note-item" key={n.id}>
                <div className="note-body">{n.body}</div>
                <div className="note-meta">
                  <span>{n.author_email ?? 'Unknown'} · {new Date(n.created_at).toLocaleString()}</span>
                  {isDirector && (
                    <button className="btn-action btn-del" onClick={() => remove(n.id)} title="Delete note">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
