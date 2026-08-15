import { describe, expect, it } from "vitest"
import type { StepRun } from "@/lib/types"
import {
  allStepsFinished,
  computeStepProgress,
  deriveWorkflowRunStatus,
  updateStepRunStatus,
} from "@/lib/workflow-run-utils"

function makeStep(overrides: Partial<StepRun> = {}): StepRun {
  return {
    id: "s1",
    workflowStepId: "ws1",
    title: "Step",
    description: "",
    promptId: null,
    promptName: "",
    status: "Not started",
    notes: "",
    completedAt: null,
    ...overrides,
  }
}

describe("allStepsFinished", () => {
  it("is false for an empty run", () => {
    expect(allStepsFinished([])).toBe(false)
  })

  it("is false when any step is still open", () => {
    const steps = [
      makeStep({ status: "Complete" }),
      makeStep({ id: "s2", status: "In progress" }),
    ]
    expect(allStepsFinished(steps)).toBe(false)
  })

  it("is true when every step is Complete or Skipped", () => {
    const steps = [
      makeStep({ status: "Complete" }),
      makeStep({ id: "s2", status: "Skipped" }),
    ]
    expect(allStepsFinished(steps)).toBe(true)
  })
})

describe("computeStepProgress", () => {
  it("reports 0/0 for no steps", () => {
    expect(computeStepProgress([])).toEqual({ done: 0, total: 0, percent: 0 })
  })

  it("counts Complete and Skipped as done, and rounds the percent", () => {
    const steps = [
      makeStep({ status: "Complete" }),
      makeStep({ id: "s2", status: "Skipped" }),
      makeStep({ id: "s3", status: "In progress" }),
    ]
    expect(computeStepProgress(steps)).toEqual({ done: 2, total: 3, percent: 67 })
  })
})

describe("deriveWorkflowRunStatus", () => {
  it("never leaves Archived, regardless of step activity", () => {
    const steps = [makeStep({ status: "Complete" })]
    expect(deriveWorkflowRunStatus(steps, "Archived")).toBe("Archived")
    expect(deriveWorkflowRunStatus([], "Archived")).toBe("Archived")
  })

  it("never leaves Complete on its own — only markWorkflowRunComplete does that", () => {
    const steps = [makeStep({ status: "Complete" })]
    expect(deriveWorkflowRunStatus(steps, "Complete")).toBe("Complete")
  })

  it("is Not started with no steps", () => {
    expect(deriveWorkflowRunStatus([], "Not started")).toBe("Not started")
  })

  it("stays Not started until a step has moved off Not started", () => {
    const steps = [makeStep(), makeStep({ id: "s2" })]
    expect(deriveWorkflowRunStatus(steps, "Not started")).toBe("Not started")
  })

  it("is In progress once any step has started", () => {
    const steps = [makeStep({ status: "In progress" }), makeStep({ id: "s2" })]
    expect(deriveWorkflowRunStatus(steps, "Not started")).toBe("In progress")
  })

  // Regression test for the audit finding: deriveWorkflowRunStatus used to
  // contain `current === "Complete" ? "Complete" : "In progress"` after all
  // steps finished — but `current` can never be "Complete" at that point
  // (the function already returns early for it above), so that branch was
  // dead code and the status must always come back "In progress" here.
  // Runs are only ever marked Complete by the explicit
  // markWorkflowRunComplete action, never derived automatically.
  it("stays In progress (not Complete) once all steps finish, until explicitly completed", () => {
    const steps = [
      makeStep({ status: "Complete" }),
      makeStep({ id: "s2", status: "Skipped" }),
    ]
    expect(allStepsFinished(steps)).toBe(true)
    expect(deriveWorkflowRunStatus(steps, "In progress")).toBe("In progress")
  })
})

describe("updateStepRunStatus", () => {
  it("stamps completedAt when a step is marked Complete", () => {
    const run = {
      id: "wr1",
      workflowId: "w1",
      workflowName: "Test workflow",
      category: "General" as const,
      status: "Not started" as const,
      stepRuns: [makeStep()],
      notes: "",
      startedAt: 0,
      updatedAt: 0,
      completedAt: null,
    }

    const updated = updateStepRunStatus(run, "s1", "Complete")
    expect(updated.stepRuns[0].status).toBe("Complete")
    expect(updated.stepRuns[0].completedAt).not.toBeNull()
    expect(updated.status).toBe("In progress")
  })

  it("clears completedAt when a step is reset to Not started", () => {
    const run = {
      id: "wr1",
      workflowId: "w1",
      workflowName: "Test workflow",
      category: "General" as const,
      status: "In progress" as const,
      stepRuns: [makeStep({ status: "Complete", completedAt: 12345 })],
      notes: "",
      startedAt: 0,
      updatedAt: 0,
      completedAt: null,
    }

    const updated = updateStepRunStatus(run, "s1", "Not started")
    expect(updated.stepRuns[0].completedAt).toBeNull()
  })
})
