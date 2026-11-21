/**
 * METROPOLIS Google Drive Integration Service
 * Аутентификация через Google Identity / Firebase Auth и экспорт в личную папку game/ на Google Диске
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { GameState } from '../types/game';
import { encodeSavePayload, decodeSavePayload } from './security';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!user) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      // In cases where accessToken is not in credential, check if we have currentUser
      if (result.user) {
        const idToken = await result.user.getIdToken();
        cachedAccessToken = idToken;
        return { user: result.user, accessToken: idToken };
      }
      return null;
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    // Gracefully handle user cancellation or popup dismissal without crashing
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/user-cancelled'
    ) {
      console.info('Окно авторизации Google закрыто пользователем.');
      return null;
    }
    if (error?.code === 'auth/popup-blocked') {
      console.warn('Всплывающее окно Google заблокировано браузером.');
      return null;
    }
    console.error('Ошибка входа Google:', error);
    return null;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedToken = (): string | null => cachedAccessToken;

export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Ищет или создает папку 'game' в корне Google Диска пользователя
 */
export async function findOrCreateGameFolder(token: string): Promise<string> {
  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and name = 'game' and trashed = false");
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Ошибка поиска папки game: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Создаем папку 'game'
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'game',
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Ошибка создания папки game: ${createRes.statusText}`);
  }

  const folder = await createRes.json();
  return folder.id;
}

/**
 * Сохраняет зашифрованный файл сейва на Google Диск
 */
export async function saveGameToGoogleDrive(state: GameState, token: string): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    const folderId = await findOrCreateGameFolder(token);
    const encryptedContent = await encodeSavePayload(state);
    const filename = `metropolis_save_v016_${state.id}.dat`;

    // Ищем существующий файл
    const q = encodeURIComponent(`'${folderId}' in parents and name = '${filename}' and trashed = false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const searchData = await searchRes.json();
    const existingFileId = searchData.files?.[0]?.id;

    const metadata = {
      name: filename,
      parents: existingFileId ? undefined : [folderId],
      mimeType: 'application/octet-stream',
    };

    const boundary = 'foo_bar_baz';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/octet-stream\r\n\r\n' +
      encryptedContent +
      closeDelimiter;

    const url = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const uploadRes = await fetch(url, {
      method: existingFileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!uploadRes.ok) {
      throw new Error(`Ошибка выгрузки: ${uploadRes.statusText}`);
    }

    const uploadedData = await uploadRes.json();

    // Параллельно создаем читаемый документ "Личное Дело Гражданина" для игрока
    await exportCitizenDoc(state, token, folderId);

    return { success: true, fileId: uploadedData.id };
  } catch (err: any) {
    console.error('Ошибка сохранения на Google Диск:', err);
    return { success: false, error: err.message || 'Ошибка синхронизации' };
  }
}

/**
 * Создает читаемый отчет о гражданине
 */
async function exportCitizenDoc(state: GameState, token: string, folderId: string) {
  try {
    const docName = `Личное_Дело_${state.username}_ID_${state.id}.txt`;
    const q = encodeURIComponent(`'${folderId}' in parents and name = '${docName}' and trashed = false`);
    const sRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const sData = await sRes.json();
    const existingId = sData.files?.[0]?.id;

    const textContent = `======================================================
METROPOLIS v0.16 — ОФИЦИАЛЬНОЕ ЛИЧНОЕ ДЕЛО ГРАЖДАНИНА
Дата синхронизации: ${new Date().toLocaleString('ru-RU')}
======================================================
Имя гражданина: ${state.username}
Идентификатор (ID): #${state.id}
Серия и номер паспорта: ${state.passportSerial}
Телефон: ${state.phone}
Пол: ${state.gender === 'M' ? 'Мужской' : 'Женский'}
Карма: ${state.karma >= 0 ? '+' : ''}${state.karma}
Предупреждения (Warns): ${state.warns}/3

--- ФИНАНСОВЫЕ АКТИВЫ ---
Наличные рубли: ${state.rub.toLocaleString('ru-RU')} ₽
Банковский Депозит: ${state.depositRub.toLocaleString('ru-RU')} ₽
Хранилище Банка (₽): ${state.vault.rub.toLocaleString('ru-RU')} ₽
Наличные доллары: ${state.usdCash.toLocaleString('ru-RU')} $
Оффшорный счет: ${state.usdOffshore.toLocaleString('ru-RU')} $
Хранилище Банка ($): ${state.vault.usd.toLocaleString('ru-RU')} $
Криптосчет Биткоин: ${state.btc.toFixed(4)} ₿
Евро (€, Донат): ${state.eur} €

--- КАРЬЕРА И ИМУЩЕСТВО ---
Текущая должность: ${state.jobId}
Активных бизнесов: ${state.businesses.length} шт.
Опыт шахты: ${state.mineXp} XP
Бур: ${state.drill ? state.drill.id : 'Отсутствует'}
Принтер: ${state.press ? state.press.id : 'Отсутствует'}
Автомобиль: ${state.car ? `${state.car.id} (Stage ${state.car.stage}, Номер: ${state.car.plateNumber || 'Без номера'})` : 'Пешеход'}
Жилье: ${state.estateId} (Сейф: ${state.homeSafeRub.toLocaleString('ru-RU')} ₽)
Фракция: ${state.activeFaction || 'Вне фракций'}
======================================================
Файл сформирован автоматически клиентом METROPOLIS v0.16
`;

    const metadata = {
      name: docName,
      parents: existingId ? undefined : [folderId],
      mimeType: 'text/plain',
    };

    const boundary = 'foo_doc_baz';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
      textContent +
      closeDelimiter;

    const url = existingId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    await fetch(url, {
      method: existingId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });
  } catch (err) {
    console.error('Ошибка записи личного дела:', err);
  }
}

/**
 * Загружает и восстанавливает сохранение из Google Диска
 */
export async function loadGameFromGoogleDrive(token: string): Promise<{ success: boolean; state?: GameState; error?: string }> {
  try {
    const folderId = await findOrCreateGameFolder(token);
    const q = encodeURIComponent(`'${folderId}' in parents and name contains 'metropolis_save_v016' and trashed = false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const searchData = await searchRes.json();

    if (!searchData.files || searchData.files.length === 0) {
      return { success: false, error: 'Файл сохранения не найден в папке game/ на Google Диске' };
    }

    const fileId = searchData.files[0].id;
    const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!downloadRes.ok) {
      throw new Error(`Ошибка загрузки файла: ${downloadRes.statusText}`);
    }

    const rawContainerText = await downloadRes.text();
    const result = await decodeSavePayload(rawContainerText);

    if (!result.state) {
      return { success: false, error: result.error || 'Ошибка расшифровки' };
    }

    return { success: true, state: result.state };
  } catch (err: any) {
    return { success: false, error: err.message || 'Ошибка загрузки с Google Диска' };
  }
}

/**
 * Ищет или создает папку с заданным именем в корне Google Диска пользователя
 */
export async function findOrCreateFolderByName(token: string, folderName: string): Promise<string> {
  const query = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false and 'root' in parents`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Создаем новую папку в корне Google Диска
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['root'],
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Ошибка создания папки ${folderName}: ${createRes.statusText}`);
  }

  const folder = await createRes.json();
  return folder.id;
}

/**
 * Выгружает полный архив исходного кода версии 0.17 (gamecod_v017.zip)
 * в папку 'gamecod_v017' в корне Google Диска пользователя
 */
export async function uploadCodebaseToGoogleDrive(
  token: string,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; folderId?: string; fileId?: string; error?: string }> {
  try {
    onProgress?.('Создание папки gamecod_v017 в корне Google Диска...');
    const folderId = await findOrCreateFolderByName(token, 'gamecod_v017');

    onProgress?.('Подготовка архива gamecod_v017.zip (151 КБ, 41 файл)...');
    const zipBlobRes = await fetch('/gamecod_v017.zip');
    if (!zipBlobRes.ok) {
      throw new Error('Архив gamecod_v017.zip временно недоступен в бандле');
    }
    const zipBlob = await zipBlobRes.blob();

    onProgress?.('Проверка существующей версии архива на Диске...');
    const filename = 'gamecod_v017.zip';
    const q = encodeURIComponent(`'${folderId}' in parents and name = '${filename}' and trashed = false`);
    const sRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const sData = await sRes.json();
    const existingFileId = sData.files?.[0]?.id;

    onProgress?.('Загрузка исходного кода в Google Диск -> gamecod_v017...');
    const metadata = {
      name: filename,
      parents: existingFileId ? undefined : [folderId],
      mimeType: 'application/zip',
      description: 'METROPOLIS v0.17 — Полный снимок исходного кода проекта (41 файл)',
    };

    const boundary = 'foo_zip_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;
    const metadataPart = JSON.stringify(metadata);

    const zipArrayBuffer = await zipBlob.arrayBuffer();
    const preamble = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${metadataPart}${delimiter}Content-Type: application/zip\r\n\r\n`;
    const epilogue = closeDelimiter;

    const encoder = new TextEncoder();
    const preambleBytes = encoder.encode(preamble);
    const epilogueBytes = encoder.encode(epilogue);

    const fullPayload = new Uint8Array(preambleBytes.length + zipArrayBuffer.byteLength + epilogueBytes.length);
    fullPayload.set(preambleBytes, 0);
    fullPayload.set(new Uint8Array(zipArrayBuffer), preambleBytes.length);
    fullPayload.set(epilogueBytes, preambleBytes.length + zipArrayBuffer.byteLength);

    const uploadUrl = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const uploadRes = await fetch(uploadUrl, {
      method: existingFileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: fullPayload,
    });

    if (!uploadRes.ok) {
      throw new Error(`Ошибка выгрузки zip: ${uploadRes.statusText}`);
    }

    const uploadedFileData = await uploadRes.json();

    // Создаем текстовый индекс файлов в папке gamecod_v017
    const readmeMetadata = {
      name: 'README_gamecod_v017.txt',
      parents: [folderId],
      mimeType: 'text/plain',
    };
    const readmeText = `======================================================
METROPOLIS v0.17 — СНИМОК ИСХОДНОГО КОДА
Дата сохранения: ${new Date().toLocaleString('ru-RU')}
Папка: Google Диск -> gamecod_v017
======================================================

В этой папке сохранены:
1. gamecod_v017.zip (151 КБ) — полный архив кодовой базы:
   - src/ (все компоненты, движок, типы, стили, сервисы)
   - package.json, tsconfig.json, vite.config.ts, index.html
   - firebase-applet-config.json
   - README.md

Инструкция по запуску:
Распакуйте gamecod_v017.zip и выполните:
  npm install
  npm run dev
======================================================`;

    const rBoundary = 'foo_readme_boundary';
    const rMultipart =
      `\r\n--${rBoundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(readmeMetadata) +
      `\r\n--${rBoundary}\r\n` +
      `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
      readmeText +
      `\r\n--${rBoundary}--`;

    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${rBoundary}`,
      },
      body: rMultipart,
    }).catch((e) => console.warn('Readme upload warning:', e));

    return { success: true, folderId, fileId: uploadedFileData.id };
  } catch (err: any) {
    console.error('Ошибка выгрузки архива на Google Диск:', err);
    return { success: false, error: err.message || 'Ошибка выгрузки архива' };
  }
}

