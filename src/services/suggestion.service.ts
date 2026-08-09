import { MessageFlags, ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  GuildMember,
  type ButtonInteraction,
  type Message, } from 'discord.js';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';
import { Colors, createEmbed, errorEmbed, successEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';


export async function postSuggestion(message: Message, rawContent: string): Promise<void> {
  if (message.channel.type !== ChannelType.GuildText && message.channel.type !== ChannelType.GuildNews) return;

  const content = rawContent.replace(/@everyone/g, 'everyone').replace(/@here/g, 'here');

  const authorDisplay = `${message.author.username} (<@${message.author.id}>)`;

  const embed = createEmbed({
    title: '💡 Yeni Bir Öneri Var!',
    description: `>>> ${content.slice(0, 3900)}`,
    color: Colors.BRAND,
    fields: [
      { name: '👤 Öneren Kullanıcı', value: authorDisplay, inline: false },
      { name: '✅ Destekleyenler (0)', value: '-', inline: false },
      { name: '❌ Desteklemeyenler (0)', value: '-', inline: false },
    ],
    thumbnail: message.author.displayAvatarURL({ size: 256 }),
  });

  const upvoteButton = new ButtonBuilder()
    .setCustomId('suggestion_upvote')
    .setLabel('Destekliyorum')
    .setEmoji('✅')
    .setStyle(ButtonStyle.Success);

  const downvoteButton = new ButtonBuilder()
    .setCustomId('suggestion_downvote')
    .setLabel('Katılmıyorum')
    .setEmoji('❌')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(upvoteButton, downvoteButton);

  const suggestionMessage = await message.channel.send({ embeds: [embed], components: [row] });

  try {
    await prisma.suggestion.create({
      data: {
        messageId: suggestionMessage.id,
        authorId: message.author.id,
        content,
      },
    });
  } catch (error) {
    logger.error('Öneri DB kaydı oluşturulamadı.', error);
  }

  try {
    const thread = await suggestionMessage.startThread({
      name: `Öneri — ${content.slice(0, 60)}`,
      reason: 'Öneri tartışması için otomatik açılan konu',
    });
    
    await thread.send(`💬 **Tartışma Alanı:** Bu alanda **${message.author.username}** adlı kullanıcının önerisini tartışabilirsiniz.`);
  } catch {
    logger.debug('Öneri threadi açılamadı (izin eksik olabilir).');
  }
}

export async function handleSuggestionVote(interaction: ButtonInteraction, action: 'upvote' | 'downvote'): Promise<void> {
  const message = interaction.message;
  const embed = message.embeds[0];
  if (!embed) return;

  const userId = interaction.user.id;
  const userMention = `${interaction.user.username} (<@${userId}>)`;

  let upvoters: string[] = [];
  let downvoters: string[] = [];

  const upvoteField = embed.fields.find((f) => f.name.startsWith('✅ Destekleyenler'));
  const downvoteField = embed.fields.find((f) => f.name.startsWith('❌ Desteklemeyenler'));

  const parseVoters = (text: string) => {
    if (!text || text === '-') return [];
    return text.split('\n').filter(Boolean).filter(line => !line.includes('kişi daha'));
  };

  if (upvoteField) upvoters = parseVoters(upvoteField.value);
  if (downvoteField) downvoters = parseVoters(downvoteField.value);

  // Remove user from both arrays first
  upvoters = upvoters.filter((v) => !v.includes(userId));
  downvoters = downvoters.filter((v) => !v.includes(userId));

  // Add user to the correct array (toggle logic)
  let voted = false;
  if (action === 'upvote') {
    if (!upvoteField?.value.includes(userId)) {
      upvoters.push(userMention);
      voted = true;
    }
  } else {
    if (!downvoteField?.value.includes(userId)) {
      downvoters.push(userMention);
      voted = true;
    }
  }

  const formatVoters = (voters: string[]) => {
    if (voters.length === 0) return '-';
    if (voters.length > 10) {
      const top = voters.slice(0, 10);
      return [...top, `*...ve ${voters.length - 10} kişi daha*`].join('\n');
    }
    return voters.join('\n');
  };

  const newFields = embed.fields.map((f) => {
    if (f.name.startsWith('✅ Destekleyenler')) {
      return { name: `✅ Destekleyenler (${upvoters.length})`, value: formatVoters(upvoters), inline: false };
    }
    if (f.name.startsWith('❌ Desteklemeyenler')) {
      return { name: `❌ Desteklemeyenler (${downvoters.length})`, value: formatVoters(downvoters), inline: false };
    }
    return f;
  });

  const updatedEmbed = createEmbed({
    title: embed.title || '💡 Yeni Bir Öneri Var!',
    description: embed.description || '',
    color: embed.color || Colors.BRAND,
    fields: newFields,
    thumbnail: embed.thumbnail?.url,
  });

  await interaction.update({ embeds: [updatedEmbed] });
}