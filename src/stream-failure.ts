export type StreamFailureCode =
  | "HTTP_RESPONSE_INVALID"
  | "HTTP_RATE_LIMITED"
  | "HTTP_LIMIT_REACHED"
  | "HTTP_SERVICE_UNAVAILABLE"
  | "HTTP_UPSTREAM_REJECTED"
  | "HTTP_CAPACITY_REACHED"
  | "HTTP_MODEL_NOT_FOUND"
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
  | "OUTPUT_LIMIT_REACHED"
  | "ABORTED"
  | "TIMED_OUT"
  | "TRANSPORT_OR_DECRYPTION";

export class StreamProtocolError extends Error {
  constructor(
    public readonly code: StreamFailureCode,
    /** For HTTP_LIMIT_REACHED: when the allowance frees up, as the server said. */
    public readonly resetsAt?: string,
  ) {
    super("Protected response protocol rejected.");
    this.name = "StreamProtocolError";
  }
}
