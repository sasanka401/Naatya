import { useState } from 'react';
import { Layers, Drama, Wrench, Link, FileUp } from 'lucide-react';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

export function Onboarding() {
  const [path, setPath] = useState<'selection' | 'cast' | 'crew'>('selection');
  const [roleDetail, setRoleDetail] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitCast(e: React.FormEvent) {
    e.preventDefault();
    if (!roleDetail) {
      showToast('Please select your role.', 'warning');
      return;
    }
    setLoading(true);

    const { error } = await supabase.rpc('complete_onboarding', {
      chosen_role: roleDetail,
      link: null,
      path: null
    });

    setLoading(false);
    if (error) {
      showToast(`Setup failed: ${error.message}`, 'danger');
    } else {
      showToast('Profile configured successfully! Welcome to Naatya.', 'success');
      window.location.reload();
    }
  }

  async function submitCrew(e: React.FormEvent) {
    e.preventDefault();
    if (!roleDetail) {
      showToast('Please select your role.', 'warning');
      return;
    }
    if (!portfolioLink.trim() && !portfolioFile) {
      showToast('Please provide a portfolio link or upload a file.', 'warning');
      return;
    }
    setLoading(true);

    let portfolioPath = null;
    if (portfolioFile) {
      const fileName = `${Date.now()}-${portfolioFile.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from('portfolios')
        .upload(fileName, portfolioFile);

      if (uploadError) {
        setLoading(false);
        showToast(`File upload failed: ${uploadError.message}`, 'danger');
        return;
      }
      portfolioPath = data.path;
    }

    const { error } = await supabase.rpc('complete_onboarding', {
      chosen_role: roleDetail,
      link: portfolioLink.trim() || null,
      path: portfolioPath
    });

    setLoading(false);
    if (error) {
      showToast(`Submission failed: ${error.message}`, 'danger');
    } else {
      showToast('Portfolio submitted successfully! Pending admin approval.', 'success');
      window.location.reload();
    }
  }

  return (
    <div className="onboarding-modal-container">
      <div className="login-card" style={{ maxWidth: '480px' }}>
        <div className="login-logo">
          <Layers size={32} color="#fff" strokeWidth={2.25} />
        </div>
        <h1 className="login-title">NAATYA</h1>
        <p className="login-subtitle">Complete Your Profile Setup</p>

        {path === 'selection' && (
          <div className="flex flex-col gap-4 mt-4">
            <p className="text-center text-muted text-sm mb-2">
              Choose your primary path to continue.
            </p>
            <button
              className="btn-google"
              style={{
                padding: '1.5rem',
                flexDirection: 'column',
                gap: '0.5rem',
                border: '2px solid var(--naatya-border)',
              }}
              onClick={() => {
                setPath('cast');
                setRoleDetail('Actor');
              }}
            >
              <Drama size={28} className="text-primary" />
              <span className="font-semibold text-base">The Cast (The Talent)</span>
              <span className="text-xs text-muted font-normal text-center">
                Actors, Actresses, and Performing Artists. Project-approved by Directors.
              </span>
            </button>

            <button
              className="btn-google"
              style={{
                padding: '1.5rem',
                flexDirection: 'column',
                gap: '0.5rem',
                border: '2px solid var(--naatya-border)',
              }}
              onClick={() => {
                setPath('crew');
                setRoleDetail('Director');
              }}
            >
              <Wrench size={28} className="text-accent" />
              <span className="font-semibold text-base">The Crew (Technical & Creative)</span>
              <span className="text-xs text-muted font-normal text-center">
                Directors, Writers, Camera, Light, and Sound. Requires Admin approval.
              </span>
            </button>
          </div>
        )}

        {path === 'cast' && (
          <form onSubmit={submitCast}>
            <div className="form-group">
              <label className="form-label">Select Cast Role</label>
              <select
                className="form-select"
                value={roleDetail}
                onChange={e => setRoleDetail(e.target.value)}
              >
                <option value="Actor">Actor</option>
                <option value="Actress">Actress</option>
                <option value="Supporting Actor">Supporting Actor</option>
                <option value="Supporting Actress">Supporting Actress</option>
              </select>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Submitting...' : 'Finish Setup'}
            </button>

            <button
              type="button"
              className="login-switch-link mt-4 block mx-auto text-center"
              onClick={() => setPath('selection')}
            >
              Back
            </button>
          </form>
        )}

        {path === 'crew' && (
          <form onSubmit={submitCrew}>
            <div className="form-group">
              <label className="form-label">Select Crew Role</label>
              <select
                className="form-select"
                value={roleDetail}
                onChange={e => setRoleDetail(e.target.value)}
              >
                <option value="Director">Director</option>
                <option value="Writer">Writer</option>
                <option value="Producer">Producer</option>
                <option value="Cameraman">Cameraman</option>
                <option value="Lighting Technician">Lighting Technician</option>
                <option value="Sound Engineer">Sound Engineer</option>
                <option value="Makeup Artist">Makeup Artist</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Portfolio Link</label>
              <div className="input-wrap">
                <span className="input-icon">
                  <Link size={16} />
                </span>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://behance.net/your-profile"
                  value={portfolioLink}
                  onChange={e => setPortfolioLink(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Portfolio CV/File (Optional)</label>
              <div className="input-wrap">
                <span className="input-icon">
                  <FileUp size={16} />
                </span>
                <input
                  type="file"
                  className="form-input"
                  accept=".pdf,.zip,.jpg,.png"
                  onChange={e => setPortfolioFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Submitting Portfolio...' : 'Submit Portfolio for Approval'}
            </button>

            <button
              type="button"
              className="login-switch-link mt-4 block mx-auto text-center"
              onClick={() => setPath('selection')}
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
