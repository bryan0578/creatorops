export class WorkflowDatabaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "WorkflowDatabaseError"
    if (options?.cause !== undefined) {
      this.cause = options.cause
    }
  }
}
