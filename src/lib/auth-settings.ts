// Match cookies to the public URL, including HTTP deployments on a private LAN.
export const secureCookies = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || '').startsWith('https://');
export const sessionCookieName = `${secureCookies ? '__Secure-' : ''}authjs.session-token`;
