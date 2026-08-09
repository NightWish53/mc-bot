import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MessageFlags, type ModalSubmitInteraction } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { errorEmbed } from '../../utils/embeds.js';

const moduleDir = dirname(fileURLToPath(import.meta.url));

export interface ModalHandler {
  customIdPrefix: string;
  run: (interaction: ModalSubmitInteraction) => Promise<void>;
}

const modalHandlers = new Map<string, ModalHandler>();

for (const file of readdirSync(moduleDir)) {
  if (!/\.(ts|js)$/.test(file) || file === 'index.ts') continue;
  const mod = (await import(pathToFileURL(join(moduleDir, file)).href)) as {
    default?: ModalHandler | ModalHandler[];
  };
  if (!mod.default) continue;
  const entries = Array.isArray(mod.default) ? mod.default : [mod.default];
  for (const entry of entries) {
    modalHandlers.set(entry.customIdPrefix, entry);
    logger.info(`Modal handler yüklendi: ${entry.customIdPrefix}`);
  }
}

export async function handleModal(interaction: ModalSubmitInteraction): Promise<void> {
  const prefix = interaction.customId.split(':')[0] ?? '';
  const handler = modalHandlers.get(prefix);
  if (!handler) {
    await interaction.reply({
      embeds: [errorEmbed('Bilinmeyen form', 'Bu form artık geçerli değil.')],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await handler.run(interaction);
  } catch (error) {
    logger.error(`Modal hatası (${interaction.customId}):`, error);
    const message = 'Bir şeyler ters gitti. Lütfen tekrar deneyin.';
    if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed('Hata', message)] });
    } else if (!interaction.replied) {
      await interaction.reply({ embeds: [errorEmbed('Hata', message)], flags: MessageFlags.Ephemeral });
    }
  }
}