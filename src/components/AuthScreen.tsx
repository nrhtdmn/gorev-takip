import { useState, type FormEvent } from 'react'
import { useApp } from '../hooks/useApp'
import { createLocalId, upsertMember } from '../lib/api'
import { FAMILY_PASSWORD } from '../lib/firebase'
import { demoUpsertMember } from '../lib/demoStore'
import { PROFILE_COLORS } from '../types'

export function AuthScreen() {
  const { setSession, demoMode, refreshLocal } = useApp()
  const [step, setStep] = useState<'password' | 'profile'>('password')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [color, setColor] = useState(PROFILE_COLORS[0])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const unlock = (e: FormEvent) => {
    e.preventDefault()
    if (password.trim() !== FAMILY_PASSWORD) {
      setError('Aile şifresi hatalı')
      return
    }
    setError('')
    setStep('profile')
  }

  const createProfile = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('İsim en az 2 karakter olmalı')
      return
    }

    setBusy(true)
    setError('')
    const id = createLocalId()
    const member = { id, name: trimmed, color, createdAt: Date.now() }

    try {
      if (demoMode) {
        demoUpsertMember(member)
        refreshLocal?.()
      } else {
        await upsertMember(member)
      }

      setSession({
        memberId: id,
        memberName: trimmed,
        memberColor: color,
        unlocked: true,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profil oluşturulamadı')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-glow" aria-hidden />
      <div className="auth-card">
        <p className="eyebrow">Görev Takip</p>
        <h1>Birlikte takip edin</h1>
        <p className="lead">
          Ev ve iş görevlerini aynı ekrandan yönetin. Herkes durum günceller, herkes görür.
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
                placeholder="Örn. 123456"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn primary">
              Devam et
            </button>
          </form>
        ) : (
          <form onSubmit={createProfile} className="stack">
            <label>
              Profil adın
              <input
                type="text"
                placeholder="Örn. Gizem veya Nurhat"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                    className={`swatch ${color === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                    aria-label={`Renk ${c}`}
                  />
                ))}
              </div>
            </div>

            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? 'Kaydediliyor…' : 'Profil oluştur'}
            </button>
            <button type="button" className="btn ghost" onClick={() => setStep('password')}>
              Geri
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
