export class PromptRunDatabaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "PromptRunDatabaseError"
    if (options?.cause !== undefined) {
      this.cause = options.cause
    }
  }
}
