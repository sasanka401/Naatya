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
  profile_id: string;
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

function filterScript(text: string, characterName: string): string {
  if (!characterName) {
    return "No character assigned. Please ask your Director to assign you a character from the Characters page to view your scenes.";
  }

  const charLower = characterName.toLowerCase();
  const lines = text.split('\n');
  const scenes: { title: string; content: string[] }[] = [];
  let currentSceneTitle = 'Opening / Prologue';
  let currentSceneLines: string[] = [];

  for (const line of lines) {
    const isHeader = /^\s*(SCENE|Scene|ACT|Act|PROLOGUE|Prologue)\b/i.test(line) || /^\s*#+\s*(SCENE|Scene|ACT|Act)/i.test(line);
    
    if (isHeader) {
      if (currentSceneLines.length > 0) {
        scenes.push({ title: currentSceneTitle, content: currentSceneLines });
      }
      currentSceneTitle = line.trim();
      currentSceneLines = [];
    } else {
      currentSceneLines.push(line);
    }
  }
  if (currentSceneLines.length > 0) {
    scenes.push({ title: currentSceneTitle, content: currentSceneLines });
  }

  const filteredScenes = scenes.map(scene => {
    const sceneText = scene.content.join('\n');
    const sceneTextLower = sceneText.toLowerCase();

    // Check if the character speaks in this scene or is mentioned
    const speaks = new RegExp(`\\b${charLower}\\b\\s*[:\\]]`, 'i').test(sceneText) || sceneTextLower.includes(`${charLower}:`) || sceneTextLower.includes(`[${charLower}]`);
    const mentioned = sceneTextLower.includes(charLower);

    if (speaks || (mentioned && scene.title !== 'Opening / Prologue')) {
      const speakers = new Set<string>();
      scene.content.forEach(l => {
        const match = l.match(/^\s*([A-Za-z\s]{2,20})\s*[:]/);
        if (match) {
          const speaker = match[1].trim();
          if (speaker.toLowerCase() !== charLower) {
            speakers.add(speaker);
          }
        }
      });

      const interactions = speakers.size > 0 
        ? ` (Interacting with: ${Array.from(speakers).join(', ')})`
        : '';

      return {
        included: true,
        title: scene.title,
        header: `🎭 ${scene.title}${interactions}`,
        content: scene.content.join('\n')
      };
    } else {
      return {
        included: false,
        title: scene.title,
        header: `🔒 ${scene.title} (Omitted - ${characterName} is not in this scene)`
      };
    }
  });

  let output = `=================================================================\n`;
  output += `   SECURE DYNAMIC CAST VIEW FOR: ${characterName.toUpperCase()}\n`;
  output += `   (Full script file access disabled for security)\n`;
  output += `=================================================================\n\n`;

  filteredScenes.forEach(scene => {
    if (scene.included) {
      output += `${scene.header}\n`;
      output += `-`.repeat(scene.header.length) + `\n`;
      output += `${scene.content}\n\n`;
    } else {
      output += `${scene.header}\n\n`;
    }
  });

  return output;
}

export function Scripts() {
  const { user, profile } = useAuth();
  const { selectedId, isAll, productions, reload, setSelectedId } = useProduction();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth flags
  const isEditor = profile?.role === 'Director' || profile?.detailed_role === 'Writer';
  const isCast = profile?.role === 'Cast' && profile?.detailed_role !== 'Writer';
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

  // Character Name state for Cast scene filter
  const [characterName, setCharacterName] = useState('');

  // Onboarding, Invite dropdown & version banner states
  const [characters, setCharacters] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [newVersionAvailable, setNewVersionAvailable] = useState<Script | null>(null);
  const [accessList, setAccessList] = useState<any[]>([]);
  const [otpCodeForTesting, setOtpCodeForTesting] = useState('');

  async function fetchCharacterName() {
    if (!user) return;
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('member_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileData?.member_id) {
      const { data: charData } = await supabase
        .from('characters')
        .select('name')
        .eq('member_id', profileData.member_id)
        .maybeSingle();

      if (charData) {
        setCharacterName(charData.name);
      } else {
        setCharacterName('');
      }
    } else {
      setCharacterName('');
    }
  }

  // 1. Initial Access Verification & Surveillance load
  useEffect(() => {
    if (!selectedId || selectedId === 'all') return;
    
    if (isCast) {
      const pending = sessionStorage.getItem('pending_invite_code');
      if (pending) {
        setInviteCodeInput(pending);
      }
      checkScriptRoomAccess();
      fetchCharacterName();
    } else {
      setCheckingAccess(false);
    }

    if (isEditor) {
      loadSurveillance();
      subscribeSurveillance();
      loadCharacters();
      loadAccessList();
    }
  }, [selectedId, user, profile]);

  async function loadCharacters() {
    if (!selectedId || selectedId === 'all') return;
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('production_id', selectedId)
      .order('name', { ascending: true });
    if (!error && data) {
      setCharacters(data);
    }
  }

  async function loadAccessList() {
    if (!selectedId || selectedId === 'all') return;
    
    const { data: accessData, error: accessErr } = await supabase
      .from('script_room_access')
      .select(`
        id,
        status,
        joined_at,
        profile_id,
        profiles (
          email,
          member_id
        )
      `)
      .eq('production_id', selectedId);

    if (accessErr) {
      console.error('Error loading access list:', accessErr);
      return;
    }

    const { data: charData } = await supabase
      .from('characters')
      .select('name, member_id')
      .eq('production_id', selectedId);

    const charMap: Record<string, string> = {};
    if (charData) {
      charData.forEach(c => {
        if (c.member_id) {
          charMap[c.member_id] = c.name;
        }
      });
    }

    const mapped = (accessData || []).map((row: any) => {
      const profileInfo = row.profiles;
      const email = profileInfo?.email || 'Unknown';
      const memberId = profileInfo?.member_id;
      const charName = memberId ? (charMap[memberId] || 'Cast Member (Not Cast)') : 'Not Linked';
      return {
        id: row.id,
        status: row.status,
        joined_at: row.joined_at,
        profile_id: row.profile_id,
        email,
        characterName: charName
      };
    });

    setAccessList(mapped);
  }

  // Load scripts once authenticated & verified
  useEffect(() => {
    if (selectedId && selectedId !== 'all') {
      if (isEditor || (isCast && hasAccessRow && isOtpVerified)) {
        loadScripts();
      }
    }
  }, [selectedId, hasAccessRow, isOtpVerified, profile]);

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

    const accessSub = supabase
      .channel('surveillance-access-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'script_room_access' }, () => {
        loadAccessList();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(presenceSub);
      supabase.removeChannel(alarmSub);
      supabase.removeChannel(accessSub);
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
          profile_id,
          entered_at,
          profiles (id, email, detailed_role)
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

  // Realtime Script Versioning Notification Banner for Cast
  useEffect(() => {
    if (!viewer || !selectedId || selectedId === 'all') {
      setNewVersionAvailable(null);
      return;
    }

    const currentScriptTitle = viewer.script.title;
    const currentScriptVersion = viewer.script.version || 1;

    const versionChannel = supabase
      .channel(`script-version-${viewer.script.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'scripts',
        filter: `production_id=eq.${selectedId}`
      }, (payload) => {
        const newScript = payload.new as Script;
        if (
          newScript.title === currentScriptTitle &&
          (newScript.version || 1) > currentScriptVersion
        ) {
          setNewVersionAvailable(newScript);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(versionChannel);
    };
  }, [viewer, selectedId]);

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

    setOtpCodeForTesting(code); // Save code to show on testing UI

    // Mock Email Toast
    alert(`[MOCK EMAIL: ${user.email}]\nSubject: Naatya Script Room Verification Code\n\nYour temporary verification code is: ${code}\n(Expires in 10 minutes)`);
    showToast(`2FA verification code sent to ${user.email}. Code: ${code}`, 'info');
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

    // Check invite table (query by code only to find which production this is for)
    const { data: invite, error: inviteError } = await supabase
      .from('script_room_invites')
      .select('*')
      .eq('code', inviteCodeInput.trim())
      .eq('used', false)
      .maybeSingle();

    if (inviteError || !invite) {
      setVerifyingInvite(false);
      showToast('Invalid or already-used invite code.', 'danger');
      return;
    }

    const targetProductionId = invite.production_id;
    if (!targetProductionId) {
      setVerifyingInvite(false);
      showToast('No production found linked to this invite.', 'danger');
      return;
    }

    // Check expiration (24h validity)
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      setVerifyingInvite(false);
      showToast('Invalid or Expired Code', 'danger');
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

    // Auto-casting logic:
    // 1. Get current profile's member_id
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('member_id')
      .eq('id', user?.id)
      .maybeSingle();

    let memberId = currentProfile?.member_id;
    if (!memberId) {
      const { data: newMember, error: memberError } = await supabase
        .from('members')
        .insert({
          name: user?.email?.split('@')[0] || 'Cast Member',
          role: 'Cast',
          phone: '',
          status: 'Free',
          production_id: targetProductionId
        })
        .select()
        .single();

      if (!memberError && newMember) {
        memberId = newMember.id;
        await supabase
          .from('profiles')
          .update({ member_id: memberId })
          .eq('id', user?.id);
      }
    }

    // 2. Cast the member as the invited character role
    if (invite.role_name && memberId) {
      const { data: existingChar } = await supabase
        .from('characters')
        .select('id')
        .eq('production_id', targetProductionId)
        .eq('name', invite.role_name)
        .maybeSingle();

      if (existingChar) {
        await supabase
          .from('characters')
          .update({ member_id: memberId })
          .eq('id', existingChar.id);
      } else {
        await supabase
          .from('characters')
          .insert({
            production_id: targetProductionId,
            name: invite.role_name,
            description: 'Cast via Invite Code',
            member_id: memberId
          });
      }
      setCharacterName(invite.role_name);
    }

    // Insert access permission
    const { error: accessError } = await supabase
      .from('script_room_access')
      .insert({
        production_id: targetProductionId,
        profile_id: user?.id,
        status: 'active'
      });

    setVerifyingInvite(false);

    if (accessError) {
      showToast(`Access config failed: ${accessError.message}`, 'danger');
    } else {
      showToast('Invite code validated! Access granted.', 'success');
      
      // Reload productions in context and set active production to the unlocked one
      await reload();
      setSelectedId(targetProductionId);
      
      setHasAccessRow(true);
      sessionStorage.removeItem('pending_invite_code'); // Clean up pending code
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
        recipient_email: recipientEmail.trim(),
        role_name: selectedRole || null
      });

    setGeneratingCode(false);

    if (error) {
      showToast(`Failed to generate code: ${error.message}`, 'danger');
    } else {
      setLatestGeneratedCode(code);
      const activeProd = productions.find(p => p.id === selectedId);
      const prodName = activeProd ? activeProd.name : 'our production';
      
      const emailContent = `Hello!\n\n` +
        `Director ${user?.email} has invited you to join the production for the script: ${scripts[0]?.title || 'our production'}.\n` +
        `Your assigned role is: ${selectedRole || 'Auditioning Cast'}.\n\n` +
        `Please use this Invite Code to enter the room: ${code}\n` +
        `Note: This code is valid for 24 hours only.\n\n` +
        `Join here: ${window.location.origin}/?invite_code=${code}`;

      alert(
        `[MOCK EMAIL: ${recipientEmail.trim()}]\n` +
        `Subject: Invitation to Join Production: ${prodName}\n\n` +
        emailContent
      );

      // Trigger mailto link to open in user's local mail client
      const subject = encodeURIComponent(`Invitation to Join Production: ${prodName}`);
      const body = encodeURIComponent(emailContent);
      
      setTimeout(() => {
        window.location.href = `mailto:${recipientEmail.trim()}?subject=${subject}&body=${body}`;
      }, 500);

      setRecipientEmail('');
      setSelectedRole('');
      showToast(`Generated code: ${code}`, 'success');
    }
  }

  async function loadScripts() {
    setLoading(true);
    let query = supabase
      .from('scripts')
      .select(`
        id,
        title,
        description,
        storage_path,
        uploaded_by,
        production_id,
        created_at,
        version,
        profiles:uploaded_by (
          email
        )
      `)
      .order('created_at', { ascending: false });
    if (!isAll) query = query.eq('production_id', selectedId);
    const { data, error } = await query;

    if (error) {
      showToast(`Failed to load scripts: ${error.message}`, 'danger');
    } else {
      const mapped = (data || []).map((s: any) => {
        let profilesObj = null;
        if (s.profiles) {
          profilesObj = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        }
        return {
          ...s,
          profiles: profilesObj
        };
      });
      setScripts(mapped as Script[]);
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

    const prodId = isAll ? (productions[0]?.id ?? null) : selectedId;

    // Get next version number
    const { data: existingScripts } = await supabase
      .from('scripts')
      .select('version')
      .eq('production_id', prodId)
      .eq('title', title.trim())
      .order('version', { ascending: false })
      .limit(1);

    let nextVersion = 1;
    if (existingScripts && existingScripts.length > 0) {
      nextVersion = (existingScripts[0].version || 1) + 1;
    }

    const { error: insertError } = await supabase.from('scripts').insert({
      title,
      description: description || null,
      storage_path: path,
      uploaded_by: user?.id ?? null,
      production_id: prodId,
      version: nextVersion
    });

    setUploading(false);
    if (insertError) {
      showToast(`Save failed: ${insertError.message}`, 'danger');
      return;
    }

    showToast(`Script uploaded successfully as V${nextVersion}!`, 'success');
    logActivity(`${user?.email ?? 'Someone'} uploaded the script "${title}" (Version ${nextVersion})`);
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
    const lower = script.storage_path.toLowerCase();
    const isText = lower.endsWith('.txt') || lower.endsWith('.md');

    if (isCast && !isText) {
      showToast('Security Alert: Cast members are restricted to text-based scripts only to enforce character-scene filters. PDF access is blocked.', 'danger');
      return;
    }

    // Ensure uploader's email is fetched for the watermark
    let scriptWithProfile = { ...script };
    if (!scriptWithProfile.profiles && scriptWithProfile.uploaded_by) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', scriptWithProfile.uploaded_by)
        .maybeSingle();
      if (profileData) {
        scriptWithProfile.profiles = { email: profileData.email };
      }
    }

    const { data, error } = await supabase.storage
      .from(SCRIPT_BUCKET)
      .createSignedUrl(scriptWithProfile.storage_path, 300);

    if (error || !data) {
      showToast(`Could not open script: ${error?.message ?? 'unknown error'}`, 'danger');
      return;
    }

    if (isText) {
      const res = await fetch(data.signedUrl);
      const text = await res.text();
      const finalText = isCast ? filterScript(text, characterName) : text;
      setViewer({ script: scriptWithProfile, url: data.signedUrl, isText: true, text: finalText });
    } else {
      setViewer({ script: scriptWithProfile, url: data.signedUrl, isText: false });
    }
  }

  if (selectedId === 'all') {
    return (
      <div className="content-area">
        <div className="card text-center mb-6" style={{ padding: '3rem' }}>
          <Lock size={40} className="text-muted mb-3 mx-auto" />
          <h5>Select a specific Production Room</h5>
          <p className="text-muted text-sm mt-2">
            The Script Room can only be accessed inside a specific active Production Room. 
            {productions.length > 0 
              ? "Please select a production from the top dropdown menu."
              : "You have not joined any production rooms yet."}
          </p>
        </div>

        {isCast && (
          <div className="card" style={{ maxWidth: '480px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ textAlign: 'center' }} className="mb-4">
              <Key size={30} className="text-accent mb-2 mx-auto" style={{ color: 'var(--naatya-accent)' }} />
              <h5>Join a Production Room</h5>
              <p className="text-muted text-xs mt-1">
                Enter the unique invite code sent by your Director to unlock access.
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
        )}
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
            {otpCodeForTesting && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px dashed var(--naatya-accent)',
                borderRadius: '6px',
                color: 'var(--naatya-accent)',
                fontSize: '0.85rem',
                textAlign: 'center',
                fontWeight: 'semibold'
              }}>
                🔑 [MOCK EMAIL SIMULATION] Your code is: <strong style={{ letterSpacing: '2px', fontSize: '1.1rem' }}>{otpCodeForTesting}</strong>
              </div>
            )}
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
                        onClick={() => handleKickUser(p.profile_id)}
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
              <select
                className="form-input"
                style={{ width: '250px' }}
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
              >
                <option value="">Select Character Role</option>
                {characters.map(char => (
                  <option key={char.id} value={char.name}>
                    {char.name}
                  </option>
                ))}
              </select>
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
            {latestGeneratedCode && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '6px',
                border: '1px dashed var(--naatya-border)'
              }}>
                <span className="text-xs text-muted block mb-1">Mock Invite Link (Direct copy/paste to test Cast user journey):</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    className="form-input"
                    readOnly
                    value={`${window.location.origin}/?invite_code=${latestGeneratedCode}`}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    style={{ fontSize: '0.85rem', fontFamily: 'monospace', flex: 1 }}
                  />
                  <button
                    className="btn-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?invite_code=${latestGeneratedCode}`);
                      showToast('Invite link copied to clipboard!', 'success');
                    }}
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            )}
            <p className="text-muted text-xs mt-2" style={{ fontStyle: 'italic' }}>
              ℹ️ Codes expire automatically after 24 hours. Generating an invite will simulate an email notification to the cast member.
            </p>
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

      {isEditor && (
        <div className="card mt-6">
          <div className="card-header">
            <h5>Production Cast & Access</h5>
          </div>
          <div className="card-body">
            {accessList.length === 0 ? (
              <p className="text-muted text-sm">No cast members have accessed this room yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--naatya-border)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--naatya-text-muted)' }}>Email</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--naatya-text-muted)' }}>Assigned Character Role</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--naatya-text-muted)' }}>Joined Date</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--naatya-text-muted)' }}>Status</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'var(--naatya-text-muted)' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessList.map(row => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--naatya-border-subtle)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>{row.email}</td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: 'rgba(99, 102, 241, 0.1)',
                            color: 'var(--naatya-accent)',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            {row.characterName}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem', color: 'var(--naatya-text-muted)' }}>
                          {new Date(row.joined_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: row.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: row.status === 'active' ? '#10b981' : '#ef4444'
                          }}>
                            {row.status === 'active' ? 'Active' : 'Revoked'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>
                          {row.status === 'active' && (
                            <button
                              className="btn-action btn-del"
                              onClick={async () => {
                                await handleKickUser(row.profile_id);
                                loadAccessList();
                              }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              <UserMinus size={12} /> Revoke Access
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

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
              <h5>{viewer.script.title} {viewer.script.version ? `(V${viewer.script.version})` : ''}</h5>
              <button className="modal-close" onClick={() => setViewer(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="script-viewer-body" style={{ position: 'relative' }}>
              {/* Real-time Version Update Banner */}
              {newVersionAvailable && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.95)',
                  color: '#000',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                  animation: 'slideDown 0.3s ease'
                }}>
                  <span>🎭 Newer version (V{newVersionAvailable.version}) of this script is available.</span>
                  <button
                    onClick={async () => {
                      const latest = newVersionAvailable;
                      setNewVersionAvailable(null);
                      await view(latest);
                    }}
                    style={{
                      background: '#000',
                      color: '#fff',
                      border: 'none',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      marginLeft: '1rem',
                      fontWeight: 'bold'
                    }}
                  >
                    Click here to reload
                  </button>
                </div>
              )}
              <Watermark label={`${viewer.script.profiles?.email || 'Director'} · ${new Date().toLocaleString()}`} />
              {viewer.isText ? (
                <div style={{ userSelect: 'none', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.5' }}>{viewer.text}</div>
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
