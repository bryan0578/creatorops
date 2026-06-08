export class ProductListingDatabaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "ProductListingDatabaseError"
    if (options?.cause !== undefined) {
      this.cause = options.cause
    }
  }
}
