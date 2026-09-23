import { initFileHandling } from '../components/renderer/excelPreview.js';
import { initLiveContext, initClock } from '../components/renderer/liveContext.js';
import { initSubmit } from '../components/renderer/submit.js';
import { initTheme } from '../components/renderer/theme.js';
import { initTitleBar } from '../components/renderer/titleBar.js';
import type { AppElements, FileUploadState } from '../components/renderer/types.js';

function getElements(): AppElements {
  return {
    clock: document.getElementById('clock') as HTMLElement,
    date: document.getElementById('currentDate') as HTMLElement,
    city: document.getElementById('currentCity') as HTMLElement,
    weather: document.getElementById('weather') as HTMLElement,
    weatherIcon: document.getElementById('weatherIcon') as HTMLElement,
    dropzone: document.getElementById('dropzone') as HTMLElement,
    fileInput: document.getElementById('fileInput') as HTMLInputElement,
    dropzoneText: document.getElementById('dropzoneText') as HTMLElement,
    excelPreview: document.getElementById('excelPreview') as HTMLElement,
    uploadButton: document.getElementById('btnUpload') as HTMLButtonElement,
    statusMessage: document.getElementById('statusMessage') as HTMLElement,
    inputUser: document.getElementById('usuario') as HTMLInputElement,
    inputPass: document.getElementById('password') as HTMLInputElement,
    inputStartDate: document.getElementById('fechaInicio') as HTMLInputElement,
    inputEndDate: document.getElementById('fechaFin') as HTMLInputElement,
    themeToggle: document.getElementById('themeToggle') as HTMLButtonElement,
  };
}

function enforceSvgIconVisibility(): void {
  const selectors = [
    '.svg-icon-path', '.svg-cloud', '.svg-arrow', '.svg-moon',
    '.svg-sun', '.svg-sun-rays', '.svg-weather-cloud', '.svg-clock-hands', '.svg-check',
    '.svg-lock-core', '.svg-cal-dot',
  ];
  document.querySelectorAll<SVGElement | HTMLElement>(selectors.join(',')).forEach((el) => {
    if (el instanceof SVGElement || el instanceof HTMLElement) {
      el.style.setProperty('stroke-dashoffset', '0', 'important');
      el.style.setProperty('stroke-dasharray', '10000', 'important');
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('display', '', 'important');
    }
  });
  document.querySelectorAll<HTMLElement | SVGElement>('.app-icon, .input-icon, .status-icon, .btn-icon, .theme-icon, .cloud-icon, .upload-arrow-icon').forEach((svg) => {
    svg.style.setProperty('opacity', '1', 'important');
    svg.style.setProperty('visibility', 'visible', 'important');
    svg.style.removeProperty('animation-play-state');
  });
}

function initIconScrollAnimations(): void {
  const icons = Array.from(document.querySelectorAll<HTMLElement>(
    '.app-icon, .theme-icon, .status-icon, .input-icon, .dropzone-icon .cloud-icon, .dropzone-icon .upload-arrow-icon, .btn-icon',
  ));
  if (!icons.length) return;

  document.documentElement.classList.add('icons-ready');
  icons.forEach((icon, index) => {
    icon.classList.add('app-icon');
    if (!icon.style.getPropertyValue('--icon-delay')) {
      icon.style.setProperty('--icon-delay', `${Math.min(index * 45, 300)}ms`);
    }
  });

  if (!('IntersectionObserver' in window)) {
    icons.forEach((icon) => icon.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
    icons.forEach((icon) => observer.observe(icon));
  }

  window.setTimeout(enforceSvgIconVisibility, 1500);
  window.setTimeout(enforceSvgIconVisibility, 3500);
  window.setTimeout(enforceSvgIconVisibility, 7000);

  // Re-force visibility cada vez que un input recibe foco (soluciona el bug del desaparecido al seleccionar)
  document.addEventListener('focusin', (event) => {
    const target = event.target as Element | null;
    if (target && target.closest('.input-wrapper, .access-card, .dropzone')) {
      enforceSvgIconVisibility();
      window.setTimeout(enforceSvgIconVisibility, 10);
      window.setTimeout(enforceSvgIconVisibility, 120);
    }
  }, true);
}

function initMouseLightEffect(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const header = document.querySelector<HTMLElement>('.content-header');
  let headerBounds = header?.getBoundingClientRect();
  let framePending = false;
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 3;
  let currentX = targetX;
  let currentY = targetY;

  const updateLightPosition = (): void => {
    currentX += (targetX - currentX) * 0.18;
    currentY += (targetY - currentY) * 0.18;
    document.documentElement.style.setProperty('--mouse-x', `${currentX}px`);
    document.documentElement.style.setProperty('--mouse-y', `${currentY}px`);
    if (headerBounds) {
      document.documentElement.style.setProperty('--header-mouse-x', `${currentX - headerBounds.left}px`);
      document.documentElement.style.setProperty('--header-mouse-y', `${currentY - headerBounds.top}px`);
    }

    const distance = Math.hypot(targetX - currentX, targetY - currentY);
    if (distance > 0.5) {
      window.requestAnimationFrame(updateLightPosition);
      return;
    }

    currentX = targetX;
    currentY = targetY;
    framePending = false;
  };

  const handleMouseMove = (event: MouseEvent): void => {
    if (document.documentElement.dataset.theme !== 'dark') return;
    targetX = event.clientX;
    targetY = event.clientY;
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(updateLightPosition);
  };

  window.addEventListener('resize', () => { headerBounds = header?.getBoundingClientRect(); }, { passive: true });
  document.addEventListener('mousemove', handleMouseMove, { passive: true });
}

function initApp(): void {
  const elements = getElements();
  const state: FileUploadState = { file: null, firstIdentification: null, isUploading: false };

  initTitleBar();
  initClock(elements);
  void initLiveContext(elements);
  initTheme(elements);
  initFileHandling(elements, state);
  initSubmit(elements, state);
  initIconScrollAnimations();
  initMouseLightEffect();
}

document.addEventListener('DOMContentLoaded', initApp);
