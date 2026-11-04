import { customAlphabet } from 'nanoid';

const nano = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);

/** ID ngắn, an toàn cho thuộc tính HTML và tên class CSS. */
export function uid(prefix = 'n'): string {
  return `${prefix}_${nano()}`;
}
