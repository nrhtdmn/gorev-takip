import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../hooks/useApp'
import {
  createProfile,
  deleteProfile,
  ensureDefaultProfiles,
  isFamilyUnlocked,
  setFamilyUnlocked,
} from '../lib/api'
import { FAMILY_PASSWORD } from '../lib/firebase'
import {
  demoCreateProfile,
  demoDeleteProfile,
  demoEnsureDefaults,
} from '../lib/demoStore'
import { PROFILE_COLORS, type Profile } from '../types'

export function AuthScreen() {
  const { setSession, demoMode, profiles, refreshLocal, logout } = useApp()
  const [step, setStep] = useState<'password' | 'pick'>(() =>
    isFamilyUnlocked() ? 'pick' : 'password',
  )
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PROFILE_COLORS[0])

  useEffect(() => {
    if (step !== 'pick') return
    if (demoMode) {
      demoEnsureDefaults()
      refreshLocal?.()
      return
    }
    ensureDefaultProfiles()
      .then(() => refreshLocal?.())
      .catch(console.error)
  }, [step, demoMode, refreshLocal])

  const unlock = (e: FormEvent) => {
    e.preventDefault()
    if (password.trim() !== FAMILY_PASSWORD) {
      setError('Aile şifresi hatalı')
      return
    }
    setFamilyUnlocked(true)
    setError('')
    setStep('pick')
  }

  const enterAs = (profile: Profile) => {
    setSession({
      memberId: profile.id,
      memberName: profile.name,
      memberColor: profile.color,
      unlocked: true,
    })
  }

  const addProfile = async (e: FormEvent) => {
    e.preventDefault()
    if (newName.trim().length < 2) {
      setError('İsim en az 2 karakter olmalı')
      return
    }
    setBusy(true)
    setError('')
    try {
      const profile = demoMode
        ? demoCreateProfile(newName, newColor)
        : await createProfile({ name: newName, color: newColor })
      refreshLocal?.()
      setCreating(false)
      setNewName('')
      enterAs(profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profil eklenemedi')
    } finally {
      setBusy(false)
    }
  }

  const removeProfile = async (profile: Profile) => {
    if (!confirm(`“${profile.name}” profilini silmek istiyor musun?`)) return
    setBusy(true)
    try {
      if (demoMode) demoDeleteProfile(profile.id)
      else await deleteProfile(profile.id)
      refreshLocal?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-glow" aria-hidden />
      <div className="auth-card">
        <div className="brand-lockup">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="brand-logo" />
          <div>
            <p className="eyebrow">Görev Takip</p>
            <h1>{step === 'password' ? 'Aile girişi' : 'Kim kullanıyor?'}</h1>
          </div>
        </div>
        <p className="lead">
          {step === 'password'
            ? 'Sadece siz ve eşiniz — aile şifresi bir kez yeterli.'
            : 'Profilini seç. Yeni profil ekleyebilir veya silebilirsin.'}
        </p>

        {demoMode && (
          <div className="banner banner-info">
            Demo modu açık — Firebase `.env` ayarlanınca canlı senkron çalışır.
          </div>
        )}

        {step === 'password' ? (
          <form onSubmit={unlock} className="stack">
            <label>
              Aile şifresi
              <input
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                placeholder="Aile şifresi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn primary">
              Kilidi aç
            </button>
          </form>
        ) : creating ? (
          <form onSubmit={addProfile} className="stack">
            <label>
              Yeni profil adı
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Örn. Ahmet"
                autoFocus
                maxLength={24}
              />
            </label>
            <div className="color-picker">
              <span>Renk</span>
              <div className="swatches">
                {PROFILE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`swatch ${newColor === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setNewColor(c)}
                    aria-label={`Renk ${c}`}
                  />
                ))}
              </div>
            </div>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn primary" disabled={busy}>
              Kaydet ve gir
            </button>
            <button type="button" className="btn ghost" onClick={() => setCreating(false)}>
              Vazgeç
            </button>
          </form>
        ) : (
          <div className="stack">
            <div className="profile-pick">
              {profiles.map((p) => (
                <div key={p.id} className="profile-pick-wrap">
                  <button
                    type="button"
                    className="profile-pick-btn"
                    style={{ ['--pick' as string]: p.color }}
                    disabled={busy}
                    onClick={() => enterAs(p)}
                  >
                    <span className="profile-pick-avatar">{p.name.slice(0, 1)}</span>
                    <span>{p.name}</span>
                  </button>
                  <button
                    type="button"
                    className="profile-delete"
                    disabled={busy}
                    onClick={() => removeProfile(p)}
                    aria-label={`${p.name} sil`}
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
            {error && <p className="error">{error}</p>}
            <button type="button" className="btn primary" onClick={() => setCreating(true)}>
              + Profil ekle
            </button>
            <button type="button" className="btn ghost" onClick={logout}>
              Çıkış
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
