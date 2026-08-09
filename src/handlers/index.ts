import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MessageFlags, type ButtonInteraction } from 'discord.js';
import { logger } from '../utils/logger.js';
import { errorEmbed } from '../utils/embeds.js';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const buttonsDir = join(moduleDir, 'buttons');

export interface ButtonHandler {
  customIdPrefix: string;
  run: (interaction: ButtonInteraction) => Promise<void>;
}

const buttonHandlers = new Map<string, ButtonHandler>();

for (const file of readdirSync(buttonsDir)) {
  if (!/\.(ts|js)$/.test(file)) continue;
  const mod = (await import(pathToFileURL(join(buttonsDir, file)).href)) as {
    default?: ButtonHandler | ButtonHandler[];
  };
  if (!mod.default) continue;
  const entries = Array.isArray(mod.default) ? mod.default : [mod.default];
  for (const entry of entries) {
    buttonHandlers.set(entry.customIdPrefix, entry);
    logger.info(`Buton handler yüklendi: ${entry.customIdPrefix}`);
  }
}

export async function handleButton(interaction: ButtonInteraction): Promise<void> {
  const prefix = interaction.customId.split(':')[0] ?? '';
  const handler = buttonHandlers.get(prefix);
  if (!handler) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [errorEmbed('Bilinmeyen buton', 'Bu buton artık geçerli değil.')],
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  try {
    await handler.run(interaction);
  } catch (error) {
    logger.error(`Buton hatası (${interaction.customId}):`, error);
    const message = 'Bir şeyler ters gitti. Lütfen tekrar deneyin.';
    if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed('Hata', message)] });
    } else if (!interaction.replied) {
      await interaction.reply({ embeds: [errorEmbed('Hata', message)], flags: MessageFlags.Ephemeral });
    }
  }
}