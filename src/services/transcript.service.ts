import type { Message, TextChannel } from 'discord.js';
import { env } from '../config/env.js';

const MAX_MESSAGES = 2000;



function formatDate(date: Date): string {
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function cleanDiscordMarkdown(text: string, client?: import('discord.js').Client): string {
  return text
    // Remove bold/italic markdown
    .replace(/\*\*/g, '')
    // Parse timestamps: <t:1234567890:R> -> human readable date
    .replace(/<t:(\d+):[a-zA-Z]>/g, (_, ts) => {
      return formatDate(new Date(parseInt(ts, 10) * 1000));
    })
    // Parse user mentions: <@12345> -> @Kullanıcı[12345]
    .replace(/<@!?(\d+)>/g, (_, id) => {
      const user = client?.users.cache.get(id);
      return user ? `@${user.username}` : `@Kullanıcı[${id}]`;
    })
    // Parse role mentions: <@&12345> -> @Rol[$1]
    .replace(/<@&(\d+)>/g, '@Rol[$1]')
    // Parse channel mentions: <#12345> -> #Kanal[$1]
    .replace(/<#(\d+)>/g, '#Kanal[$1]');
}

async function fetchAllMessages(channel: TextChannel): Promise<Message[]> {
  const messages: Message[] = [];
  let beforeId: string | undefined;
  for (;;) {
    const page = await channel.messages.fetch({ limit: 100, ...(beforeId ? { before: beforeId } : {}) });
    messages.push(...page.values());
    if (page.size < 100 || messages.length >= MAX_MESSAGES) break;
    beforeId = page.last()?.id;
  }
  return messages.reverse();
}

export async function buildTranscript(
  channel: TextChannel,
  ticketNumber: number,
  categoryLabel: string,
  closerName: string = 'Bilinmiyor',
  closerId: string = 'Bilinmiyor'
): Promise<Buffer> {
  const messages = await fetchAllMessages(channel);

  const lines: string[] = [];
  lines.push('==================================================');
  lines.push(`🎫 DESTEK TALEBİ ARŞİVİ - #${channel.name}`);
  lines.push(`📅 Kapatılma Tarihi: ${formatDate(new Date())}`);
  lines.push(`🔒 Kapatan: ${closerName} (${closerId})`);
  lines.push('==================================================\n');

  for (const message of messages) {
    const author = message.member?.displayName ?? message.author.tag;
    const dateStr = formatDate(message.createdAt);
    
    // Check if message has embeds
    if (message.embeds.length > 0) {
      lines.push(`[${dateStr}] ${author}:`);
      const embed = message.embeds[0];
      
      lines.push(`    ╭──────────────────────────────────────────────────`);
      if (embed?.title) {
        lines.push(`    │ ${embed.title}`);
        if (embed?.description) lines.push(`    │`);
      }
      if (embed?.description) {
        const descLines = embed.description.split('\n');
        for (const descLine of descLines) {
          lines.push(`    │ ${cleanDiscordMarkdown(descLine, channel.client)}`);
        }
      }
      lines.push(`    ╰──────────────────────────────────────────────────`);
    } else if (message.content.length > 0) {
      // Normal message
      lines.push(`[${dateStr}] ${author}: ${cleanDiscordMarkdown(message.content, channel.client)}`);
    }
    
    // Check if message has attachments
    if (message.attachments.size > 0) {
      lines.push(`[${dateStr}] ${author}: [Eklenti/Dosya - ${message.attachments.size} adet]`);
    }
  }

  if (messages.length === 0) {
    lines.push('Bu kanalda kaydedilmiş mesaj bulunmamaktadır.');
  }

  lines.push('\n==================================================');
  lines.push(`Arşiv Sonu - Toplam ${messages.length} mesaj loglandı.`);

  return Buffer.from(lines.join('\n'), 'utf-8');
}