import type { SofiaCredentials } from './types.js';

// Busca los campos del login de SofiaPlus y los rellena con las credenciales recibidas.
export async function fillSofiaInputs(credentials: SofiaCredentials): Promise<boolean> {
  const fields = Array.from(document.querySelectorAll<HTMLInputElement>('input'))
    .filter((field) => field.type !== 'hidden' && field.getClientRects().length > 0);

  const textOf = (field: HTMLInputElement): string => [
    field.type, field.name, field.id, field.placeholder, field.getAttribute('aria-label') ?? '',
  ].join(' ').toLowerCase();

  const findField = (patterns: string[], type?: string): HTMLInputElement | undefined => fields.find((field) => {
    const matchesType = !type || field.type === type;
    return matchesType && patterns.some((pattern) => textOf(field).includes(pattern));
  });

  // Asigna un valor a un input sin depender del comportamiento nativo del navegador.
  const setValue = (field: HTMLInputElement | undefined, value: string): void => {
    if (!field || !value) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  };

  // Intenta localizar usuario y contraseña por nombre, ID, placeholder o tipo de input.
  const username = findField(['número de documento', 'numero de documento'], 'text')
    ?? findField(['usuario', 'user', 'login', 'documento', 'identificacion'], 'text')
    ?? findField(['usuario', 'user', 'login', 'documento', 'identificacion'], 'email')
    ?? fields.find((field) => ['text', 'email', 'tel', 'number'].includes(field.type));
  const password = findField(['contraseña', 'contrasena', 'password', 'clave'], 'password')
    ?? fields.find((field) => field.type === 'password');

  if (!username || !password) return false;
  setValue(username, credentials.username);
  setValue(password, credentials.password);
  username.focus();

  // Busca el botón de acceso por texto o atributos para iniciar sesión automáticamente.
  const loginControl = Array.from(document.querySelectorAll<HTMLElement>(
    'button, input[type="submit"], input[type="button"], a',
  )).find((control) => /ingresar|iniciar|login|aceptar|entrar/.test([
    control.textContent ?? '', control.getAttribute('value') ?? '', control.getAttribute('aria-label') ?? '',
    control.getAttribute('id') ?? '', control.getAttribute('name') ?? '',
  ].join(' ').toLowerCase()));

  if (loginControl) loginControl.click();
  else password.form?.requestSubmit();
  return true;
}
