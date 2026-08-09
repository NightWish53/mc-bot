import { EmbedBuilder, type ColorResolvable } from 'discord.js';
import { env } from '../config/env.js';

export const Colors = {
  BRAND: env.EMBED_COLOR as ColorResolvable,
  SUCCESS: '#10b981' as ColorResolvable, // Modern emerald green
  ERROR: '#ef4444' as ColorResolvable,   // Modern red
  WARNING: '#f59e0b' as ColorResolvable, // Modern amber
};

interface EmbedOptions {
  title?: string;
  description?: string;
  color?: ColorResolvable;
  fields?: EmbedBuilder['data']['fields'];
  footerText?: string;
  author?: { name: string; iconURL?: string };
  thumbnail?: string;
  image?: string;
  timestamp?: boolean;
}

function buildFooter(footerText?: string): { text: string } {
  const server = env.SERVER_NAME;
  return {
    text: footerText ? `${server} • ${footerText}` : `${server}`,
  };
}

export function createEmbed(options: EmbedOptions): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(options.color ?? Colors.BRAND)
    .setFooter(buildFooter(options.footerText));

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.fields) embed.setFields(options.fields);
  if (options.author) embed.setAuthor(options.author);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.timestamp ?? true) embed.setTimestamp(new Date());

  return embed;
}

export function successEmbed(title: string, description?: string, options?: Omit<EmbedOptions, 'title' | 'description'>): EmbedBuilder {
  return createEmbed({ title: `✅ ${title}`, description, color: Colors.SUCCESS, ...options });
}

export function errorEmbed(title: string, description?: string, options?: Omit<EmbedOptions, 'title' | 'description'>): EmbedBuilder {
  return createEmbed({ title: `❌ ${title}`, description, color: Colors.ERROR, ...options });
}

export function warningEmbed(title: string, description?: string, options?: Omit<EmbedOptions, 'title' | 'description'>): EmbedBuilder {
  return createEmbed({ title: `⚠️ ${title}`, description, color: Colors.WARNING, ...options });
}