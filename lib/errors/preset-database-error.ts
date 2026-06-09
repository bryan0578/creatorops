export class PresetDatabaseError extends Error {
  name = "PresetDatabaseError"

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
  }
}
