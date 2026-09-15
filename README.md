# Görev Takip

Aile / ev / iş görevlerini birlikte yönetmek için basit bir PWA.

- Aile şifresi ile giriş (Google yok)
- Herkes kendi profilini oluşturur (ör. Gizem, Nurhat)
- Görev yazma, durum güncelleme, not / neden
- Gerçek zamanlı senkron (Firebase Firestore)
- Telefona “Ana ekrana ekle” ile uygulama gibi kurulum
- Duruma göre renkli kartlar + özet istatistikler

## Hızlı başlangıç

```bash
npm install
npm run dev
```

Varsayılan aile şifresi: `123456` (`.env` içindeki `VITE_FAMILY_PASSWORD`)

Firebase ayarlanmadan **demo modu** çalışır (veri bu cihazda kalır). Firebase bağlayınca herkes aynı görevleri canlı görür.

## Firebase kurulumu

1. [Firebase Console](https://console.firebase.google.com/) üzerinde yeni proje oluşturun.
2. **Firestore Database** ekleyin (production veya test mode).
3. `firestore.rules` dosyasındaki kuralları yayınlayın.
4. Project settings → Your apps → Web app ekleyin.
5. `.env.example` dosyasını `.env` olarak kopyalayıp web config değerlerini yapıştırın:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FAMILY_PASSWORD=123456
VITE_GROUP_ID=aile
```

6. `npm run dev` ile tekrar başlatın.

> Not: Bu proje aile içi kullanım içindir. Firestore kuralları açık bırakılmıştır; herkese açık internete koymadan önce kuralları sıkılaştırın.

## GitHub’a yükleme

```bash
git init
git add .
git commit -m "Görev takip PWA uygulamasını ekle"
git branch -M main
git remote add origin https://github.com/KULLANICI/gorevtakip.git
git push -u origin main
```

## GitHub Pages ile yayınlama

1. Repo Settings → Pages → Source: **GitHub Actions**
2. Bu repodaki workflow `Deploy to GitHub Pages` otomatik build alır.
3. Site adresi: `https://KULLANICI.github.io/gorevtakip/`

Firebase domain allowlist’e Pages URL’inizi ekleyin.

## Telefona kurma (PWA)

- **Android (Chrome):** Menü → Ana ekrana ekle / Uygulamayı yükle
- **iPhone (Safari):** Paylaş → Ana Ekrana Ekle

İlk girişten sonra profil tarayıcıda saklanır; her seferinde şifre sormaz (Çıkış yapmadıkça).

## Kullanım akışı

1. Aile şifresini gir
2. Profil oluştur (isim + renk)
3. Görev ekle (Ev / İş / Diğer)
4. Diğer kişi görevi açıp:
   - İşe başladım
   - Devam ediyor
   - Tamamladım
   - Tamamlayamadım (+ neden, örn. “çamaşır ıslak”)
5. Açıklama / not yaz — herkes aktivite zaman çizelgesinde görür

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Üretim derlemesi |
| `npm run preview` | Derlenmiş sürümü önizle |
