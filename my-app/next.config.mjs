/** @type {import('next').NextConfig} */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://5dd3qrgx-5000.use2.devtunnels.ms';
const isDev = process.env.NODE_ENV === 'development';

// Turbopack HMR uses a dynamic WebSocket port on 127.0.0.1 in development.
const DEV_CONNECT = isDev
  ? 'ws://localhost:* ws://127.0.0.1:* wss://localhost:* wss://127.0.0.1:*'
  : '';

// unsafe-eval is required only in development for Next.js hot-module replacement.
const SCRIPT_SRC = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com"
  : "'self' 'unsafe-inline' https://accounts.google.com";

const securityHeaders = [
  // Prevent the app from being embedded in iframes (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop browsers from guessing content types (MIME sniffing)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Avoid sending the full URL as Referer to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Deny access to sensitive device APIs
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src ${SCRIPT_SRC}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      `connect-src 'self' ${API_URL} https://accounts.google.com${DEV_CONNECT ? ` ${DEV_CONNECT}` : ''}`,
      "frame-src https://accounts.google.com",   // iframe del botón Google Sign-In
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
