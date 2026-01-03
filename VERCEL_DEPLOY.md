# Vercel'de Yayınlama Rehberi

Evet, projenizi Vercel'de yayınlayabilirsiniz! LiveKit, Supabase ve chat özellikleriniz Vercel'de sorunsuz çalışacaktır.

## 🚀 Hızlı Başlangıç

### 1. GitHub'a Push Edin

Projenizi GitHub'a push edin (eğer henüz yapmadıysanız):

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/kullaniciadi/tez-frontend.git
git push -u origin main
```

### 2. Vercel'e Import Edin

1. [Vercel](https://vercel.com) hesabınıza giriş yapın
2. "Add New Project" butonuna tıklayın
3. GitHub repository'nizi seçin
4. "Import" butonuna tıklayın

### 3. Environment Variables Ayarlayın

Vercel proje ayarlarında **Settings > Environment Variables** bölümüne gidin ve şu değişkenleri ekleyin:

#### LiveKit Variables
```
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

#### Supabase Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Önemli:** Her environment variable için **Production**, **Preview** ve **Development** ortamlarını seçin.

### 4. Build Ayarları

Vercel otomatik olarak Next.js projelerini algılar, ancak manuel ayar yapmak isterseniz:

- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (otomatik algılanır)
- **Output Directory:** `.next` (otomatik algılanır)
- **Install Command:** `npm install` (otomatik algılanır)

### 5. Deploy

"Deploy" butonuna tıklayın. Vercel otomatik olarak:
- Bağımlılıkları yükler
- Projeyi build eder
- Production'a deploy eder

## ✅ Kontrol Listesi

Deploy sonrası kontrol edin:

- [ ] Ana sayfa açılıyor mu? (`https://your-project.vercel.app`)
- [ ] Login sayfası çalışıyor mu? (`/login`)
- [ ] Supabase bağlantısı çalışıyor mu? (Kayıt/Giriş test edin)
- [ ] LiveKit bağlantısı çalışıyor mu? (`/broadcast` sayfasını test edin)
- [ ] Chat özelliği çalışıyor mu?
- [ ] API route'ları çalışıyor mu? (`/api/token`)

## 🔧 Önemli Notlar

### LiveKit WebSocket Bağlantıları

LiveKit WebSocket bağlantıları (`wss://`) Vercel'de sorunsuz çalışır. Sadece `NEXT_PUBLIC_LIVEKIT_URL` environment variable'ının doğru ayarlandığından emin olun.

### Supabase CORS Ayarları

Supabase Dashboard'da **Settings > API > CORS** bölümüne Vercel domain'inizi ekleyin:
- `https://your-project.vercel.app`
- `https://*.vercel.app` (tüm preview URL'leri için)

### Environment Variables

- `NEXT_PUBLIC_*` ile başlayan değişkenler client-side'da kullanılabilir
- Diğer değişkenler (`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`) sadece server-side'da kullanılır
- **Asla** API key'leri client-side kodda expose etmeyin

### Custom Domain (Opsiyonel)

1. Vercel Dashboard > Settings > Domains
2. Domain'inizi ekleyin
3. DNS ayarlarını yapın (Vercel size talimat verecek)

## 🐛 Sorun Giderme

### Build Hatası

Eğer build sırasında hata alırsanız:
1. Vercel build loglarını kontrol edin
2. Tüm environment variables'ın ayarlandığından emin olun
3. `package.json`'daki dependencies'lerin doğru olduğunu kontrol edin

### Runtime Hatası

Eğer deploy sonrası hata alırsanız:
1. Browser console'u kontrol edin
2. Vercel Function logs'larına bakın (Settings > Logs)
3. Environment variables'ın doğru olduğunu kontrol edin

### LiveKit Bağlantı Hatası

- `NEXT_PUBLIC_LIVEKIT_URL`'in `wss://` ile başladığından emin olun
- LiveKit Cloud dashboard'da API key'lerin aktif olduğunu kontrol edin

### Supabase Bağlantı Hatası

- Supabase project'inizin aktif olduğunu kontrol edin
- CORS ayarlarında Vercel domain'inizin olduğundan emin olun
- API keys'lerin doğru olduğunu kontrol edin

## 📊 Monitoring

Vercel Dashboard'da şunları izleyebilirsiniz:
- **Analytics:** Sayfa görüntülemeleri, performans metrikleri
- **Logs:** Server-side ve function logları
- **Deployments:** Tüm deployment geçmişi

## 🔄 Otomatik Deploy

Vercel, GitHub'a push yaptığınızda otomatik olarak deploy eder:
- `main` branch → Production
- Diğer branch'ler → Preview deployment

## 💡 İpuçları

1. **Preview Deployments:** Her pull request için otomatik preview URL oluşturulur
2. **Environment Variables:** Her ortam için farklı değerler kullanabilirsiniz
3. **Edge Functions:** Gerekirse API route'larınızı Edge Functions'a dönüştürebilirsiniz
4. **Analytics:** Vercel Analytics'i aktif ederek kullanıcı davranışlarını izleyebilirsiniz

## 🎉 Başarılı Deploy Sonrası

Deploy başarılı olduktan sonra:
1. Production URL'inizi paylaşın
2. Kullanıcılarınız kayıt olup giriş yapabilir
3. Yayın özelliklerini kullanabilirler
4. Chat özelliği çalışır

## 📞 Destek

Sorun yaşarsanız:
- Vercel Docs: https://vercel.com/docs
- Vercel Discord: https://vercel.com/discord
- LiveKit Docs: https://docs.livekit.io
- Supabase Docs: https://supabase.com/docs

