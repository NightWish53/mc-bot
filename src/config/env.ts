import { loadEnvFile } from 'node:process';
import { z } from 'zod';

loadEnvFile();

const idList = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0),
  );

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN boş olamaz'),
  CLIENT_ID: z.string().min(1, 'CLIENT_ID boş olamaz'),
  GUILD_ID: z.string().min(1, 'GUILD_ID boş olamaz'),
  SERVER_NAME: z.string().min(1).default('MC Sunucusu'),
  EMBED_COLOR: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'EMBED_COLOR #RRGGBB formatında olmalı').default('#D4AF37'),
  WEBSITE_URL: z.string().default(''),

  MC_SERVER_IP: z.string().default(''),
  MC_SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(25565),
  PING_INTERVAL_SECONDS: z.coerce.number().int().min(10).default(60),
  STAT_CHANNEL_UPDATE_MINUTES: z.coerce.number().int().min(10).default(10),
  STATS_CHANNEL_PLAYERCOUNT_ID: z.string().default(''),
  STATS_CHANNEL_RECORD_ID: z.string().default(''),
  SERVER_OFFLINE_ALERT_CHANNEL_ID: z.string().default(''),
  SERVER_OFFLINE_ALERT_ROLE_ID: z.string().default(''),

  LOBBY_CHANNEL_ID: z.string().default(''),
  AUTO_ROLE_ID: z.string().default(''),

  SUGGESTIONS_CHANNEL_ID: z.string().default(''),

  MOD_LOG_CHANNEL_ID: z.string().default(''),
  MOD_ROLE_IDS: idList,
  WARN_LIMIT_MUTE: z.coerce.number().int().min(0).default(3),

  TICKET_CATEGORY_ID: z.string().default(''),
  TICKET_PANEL_CHANNEL_ID: z.string().default(''),
  TICKET_LOG_CHANNEL_ID: z.string().default(''),
  TICKET_STAFF_ROLE_IDS: idList,

  STAFF_APP_CHANNEL_ID: z.string().default(''),

  STAFF_APP_QUESTION_1: z.string().default('Adınız ve Yaşınız?'),
  STAFF_APP_QUESTION_2: z.string().default('Daha önceki tecrübeleriniz neler?'),
  STAFF_APP_QUESTION_3: z.string().default('Neden yetkili olmak istiyorsunuz?'),
  STAFF_APP_QUESTION_4: z.string().default('Günlük aktif olabileceğiniz saatler?'),
  STAFF_APP_QUESTION_5: z.string().default('Eklemek istediğiniz bir şey var mı? (İsteğe Bağlı)'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error('❌ .env doğrulaması başarısız oldu. Aşağıdaki değişkenlerde sorun var:\n' + lines);
  console.error('Düzeltme için .env dosyanızı kontrol edin (şablon: .env.example).');
  process.exit(1);
}

export const env: Env = parsed.data;