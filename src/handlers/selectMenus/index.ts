import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MessageFlags, type StringSelectMenuInteraction } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { errorEmbed } from '../../utils/embeds.js';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const selectMenusDir = moduleDir;

export interface SelectMenuHandler {
  customIdPrefix: string;
  run: (interaction: StringSelectMenuInteraction) => Promise<void>;
}

const selectMenuHandlers = new Map<string, SelectMenuHandler>();

for (const file of readdirSync(selectMenusDir)) {
  if (!/\.(ts|js)$/.test(file) || file === 'index.ts') continue;
  const mod = (await import(pathToFileURL(join(selectMenusDir, file)).href)) as {
    default?: SelectMenuHandler | SelectMenuHandler[];
  };
  if (!mod.default) continue;
  const entries = Array.isArray(mod.default) ? mod.default : [mod.default];
  for (const entry of entries) {
    selectMenuHandlers.set(entry.customIdPrefix, entry);
    logger.info(`Select menu handler yüklendi: ${entry.customIdPrefix}`);
  }
}

export async function handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  const prefix = interaction.customId.split(':')[0] ?? '';
  const handler = selectMenuHandlers.get(prefix);
  if (!handler) {
    await interaction.reply({
      embeds: [errorEmbed('Bilinmeyen menü', 'Bu menü artık geçerli değil.')],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await handler.run(interaction);
  } catch (error) {
    logger.error(`Select menu hatası (${interaction.customId}):`, error);
    const message = 'Bir şeyler ters gitti. Lütfen tekrar deneyin.';
    if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed('Hata', message)] });
    } else if (!interaction.replied) {
      await interaction.reply({ embeds: [errorEmbed('Hata', message)], flags: MessageFlags.Ephemeral });
    }
  }
}