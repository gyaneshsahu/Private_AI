import { accountDeadlineMs } from "./account-request";

const maximumResponseBytes = 128 * 1024;
type Failure = "options" | "verification" | undefined;

/** Network bounds only: the SDK's browser authenticator interaction stays separate. */
export function createPasskeyTransport(origin: string) {
  let failure: Failure;
  const unavailable = () =>
    new Response(
      JSON.stringify({
        code: "PASSKEY_TRANSPORT_UNAVAILABLE",
        message: "Account transport unavailable.",
      }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  const transport: typeof fetch = async (input, init) => {
    const request = new Request(
      input instanceof Request ? input : new URL(String(input), origin),
      init,
    );
    const url = new URL(request.url);
    const verification =
      url.pathname === "/api/auth/passkey/verify-registration" ||
      url.pathname === "/api/auth/passkey/verify-authentication";
    const options =
      url.pathname === "/api/auth/passkey/generate-register-options" ||
      url.pathname === "/api/auth/passkey/generate-authenticate-options";
    const markFailure = () => {
      if (verification) failure = "verification";
      else if (options && failure !== "verification") failure = "options";
    };
    if (url.origin !== origin || !url.pathname.startsWith("/api/auth/")) {
      markFailure();
      return unavailable();
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), accountDeadlineMs);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await fetch(request, {
        signal: AbortSignal.any([request.signal, controller.signal]),
        cache: "no-store",
        redirect: "error",
      });
      reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      if (reader) {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > maximumResponseBytes)
            throw Error("Response exceeds limit");
          chunks.push(value);
        }
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      // Do not let a malformed successful verification look like SDK cancellation/success.
      if (length) JSON.parse(new TextDecoder().decode(bytes));
      else if (verification || options) throw Error("Empty passkey response");
      if (response.status >= 500) {
        markFailure();
        return unavailable();
      }
      return new Response(
        [204, 205, 304].includes(response.status) ? null : bytes,
        {
          status: response.status,
          statusText: response.statusText,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        },
      );
    } catch {
      markFailure();
      controller.abort();
      // No URLs, credentials, assertions or raw SDK/server errors enter logs.
      return unavailable();
    } finally {
      clearTimeout(timer);
      if (reader) {
        void reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    }
  };
  return {
    fetch: transport,
    reset: () => {
      failure = undefined;
    },
    failure: () => failure,
  };
}
