import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Eye, X, Upload } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Watermark } from '../components/Watermark';
import { showToast } from '../components/Toast';
import { logActivity } from '../lib/activity';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { useProduction } from '../lib/production-context';
import type { Script } from '../lib/types';

const SCRIPT_BUCKET = 'scripts';

export function Scripts() {
  const { user, isDirector } = useAuth();
  const { selectedId, isAll, productions } = useProduction();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [viewer, setViewer] = useState<{ script: Script; url: string; isText: boolean; text?: string } | null>(null);

  useEffect(() => {
    loadScripts();
  }, [selectedId]);

  async function loadScripts() {
    setLoading(true);
    let query = supabase.from('scripts').select('*').order('created_at', { ascending: false });
    if (!isAll) query = query.eq('production_id', selectedId);
    const { data, error } = await query;

    if (error) {
      showToast(`Failed to load scripts: ${error.message}`, 'danger');
    } else {
      setScripts(data as Script[]);
    }
    setLoading(false);
  }

  function openAdd() {
    setTitle('');
    setDescription('');
    setFile(null);
    setModal(true);
  }

  async function save() {
    if (!title.trim() || !file) {
      showToast('Please enter a title and choose a file.', 'warning');
      return;
    }

    setUploading(true);
    const path = `${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from(SCRIPT_BUCKET).upload(path, file);
    if (uploadError) {
      setUploading(false);
      showToast(`Upload failed: ${uploadError.message}`, 'danger');
      return;
    }

    const { error: insertError } = await supabase.from('scripts').insert({
      title,
      description: description || null,
      storage_path: path,
      uploaded_by: user?.id ?? null,
      production_id: isAll ? (productions[0]?.id ?? null) : selectedId,
    });

    setUploading(false);
    if (insertError) {
      showToast(`Save failed: ${insertError.message}`, 'danger');
      return;
    }

    showToast('Script uploaded successfully!', 'success');
    logActivity(`${user?.email ?? 'Someone'} uploaded the script "${title}"`);
    setModal(false);
    loadScripts();
  }

  async function remove(script: Script) {
    if (!confirm(`Delete "${script.title}"? This cannot be undone.`)) return;

    await supabase.storage.from(SCRIPT_BUCKET).remove([script.storage_path]);
    const { error } = await supabase.from('scripts').delete().eq('id', script.id);

    if (error) {
      showToast(`Delete failed: ${error.message}`, 'danger');
      return;
    }
    showToast('Script deleted.', 'success');
    logActivity(`${user?.email ?? 'Someone'} deleted the script "${script.title}"`);
    loadScripts();
  }

  async function view(script: Script) {
    const { data, error } = await supabase.storage
      .from(SCRIPT_BUCKET)
      .createSignedUrl(script.storage_path, 300);

    if (error || !data) {
      showToast(`Could not open script: ${error?.message ?? 'unknown error'}`, 'danger');
      return;
    }

    const lower = script.storage_path.toLowerCase();
    const isText = lower.endsWith('.txt') || lower.endsWith('.md');

    if (isText) {
      const res = await fetch(data.signedUrl);
      const text = await res.text();
      setViewer({ script, url: data.signedUrl, isText: true, text });
    } else {
      setViewer({ script, url: data.signedUrl, isText: false });
    }
  }

  const watermarkLabel = `${user?.email ?? 'unknown'} · ${new Date().toLocaleString()}`;

  return (
    <div className="content-area">
      <div className="card">
        <div className="card-header">
          <h5><FileText size={16} className="text-primary" /> Script Library</h5>
          {isDirector && (
            <button className="btn-primary" onClick={openAdd}><Plus size={15} /> Upload Script</button>
          )}
        </div>
        <div className="card-body">
          {loading && <p className="text-muted text-sm">Loading...</p>}

          {!loading && scripts.length === 0 && (
            <p className="text-muted text-sm">No scripts uploaded yet.</p>
          )}

          {!loading && scripts.length > 0 && (
            <div className="script-grid">
              {scripts.map(s => (
                <div className="script-card" key={s.id}>
                  <h6>{s.title}</h6>
                  <p>{s.description || 'No description provided.'}</p>
                  <span className="script-meta">
                    Uploaded {s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}
                  </span>
                  <div className="flex gap-2 mt-2">
                    <button className="btn-primary" onClick={() => view(s)}><Eye size={14} /> View</button>
                    {isDirector && (
                      <button className="btn-action btn-del" onClick={() => remove(s)} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <Modal title="Upload New Script" onClose={() => setModal(false)} onSave={save} saveLabel={uploading ? 'Uploading...' : 'Upload'}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" placeholder="e.g. Act I - The Opening" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <input className="form-input" placeholder="Short description" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">File (PDF or text)</label>
            <input
              type="file"
              className="form-input"
              accept=".pdf,.txt,.md"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <p className="text-muted text-xs">
            <Upload size={12} /> Scripts are stored privately and only accessible to logged-in cast &amp; crew.
          </p>
        </Modal>
      )}

      {viewer && (
        <div className="script-viewer-overlay" onClick={e => { if (e.target === e.currentTarget) setViewer(null); }}>
          <div className="script-viewer-box">
            <div className="script-viewer-header">
              <h5>{viewer.script.title}</h5>
              <button className="modal-close" onClick={() => setViewer(null)}><X size={20} /></button>
            </div>
            <div className="script-viewer-body">
              <Watermark label={watermarkLabel} />
              {viewer.isText ? (
                <div>{viewer.text}</div>
              ) : (
                <iframe src={viewer.url} title={viewer.script.title} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
