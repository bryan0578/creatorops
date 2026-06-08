export class WorkflowRunDatabaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "WorkflowRunDatabaseError"
    if (options?.cause !== undefined) {
      this.cause = options.cause
    }
  }
}
