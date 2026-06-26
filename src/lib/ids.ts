import { customAlphabet } from "nanoid";

// Unambiguous alphabet (no 0/O/1/I/l) — these ids double as ticket numbers
// that people may read back over WhatsApp.
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const nano = customAlphabet(alphabet, 8);

/** Public ticket id for a report, e.g. "VE-7K2P9QXM". */
export function reportId(): string {
  return `VE-${nano()}`;
}

const nanoLong = customAlphabet(`${alphabet.toLowerCase()}0123456789`, 16);

/** Opaque id for audit-log rows. */
export function auditId(): string {
  return `aud_${nanoLong()}`;
}
