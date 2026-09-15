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
import { PROFILE_COLORS, profileNeedsPin, type Profile } from '../types'

export function AuthScreen() {
  const { setSession, demoMode, profiles, refreshLocal, logout } = useApp()
  const [step, setStep] = useState<'password' | 'pick' | 'pin'>(() =>
    isFamilyUnlocked() ? 'pick' : 'password',
  )
  const [password, setPassword] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [pendingProfile, setPendingProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PROFILE_COLORS[0])
  const [newPin, setNewPin] = useState('')

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

  const completeEnter = (profile: Profile) => {
    setSession({
      memberId: profile.id,
      memberName: profile.name,
      memberColor: profile.color,
      unlocked: true,
    })
  }

  const enterAs = (profile: Profile) => {
    setError('')
    if (profileNeedsPin(profile)) {
      setPendingProfile(profile)
      setPinInput('')
      setStep('pin')
      return
    }
    completeEnter(profile)
  }

  const submitPin = (e: FormEvent) => {
    e.preventDefault()
    if (!pendingProfile) return
    if (pinInput.trim() !== pendingProfile.pin?.trim()) {
      setError('Profil şifresi hatalı')
      return
    }
    setError('')
    completeEnter(pendingProfile)
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
      const pin = newPin.trim() || undefined
      const profile = demoMode
        ? demoCreateProfile(newName, newColor, pin)
        : await createProfile({ name: newName, color: newColor, pin })
      refreshLocal?.()
      setCreating(false)
      setNewName('')
      setNewPin('')
      // Yeni profil şifreliyse hemen sormadan gir (az önce kendi yazdı)
      completeEnter(profile)
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
            <h1>
              {step === 'password'
                ? 'Aile girişi'
                : step === 'pin'
                  ? `${pendingProfile?.name} şifresi`
                  : 'Kim kullanıyor?'}
            </h1>
          </div>
        </div>
        <p className="lead">
          {step === 'password'
            ? 'Sadece siz ve eşiniz — aile şifresi bir kez yeterli.'
            : step === 'pin'
              ? 'Bu profil kilitli. Şifreyi girerek devam et.'
              : 'Kilitli profiller şifre ister. Diğerleri doğrudan açılır.'}
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
        ) : step === 'pin' && pendingProfile ? (
          <form onSubmit={submitPin} className="stack">
            <label>
              Profil şifresi
              <input
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Şifre"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn primary">
              Giriş yap
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setStep('pick')
                setPendingProfile(null)
                setPinInput('')
                setError('')
              }}
            >
              Geri
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
            <label>
              Profil şifresi (isteğe bağlı)
              <input
                type="password"
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Boş bırakırsan şifresiz"
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
                    <span>
                      {p.name}
                      {profileNeedsPin(p) ? <span className="lock-badge">kilitli</span> : null}
                    </span>
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
