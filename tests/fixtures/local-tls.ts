// Moved to server/local-tls.ts (the server imports it for PRIVATEAI_LOCAL_TLS, and the image
// contains server/ but not tests/). Kept so test imports stay unchanged.
export { localTLS } from "../../server/local-tls";
