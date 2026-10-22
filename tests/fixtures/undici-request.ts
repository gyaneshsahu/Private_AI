import { Readable } from "node:stream";

/**
 * Adapts a WHATWG Response produced by a test double into the shape of an
 * `undici.request` result, so relay tests keep describing upstream replies as
 * Responses. Trailers may be supplied on the Response as `trailers`.
 */
export function asUndiciRequestResult(response: Response) {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  const body = response.body
    ? Readable.fromWeb(response.body as never)
    : Readable.from([]);
  const trailers =
    (response as Response & { trailers?: Record<string, string> }).trailers ??
    {};
  return {
    statusCode: response.status,
    headers,
    body: Object.assign(body, {
      async dump() {
        for await (const _chunk of body) {
          /* discard */
        }
      },
    }),
    trailers,
  };
}

export function withTrailers(
  response: Response,
  trailers: Record<string, string>,
) {
  return Object.assign(response, { trailers });
}
