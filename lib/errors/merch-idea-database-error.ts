export class MerchIdeaDatabaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "MerchIdeaDatabaseError"
    if (options?.cause !== undefined) {
      this.cause = options.cause
    }
  }
}
