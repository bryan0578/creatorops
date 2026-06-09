export class WorkspaceSettingsDatabaseError extends Error {
  name = "WorkspaceSettingsDatabaseError"

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
  }
}
