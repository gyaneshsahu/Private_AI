export interface AllowedAdvisory { id: string; package: string; added: string; reviewBy: string; reason: string }
export interface Advisory { name: string; severity: string; title: string; url: string }
export const ALLOWED: AllowedAdvisory[];
export function blockingAdvisories(
  report: { vulnerabilities?: Record<string, { via?: (string | Advisory)[] }> },
  allowed?: AllowedAdvisory[],
): { blocking: Advisory[]; allowedSeen: AllowedAdvisory[] };
