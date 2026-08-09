import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import type { GuildMember, PartialGuildMember } from 'discord.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let outfitLatin: ArrayBuffer | null = null;
let outfitExt: ArrayBuffer | null = null;
let interLatin: ArrayBuffer | null = null;
let interExt: ArrayBuffer | null = null;

async function fetchFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch font: ${res.statusText}`);
  return await res.arrayBuffer();
}

async function loadFonts() {
  if (outfitLatin && outfitExt && interLatin && interExt) return;
  try {
    const res = await Promise.all([
      fetchFont('https://cdn.jsdelivr.net/npm/@fontsource/outfit@5.0.8/files/outfit-latin-600-normal.woff'),
      fetchFont('https://cdn.jsdelivr.net/npm/@fontsource/outfit@5.0.8/files/outfit-latin-ext-600-normal.woff'),
      fetchFont('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.20/files/inter-latin-400-normal.woff'),
      fetchFont('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.20/files/inter-latin-ext-400-normal.woff'),
    ]);
    [outfitLatin, outfitExt, interLatin, interExt] = res;
  } catch (err) {
    logger.error('Fontlar yüklenirken hata oluştu:', err);
    throw err;
  }
}

export interface WelcomeCardInput {
  member: GuildMember | PartialGuildMember;
  type: 'join' | 'leave';
  memberCount: number;
}

export async function renderWelcomeCard(input: WelcomeCardInput): Promise<Buffer | null> {
  await loadFonts();
  if (!outfitLatin || !interLatin) return null;

  const { member, type, memberCount } = input;
  const username = member.user?.username ?? 'Bilinmeyen';
  const avatarUrl = member.user?.displayAvatarURL({ extension: 'png', size: 256 }) ?? 'https://cdn.discordapp.com/embed/avatars/0.png';

  const isJoin = type === 'join';
  
  // Use brand color for join, static red for leave
  const primaryColor = isJoin ? env.EMBED_COLOR : '#ef4444';
  
  // Date format for badge
  const dateStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Dynamic texts based on join/leave with margin for space
  const titleHtml = isJoin 
    ? `<span style="color: white; margin-right: 10px;">Hoş</span><span style="color: ${primaryColor}">Geldin!</span>`
    : `<span style="color: #cbd5e1; margin-right: 10px;">Güle</span><span style="color: ${primaryColor}">Güle!</span>`;

  const subtitleText = isJoin 
    ? `Aramıza katıldın, iyi eğlenceler!` 
    : `Aramızdan ayrıldı, umarız tekrar görüşürüz.`;

  const bgSvg = `
  <svg width="800" height="250" viewBox="0 0 800 250" xmlns="http://www.w3.org/2000/svg" style="position: absolute; top: 0; left: 0;">
    <defs>
      <filter id="blurGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="90" />
      </filter>
    </defs>
    <!-- Background Base -->
    <rect width="800" height="250" fill="#141a23" />
    
    <!-- Left Glow -->
    <circle cx="0" cy="250" r="220" fill="${primaryColor}" opacity="0.12" filter="url(#blurGlow)" />
    
    <!-- Right Glow -->
    <circle cx="800" cy="0" r="300" fill="${primaryColor}" opacity="0.06" filter="url(#blurGlow)" />
  </svg>
  `;

  const template = `
  <div style="display: flex; flex-direction: row; width: 800px; height: 250px; position: relative; overflow: hidden; align-items: center;">
    ${bgSvg}
    
    <!-- Left solid border strip -->
    <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 8px; background-color: ${primaryColor}; display: flex;"></div>
    
    <!-- Content Wrapper -->
    <div style="display: flex; flex-direction: row; width: 100%; height: 100%; align-items: center; padding-left: 50px;">
      
      <!-- Avatar container with thick border -->
      <div style="display: flex; width: 160px; height: 160px; border-radius: 50%; border: 4px solid ${primaryColor}; margin-right: 40px; justify-content: center; align-items: center; padding: 4px; background-color: #141a23; box-shadow: 0 0 20px ${primaryColor}40;">
        <img src="${avatarUrl}" width="144" height="144" style="border-radius: 50%; width: 100%; height: 100%; object-fit: cover;" />
      </div>

      <!-- Text Content -->
      <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; padding-top: 10px;">
        
        <!-- Title -->
        <div style="display: flex; font-family: 'Outfit', 'OutfitExt'; font-size: 42px; font-weight: 600; margin-bottom: 5px;">
          ${titleHtml}
        </div>
        
        <!-- Username -->
        <div style="display: flex; font-family: 'Outfit', 'OutfitExt'; font-size: 38px; color: #ffffff; font-weight: 600; margin-bottom: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 500px;">
          ${username}
        </div>
        
        <!-- Subtitle -->
        <div style="display: flex; font-family: 'Inter', 'InterExt'; font-size: 18px; color: #94a3b8; font-weight: 400; margin-bottom: 20px;">
          ${subtitleText}
        </div>
        
        <!-- Badges -->
        <div style="display: flex; flex-direction: row; gap: 12px;">
          <!-- Badge 1: Member Count -->
          <div style="display: flex; background-color: #1f2937; border: 1px solid #374151; border-radius: 8px; padding: 6px 14px; justify-content: center; align-items: center;">
            <span style="font-family: 'Inter', 'InterExt'; font-size: 15px; font-weight: 600; color: ${primaryColor};">Üye #${memberCount}</span>
          </div>
          
          <!-- Badge 2: Date -->
          <div style="display: flex; background-color: #1f2937; border: 1px solid #374151; border-radius: 8px; padding: 6px 14px; justify-content: center; align-items: center;">
            <span style="font-family: 'Inter', 'InterExt'; font-size: 15px; font-weight: 600; color: ${primaryColor};">${dateStr}</span>
          </div>
        </div>

      </div>
    </div>
  </div>
  `;

  try {
    const vnode = html(template);
    
    const svg = await satori(vnode, {
      width: 800,
      height: 250,
      fonts: [
        { name: 'Outfit', data: outfitLatin!, weight: 600, style: 'normal' },
        { name: 'OutfitExt', data: outfitExt!, weight: 600, style: 'normal' },
        { name: 'Inter', data: interLatin!, weight: 400, style: 'normal' },
        { name: 'InterExt', data: interExt!, weight: 400, style: 'normal' }
      ]
    });

    const resvg = new Resvg(svg, {
      fitTo: { mode: 'original' }
    });
    
    const pngData = resvg.render();
    return pngData.asPng();
  } catch (error) {
    logger.error('Satori render hatası (WelcomeCard):', error);
    return null;
  }
}
