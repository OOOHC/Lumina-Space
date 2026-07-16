import { describe, expect, it } from 'vitest';
import { webOrigins, type Env } from './env';

const env = {
  WEB_ORIGIN: 'http://localhost:5174,http://localhost:8788',
} as Env;

describe('web origins', () => {
  it('allows configured development ports while running locally', () => {
    expect(webOrigins(env, 'http://localhost:8788/api/me')).toEqual([
      'http://localhost:8788',
      'http://localhost:5174',
    ]);
  });

  it('trusts only the deployed same origin in production', () => {
    expect(webOrigins(env, 'https://lumina.example/api/me')).toEqual([
      'https://lumina.example',
    ]);
  });
});
