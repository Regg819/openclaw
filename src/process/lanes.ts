export const enum CommandLane {
  Main = "main",
  Cron = "cron",
  Subagent = "subagent",
  Nested = "nested",
  /**
   * Dedicated lane for approval commands (/approve, /deny).
   * This lane bypasses regular session serialization to prevent deadlock
   * when a plugin approval is blocking inside an agent run.
   */
  Approval = "approval",
}
