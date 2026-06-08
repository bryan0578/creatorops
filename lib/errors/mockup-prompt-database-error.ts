export class MockupPromptDatabaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "MockupPromptDatabaseError"
    if (options?.cause !== undefined) {
      this.cause = options.cause
    }
  }
}
