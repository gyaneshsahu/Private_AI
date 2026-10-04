// Fixed labels only: never persist arbitrary URLs, query strings or credentials.
export function networkRoute(value: string, localOrigin: string) {
  const url = new URL(value);
  if (url.origin === localOrigin) {
    if (url.pathname === "/api/inference/v1/chat/completions")
      return "INFERENCE_RELAY";
    if (url.pathname === "/") return "LOCAL_PAGE";
    if (
      ["/src/", "/evaluation/", "/shared/", "/node_modules/", "/@"].some((p) =>
        url.pathname.startsWith(p),
      )
    )
      return "LOCAL_MODULE";
    return "OTHER_LOCAL";
  }
  if (
    url.origin === "https://atc.tinfoil.sh" &&
    url.pathname === "/attestation"
  )
    return "ATTESTATION";
  return "OTHER_EXTERNAL";
}
