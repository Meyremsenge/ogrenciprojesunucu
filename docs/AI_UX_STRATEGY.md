# AI UX/Frontend Ürün Tasarım Stratejisi

## 📋 Genel Bakış

Bu doküman, öğrenci koçluk uygulaması için AI destekli özelliklerin frontend ürün tasarım stratejisini tanımlar.

---

## 🎯 1. AI Konumlandırması: "Koç" Yaklaşımı

### Neden "Asistan" Değil "Koç"?

| Asistan Yaklaşımı | Koç Yaklaşımı |
|-------------------|---------------|
| Direkt cevap verir | Yol gösterir |
| Bağımlılık yaratır | Bağımsızlık geliştirir |
| İşi yapar | Düşündürür |
| Pasif kullanıcı | Aktif öğrenci |

### Koç Karakteri

```typescript
// Persona Tanımı
const AI_COACH = {
  name: "Koç",
  avatar: "🎓",
  personality: {
    tone: "samimi ama profesyonel",
    approach: "sokratik sorgulama",
    style: "destekleyici, yönlendirici"
  },
  principles: [
    "Cevabı vermek yerine düşündürme",
    "Hatadan öğrenmeyi teşvik etme",
    "Küçük başarıları kutlama",
    "Sınırları açıkça belirtme"
  ]
};
```

### Koç Davranışları

1. **Soru Sorma**: "Bu problemi nasıl parçalara ayırabiliriz?"
2. **Yönlendirme**: "Şu formülü düşünür müsün?"
3. **Teşvik Etme**: "Doğru yoldasın, devam et!"
4. **Kabul Etme**: "Bu konuda emin değilim, öğretmenine danış."

---

## 👥 2. Rol Bazlı AI Deneyimi

### 2.1 Öğrenci Deneyimi

```
┌─────────────────────────────────────────────────┐
│ 🎓 Koç                                          │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ "Merhaba! Bu soruyu birlikte çözelim.      │ │
│ │  Sana cevabı vermeyeceğim ama doğru yolu   │ │
│ │  bulmana yardımcı olacağım."               │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [💡 İpucu Al] [📚 Konuyu Açıkla] [📋 Plan Yap]│
│                                                 │
│ ⚡ 12/20 kullanım hakkı kaldı                   │
└─────────────────────────────────────────────────┘
```

**Özellikler:**
- Soru ipucu (kademeli - hafif/orta/detaylı)
- Konu açıklaması
- Çalışma planı önerisi
- Motivasyon mesajları

**Kotalar:**
- Günlük 30 AI etkileşimi
- Soru başına 3 ipucu hakkı
- Limit dolunca alternatif yönlendirme

### 2.2 Öğretmen Deneyimi

```
┌───────────────────────────────────────────────────────┐
│ 🎓 AI Asistan                                         │
│                                                       │
│ [💬 Sohbet] [✍️ Soru Üret] [📊 Analiz]               │
│ ────────────────────────────────────────────────────  │
│                                                       │
│ ┌─ Soru Üretici ────────────────────────────────────┐ │
│ │ Konu: [Doğrusal Denklemler          ]             │ │
│ │ Zorluk: [Kolay] [Orta] [Zor]                      │ │
│ │ Sayı: 5 ████████░░                                │ │
│ │                                                   │ │
│ │ [🚀 5 Soru Üret]                                 │ │
│ │                                                   │ │
│ │ ⚠️ Üretilen sorular taslak olarak kaydedilir.   │ │
│ │    Kullanmadan önce kontrol edin.                │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ ⚡ 85/100 kullanım                                    │
└───────────────────────────────────────────────────────┘
```

**Özellikler:**
- Soru üretimi (kontrol gerekli uyarısıyla)
- Öğrenci performans analizi
- İçerik zenginleştirme önerileri
- Toplu işlem yetenekleri

**Kotalar:**
- Günlük 100 AI etkileşimi
- Soru üretimi için özel limit
- Taslak onay mekanizması

### 2.3 Admin Deneyimi

```
┌─────────────────────────────────────────────────────────┐
│ 🎛️ AI Sistem Durumu                                     │
│                                                         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ 🔄 12.5K │ │ 🎫 2.3M  │ │ 💰 $45   │ │ 👥 342   │    │
│ │ İstek    │ │ Token    │ │ Maliyet  │ │ Aktif    │    │
│ │ +12% ↑   │ │ +8% ↑    │ │ +5% ↑    │ │ +15% ↑   │    │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                         │
│ ┌─ Rol Bazlı Kullanım ─────────────────────────────────┐│
│ │ Öğrenciler  ████████████████░░░░ 65%                ││
│ │ Öğretmenler █████░░░░░░░░░░░░░░░ 25%                ││
│ │ Adminler    ██░░░░░░░░░░░░░░░░░░ 10%                ││
│ └──────────────────────────────────────────────────────┘│
│                                                         │
│ ⚠️ Uyarılar:                                           │
│ • Günlük bütçenin %80'i kullanıldı                     │
│ • 3 öğrenci limitini aştı                              │
│ • Matematik konusunda yoğunluk yüksek                  │
└─────────────────────────────────────────────────────────┘
```

**Özellikler:**
- Kullanım istatistikleri
- Maliyet takibi
- Limit yönetimi
- Anomali tespiti

---

## 🔄 3. AI Etkileşim Modelleri

### 3.1 Chat Tabanlı Etkileşim

```
┌─ AI Koç Sohbet ──────────────────────────────────┐
│                                                   │
│ 🎓 Merhaba! Bu soruyu birlikte çözelim.          │
│                                                   │
│                    Bu formülü anlamadım. 👤       │
│                                                   │
│ 🎓 Hangi formül? Bana biraz daha açıklar mısın?  │
│                                                   │
│ ─────────────────────────────────────────────────│
│ [Formülü açıkla...]                    [Gönder]  │
│                                                   │
│ [Nereden başlamalıyım?] [Bir ipucu ver]          │
└──────────────────────────────────────────────────┘
```

**Kullanım Alanları:**
- Soru çözümü
- Konu açıklaması
- Çalışma planı oluşturma

### 3.2 Context-Aware (Bağlam Duyarlı) Yardım

```
┌─ Soru #123 ──────────────────────────────────────┐
│                                                   │
│ Bir cisim 10 m/s hızla hareket etmektedir...     │
│                                                   │
│ ┌───────────────────────────────────────────────┐│
│ │ 💡 AI Koç Yardımı                             ││
│ │                                               ││
│ │ [💡 Hafif İpucu] ✓                           ││
│ │ [🔍 Orta İpucu ]                             ││
│ │ [📚 Detaylı   ]                              ││
│ │                                               ││
│ │ ┌────────────────────────────────────────┐   ││
│ │ │ İpucu 1: Bu soruda temel kavramı      │   ││
│ │ │ düşün. Formüllerden hangisi uyar?     │   ││
│ │ └────────────────────────────────────────┘   ││
│ │                                               ││
│ │ [Koçla konuş →]                              ││
│ └───────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

**Kullanım Alanları:**
- Soru sayfalarında inline ipucu
- İçerik üzerinde açıklama
- Form doldururken yardım

### 3.3 Floating (Yüzen) Yardım Butonu

```
                                    ┌──────────────────┐
                                    │ Nasıl yardımcı   │
                                    │ olabilirim?      │
                                    │                  │
                                    │ [💡 Açıkla]      │
                                    │ [❓ Sorum var]   │
                                    │ [📝 Pratik yap]  │
                                    └────────┬─────────┘
                                             │
                                             ▼
                                         ┌──────┐
                                         │  🎓  │
                                         └──────┘
```

**Kullanım Alanları:**
- Her sayfada erişilebilir
- Minimal dikkat dağınıklığı
- Hızlı erişim

---

## ⚠️ 4. Beklenti Yönetimi

### 4.1 Disclaimer Sistemi

```
┌─ ⚠️ AI Koç Yardımı Hakkında ─────────────────────┐
│                                                   │
│ Ben sana direkt cevap vermek yerine, doğru       │
│ cevabı kendin bulman için yol göstereceğim.      │
│ Bazen yanılabilirim, bu yüzden öğretmeninin      │
│ görüşü her zaman daha değerlidir.                │
│                                                   │
│ • ⚠️ Yanıtlarım her zaman doğru olmayabilir      │
│ • 👨‍🏫 Öğretmenin yerini tutmam                    │
│ • 📋 Sadece gördüğüm bilgilerle yorum yapabilirim│
│                                                   │
│                              [Anladım, Devam Et] │
└──────────────────────────────────────────────────┘
```

### 4.2 Güven Göstergesi

```
AI Yanıtı altında:

┌─────────────────────────────────────────────────┐
│ 🎓 Bu soruyu çözmek için Newton'un ikinci       │
│    yasasını kullanabilirsin: F = m × a          │
│                                                  │
│ ────────────────────────────────────────────────│
│ Güven: ████████░░ Yüksek                        │
│                                                  │
│ veya düşük güvende:                             │
│                                                  │
│ Güven: ███░░░░░░░ Düşük                         │
│ ⚠️ Bu yanıttan emin değilim. Öğretmenine danış.│
└─────────────────────────────────────────────────┘
```

### 4.3 Hata Durumları

```
┌─ 😔 Bir Sorun Oluştu ────────────────────────────┐
│                                                   │
│ Şu an sana yardımcı olamıyorum.                  │
│                                                   │
│ Ne yapabilirsin?                                 │
│                                                   │
│ [🔄 Tekrar Dene]                                 │
│ [👨‍🏫 Öğretmenine Sor]                            │
│ [📚 Kaynakları İncele]                           │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

## 📊 5. Kota ve Limit Yönetimi UI

### 5.1 Kota Göstergesi

```
Header'da (Compact):
┌──────────────────────────┐
│ 🟢 12/20                 │  ← Yeşil: Yeterli
└──────────────────────────┘

┌──────────────────────────┐
│ 🟡 3/20                  │  ← Sarı: Az kaldı
└──────────────────────────┘

┌──────────────────────────┐
│ 🔴 0/20                  │  ← Kırmızı: Bitti
└──────────────────────────┘
```

### 5.2 Kota Uyarı Seviyeleri

**Seviye 1 - Bilgi (>70% kullanım):**
```
ℹ️ Günün %75'ini kullandın. Geri kalanı önemli sorular için sakla.
```

**Seviye 2 - Uyarı (≤3 kalan):**
```
⚠️ Sadece 3 kullanım hakkın kaldı. Dikkatli kullan!
```

**Seviye 3 - Kritik (0 kalan):**
```
🔴 Günlük AI kullanım hakkın bitti. Yarın tekrar dene.
```

### 5.3 Limit Dolduğunda Modal

```
┌──────────────────────────────────────────────────┐
│                    😔                            │
│                                                  │
│           Günlük Limit Doldu                     │
│    Bugünlük AI kullanım hakkın bitti             │
│                                                  │
│ ─────────────────────────────────────────────────│
│                                                  │
│ Ama endişelenme! İşte yapabileceklerin:          │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ ⏰ Yarın tekrar dene                        │ │
│ │    Hakkın yarın saat 00:00'da yenilenecek   │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ 👨‍🏫 Öğretmeninden yardım iste                │ │
│ │    Öğretmenin her zaman sana yardımcı olabilir│ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📚 Kendi başına çalış                       │ │
│ │    Notlarını ve kitabını kullanarak devam et │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│                              [Anladım]           │
└──────────────────────────────────────────────────┘
```

---

## 🎨 6. Görsel Tasarım İlkeleri

### 6.1 Renk Paleti

| Element | Açık Mod | Koyu Mod | Anlam |
|---------|----------|----------|-------|
| AI Gradient | `blue-500 → purple-500` | `blue-600 → purple-600` | AI tanımlayıcı |
| Uyarı | `amber-50/500` | `amber-900/300` | Dikkat |
| Hata | `red-50/500` | `red-900/300` | Problem |
| Başarı | `green-50/500` | `green-900/300` | Onay |

### 6.2 İkonografi

| Icon | Anlam |
|------|-------|
| 🎓 | AI Koç |
| 💡 | İpucu/Fikir |
| 📚 | Öğrenme/Kaynak |
| ⚠️ | Uyarı |
| 👨‍🏫 | Öğretmen |
| 📊 | Analiz |
| ✍️ | Üretim |
| ⏰ | Zaman/Bekleme |

### 6.3 Animasyon

- **Thinking indicator**: Yumuşak pulse + dots animasyonu
- **Message appear**: Slide-in from left (AI) / right (User)
- **Progress bars**: Smooth transition (500ms)
- **Button hover**: Scale 1.02 + shadow increase

---

## 📱 7. Responsive Tasarım

### Desktop (≥1024px)
- Sidebar veya modal olarak AI panel
- Full chat experience
- Detaylı kota görünümü

### Tablet (768-1023px)
- Full-width modal
- Simplified quota
- Touch-friendly buttons

### Mobile (<768px)
- Full-screen overlay
- Floating action button
- Compact messages
- Bottom sheet for actions

---

## 🔒 8. Güvenlik ve Gizlilik UI

### 8.1 Veri Kullanım Bildirimi

```
ℹ️ Sohbet içeriğin sadece sana yardımcı olmak için kullanılır.
   Öğretmenin veya ailenle paylaşılmaz.
```

### 8.2 Hassas İçerik Uyarısı

```
⚠️ Bu konu hakkında daha fazla bilgi için lütfen bir 
   yetişkinle veya okul danışmanınla konuş.
```

---

## 📁 Dosya Yapısı

```
frontend/src/
├── components/ai/
│   ├── index.ts                 # Barrel export
│   ├── AICoachPersona.tsx       # Persona & Avatar
│   ├── AIChat.tsx               # Chat container
│   ├── AIDisclaimer.tsx         # Uyarı bileşenleri
│   ├── AIQuotaIndicator.tsx     # Kota göstergeleri
│   ├── AIContextHelpers.tsx     # Inline yardım
│   └── AIRoleComponents.tsx     # Rol bazlı paneller
├── stores/
│   └── aiStore.ts               # Zustand state
└── types/
    └── ai.ts                    # TypeScript types
```

---

## ✅ Uygulama Checklist

- [x] AI Type definitions
- [x] AI Coach Persona components
- [x] AI Chat container
- [x] AI Disclaimer & warning components
- [x] AI Quota indicator components
- [x] AI Context helper components
- [x] AI Store (Zustand)
- [x] Role-based AI panels
- [x] Component barrel exports
- [x] UX Strategy documentation

---

## 🚀 Sonraki Adımlar

1. **API Entegrasyonu**: Backend AI service ile bağlantı
2. **Real-time Updates**: WebSocket ile canlı güncellemeler
3. **Offline Support**: Temel işlevsellik için cache
4. **A/B Testing**: Persona ve prompt varyasyonları
5. **Analytics**: Kullanım metrikleri takibi

---

*Son güncelleme: 2024*
*Hazırlayan: AI UX Architect*
