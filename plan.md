# 🎮 Minecraft Discord Botu — Teknik Plan

> Bu doküman bir AI kodlama ajanına (Antigravity, OpenCode, Gemini vb.) doğrudan verilmek üzere hazırlanmıştır. Amaç: plugin gerektirmeyen, tamamen dışarıdan çalışan, açık kaynak, kolay kurulabilir bir Minecraft topluluğu Discord botu.

---

## 1. Proje Özeti

Bot, herhangi bir Minecraft sunucu pluginine ihtiyaç duymadan çalışır. Sunucuya dışarıdan ping atarak veri çeker, topluluk yönetimi (öneri, ticket, moderasyon, rol seçimi, başvuru) için tamamen Discord tarafında çalışan modüller sunar. Tek bir Discord sunucusuna kurulacak şekilde tasarlanmıştır (multi-tenant değil) — herkes kendi botunu kendi `.env` dosyasıyla kurar.

**Temel prensip:** Sunucu tarafında sıfır kurulum. Sadece IP/port bilgisi yeterli.

---

## 2. Teknoloji Yığını

| Katman | Seçim | Neden |
|---|---|---|
| Dil | **TypeScript** | Vibecoding için en geniş dokümantasyon/örnek desteği, tip güvenliği AI'nin ürettiği kodda sessiz hataları engeller |
| Discord kütüphanesi | **discord.js v14** | En olgun, en çok örneği olan kütüphane, slash command + buton + modal + select menu desteği native |
| Veritabanı | **SQLite** | Kurulum gerektirmez, tek dosya, self-host senaryosu için ideal |
| ORM | **Prisma** | Tip güvenli sorgular, migration yönetimi kolay |
| Minecraft ping | **`node-mcstatus`** veya **`minecraft-server-util`** (Java) + gerekirse **`gamedig`** (Bedrock desteği için) | Plugin gerektirmeden sunucu verisi çeker |
| Paket yöneticisi | **pnpm** | Hızlı, disk verimli |
| Env doğrulama | **zod** | `.env` eksik/hatalıysa bot açılışta net hata versin, sessizce çökmesin |

---

## 3. Tasarım Prensipleri

### 3.1 Embed Renk Sistemi
Tüm mesajlar embed olacak. Renkler sabit bir yardımcı fonksiyondan gelecek, hiçbir komut kendi rengini elle yazmayacak:

```ts
// src/utils/embeds.ts
export const Colors = {
  BRAND: process.env.EMBED_COLOR ?? "#D4AF37", // .env'den, ana marka rengi
  SUCCESS: "#57F287", // sabit, değiştirilemez
  ERROR: "#ED4245",   // sabit, değiştirilemez
  WARNING: "#FEE75C", // sabit, değiştirilemez
};
```

- **BRAND**: bilgi/nötr embedler (`/sunucu`, ticket açılış, karşılama mesajı, öneri embedi vb.) — kullanıcı `.env`'den kendi rengine çevirebilir
- **SUCCESS / ERROR / WARNING**: her zaman sabit, kullanıcı override edemez (tutarlılık için)

Her embed'de footer veya yazar (author) kısmında **sunucu adı** (`process.env.SERVER_NAME`) + timestamp bulunur. Tasarımlar modern, göze hitap eden ve şık olmalıdır. Tek bir `createEmbed()`, `successEmbed()`, `errorEmbed()`, `warningEmbed()` fonksiyonu tüm projede kullanılır — kod asistanına bu kısıtı özellikle belirt, aksi halde her dosyada farklı görünümde embed üretir.

### 3.2 Slash Command Zorunluluğu
Prefix komut yok, sadece `/` komutları. Komut isimleri Türkçe (topluluk Türkçe konuşuyor), kod içindeki değişken/fonksiyon isimleri İngilizce standart.

### 3.3 Gerekli Gateway Intent'leri
⚠️ Kod asistanına özellikle iletilmeli — bunlar eksik olursa ilgili event'ler hiç tetiklenmez:

```
Guilds
GuildMembers        (privileged — Discord Developer Portal'dan açılmalı)
GuildMessages
MessageContent      (privileged — öneri kanalı + mesaj düzenleme/silme logu için şart)
GuildMessageReactions
GuildModeration     (ban/unban event'leri için)
GuildVoiceStates    (sadece ses istatistik kanalı güncellemesi kullanılacaksa)
```

---

## 4. Ortam Değişkenleri (`.env.example`)

```env
# ── Bot Temel ──────────────────────────────
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID=
SERVER_NAME=MCTR Sunucusu
EMBED_COLOR=#D4AF37

# ── Minecraft Sunucu İzleme ────────────────
MC_SERVER_IP=
MC_SERVER_PORT=25565
MC_SERVER_TYPE=java              # java | bedrock
PING_INTERVAL_SECONDS=60         # /sunucu ve çökme kontrolü için
STAT_CHANNEL_UPDATE_MINUTES=10   # istatistik kanal İSMİ güncelleme aralığı (Discord rate limit nedeniyle düşük tutulmamalı)
STATS_CHANNEL_PLAYERCOUNT_ID=
STATS_CHANNEL_RECORD_ID=
SERVER_OFFLINE_ALERT_CHANNEL_ID=
SERVER_OFFLINE_ALERT_ROLE_ID=

# ── Karşılama / Ayrılma (Lobi) ─────────────
LOBBY_CHANNEL_ID=
AUTO_ROLE_ID=                    # katılınca otomatik verilir, boşsa verilmez

# ── Öneri Sistemi ───────────────────────────
SUGGESTIONS_CHANNEL_ID=
SUGGESTIONS_CHANGELOG_CHANNEL_ID=
SUGGESTIONS_REVIEWER_ROLE_ID=

# ── Moderasyon ───────────────────────────────
MOD_LOG_CHANNEL_ID=
MOD_ROLE_IDS=                    # virgülle ayrılmış, örn: 111,222
WARN_LIMIT_MUTE=3                # uyarı eşiği → otomatik susturma, 0 = kapalı (warn asla kick üretmez)

# ── Ticket Sistemi ───────────────────────────
TICKET_CATEGORY_ID=
TICKET_PANEL_CHANNEL_ID=
TICKET_LOG_CHANNEL_ID=
TICKET_STAFF_ROLE_IDS=           # tüm ticket kategorilerini gören yetkili roller, virgülle ayrılmış

# ── Yetkili Başvurusu ─────────────────────────
STAFF_APP_CHANNEL_ID=
STAFF_APP_PING_ROLE_ID=          # yeni başvuruda ping atılacak rol (opsiyonel)
```

---

## 5. Veritabanı Şeması (Prisma)

Bilinçli olarak sade tutuldu — tek sunucu senaryosu olduğu için `guildId` alanı yok.

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./data.db"
}

generator client {
  provider = "prisma-client-js"
}

model Suggestion {
  id          Int      @id @default(autoincrement())
  authorId    String
  content     String
  status      String   @default("pending") // pending | accepted | rejected
  messageId   String
  threadId    String?
  reviewedBy  String?
  createdAt   DateTime @default(now())
}

model ModCase {
  id          Int      @id @default(autoincrement())
  type        String   // ban | kick | mute | unmute | unban | warn
  targetId    String
  moderatorId String
  reason      String?
  durationMin Int?
  createdAt   DateTime @default(now())
}

model Warning {
  id          Int      @id @default(autoincrement())
  userId      String
  moderatorId String
  reason      String
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model Ticket {
  id           Int       @id @default(autoincrement())
  ticketNumber Int       @unique
  channelId    String    @unique
  category     String    // hile | magaza | sikayet | diger
  ownerId      String
  claimedBy    String?
  claimedAt    DateTime?
  status       String    @default("open") // open | closed
  closedBy     String?
  closeReason  String?
  rating       Int?      // 1-5
  createdAt    DateTime  @default(now())
  closedAt     DateTime?
}

model StaffApplication {
  id         Int      @id @default(autoincrement())
  userId     String
  answers    String   // JSON string
  status     String   @default("pending") // pending | accepted | rejected
  reviewedBy String?
  createdAt  DateTime @default(now())
}
```

---

## 6. Özellik Modülleri

### 6.1 Sunucu İzleme (Ping & Status)

- `PING_INTERVAL_SECONDS` aralığıyla sunucuya ping atılır (`minecraft-server-util` / `gamedig`)
- **İstatistik kanalları**: Ses/metin kanal ismi periyodik güncellenir (örn: `🟢 Aktif: 45/100`). ⚠️ Discord kanal ismi değişikliği **saatte ~2 defa** ile sınırlıdır — `STAT_CHANNEL_UPDATE_MINUTES` en az 10 dk önerilir, değer değişmediyse API çağrısı hiç yapılmamalı
- `/sunucu` komutu: IP, MOTD, ping (ms), oyuncu sayısı, aktif oyuncu listesi (varsa) — BRAND renginde embed
- Ping başarısız olursa `SERVER_OFFLINE_ALERT_CHANNEL_ID`'ye `SERVER_OFFLINE_ALERT_ROLE_ID` etiketiyle uyarı düşer. Ardışık başarısız ping olmadan tek seferde alarm vermemeli (en az 2-3 ardışık başarısızlık sonrası — false-positive'i önler)

### 6.2 Öneri Sistemi

Akış tamamen kanal mesajı tabanlı, slash komut değil:

1. Kullanıcı `SUGGESTIONS_CHANNEL_ID` kanalına düz mesaj atar
2. Bot orijinal mesajı **anında siler**
3. Bot embed olarak yeniden basar: yazar (avatar+isim), içerik, durum etiketi `⏳ İnceleniyor`
4. Embed altına 👍 👎 **reaction** eklenir (herkese açık topluluk oylaması)
5. İki buton eklenir: `✅ Kabul Et` / `❌ Reddet` — sadece `SUGGESTIONS_REVIEWER_ROLE_ID` rolüne sahip kullanıcılar basabilir, diğerlerine ephemeral "Bu işlem için yetkin yok" döner
6. Mesajın altında otomatik **thread** açılır, tartışma orada devam eder
7. Kabul/Red durumunda: embed rengi SUCCESS/ERROR'a döner, "✅ [Yetkili] tarafından kabul edildi" notu eklenir, butonlar devre dışı bırakılır
8. Kabul edilenler otomatik olarak `SUGGESTIONS_CHANGELOG_CHANNEL_ID`'ye de düşer

### 6.3 Moderasyon Sistemi

- Komutlar: `/ban` `/kick` `/mute` `/unmute` `/unban` `/warn` `/uyarılar` `/vaka` `/geçmiş` `/işlemler`
- **Mute**, custom rol yerine Discord'un **native timeout** özelliğiyle yapılır (`GuildMember.timeout()`) — izin overwrite karmaşasına girmez, max 28 gün
- Her aksiyon `ModCase` tablosuna kaydedilir, ardışık numara alır (case ID)
- Her aksiyon `MOD_LOG_CHANNEL_ID`'ye embed olarak düşer: kim, kime, ne zaman, neden
- **DM gönderilmez** — tüm bildirim mod-log kanalı üzerinden yapılır
- WARN_LIMIT_KICK kaldırıldı: warn **asla** kick üretmez. Warn eskalasyonu sadece `WARN_LIMIT_MUTE` içindir (0 = kapalı): eşik aşılanınca 1 günlük otomatik timeout + mod-log kaydı
- `/geçmiş <kullanıcı>`: o kullanıcının tüm ceza geçmişi (vakalar + uyarılar, özet istatistik)
- `/işlemler <kullanıcı>`: seçilen yetkilinin gerçekleştirdiği tüm işlem geçmişi (moderatorId bazlı)
- `/mute` ve `/unmute` yetki kapısı: `MOD_ROLE_IDS`'deki roller **veya** Discord'un native "Timeout Members" iznine sahip üyeler (yeni env değişkeni gerekmez). Diğer tüm moderasyon komutları yalnızca `MOD_ROLE_IDS`

### 6.4 Ticket Sistemi

**Açılış:**
1. `TICKET_PANEL_CHANNEL_ID` kanalında sabit tek buton: `🎫 Ticket Oluştur`
2. Basınca select menu açılır: Oyun İçi Hile Bildirimi / Mağaza-VIP Sorunları / Yetkili Şikayeti / Diğer
3. Kategori seçilince özel kanal oluşur (`ticket-hile-0007` gibi, `ticketNumber` DB'den artan)
4. Kanal izinleri: sadece ticket sahibi + `TICKET_STAFF_ROLE_IDS`'deki roller + bot görebilir
5. Açılış embedinde: kategori, sahip, oluşturulma zamanı + `👤 Devral` butonu

**Devralma:**
- `👤 Devral` basan yetkili ticket'a atanır, embed `İlgilenen: [isim]` olarak güncellenir, buton `Devralmayı Bırak`'a döner
- ⚠️ **Race condition önlemi (kritik)**: DB update'i `WHERE claimedBy IS NULL` koşuluyla atomik yapılmalı. İki yetkili aynı anda basarsa ilk isteği kazanır, ikinciye ephemeral "Bu ticket zaten devralındı" döner
- Sadece devralan yetkili veya admin devralmayı bırakabilir/kapatabilir

**Kapanış:**
1. `/kapat` komutu veya `🔒 Kapat` butonu — devralan yetkili, admin veya ticket sahibi kullanabilir
2. Modal ile opsiyonel kapanış sebebi istenir
3. Transcript (mesaj geçmişi, basit HTML/txt) oluşturulur ve `TICKET_LOG_CHANNEL_ID`'ye gönderilir — **kanal silinmeden önce mutlaka**, kanıt kaybı olmasın
4. Aynı transcript `safeDm()` üzerinden sahibinin DM'ine de gönderilir (kullanıcı geçmişini kendi DM'inde görür). DM kapalıysa sessizce atlanır — log kanalındaki kayıt esas alınır, akış çökmez
5. Kanal silinir
6. DM'e ulaştıysa, DM içinde 1-5 yıldız butonlu puanlama embed'i gönderilir: "✦ Deneyiminizi puanlamak ister misiniz?"
7. **Puanlama asla kapanışı engellemez**: DM kapalıysa veya kullanıcı puanlamazsa hiçbir akış beklemez/durmaz. Butonun süre sınırı yoktur — geç tıklansa bile `Ticket.rating` kaydedilir (tıklayanın önce ticket sahibi olduğu interaction anında yeniden doğrulanır). Puanlanmamış ticket'lar leaderboard'a dahil edilmez

**Erişim Matrisi:**

| Aksiyon | Kim yapabilir |
|---|---|
| Ticket aç | Herkes (aynı anda sadece 1 açık ticket) |
| Devral | `TICKET_STAFF_ROLE_IDS` içindeki herhangi bir destek yetkilisi |
| Devralmayı bırak | Sadece devralan yetkili veya admin |
| Kapat | Devralan yetkili, admin veya ticket sahibi |
| Puanla | Sadece ticket sahibi |

**Leaderboard:**
- `/yetkili-sıralama`: ortalama puan + toplam çözülen ticket sayısına göre sıralı embed listesi

### 6.5 Karşılama / Ayrılma (Lobi Kanalı)

- Katılımda `LOBBY_CHANNEL_ID`'ye embed: kullanıcı etiketi, avatar, "X. üye", katılma tarihi
- `AUTO_ROLE_ID` doluysa katılır katılmaz otomatik verilir — buton/onay adımı **yok**, direkt
- Ayrılışta da aynı `LOBBY_CHANNEL_ID`'ye embed: "👋 [isim] sunucudan ayrıldı — X gündür üyeydi"
- **Hiçbir DM gönderilmez**
- Canvas/banner görseli **yok** — düz ama şık embed yeterli (herkesin sunucusuna uyacak tek bir görsel tasarım mümkün değil)

### 6.6 Yetkili Başvuru Sistemi

- `/başvuru` komutu modal açar: motivasyon, deneyim, aktif olunabilecek saatler gibi birkaç text input
- Cevaplar `StaffApplication.answers` alanına JSON olarak kaydedilir
- `STAFF_APP_CHANNEL_ID`'ye embed olarak düşer, `STAFF_APP_PING_ROLE_ID` varsa etiketlenir
- Kabul/Red butonları (öneri sistemiyle aynı desen) yetkili tarafından işaretlenir

---

## 7. Komut Listesi

| Komut | Açıklama | Yetki |
|---|---|---|
| `/sunucu` | Sunucu bilgisi | Herkes |
| `/ban <kullanıcı> <sebep>` | Yasakla | Yetkili |
| `/kick <kullanıcı> <sebep>` | At | Yetkili |
| `/mute <kullanıcı> <süre> <sebep>` | Sustur (timeout) | Yetkili |
| `/unmute <kullanıcı>` | Susturmayı kaldır | Yetkili |
| `/unban <kullanıcı_id>` | Yasağı kaldır | Yetkili |
| `/warn <kullanıcı> <sebep>` | Uyar | Yetkili |
| `/uyarılar <kullanıcı>` | Uyarı listesi | Yetkili |
| `/vaka <numara>` | Vaka detayı | Yetkili |
| `/geçmiş <kullanıcı>` | Tüm moderasyon geçmişi | Yetkili |
| `/işlemler <kullanıcı>` | Yetkilinin işlem geçmişi | Yetkili |
| `/kapat` | Aktif ticket'ı kapat | Devralan/Admin/Sahip |
| `/yetkili-sıralama` | Puan liderlik tablosu | Herkes |
| `/başvuru` | Yetkili başvurusu (modal) | Herkes |
| `/yardım` | Tüm komutları ve açıklamalarını listeler | Herkes |
| `/panel-oluştur ticket` | Ticket panelini bas | Admin |

---

## 8. Klasör Yapısı

```
mc-discord-bot/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── index.ts
│   ├── config/
│   │   └── env.ts                 # zod ile .env doğrulama
│   ├── commands/
│   │   ├── genel/                 # sunucu
│   │   ├── moderasyon/            # ban, kick, mute, warn, gecmis...
│   │   ├── ticket/                # kapat, yetkili-siralama
│   │   ├── basvuru/               # basvuru
│   │   └── kurulum/               # panel-olustur
│   ├── events/
│   │   ├── ready.ts
│   │   ├── interactionCreate.ts
│   │   ├── guildMemberAdd.ts
│   │   ├── guildMemberRemove.ts
│   │   └── messageCreate.ts       # öneri kanalı yakalama
│   ├── handlers/
│   │   ├── buttons/                # ticketClaim, ticketClose, suggestionApprove...
│   │   ├── selectMenus/            # ticketCategorySelect
│   │   └── modals/                 # ticketCloseReason, staffApplication
│   ├── services/
│   │   ├── mcPing.service.ts
│   │   ├── ticket.service.ts
│   │   ├── moderation.service.ts
│   │   ├── suggestion.service.ts
│   │   └── transcript.service.ts
│   ├── utils/
│   │   ├── embeds.ts               # createEmbed, successEmbed, errorEmbed, warningEmbed
│   │   ├── logger.ts
│   │   └── permissions.ts
│   ├── database/
│   │   └── prisma.ts               # PrismaClient singleton
│   └── types/
│       └── index.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 9. Güvenlik / Edge Case Notları

⚠️ Kod asistanına doğrudan iletilmesi gereken kritik noktalar:

1. **Ticket claim race condition**: `WHERE claimedBy IS NULL` koşuluyla atomik update, ilk isteği kazanır
2. **Tek açık ticket kuralı**: Yeni ticket denemesinde açık ticket'ı varsa engelle
3. **Transcript garantisi**: Kanal silinmeden önce mutlaka transcript alınmalı
4. **Kanal ismi rate limit**: İstatistik kanal ismi çok sık güncellenmemeli (10 dk+ önerilir), değer değişmediyse API çağrısı atlanmalı
5. **DM yasağı**: Botun hiçbir modülü kullanıcıya DM atmamalı — tüm bildirimler kanal içi
6. **Env doğrulama**: Bot açılışında zorunlu env değişkenleri eksikse net hata mesajıyla durmalı, sessizce çökmemeli
7. **Yetki kontrolü her etkileşimde**: Buton/select/modal handler'larında custom ID sahibi/rolü her seferinde tekrar kontrol edilmeli (Discord tarafında cache'e güvenilmemeli)
8. **Privileged Intent'ler**: `GuildMembers` ve `MessageContent` Discord Developer Portal'dan manuel açılmadıkça bot bağlanamaz — README'de bu adım net belirtilmeli

---

## 10. Kapsam Dışı (Bilinçli Olarak MVP'ye Dahil Edilmedi)

Bunlar iyi fikirler ama scope'u şişirmemek için sonraki sürüme bırakıldı:

- **RCON entegrasyonu** (Discord↔oyun içi sohbet köprüsü) — sadece kendi sunucusu için RCON erişimi olanlar isteğe bağlı ekleyebilir, genel dağıtımda gerekli değil
- **Web yönetim paneli** — `.env` düzenlemek yerine tarayıcıdan ayar yapma imkânı, ileride Reliance altyapısıyla reuse edilebilir
- **Whitelist kontrolü** — sunucu dosyasına erişim gerektirdiği için "tamamen dışarıdan" prensibiyle çelişir
- **Geçici ban (otomatik unban zamanlaması)** — job queue gerektirir, ayrı bir altyapı işi
- **Uptime geçmişi grafiği** — ping verisini zaman serisi olarak tutup grafik çizmek, ek bir tabloya ihtiyaç duyar
- **Minecraft hesap araçları** (`/cilt`, `/isim-geçmişi`) — Crafatar/Mojang API dışa bağımlı; MVP'ye dahil edilmedi, ileride istenirse eklenebilir

---

## 11. Kurulum Notu

- SQLite dosya tabanlı olduğu için bot **her zaman açık kalan bir süreç** olarak çalışmalı (VPS, Oracle Cloud Always Free VM, PM2 ile) — serverless/stateless platformlar (Vercel gibi) hem Discord gateway bağlantısı hem de SQLite kalıcılığı açısından uygun değildir
- Kurulum sırası: `pnpm install` → `.env` doldur → `npx prisma migrate dev` → slash komutları kaydet (`deploy-commands` script'i) → `pnpm start`
