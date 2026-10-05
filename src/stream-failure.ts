export type StreamFailureCode =
  | "HTTP_RESPONSE_INVALID"
  | "FRAME_TOO_LARGE"
  | "UNSUPPORTED_EVENT"
  | "DATA_AFTER_DONE"
  | "INVALID_JSON"
  | "INVALID_EVENT"
  | "MISSING_DONE"
  | "INVALID_CHOICES"
  | "INVALID_CHOICE"
  | "CONTENT_AFTER_FINISH"
  | "DUPLICATE_USAGE"
  | "USAGE_REGRESSION"
  | "MISSING_FINAL_USAGE"
  | "INVALID_USAGE"
  | "INCOMPLETE_ANSWER"
  | "ABORTED"
  | "TRANSPORT_OR_DECRYPTION";

export class StreamProtocolError extends Error {
  constructor(public readonly code: StreamFailureCode) {
    super("Protected response protocol rejected.");
    this.name = "StreamProtocolError";
  }
}
