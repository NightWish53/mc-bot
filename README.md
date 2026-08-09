# 🎮 Kapsamlı Minecraft Topluluk Botu

Bu bot, Minecraft sunucunuza dışarıdan ping atarak anlık verileri çeken ve tamamen Discord özelliklerini (Slash komutlar, Butonlar, Modallar vb.) kullanarak topluluğunuzu yönetmenizi sağlayan açık kaynaklı bir projedir.

Tek bir sunucu için özelleştirilmiş, kurulumu inanılmaz kolay, hafif ve performanslı bir altyapıya sahiptir.

> 🤖 **Not:** Bu proje, baştan sona **Vibecoding (Yapay Zeka / AI)** yardımıyla, tek satır bile kod yazılmadan insan-yapay zeka etkileşimi ile sıfırdan oluşturulmuştur!

---

## 🌟 Özellikler

*   **⚡ Bağımsız Çalışır:** Sunucuya dışarıdan ping atarak aktif oyuncuları, gecikmeyi ve MOTD'yi anlık olarak çeker.
*   **📊 Canlı İstatistik Kanalları:** Oyuncu sayısı ve rekor oyuncu verilerini otomatik olarak ses kanalı ismine yansıtır.
*   **🚨 Offline (Çökme) Alarmı:** Sunucu yanıt vermediğinde belirlediğiniz kanala otomatik olarak bildirim gönderir.
*   **🎫 Gelişmiş Ticket Sistemi:** Kategori seçmeli ticket paneli, ticket devralma/bırakma, üye ekleme/çıkarma (ticket-ekle / ticket-cikar), transcript (log dosyası) ve yıldızlı puanlama sistemi.
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
*   [Node.js](https://nodejs.org/en/) (v20.12 veya daha güncel bir sürüm şarttır)
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
git clone https://github.com/NightWish53/mc-bot.git
cd mc-bot
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
npx prisma db push
```

**5. Slash Komutlarını Yükleyin:**
```bash
pnpm deploy-commands
```

**6. Projeyi Derleyin ve Başlatın:**
```bash
pnpm build
pnpm start
```
*(Geliştirme aşamasındaysanız kod değişikliklerini anında görmek için `pnpm dev` kullanabilirsiniz.)*

---

## 📜 Komut Listesi

### 🌐 Genel Komutlar (Herkes Kullanabilir)
*   `/sunucu`: Minecraft sunucusunun anlık durumunu ve aktif oyuncuları gösterir.
*   `/yardım`: Gelişmiş, kategorili yardım menüsünü açar.
*   `/kapat`: Bulunduğunuz aktif destek talebini (ticket) sonlandırır.
*   `/yetkili-sıralama`: Yetkililerin ticket çözme ve puan sıralamasını gösterir.

### 🛡️ Moderasyon Komutları (Sadece Yetkililer)
*   `/ban`: Kullanıcıyı sunucudan yasaklar.
*   `/kick`: Kullanıcıyı sunucudan atar.
*   `/mute`: Kullanıcıya zaman aşımı (timeout) uygular.
*   `/unmute`: Kullanıcının zaman aşımını kaldırır.
*   `/unban`: Kullanıcının yasağını kaldırır.
*   `/warn`: Kullanıcıya uyarı verir. (Belirli uyarı sayısında otomatik mute atar.)
*   `/uyarılar`: Kullanıcının aktif uyarılarını listeler.
*   `/vaka`: Belirli bir vaka numarasının detaylarını gösterir.
*   `/geçmiş`: Kullanıcının tüm sicil geçmişini gösterir.
*   `/işlemler`: Bir yetkilinin yaptığı tüm moderasyon işlemlerini listeler.
*   `/ticket-ekle`: Destek talebine başka bir üyeyi dahil eder.
*   `/ticket-cikar`: Destek talebinden bir üyeyi çıkarır.

### ⚙️ Kurulum Komutları (Sadece Yöneticiler)
*   `/panel-oluştur`: Destek talebi açma butonunu bulunduğunuz kanala gönderir.
*   `/başvuru-paneli`: Yetkili başvuru formunu bulunduğunuz kanala gönderir.

---

## 📁 GitHub'a Yüklerken Bilinmesi Gerekenler
Eğer projeyi forklar veya kendi GitHub hesabınıza yüklerseniz gizliliğiniz korunur. Projede yer alan `.gitignore` dosyası sayesinde;
*   `.env` dosyanız (Token ve şifrelerinizin bulunduğu dosya)
*   `prisma/*.db` (Kendi sunucunuzun verilerini içeren veritabanı dosyası)
*   `node_modules/` (Gereksiz ağırlık yapan kütüphane dosyaları)

gibi hassas verileriniz **asla GitHub'a yüklenmez**. Tamamen güvenle paylaşabilirsiniz.

---

## 👨‍💻 Lisans
Bu proje **MIT Lisansı** altında açık kaynak kodlu olarak topluluğa sunulmuştur. Detaylar için `LICENSE` dosyasına göz atabilirsiniz. İstediğiniz gibi geliştirebilir ve kullanabilirsiniz!
