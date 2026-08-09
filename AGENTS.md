ık AGENTS.md

Bu dosya bu repoda çalışan her AI kodlama ajanı (Antigravity, OpenCode, Gemini, Claude Code vb.) için geçerlidir. Kod yazmadan önce bu dosyayı ve plan.md'yi oku. plan.md ne yapılacağını, bu dosya nasıl yapılacağını anlatır.

1. Proje Kimliği

Plugin gerektirmeyen, tek Discord sunucusuna kurulan, açık kaynak Minecraft topluluk botu. Tam özellik listesi ve mimari için → plan.md.

Değiştirilemez teknoloji kararları (aksini önerme, aksini uygulama):

Karar	Değer
Dil	TypeScript (strict mode açık)
Kütüphane	discord.js v14
Veritabanı	SQLite + Prisma
Paket yöneticisi	pnpm
Mute mekanizması	Discord native timeout() — custom mute rolü yok
Komut tipi	Sadece slash command — prefix komut yok

Bu tablodaki hiçbir satırı "daha iyi olur" diyerek değiştirme. Kullanıcı bilinçli olarak bu seçimleri yaptı.

2. Sabit Kurallar (Hard Rules)

Bunlar kod incelemesinde otomatik red sebebidir:

Hiçbir modül kullanıcıya doğrudan DM atmaz. DM gönderimi YALNIZCA src/utils/dm.ts içindeki safeDm() fonksiyonu üzerinden yapılır. safeDm, DM kapalıysa (hata 50007) veya başka bir hata olursa sessizce false döner — hiçbir akış DM yüzünden çökmez. İzin verilen tek DM akışı: ticket kapanışında sahibine transcript göndermek + o DM içindeki 1-5 puanlama butonları. Karşılama mesajı, moderasyon bildirimi, öneri bildirimi, lobby mesajı — hepsi kesin olarak kanal içi kalır. Bir özellik DM gerektiriyor gibi görünüyorsa ve ticket dışındaysa, kanal içi ephemeral/buton alternatifi bul.
Renk her zaman src/utils/embeds.ts'den gelir. Hiçbir dosyada .setColor("#xxxxxx") elle yazılmaz. Colors.BRAND, Colors.SUCCESS, Colors.ERROR, Colors.WARNING dışında renk kullanılmaz.
Hiçbir Discord ID kod içine hardcode edilmez. Kanal/rol/kategori ID'leri her zaman src/config/env.ts üzerinden okunur.
Ticket claim işlemi atomik olmalı. UPDATE ... WHERE claimedBy IS NULL deseninin dışına çıkma. Önce oku-sonra-yaz (read-then-write) deseni kullanma, race condition'a açık.
Kanal silmeden önce transcript alınmadan hiçbir ticket kapatma kodu tamamlanmış sayılmaz.
İstatistik kanal ismi güncellemesi debounce'lu olmalı — değer değişmediyse API çağrısı yapılmaz, STAT_CHANNEL_UPDATE_MINUTES altına düşülmez.
Her buton/select/modal handler'ı, custom ID'den çıkardığı sahiplik/rol bilgisini interaction anında yeniden kontrol eder. Önbelleğe veya önceki kontrole güvenilmez.
3. Kod Konvansiyonları
Kullanıcıya görünen metin: Türkçe (komut isimleri, embed içerikleri, hata mesajları)
Kod: değişken/fonksiyon/dosya isimleri İngilizce, camelCase (dosya isimleri: ticketClaim.ts, mcPing.service.ts)
Her slash komut kendi dosyasında, src/commands/<kategori>/<komut-adi>.ts altında, ilgili kategori klasörüne (genel, moderasyon, ticket, basvuru, kurulum)
Servis katmanı (src/services/) iş mantığını tutar; komut dosyaları (src/commands/) sadece interaction'ı parse edip servisi çağırır ve embed döner. Komut dosyasına doğrudan Prisma sorgusu yazma.
Tek PrismaClient singleton'ı (src/database/prisma.ts) — her dosyada new PrismaClient() çağırma.
4. Yeni Slash Komut Ekleme Şablonu

Bir komut eklerken bu sırayı izle:

src/commands/<kategori>/<isim>.ts dosyasını oluştur, SlashCommandBuilder ile tanımla
İşlem 3 saniyeden uzun sürebilecekse (Minecraft ping, transcript oluşturma, audit log fetch gibi) ilk satırda interaction.deferReply() çağır — aksi halde Discord "Bu etkileşim başarısız oldu" hatası gösterir
İş mantığını src/services/ altındaki ilgili servise yaz, komut dosyası sadece çağırsın
Yanıtı createEmbed()/successEmbed()/errorEmbed() ile oluştur
Yetki kontrolü gerekiyorsa src/utils/permissions.ts üzerinden yap, komut içinde elle rol ID karşılaştırması yazma
Komutu deploy script'ine (slash komut kaydı) otomatik alınacak şekilde bırak — komutlar guild-scoped (GUILD_ID) kaydedilir, global değil (anında yayına girmesi için)
5. Sık Yapılan Hatalar (Dikkat Et)

Discord bot geliştirmede AI ajanlarının en sık düştüğü tuzaklar, bu projeye özel olarak:

deferReply unutmak: Minecraft sunucusuna ping atan veya transcript oluşturan her komut/handler'da mutlaka defer edilmeli.
Privileged intent unutmak: GuildMembers ve MessageContent hem kodda (GatewayIntentBits) hem Discord Developer Portal'da açılmalı. Biri eksikse ilgili event'ler sessizce hiç tetiklenmez, hata da vermez — bu debug'ı zorlaştırır.
Ephemeral yanıt unutmak: Yetkisiz kullanıcıya dönen hata mesajları (Bu butonu kullanma yetkin yok gibi) her zaman ephemeral: true olmalı, herkese açık kanalda görünmemeli.
Aynı anda çift ticket açılması: Yeni ticket oluşturma handler'ı her zaman önce kullanıcının açık ticket'ı var mı diye DB'den kontrol etmeli.
Channel rename rate limit'ine takılmak: İstatistik kanalı çok sık güncellenirse bot geçici olarak rate limit yer, tüm diğer API çağrıları da gecikir. Debounce şart.
Env değişkeni eksikken sessiz çökme: env.ts zod ile parse edilirken hata varsa process.exit(1) ile açık, okunabilir hata mesajı basılmalı (hangi değişken eksik/hatalı net yazılmalı).
6. Ortam Değişkenleri Kuralları
.env asla commit edilmez, .gitignore'da olmalı
.env.example her zaman güncel tutulur, ama içinde gerçek ID/token olmaz, sadece boş anahtarlar
Yeni bir özellik yeni bir kanal/rol ID'sine ihtiyaç duyuyorsa: önce .env.example'a ekle, sonra env.ts şemasına ekle, sonra kodda kullan — bu sırayı atlama
7. Güvenlik Kontrol Listesi (Her Interaction Handler İçin)

Yeni bir buton/select/modal handler'ı yazdıktan sonra şunları doğrula:

 Bu etkileşimi tetikleyen kişinin gerçekten yetkisi var mı, kontrol ediliyor mu?
 Yetkisiz erişimde kullanıcıya ephemeral, anlaşılır bir hata dönüyor mu?
 DB yazma işlemi varsa, eşzamanlı iki istekte veri bozulmasını önleyen bir koşul var mı (özellikle ticket claim)?
 İşlem uzun sürebilirse deferReply/deferUpdate çağrıldı mı?
 DM kullanılıyorsa, akış src/utils/dm.ts'teki safeDm() üzerinden mi gidiyor? (DM kapalıysa işlem sessizce gerçekleşmeyecek şekilde tasarlandı mı?)
8. Yasaklı Şeyler

Açıkça istenmedikçe bunları yapma:

PostgreSQL, MongoDB veya başka bir veritabanına geçiş önerme/uygulama
Minecraft sunucusuna plugin/mod kurulumu gerektiren bir çözüm önerme
Prefix tabanlı komut sistemi ekleme
DM gönderen akış ekleme — yalnızca ticket kapanış transcript'i ve DM puanlama butonları olabilir, hepsi src/utils/dm.ts'teki safeDm() üzerinden
Kanal/rol ID'lerini .env dışında bir yerde (JSON config, kod içi sabit) tutma
plan.md'de "kapsam dışı" olarak işaretlenmiş özellikleri (RCON, web panel, whitelist kontrolü, geçici ban, uptime grafiği) sorulmadan ekleme
9. Build / Test Komutları

Script'ler package.json içinde tanımlıdır: pnpm dev, pnpm build, pnpm start, pnpm lint, pnpm typecheck, pnpm deploy-commands, npx prisma migrate dev. Bir ajan bu script'leri değiştirir veya yenilerini eklerse bu bölümü de güncellemeli — AGENTS.md kodla birlikte güncel kalmalı, statik kalmamalı.

Not: pnpm install, postinstall olarak prisma generate çalıştırır. pnpm v11'de native build script izinleri pnpm-workspace.yaml → allowBuilds ile verilir; postinstall'lu yeni bir dependency (esbuild gibi) eklenirse oraya eklenmelidir. .env şeması değişirse src/config/env.ts ve .env.example birlikte güncellenmelidir.
10. Embed ve UI Tasarım Kuralları
- Embed tasarımlarında modern ve şık bir görünüm elde etmek için **Discord'un standart emojilerini uygun yerlerde kullanmalısın** (örn. ✅ İşlem Başarılı, ❌ Hata, ⚠️ Uyarı, 🎮 Sunucu Adresi, 🌐 Web Sitesi). Dümdüz metin sembolleri (✦, ✧) yerine kullanıcı dostu emojiler tercih et.
- Renkler her zaman src/utils/embeds.ts üzerinden çekilmelidir ve modern UI paletlerinden (emerald green, modern red, amber vs.) olmalıdır.
- Embed footer kısımları her zaman düzgün bir emoji veya madde işareti ile (örn. '🎮 Sunucu Adresi' veya '• Sunucu Adı') estetik bir prefix barındırmalıdır.
- Kullanıcı arayüzüne veya embed'lere müdahale edilirken her zaman en şık ve Canva tarzı/modern tasarımlar tercih edilmelidir.
