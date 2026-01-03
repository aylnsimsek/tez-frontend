# Kurulum Talimatları

## 1. Paketleri Yükle

```bash
cd tez-frontend
npm install
```

## 2. Environment Variables (.env.local)

Proje kök dizininde `.env.local` dosyası oluşturun ve aşağıdaki değişkenleri ekleyin:

```env
# LiveKit Configuration
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### LiveKit Kurulumu

1. [LiveKit Cloud](https://cloud.livekit.io) hesabı oluşturun (ücretsiz plan var)
2. Yeni bir proje oluşturun
3. API Key ve Secret'ı alın
4. WebSocket URL'ini kopyalayın

### Supabase Kurulumu

1. [Supabase](https://supabase.com) hesabı oluşturun
2. Yeni bir proje oluşturun
3. Project Settings > API'den URL ve anon key'i alın
4. `supabase-setup.sql` dosyasındaki SQL script'ini Supabase SQL Editor'de çalıştırın

## 3. Development Server'ı Başlat

```bash
npm run dev
```

## 4. Kullanım

1. **Yayın Yapmak İçin:**
   - Tarayıcıda `http://localhost:3000/broadcast` adresine gidin
   - Oda adı ve kullanıcı adı girin
   - "Yayını Başlat" butonuna tıklayın
   - Kamera ve mikrofon izinlerini verin

2. **Yayını İzlemek İçin:**
   - Başka bir tarayıcı sekmesinde `http://localhost:3000/watch` adresine gidin
   - Aynı oda adını girin
   - Farklı bir kullanıcı adı girin
   - "Yayına Katıl" butonuna tıklayın

3. **Chat:**
   - Her iki sayfada da sağ tarafta chat paneli var
   - Mesajlar realtime olarak güncellenir

## Notlar

- İlk kullanımda tarayıcı kamera ve mikrofon izni isteyecektir
- Aynı oda adını kullanarak birden fazla izleyici bağlanabilir
- Chat mesajları Supabase'de saklanır ve realtime olarak güncellenir

