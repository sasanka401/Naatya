import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Eye, X, Upload, Lock, ShieldAlert, Key, RefreshCw, UserMinus } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Watermark } from '../components/Watermark';
import { showToast } from '../components/Toast';
import { logActivity } from '../lib/activity';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { useProduction } from '../lib/production-context';
import type { Script } from '../lib/types';

const SCRIPT_BUCKET = 'scripts';

interface ActivePresence {
  id: string;
  entered_at: string;
  profiles: {
    email: string;
    detailed_role: string;
  };
}

interface SecurityAlarm {
  id: string;
  user_email: string;
  action_attempted: string;
  created_at: string;
}

export function Scripts() {
  const { user, profile } = useAuth();
  const { selectedId, isAll, productions } = useProduction();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth flags
  const isEditor = profile?.detailed_role && ['Director', 'Writer'].includes(profile.detailed_role);
  const isCast = profile?.detailed_role && ['Actor', 'Actress', 'Supporting Actor', 'Supporting Actress'].includes(profile.detailed_role);
  const canAccess = isEditor || isCast;

  // Onboarding Phase States (for Cast)
  const [hasAccessRow, setHasAccessRow] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [verifyingInvite, setVerifyingInvite] = useState(false);

  // Phase 2: OTP
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Script viewer
  const [viewer, setViewer] = useState<{ script: Script; url: string; isText: boolean; text?: string } | null>(null);

  // Director Surveillance States
  const [surveillanceActive, setSurveillanceActive] = useState<ActivePresence[]>([]);
  const [securityAlarms, setSecurityAlarms] = useState<SecurityAlarm[]>([]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [latestGeneratedCode, setLatestGeneratedCode] = useState('');

  // Script Upload Form modal
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // 1. Initial Access Verification & Surveillance load
  useEffect(() => {
    if (!selectedId || selectedId === 'all') return;
    if (isCast) {
      checkScriptRoomAccess();
    } else {
      setCheckingAccess(false);
    }

    if (isEditor) {
      loadSurveillance();
      subscribeSurveillance();
    }
  }, [selectedId, user]);

  // Load scripts once authenticated & verified
  useEffect(() => {
    if (selectedId && selectedId !== 'all') {
      if (isEditor || (isCast && hasAccessRow && isOtpVerified)) {
        loadScripts();
      }
    }
  }, [selectedId, hasAccessRow, isOtpVerified]);

  // Real-time surveillance updates for Directors/Writers
  function subscribeSurveillance() {
    const presenceSub = supabase
      .channel('surveillance-presence-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'script_room_presence' }, () => {
        loadSurveillance();
      })
      .subscribe();

    const alarmSub = supabase
      .channel('surveillance-alarm-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_alarms' }, () => {
        loadSurveillance();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(presenceSub);
      supabase.removeChannel(alarmSub);
    };
  }

  // Real-time access status listener for Cast members (Kick detection)
  useEffect(() => {
    if (!isCast || !user || !selectedId || selectedId === 'all') return;

    const kickChannel = supabase
      .channel(`kick-channel-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'script_room_access',
        filter: `profile_id=eq.${user.id}`
      }, (payload) => {
        if (payload.new.status === 'kicked') {
          showToast('You have been kicked from the Script Room by the Director.', 'danger');
          setViewer(null);
          setHasAccessRow(false);
          setIsOtpVerified(false);
          setCheckingAccess(false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(kickChannel);
    };
  }, [isCast, user, selectedId]);

  // Script Room active session logger for Cast (心跳/Presence)
  useEffect(() => {
    if (!viewer || !user || !selectedId || selectedId === 'all') return;

    let presenceId = '';

    async function enterPresence() {
      if (!user) return;
      const { data, error } = await supabase
        .from('script_room_presence')
        .insert({
          production_id: selectedId,
          profile_id: user.id
        })
        .select()
        .single();
      
      if (!error && data) {
        presenceId = data.id;
      }
    }

    async function exitPresence() {
      if (presenceId) {
        await supabase.from('script_room_presence').delete().eq('id', presenceId);
      }
    }

    enterPresence();

    return () => {
      exitPresence();
    };
  }, [viewer, user, selectedId]);

  // Anti-Screenshot & Keyboard Hooks for Cast Viewers
  useEffect(() => {
    if (!viewer || !user || !selectedId || selectedId === 'all') return;

    async function triggerAlarm(action: string) {
      if (!user) return;
      await supabase.from('security_alarms').insert({
        production_id: selectedId,
        profile_id: user.id,
        user_email: user.email ?? 'Unknown',
        action_attempted: action
      });
      showToast(`Warning: ${action} blocked. Security alert sent.`, 'danger');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen block detection
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        triggerAlarm('Screenshot (PrintScreen key)');
        alert('Screenshots are strictly prohibited!');
      }
      // Ctrl+P / Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        triggerAlarm('Print command');
        alert('Printing is strictly prohibited!');
      }
      // Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        triggerAlarm('Save command');
        alert('Saving scripts is strictly prohibited!');
      }
      // Prevent dev tools inspection options
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
        e.preventDefault();
        triggerAlarm('Dev Tools Inspect Shortcut');
      }
    };

    // Tab blur / screenshot tool popup trigger
    const handleBlur = () => {
      triggerAlarm('Window Blur (Possible Screen Capture/Capture Area Selection)');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
    };
  }, [viewer, user, selectedId]);

  async function loadSurveillance() {
    const [presenceRes, alarmsRes] = await Promise.all([
      supabase
        .from('script_room_presence')
        .select(`
          id,
          entered_at,
          profiles (email, detailed_role)
        `)
        .eq('production_id', selectedId),
      supabase
        .from('security_alarms')
        .select('*')
        .eq('production_id', selectedId)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    if (!presenceRes.error && presenceRes.data) {
      setSurveillanceActive(presenceRes.data as any);
    }
    if (!alarmsRes.error && alarmsRes.data) {
      setSecurityAlarms(alarmsRes.data as SecurityAlarm[]);
    }
  }

  async function checkScriptRoomAccess() {
    setCheckingAccess(true);
    const { data, error } = await supabase
      .from('script_room_access')
      .select('*')
      .eq('production_id', selectedId)
      .eq('profile_id', user?.id)
      .maybeSingle();

    if (!error && data && data.status === 'active') {
      setHasAccessRow(true);
      // Trigger OTP flow
      generateAndSendOtp();
    } else {
      setHasAccessRow(false);
    }
    setCheckingAccess(false);
  }

  // Generate OTP & display as Mock Email Toast
  async function generateAndSendOtp() {
    if (!user || !selectedId || selectedId === 'all') return;
    setIsOtpVerified(false);

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store in DB
    await supabase.from('script_room_otp').delete().eq('profile_id', user.id).eq('production_id', selectedId);
    const { error } = await supabase.from('script_room_otp').insert({
      profile_id: user.id,
      production_id: selectedId,
      code,
      expires_at: expiresAt
    });

    if (error) {
      showToast(`2FA setup failed: ${error.message}`, 'danger');
      return;
    }

    // Mock Email Toast
    alert(`[MOCK EMAIL: ${user.email}]\nSubject: Naatya Script Room Verification Code\n\nYour temporary verification code is: ${code}\n(Expires in 10 minutes)`);
    showToast(`2FA verification code sent to ${user.email}`, 'info');
  }

  async function verifyOtpCode() {
    if (!otpInput.trim()) {
      showToast('Please enter the verification code.', 'warning');
      return;
    }
    setVerifyingOtp(true);

    const { data, error } = await supabase
      .from('script_room_otp')
      .select('*')
      .eq('profile_id', user?.id)
      .eq('production_id', selectedId)
      .eq('code', otpInput.trim())
      .maybeSingle();

    setVerifyingOtp(false);

    if (error || !data) {
      showToast('Invalid or expired verification code.', 'danger');
      return;
    }

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      showToast('Verification code has expired. Please request a new one.', 'danger');
      return;
    }

    // OTP Correct! Delete it and enter
    await supabase.from('script_room_otp').delete().eq('id', data.id);
    setIsOtpVerified(true);
    showToast('2FA Verification successful! Welcome to the Script Room.', 'success');
  }

  async function handleUnlockRoom() {
    if (!inviteCodeInput.trim()) {
      showToast('Please enter an invite code.', 'warning');
      return;
    }
    setVerifyingInvite(true);

    // Check invite table
    const { data: invite, error: inviteError } = await supabase
      .from('script_room_invites')
      .select('*')
      .eq('production_id', selectedId)
      .eq('code', inviteCodeInput.trim())
      .eq('used', false)
      .maybeSingle();

    if (inviteError || !invite) {
      setVerifyingInvite(false);
      showToast('Invalid or already-used invite code.', 'danger');
      return;
    }

    // Mark invite as used
    await supabase
      .from('script_room_invites')
      .update({
        used: true,
        used_by: user?.id,
        used_at: new Date().toISOString()
      })
      .eq('id', invite.id);

    // Insert access permission
    const { error: accessError } = await supabase
      .from('script_room_access')
      .insert({
        production_id: selectedId,
        profile_id: user?.id,
        status: 'active'
      });

    setVerifyingInvite(false);

    if (accessError) {
      showToast(`Access config failed: ${accessError.message}`, 'danger');
    } else {
      showToast('Invite code validated! Access granted.', 'success');
      setHasAccessRow(true);
      // Trigger Phase 2 OTP
      generateAndSendOtp();
    }
  }

  async function handleKickUser(profileId: string) {
    if (!confirm('Are you sure you want to kick this user from the Script Room?')) return;

    // Set status to kicked
    const { error: accessError } = await supabase
      .from('script_room_access')
      .update({ status: 'kicked' })
      .eq('production_id', selectedId)
      .eq('profile_id', profileId);

    // Remove active presence row
    await supabase
      .from('script_room_presence')
      .delete()
      .eq('production_id', selectedId)
      .eq('profile_id', profileId);

    if (accessError) {
      showToast(`Kick failed: ${accessError.message}`, 'danger');
    } else {
      showToast('User has been kicked and active connection severed.', 'success');
      loadSurveillance();
    }
  }

  async function handleGenerateInvite() {
    if (!recipientEmail.trim()) {
      showToast("Please enter the recipient's email.", 'warning');
      return;
    }
    setGeneratingCode(true);

    // Generate random code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];

    const { error } = await supabase
      .from('script_room_invites')
      .insert({
        production_id: selectedId,
        code,
        recipient_email: recipientEmail.trim()
      });

    setGeneratingCode(false);

    if (error) {
      showToast(`Failed to generate code: ${error.message}`, 'danger');
    } else {
      setLatestGeneratedCode(code);
      setRecipientEmail('');
      showToast(`Generated code: ${code}`, 'success');
    }
  }

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

  if (selectedId === 'all') {
    return (
      <div className="content-area">
        <div className="card text-center" style={{ padding: '3rem' }}>
          <Lock size={40} className="text-muted mb-3 mx-auto" />
          <h5>Select a specific Production Room</h5>
          <p className="text-muted text-sm mt-2">
            The Script Room can only be accessed inside a specific active Production Room. 
            Please select a production from the top dropdown menu.
          </p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="content-area">
        <div className="card text-center" style={{ padding: '3rem' }}>
          <ShieldAlert size={40} className="text-danger mb-3 mx-auto" />
          <h5>Access Denied</h5>
          <p className="text-muted text-sm mt-2">
            You do not have authorization to view the Script Library. The Script Room is 
            strictly reserved for the Director, Writer, and Cast members.
          </p>
        </div>
      </div>
    );
  }

  // Cast Phase 1: locked screen
  if (isCast && !hasAccessRow && !checkingAccess) {
    return (
      <div className="content-area">
        <div className="card" style={{ maxWidth: '480px', margin: '3rem auto', padding: '2rem' }}>
          <div style={{ textAlign: 'center' }} className="mb-4">
            <Lock size={36} className="text-accent mb-2 mx-auto" />
            <h5>Script Room Locked</h5>
            <p className="text-muted text-xs mt-1">
              Initial verification required. Enter the unique invite code sent by your Director.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Single-Use Invite Code</label>
            <div className="input-wrap">
              <span className="input-icon"><Key size={16} /></span>
              <input
                className="form-input"
                placeholder="Enter 8-character code"
                value={inviteCodeInput}
                onChange={e => setInviteCodeInput(e.target.value)}
                maxLength={8}
                style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '2px' }}
              />
            </div>
          </div>
          <button className="btn-login" onClick={handleUnlockRoom} disabled={verifyingInvite}>
            {verifyingInvite ? 'Verifying Invite...' : 'Unlock Script Room'}
          </button>
        </div>
      </div>
    );
  }

  // Cast Phase 2: OTP screen
  if (isCast && hasAccessRow && !isOtpVerified) {
    return (
      <div className="content-area">
        <div className="card" style={{ maxWidth: '480px', margin: '3rem auto', padding: '2rem' }}>
          <div style={{ textAlign: 'center' }} className="mb-4">
            <ShieldAlert size={36} className="text-primary mb-2 mx-auto" />
            <h5>2-Factor Security Verification</h5>
            <p className="text-muted text-xs mt-1">
              A temporary security code has been sent to your registered email address. 
              Please enter the code to unlock this visit session.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Verification Code (OTP)</label>
            <div className="input-wrap">
              <span className="input-icon"><Key size={16} /></span>
              <input
                className="form-input"
                placeholder="6-digit code"
                value={otpInput}
                onChange={e => setOtpInput(e.target.value)}
                maxLength={6}
                style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '4px' }}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" style={{ flex: 1 }} onClick={verifyOtpCode} disabled={verifyingOtp}>
              {verifyingOtp ? 'Verifying...' : 'Verify & Enter'}
            </button>
            <button className="btn-google" style={{ width: 'auto', border: '1px solid var(--naatya-border)' }} onClick={generateAndSendOtp}>
              <RefreshCw size={14} /> Resend
            </button>
          </div>
        </div>
      </div>
    );
  }

  const watermarkLabel = `${user?.email ?? 'unknown'} · ${new Date().toLocaleString()}`;

  return (
    <div className="content-area">
      {/* 2. Director Live Surveillance & Management Dashboard */}
      {isEditor && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Live Surveillance */}
          <div className="card">
            <div className="card-header">
              <h5 className="flex items-center gap-2">
                <span className="live-dot" style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                Active Script Room Presence
              </h5>
            </div>
            <div className="card-body" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {surveillanceActive.length === 0 ? (
                <p className="text-muted text-xs">No users currently viewing the Script Room.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {surveillanceActive.map(p => (
                    <div key={p.id} className="flex items-center justify-between" style={{ padding: '0.4rem 0', borderBottom: '1px solid var(--naatya-border)' }}>
                      <div>
                        <div className="font-semibold text-xs">{p.profiles?.email}</div>
                        <div className="text-muted text-xxs" style={{ fontSize: '0.7rem' }}>
                          Entered: {new Date(p.entered_at).toLocaleTimeString()} · {p.profiles?.detailed_role}
                        </div>
                      </div>
                      <button
                        className="btn-action btn-del"
                        onClick={() => handleKickUser(p.id)}
                        title="Kick User instantly"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.1rem', fontSize: '0.7rem' }}
                      >
                        <UserMinus size={11} /> Kick
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Security Alarms log */}
          <div className="card">
            <div className="card-header">
              <h5 className="text-danger flex items-center gap-1">
                <ShieldAlert size={14} /> Live Security Alarms
              </h5>
            </div>
            <div className="card-body" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {securityAlarms.length === 0 ? (
                <p className="text-muted text-xs">No security violations recorded.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {securityAlarms.map(a => (
                    <div key={a.id} className="flex flex-col" style={{ padding: '0.4rem 0', borderBottom: '1px solid var(--naatya-border)', borderLeft: '3px solid var(--naatya-danger)', paddingLeft: '0.5rem' }}>
                      <span className="font-semibold text-xs text-danger">{a.user_email}</span>
                      <span className="text-muted text-xxs" style={{ fontSize: '0.75rem' }}>
                        Attempted: {a.action_attempted}
                      </span>
                      <span className="text-muted text-xxs" style={{ fontSize: '0.65rem' }}>
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isEditor && (
        <div className="card mb-6">
          <div className="card-header">
            <h5>Generate Cast Invite Codes (Single-Use)</h5>
          </div>
          <div className="card-body">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                className="form-input"
                style={{ width: '300px' }}
                placeholder="Enter Cast Member's email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
              />
              <button className="btn-primary" onClick={handleGenerateInvite} disabled={generatingCode}>
                Generate Invite
              </button>
              {latestGeneratedCode && (
                <div style={{ marginLeft: '1rem' }}>
                  <span className="text-xs text-muted">Latest Code:</span>{' '}
                  <strong style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--naatya-accent)', letterSpacing: '1px' }}>
                    {latestGeneratedCode}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h5><FileText size={16} className="text-primary" /> Script Library</h5>
          {isEditor && (
            <button className="btn-primary" onClick={openAdd}>
              <Plus size={15} /> Upload Script
            </button>
          )}
        </div>
        <div className="card-body">
          {loading && <p className="text-muted text-sm">Loading scripts...</p>}

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
                    <button className="btn-primary" onClick={() => view(s)}>
                      <Eye size={14} /> View Securely
                    </button>
                    {isEditor && (
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
        <Modal
          title="Upload New Script"
          onClose={() => setModal(false)}
          onSave={save}
          saveLabel={uploading ? 'Uploading...' : 'Upload'}
        >
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              className="form-input"
              placeholder="e.g. Act I - The Opening"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <input
              className="form-input"
              placeholder="Short description"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
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
            <Upload size={12} /> Scripts are stored securely. Downloads are disabled.
          </p>
        </Modal>
      )}

      {viewer && (
        <div
          className="script-viewer-overlay"
          onClick={e => {
            if (e.target === e.currentTarget) setViewer(null);
          }}
          onContextMenu={e => e.preventDefault()}
        >
          <div className="script-viewer-box" style={{ userSelect: 'none' }}>
            <div className="script-viewer-header">
              <h5>{viewer.script.title}</h5>
              <button className="modal-close" onClick={() => setViewer(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="script-viewer-body" style={{ position: 'relative' }}>
              <Watermark label={watermarkLabel} />
              {viewer.isText ? (
                <div style={{ userSelect: 'none' }}>{viewer.text}</div>
              ) : (
                <iframe
                  src={`${viewer.url}#toolbar=0`}
                  title={viewer.script.title}
                  style={{ width: '100%', height: '70vh', border: 'none' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
