import type { BrowserWindow } from 'electron';
import { executeInFrames } from '../browser/index.js';
import { TITLE_BAR_HEIGHT } from '../../../../shared/window.js';

export const TOTAL_STEPS = 11;

// Muestra el contador de progreso del flujo dentro de la página de SofiaPlus.
export function showStepBanner(window: BrowserWindow, stepNumber: number, stepTitle: string): Promise<void> {
  const script = `
    (() => {
      const id = '__sofiaStepBanner__';
      let banner = document.getElementById(id);
      const root = document.body || document.documentElement;
      if (!banner) {
        banner = document.createElement('div');
        banner.id = id;
        root.appendChild(banner);
      }
      const step = ${stepNumber};
      const total = ${TOTAL_STEPS};
      const title = ${JSON.stringify(stepTitle)};
      const pct = Math.round((step / total) * 100);
      banner.style.position = 'fixed';
      banner.style.top = '${TITLE_BAR_HEIGHT + 12}px';
      banner.style.right = '12px';
      banner.style.zIndex = '2147483647';
      banner.style.background = '#11161c';
      banner.style.color = '#fff';
      banner.style.fontFamily = 'Arial, sans-serif';
      banner.style.fontSize = '13px';
      banner.style.fontWeight = '700';
      banner.style.padding = '10px 14px';
      banner.style.borderRadius = '10px';
      banner.style.border = '2px solid #007aff';
      banner.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)';
      banner.style.minWidth = '230px';
      banner.style.lineHeight = '1.35';
      banner.innerHTML = \`
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="color:#94a3b8;font-weight:600;font-size:11px;">PASO \${step} DE \${total}</span>
          <span style="background:#007aff;color:#fff;padding:2px 8px;border-radius:999px;font-size:11px;">\${pct}%</span>
        </div>
        <div style="margin-bottom:8px;">\${title}</div>
        <div style="background:#1f2937;height:6px;border-radius:999px;overflow:hidden;">
          <div style="background:linear-gradient(90deg,#007aff,#34d399);width:\${pct}%;height:100%;transition:width 0.3s;"></div>
        </div>
      \`;
      return true;
    })();
  `;
  return executeInFrames<boolean>(window, script, Boolean, 5).then(() => {
    const cleanStepTitle = stepTitle
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/\uFE0F/g, '')
      .trim();
    console.log(`[AIA][SofiaPlus] Paso ${stepNumber}/${TOTAL_STEPS}: ${cleanStepTitle}`);
  });
}
