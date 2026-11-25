// One edit request (docs/image-editing-20261125.md). Throws a failure key the editor turns into a sentence.
import type { ImageEditRequest } from "../../shared/image-edit";
import type { ImageVersion } from "./versions";

export type EditFailure =
  | "refusedRealPerson"
  | "refusedMinors"
  | "refusedProvider"
  | "limit"
  | "capacity"
  | "unavailable"
  | "signin"
  | "needSelection"
  | "chatFull"
  | "versionsFull";

export async function requestEdit(body: ImageEditRequest, csrf: string, signal?: AbortSignal): Promise<Omit<ImageVersion, "prompt">> {
  let response: Response;
  try {
    response = await fetch("/api/images/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PrivateAI-CSRF": csrf },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    throw "unavailable" satisfies EditFailure;
  }
  const answer = (await response.json().catch(() => ({}))) as { error?: string; reason?: string; type?: ImageVersion["type"]; data?: string };
  if (response.ok && answer.data && answer.type) return { type: answer.type, data: answer.data };
  if (response.status === 401) throw "signin" satisfies EditFailure;
  if (response.status === 429) throw "limit" satisfies EditFailure;
  if (response.status === 503) throw "capacity" satisfies EditFailure;
  if (answer.error === "refused")
    throw (answer.reason === "realPerson" ? "refusedRealPerson" : answer.reason === "minors" ? "refusedMinors" : "refusedProvider") satisfies EditFailure;
  throw "unavailable" satisfies EditFailure;
}
