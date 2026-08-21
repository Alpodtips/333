import type { StringValue } from 'ms';

const configuredSecret = process.env.JWT_SECRET;

if (process.env.NODE_ENV === 'production' && !configuredSecret) {
	throw new Error('JWT_SECRET must be configured in production');
}

export const JWT_SECRET = configuredSecret ?? 'development-only-secret';
export const JWT_EXPIRATION = (process.env.JWT_EXPIRATION ?? '24h') as StringValue;
export const JWT_REFRESH_EXPIRATION = (process.env.JWT_REFRESH_EXPIRATION ?? '7d') as StringValue;
