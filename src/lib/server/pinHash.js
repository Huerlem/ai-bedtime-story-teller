import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const PARAMS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** Hash a parent PIN with a per-parent salt (scrypt, 32-byte key). */
export async function hashPin(pin) {
  const salt = randomBytes(16);
  const key = await scrypt(`dreamtales:${pin}`, salt, 32, PARAMS);
  return { pinHash: key.toString('base64'), pinSalt: salt.toString('base64'), pinAlgo: 'scrypt-N15-r8-p1' };
}

export async function verifyPin(pin, { pinHash, pinSalt }) {
  if (!pinHash || !pinSalt) return false;
  const key = await scrypt(`dreamtales:${pin}`, Buffer.from(pinSalt, 'base64'), 32, PARAMS);
  const expected = Buffer.from(pinHash, 'base64');
  return expected.length === key.length && timingSafeEqual(expected, key);
}
