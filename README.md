# 🎮 Kapsamlı Minecraft Topluluk Botu

Bu bot, Minecraft sunucunuza dışarıdan ping atarak anlık verileri çeken ve tamamen Discord özelliklerini (Slash komutlar, Butonlar, Modallar vb.) kullanarak topluluğunuzu yönetmenizi sağlayan açık kaynaklı bir projedir.

Tek bir sunucu için özelleştirilmiş, kurulumu inanılmaz kolay, hafif ve performanslı bir altyapıya sahiptir.

> 🤖 **Not:** Bu proje, baştan sona **Vibecoding (Yapay Zeka / AI)** yardımıyla, tek satır bile kod yazılmadan insan-yapay zeka etkileşimi ile sıfırdan oluşturulmuştur!

---

## 🌟 Özellikler

*   **⚡ Bağımsız Çalışır:** Sunucuya dışarıdan ping atarak aktif oyuncuları, gecikmeyi ve MOTD'yi anlık olarak çeker.
*   **📊 Canlı İstatistik Kanalları:** Oyuncu sayısı ve rekor oyuncu verilerini otomatik olarak ses veya metin kanalı ismine yansıtır.
*   **🚨 Offline (Çökme) Alarmı:** Sunucu yanıt vermediğinde belirlediğiniz kanala otomatik olarak bildirim gönderir.
*   **🎫 Gelişmiş Ticket Sistemi:** Kategori seçmeli ticket paneli, ticket devralma/bırakma, transcript (log dosyası) ve yıldızlı puanlama sistemi.
*   **💡 Öneri Sistemi:** Üyelerin fikirlerini oylamaya sunan, kabul/red butonlu gelişmiş thread (alt başlık) yapısı.
*   **🛡️ Moderasyon Sistemi:** Ban, Kick, Uyarı, Timeout (Mute) işlemleri ve detaylı ceza geçmişi kaydı.
*   **📝 Yetkili Başvuru Sistemi:** Form (Modal) üzerinden başvuru alma ve özel kanaldan onay/red işlemi.
*   **👋 Lobi / Karşılama:** Sunucuya giren ve çıkan oyuncular için şık embed mesajları ve otomatik rol sistemi.

---

## 🛠️ Kullanılan Teknolojiler

*   **Dil:** TypeScript
*   **Kütüphane:** Discord.js v14
*   **Veritabanı:** SQLite + Prisma ORM (Kurulum gerektirmeyen gömülü veritabanı)
*   **Paket Yöneticisi:** pnpm

---

## 🚀 Kurulum Rehberi

Botu kendi bilgisayarınızda veya bir VDS/VPS (Sanal Sunucu) üzerinde kurmak için **iki farklı yöntem** vardır. Eğer komutlarla uğraşmak istemiyorsanız "Tek Tıkla Kurulum" yöntemini seçebilirsiniz.

### Ön Gereksinimler (Her iki yöntem için de şart)
*   [Node.js](https://nodejs.org/en/) (v18 veya daha güncel bir sürüm önerilir)
*   [pnpm](https://pnpm.io/installation) (Paket yöneticisi: Komut satırına `npm install -g pnpm` yazarak kurabilirsiniz)

---

### Yöntem 1: 🪄 Tek Tıkla Kolay Kurulum (Önerilen)

1. Projeyi ZIP olarak indirin ve bir klasöre çıkartın.
2. Klasörün içindeki **`baslat.bat`** dosyasına çift tıklayın.
3. Bot sizin için otomatik olarak `.env.example` dosyasını kopyalayıp `.env` adında yeni bir dosya oluşturacak ve kapanacaktır.
4. Oluşan `.env` dosyasını sağ tıklayıp "Birlikte Aç -> Not Defteri" diyerek açın. İçine kendi Discord Bot Token'ınızı ve kanal ID'lerinizi girin, kaydedip kapatın.
5. **`baslat.bat`** dosyasına tekrar çift tıklayın. Her şeyi (paketleri, veritabanını, komutları) kendisi kuracak ve botu anında başlatacaktır! 🎉

---

### Yöntem 2: 💻 Klasik Komut Satırı Kurulumu

**1. Dosyaları İndirin:**
Projeyi GitHub üzerinden klonlayın:
```bash
git clone https://github.com/KULLANICI_ADINIZ/proje-adi.git
cd proje-adi
```

**2. Gerekli Paketleri Yükleyin:**
```bash
pnpm install
```

**3. Ayar Dosyasını (Config) Oluşturun:**
Klasörde bulunan `.env.example` dosyasının adını `.env` olarak değiştirin ve içindeki bilgileri doldurun.

> **Önemli:** [Discord Developer Portal](https://discord.com/developers/applications) üzerinden botunuza ait **Privileged Gateway Intents** (Özellikle `Message Content Intent` ve `Server Members Intent`) izinlerini açmayı unutmayın!

**4. Veritabanını Hazırlayın:**
Aşağıdaki komut `prisma/data.db` adında gömülü veritabanınızı oluşturur:
```bash
npx prisma migrate dev --name init
```

**5. Slash Komutlarını Yükleyin:**
```bash
pnpm deploy-commands
```

**6. Botu Başlatın:**
```bash
pnpm start
```
*(Geliştirme aşamasındaysanız kod değişikliklerini anında görmek için `pnpm dev` kullanabilirsiniz.)*

---

## 📁 GitHub'a Yüklerken Bilinmesi Gerekenler
Eğer projeyi forklar veya kendi GitHub hesabınıza yüklerseniz gizliliğiniz korunur. Projede yer alan `.gitignore` dosyası sayesinde;
*   `.env` dosyanız (Token ve şifrelerinizin bulunduğu dosya)
*   `prisma/*.db` (Kendi sunucunuzun verilerini içeren veritabanı dosyası)
*   `node_modules/` (Gereksiz ağırlık yapan kütüphane dosyaları)

gibi hassas verileriniz **asla GitHub'a yüklenmez**. Tamamen güvenle paylaşabilirsiniz.

---

## 👨‍💻 Lisans
Bu proje açık kaynak kodlu olarak topluluğa sunulmuştur. İstediğiniz gibi geliştirebilir ve kullanabilirsiniz!
