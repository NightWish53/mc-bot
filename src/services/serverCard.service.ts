import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import type { JavaStatusResponse } from 'minecraft-server-util';
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

export interface ServerCardInput {
  data: JavaStatusResponse | null;
  lastPingTime: number;
}

export async function renderServerCard(input: ServerCardInput): Promise<Buffer | null> {
  await loadFonts();
  if (!outfitLatin || !interLatin) return null;

  const { data, lastPingTime } = input;
  const isOnline = data !== null;

  const statusColor = isOnline ? '#10b981' : '#ef4444';
  const statusText = isOnline ? 'SUNUCU AKTİF' : 'SUNUCU ÇEVRİMDIŞI';

  let logoHtml = '';
  if (data?.favicon) {
    logoHtml = `<div style="display: flex; width: 110px; height: 110px; border-radius: 24px; background-image: url('${data.favicon}'); background-size: 100% 100%; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 10px 25px rgba(0,0,0,0.5);"></div>`;
  } else {
    const initial = env.SERVER_NAME.charAt(0).toUpperCase();
    logoHtml = `
      <div style="display: flex; align-items: center; justify-content: center; width: 110px; height: 110px; border-radius: 24px; background-color: ${env.EMBED_COLOR}; font-family: 'Outfit', 'OutfitExt'; font-size: 56px; font-weight: 600; color: #09090b; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        ${initial}
      </div>
    `;
  }

  const motdLines = data?.motd?.clean ? data.motd.clean.split('\n').slice(0, 2) : ['Sunucu şu anda kapalı', 'veya erişilemiyor.'];
  const motdHtml = motdLines.map(l => `<div style="display: flex; margin-bottom: 6px;">${l.trim()}</div>`).join('');

  let lastSeenHtml = '';
  if (!isOnline && lastPingTime > 0) {
    const minutes = Math.floor((Date.now() - lastPingTime) / 60000);
    lastSeenHtml = `
      <div style="display: flex; margin-top: 32px; align-items: center;">
        <div style="display: flex; width: 32px; height: 2px; background-color: #ef4444; margin-right: 12px;"></div>
        <div style="display: flex; font-family: 'Inter', 'InterExt'; font-size: 16px; font-weight: 500; color: #ef4444;">Son görülme: ${minutes} dk önce</div>
      </div>
    `;
  }

  const port = env.MC_SERVER_PORT === 25565 ? '' : `:${env.MC_SERVER_PORT}`;
  const address = `${env.MC_SERVER_IP}${port}`;
  
  let players = '—';
  let playersMax = '0';
  let ratio = 0;
  let playersColor = 'white';
  let version = '—';
  let pingValue = '—';
  let pingUnitHtml = '';

  if (isOnline) {
    players = `${data.players.online}`;
    playersMax = `${data.players.max}`;
    ratio = data.players.online / Math.max(1, data.players.max);
    if (ratio > 0.9) playersColor = '#ef4444';
    else if (ratio > 0.7) playersColor = '#f59e0b';

    // Handle very long version strings gracefully
    version = data.version?.name || 'Bilinmiyor';
    if (version.length > 22) version = version.substring(0, 20) + '...';

    if (typeof data.roundTripLatency === 'number') {
      pingValue = `${data.roundTripLatency}`;
      pingUnitHtml = `<div style="display: flex; font-family: 'Outfit', 'OutfitExt'; font-size: 16px; color: #64748b; font-weight: 600; margin-left: 6px;">ms</div>`;
    }
  }

  // Ultra modern SVG background with blur effects for glow
  const bgSvg = `
  <svg width="1280" height="600" viewBox="0 0 1280 600" xmlns="http://www.w3.org/2000/svg" style="position: absolute; top: 0; left: 0;">
    <defs>
      <filter id="blurGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="120" />
      </filter>
    </defs>
    <circle cx="200" cy="100" r="350" fill="${env.EMBED_COLOR}" opacity="0.15" filter="url(#blurGlow)" />
    <circle cx="1100" cy="500" r="450" fill="#4f46e5" opacity="0.08" filter="url(#blurGlow)" />
    <pattern id="gridPattern" width="32" height="32" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.5" fill="#ffffff" opacity="0.03" />
    </pattern>
    <rect width="100%" height="100%" fill="url(#gridPattern)" />
  </svg>
  `;

  const template = `
  <div style="display: flex; flex-direction: row; width: 1280px; height: 600px; background-color: #0c0c10; padding: 64px; box-sizing: border-box;">
    ${bgSvg}
    
    <!-- Content Wrapper (z-index essentially works because it's after the absolute SVG) -->
    <div style="display: flex; flex-direction: row; width: 100%; height: 100%;">
      
      <!-- Left Column -->
      <div style="display: flex; flex-direction: column; width: 600px; justify-content: center; padding-right: 48px;">
        
        <!-- Logo and Status Row -->
        <div style="display: flex; flex-direction: row; align-items: center; margin-bottom: 40px;">
          ${logoHtml}
          
          <div style="display: flex; flex-direction: column; margin-left: 28px; justify-content: center;">
            <!-- Status Pill -->
            <div style="display: flex; flex-direction: row; align-items: center; border: 1px solid ${statusColor}40; background-color: ${statusColor}10; padding: 8px 16px; border-radius: 99px; margin-bottom: 12px; align-self: flex-start;">
              <div style="display: flex; width: 10px; height: 10px; border-radius: 50%; background-color: ${statusColor}; margin-right: 10px;"></div>
              <div style="display: flex; font-family: 'Inter', 'InterExt'; font-size: 14px; font-weight: 600; color: ${statusColor}; letter-spacing: 1px;">${statusText}</div>
            </div>
            
            <!-- Server Name -->
            <div style="display: flex; font-family: 'Outfit', 'OutfitExt'; font-size: 56px; font-weight: 600; color: #ffffff; line-height: 1.1;">
              ${env.SERVER_NAME}
            </div>
          </div>
        </div>
        
        <!-- MOTD -->
        <div style="display: flex; flex-direction: column; font-family: 'Inter', 'InterExt'; font-size: 24px; font-weight: 400; color: #cbd5e1; line-height: 1.4; border-left: 4px solid ${env.EMBED_COLOR}; padding-left: 24px;">
          ${motdHtml}
        </div>
        
        ${lastSeenHtml}
      </div>
      
      <!-- Right Column -->
      <div style="display: flex; flex-direction: column; width: 500px; margin-left: auto; justify-content: center;">
        
        <!-- IP Card -->
        <div style="display: flex; flex-direction: column; background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 28px; margin-bottom: 20px;">
          <div style="display: flex; font-family: 'Inter', 'InterExt'; font-size: 14px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Bağlantı Adresi</div>
          <div style="display: flex; font-family: 'Outfit', 'OutfitExt'; font-size: 36px; color: #ffffff; font-weight: 600;">${address}</div>
        </div>

        <!-- Players Card -->
        <div style="display: flex; flex-direction: column; background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 28px; margin-bottom: 20px;">
          <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; font-family: 'Inter', 'InterExt'; font-size: 14px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 1.5px;">Aktif Oyuncular</div>
          </div>
          <div style="display: flex; flex-direction: row; align-items: baseline;">
            <div style="display: flex; font-family: 'Outfit', 'OutfitExt'; font-size: 48px; color: ${playersColor}; font-weight: 600;">${players}</div>
            <div style="display: flex; font-family: 'Outfit', 'OutfitExt'; font-size: 28px; color: #64748b; font-weight: 600; margin-left: 8px;">/ ${playersMax}</div>
          </div>
          <!-- Progress bar -->
          <div style="display: flex; width: 100%; height: 6px; background-color: rgba(255, 255, 255, 0.05); border-radius: 99px; margin-top: 20px; overflow: hidden;">
            <div style="display: flex; width: ${Math.min(100, ratio * 100)}%; height: 100%; background-color: ${playersColor}; border-radius: 99px;"></div>
          </div>
        </div>

        <!-- Bottom Row (Version & Ping) -->
        <div style="display: flex; flex-direction: row; width: 100%;">
          <!-- Version -->
          <div style="display: flex; flex-direction: column; flex: 1; background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 24px; margin-right: 20px;">
            <div style="display: flex; font-family: 'Inter', 'InterExt'; font-size: 13px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Sürüm</div>
            <div style="display: flex; font-family: 'Outfit', 'OutfitExt'; font-size: 22px; color: #f8fafc; font-weight: 600;">${version}</div>
          </div>
          
          <!-- Ping -->
          <div style="display: flex; flex-direction: column; flex: 1; background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 24px;">
            <div style="display: flex; font-family: 'Inter', 'InterExt'; font-size: 13px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Gecikme</div>
            <div style="display: flex; flex-direction: row; align-items: baseline;">
              <div style="display: flex; font-family: 'Outfit', 'OutfitExt'; font-size: 28px; color: #10b981; font-weight: 600;">${pingValue}</div>
              ${pingUnitHtml}
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
  `;

  try {
    const vnode = html(template);
    
    const svg = await satori(vnode, {
      width: 1280,
      height: 600,
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
    logger.error('Satori render hatası:', error);
    return null;
  }
}
