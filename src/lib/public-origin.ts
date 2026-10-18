/**
 * The address visitors reach the site at, for redirects and absolute links built from a request.
 * Behind the host's reverse proxy, request.url carries the server's own bind address
 * (http://0.0.0.0:3000), so the configured site address wins, then the proxy's forwarded host.
 */
export function publicOrigin(request: Request) {
  const configured = process.env.BETTER_AUTH_URL;
  if (configured) return new URL(configured).origin;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? (/^(localhost|127\.|\[::1\])/.test(host) ? "http" : "https");
    return `${protocol}://${host}`;
  }
  return new URL(request.url).origin;
}

/** An absolute URL on the public site, for a path such as "/fr/unsubscribe". */
export const publicUrl = (path: string, request: Request) => new URL(path, publicOrigin(request));
