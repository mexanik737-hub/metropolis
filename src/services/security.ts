/**
 * METROPOLIS Security & Anti-Tamper Service
 * Обеспечивает криптографическую подпись, обфускацию файлов сохранения и верификацию прав администратора
 */

import { CONFIG } from '../data/gameData';
import { GameState } from '../types/game';

const SECRET_SALT = 'M3TR0P0L1S_v016_S3CUR3_K3Y_9841';

/**
 * Вычисляет SHA-256 хеш-сигнатуру строки данных
 */
export async function computeChecksum(content: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(content + SECRET_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Кодирует объект состояния в защищенный зашифрованный контейнер
 */
export async function encodeSavePayload(state: GameState): Promise<string> {
  const rawJson = JSON.stringify(state);
  const checksum = await computeChecksum(rawJson);

  // XOR обфускация с Base64
  let obfuscated = '';
  for (let i = 0; i < rawJson.length; i++) {
    const charCode = rawJson.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
    obfuscated += String.fromCharCode(charCode);
  }
  const base64Payload = btoa(unescape(encodeURIComponent(obfuscated)));

  const container = {
    version: state.schemaVersion,
    accountUid: state.accountUid,
    timestamp: Date.now(),
    payload: base64Payload,
    checksum: checksum,
  };

  return JSON.stringify(container, null, 2);
}

/**
 * Декодирует и верифицирует сохраненный файл
 */
export async function decodeSavePayload(rawContainerText: string): Promise<{ state: GameState | null; error?: string }> {
  try {
    const container = JSON.parse(rawContainerText);
    if (!container.payload || !container.checksum) {
      return { state: null, error: 'Неверный формат контейнера сохранения' };
    }

    const decodedBase64 = decodeURIComponent(escape(atob(container.payload)));
    let rawJson = '';
    for (let i = 0; i < decodedBase64.length; i++) {
      const charCode = decodedBase64.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
      rawJson += String.fromCharCode(charCode);
    }

    // Проверяем подпись
    const expectedChecksum = await computeChecksum(rawJson);
    if (expectedChecksum !== container.checksum) {
      return { state: null, error: 'Обнаружена модификация файла! Подпись не совпадает.' };
    }

    const state = JSON.parse(rawJson) as GameState;

    // Античит-валидация
    if (isNaN(state.rub) || state.rub < 0 || isNaN(state.energy)) {
      return { state: null, error: 'Файл содержит поврежденные числовые значения.' };
    }

    return { state };
  } catch (err: any) {
    return { state: null, error: err.message || 'Ошибка чтения файла' };
  }
}

/**
 * Проверяет права администратора (мастер-код или email создателя)
 */
export function verifyAdminAccess(enteredCode: string, userEmail?: string | null): boolean {
  if (userEmail && userEmail.toLowerCase() === CONFIG.CREATOR_EMAIL.toLowerCase()) {
    return true;
  }
  return enteredCode.trim() === CONFIG.ADMIN_MASTER_CODE;
}
