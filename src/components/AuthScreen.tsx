import { useState, type FormEvent } from 'react'
import { useApp } from '../hooks/useApp'
import { isFamilyUnlocked, setFamilyUnlocked, upsertMember } from '../lib/api'
import { FAMILY_PASSWORD } from '../lib/firebase'
import { demoUpsertMember } from '../lib/demoStore'
import { FAMILY_PROFILES, type FamilyProfileId } from '../lib/family'

export function AuthScreen() {
  const { setSession, demoMode, refreshLocal } = useApp()
  const [step, setStep] = useState<'password' | 'pick'>(() =>
    isFamilyUnlocked() ? 'pick' : 'password',
  )
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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

  const enterAs = async (profileId: FamilyProfileId) => {
    const profile = FAMILY_PROFILES.find((p) => p.id === profileId)
    if (!profile) return

    setBusy(true)
    setError('')
    const member = {
      id: profile.id,
      name: profile.name,
      color: profile.color,
      createdAt: Date.now(),
    }

    try {
      if (demoMode) {
        demoUpsertMember(member)
        refreshLocal?.()
      } else {
        await upsertMember(member)
      }

      setSession({
        memberId: profile.id,
        memberName: profile.name,
        memberColor: profile.color,
        unlocked: true,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş yapılamadı')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-glow" aria-hidden />
      <div className="auth-card">
        <p className="eyebrow">Görev Takip</p>
        <h1>{step === 'password' ? 'Aile girişi' : 'Kim kullanıyor?'}</h1>
        <p className="lead">
          {step === 'password'
            ? 'Sadece siz ve eşiniz — aile şifresi bir kez yeterli.'
            : 'Bir kez seçin; bu telefonda bir daha sormaz.'}
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
        ) : (
          <div className="stack">
            <div className="profile-pick">
              {FAMILY_PROFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="profile-pick-btn"
                  style={{ ['--pick' as string]: p.color }}
                  disabled={busy}
                  onClick={() => enterAs(p.id)}
                >
                  <span className="profile-pick-avatar">{p.name.slice(0, 1)}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
            {error && <p className="error">{error}</p>}
            {!isFamilyUnlocked() && (
              <button type="button" className="btn ghost" onClick={() => setStep('password')}>
                Geri
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
