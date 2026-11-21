/**
 * METROPOLIS v0.16 — Валидатор и форматтер госномеров РФ (ГОСТ Р 50577)
 * Строгое соответствие: 1 буква, 3 цифры, 2 буквы, 2-3 цифры региона
 * Разрешены только 12 букв: А, В, Е, К, М, Н, О, Р, С, Т, У, Х
 */

export const HOMOGLYPH_MAP: Record<string, string> = {
  A: 'А',
  B: 'В',
  E: 'Е',
  K: 'К',
  M: 'М',
  H: 'Н',
  O: 'О',
  P: 'Р',
  C: 'С',
  T: 'Т',
  Y: 'У',
  X: 'Х',
  // Lowercase latin
  a: 'А',
  b: 'В',
  e: 'Е',
  k: 'К',
  m: 'М',
  h: 'Н',
  o: 'О',
  p: 'Р',
  c: 'С',
  t: 'Т',
  y: 'У',
  x: 'Х',
  // Lowercase cyrillic
  а: 'А',
  в: 'В',
  е: 'Е',
  к: 'К',
  м: 'М',
  н: 'Н',
  о: 'О',
  р: 'Р',
  с: 'С',
  т: 'Т',
  у: 'У',
  х: 'Х',
};

export const VALID_PLATE_LETTERS = new Set(['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х']);

export const PRESET_VIP_PLATES = [
  'А777АА777',
  'О001ОО77',
  'Е999КХ77',
  'В777ОР777',
  'М001ММ99',
  'Х777ХХ77',
  'С007СС777',
  'К001КК777',
];

/**
 * Строгий позиционный фильтр для ввода госномера в реальном времени.
 * - Позиция 0: 1 буква (из 12 разрешенных)
 * - Позиции 1-3: 3 цифры
 * - Позиции 4-5: 2 буквы (из 12 разрешенных)
 * - Позиции 6-8: 2 или 3 цифры региона
 * Блокирует любые недопустимые буквы (Б, Г, Д, Ж и т.д.) и ошибки структуры.
 */
export function formatRussianPlateInput(raw: string): string {
  let result = '';

  for (let i = 0; i < raw.length && result.length < 9; i++) {
    const char = raw[i];
    const upper = HOMOGLYPH_MAP[char] || char.toUpperCase();
    const pos = result.length;

    if (pos === 0 || pos === 4 || pos === 5) {
      // Ожидается буква
      if (VALID_PLATE_LETTERS.has(upper)) {
        result += upper;
      }
    } else {
      // Ожидается цифра (позиции 1, 2, 3 и 6, 7, 8)
      if (/[0-9]/.test(char)) {
        result += char;
      }
    }
  }

  return result;
}

/**
 * Проверка соответствия стандартам ГОСТ Р 50577
 * Допустимы форматы:
 * А123ВС77 (8 символов)
 * А123ВС777 (9 символов)
 */
export function isValidRussianPlate(plate: string): boolean {
  if (!plate || (plate.length !== 8 && plate.length !== 9)) {
    return false;
  }
  return /^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$/.test(plate);
}

/**
 * Преобразует госномер в структурированный объект для рендеринга
 */
export function parsePlate(plate: string): { series: string; number: string; region: string } | null {
  if (!isValidRussianPlate(plate)) return null;
  const match = plate.match(/^([АВЕКМНОРСТУХ])(\d{3})([АВЕКМНОРСТУХ]{2})(\d{2,3})$/);
  if (!match) return null;
  return {
    series: `${match[1]} ${match[3]}`,
    number: match[2],
    region: match[4],
  };
}
