import { EnvHttpProxyAgent } from "undici";
// Reuse the platform-provided proxy, without reading or logging its credentials.
export const proxyConfigured = Boolean(
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy,
);
export const serviceDispatcher = proxyConfigured
  ? new EnvHttpProxyAgent()
  : undefined;
export const publicFetchHosts = (process.env.PRIVATEAI_PUBLIC_FETCH_HOSTS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
export function approvedProxyHost(host: string, approved: string[]) {
  // Exact public DNS hostnames only. No user-controlled host, IP, wildcard or URL can broaden this list.
  return (
    /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host) &&
    !/^[\d.]+$/.test(host) &&
    !host.endsWith(".local") &&
    !host.endsWith(".localhost") &&
    approved.includes(host)
  );
}
