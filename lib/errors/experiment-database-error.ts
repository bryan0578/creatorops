export class ExperimentDatabaseError extends Error {
  cause?: unknown

  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "ExperimentDatabaseError"
    this.cause = options?.cause
  }
}
