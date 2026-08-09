import type { Message } from 'discord.js';
import { env } from '../config/env.js';
import { postSuggestion } from '../services/suggestion.service.js';
import { logger } from '../utils/logger.js';

export default {
  name: 'messageCreate',
  once: false,
  async execute(message: Message) {
    if (message.author.bot) return;
    if (!env.SUGGESTIONS_CHANNEL_ID) return;
    if (message.channel.id !== env.SUGGESTIONS_CHANNEL_ID) return;
    if (message.channel.isThread()) return;

    const content = message.content.trim();
    if (!content) return;

    try {
      await message.delete();
    } catch (error) {
      logger.warn('Öneri mesajı silinemedi.', error);
    }

    try {
      await postSuggestion(message, content);
    } catch (error) {
      logger.error('Öneri yayınlanamadı.', error);
    }
  },
};