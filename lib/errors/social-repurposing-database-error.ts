export class SocialRepurposingDatabaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "SocialRepurposingDatabaseError"
    if (options?.cause !== undefined) {
      this.cause = options.cause
    }
  }
}
