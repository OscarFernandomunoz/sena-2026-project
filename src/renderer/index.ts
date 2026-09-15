import { initFileHandling } from '../components/renderer/excelPreview.js';
import { initLiveContext, initClock } from '../components/renderer/liveContext.js';
import { initSubmit } from '../components/renderer/submit.js';
import { initTheme } from '../components/renderer/theme.js';
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

function initIconScrollAnimations(): void {
  const icons = Array.from(document.querySelectorAll<HTMLElement>(
    '.theme-toggle i, .panel-status i, .input-wrapper i, .dropzone-icon i, .status-item i',
  ));
  if (!icons.length) return;

  document.documentElement.classList.add('icons-ready');
  icons.forEach((icon, index) => {
    icon.classList.add('app-icon');
    icon.style.setProperty('--icon-delay', `${Math.min(index * 45, 300)}ms`);
  });

  if (!('IntersectionObserver' in window)) {
    icons.forEach((icon) => icon.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.35 });

  icons.forEach((icon) => observer.observe(icon));
}

function initMouseLightEffect(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const header = document.querySelector<HTMLElement>('.content-header');
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
    if (header) {
      const headerBounds = header.getBoundingClientRect();
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
    targetX = event.clientX;
    targetY = event.clientY;
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(updateLightPosition);
  };

  document.addEventListener('mousemove', handleMouseMove, { passive: true });
}

function initApp(): void {
  const elements = getElements();
  const state: FileUploadState = { file: null, firstIdentification: null, isUploading: false };

  initClock(elements);
  void initLiveContext(elements);
  initTheme(elements);
  initFileHandling(elements, state);
  initSubmit(elements, state);
  initIconScrollAnimations();
  initMouseLightEffect();
}

document.addEventListener('DOMContentLoaded', initApp);
