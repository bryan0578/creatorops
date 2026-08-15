import { describe, expect, it } from "vitest"
import {
  buildCompletedPrompt,
  extractVariablesFromText,
  getMissingVariables,
  isLongVariable,
  mergePromptVariables,
  variableToLabel,
} from "@/lib/prompt-variables"

describe("extractVariablesFromText", () => {
  it("finds {{doubleBrace}} variables", () => {
    expect(extractVariablesFromText("Hello {{name}}, welcome to {{place}}")).toEqual([
      "name",
      "place",
    ])
  })

  it("finds {singleBrace} variables without matching {{doubleBrace}}", () => {
    expect(extractVariablesFromText("Hello {name}")).toEqual(["name"])
  })

  it("does not double-count a variable that appears in both brace styles", () => {
    expect(extractVariablesFromText("{{name}} and {name}")).toEqual(["name"])
  })

  it("returns an empty array when there are no placeholders", () => {
    expect(extractVariablesFromText("Just plain text.")).toEqual([])
  })
})

describe("mergePromptVariables", () => {
  it("keeps declared variables in order and appends new ones found in the text", () => {
    const result = mergePromptVariables(["genre", "mood"], "Track: {{trackName}}")
    expect(result).toEqual(["genre", "mood", "trackName"])
  })

  it("dedupes a declared variable that also appears in the text", () => {
    const result = mergePromptVariables(["genre"], "Genre: {{genre}}")
    expect(result).toEqual(["genre"])
  })

  it("ignores blank/whitespace-only declared variables", () => {
    const result = mergePromptVariables(["genre", "  ", ""], "")
    expect(result).toEqual(["genre"])
  })
})

describe("variableToLabel", () => {
  it("splits camelCase and title-cases each word", () => {
    expect(variableToLabel("trackTitle")).toBe("Track Title")
  })

  it("replaces underscores and hyphens with spaces", () => {
    expect(variableToLabel("target_audience")).toBe("Target Audience")
    expect(variableToLabel("primary-goal")).toBe("Primary Goal")
  })
})

describe("isLongVariable", () => {
  it("treats known long-form fields as long", () => {
    expect(isLongVariable("notes")).toBe(true)
    expect(isLongVariable("sourceContent")).toBe(true)
  })

  it("treats short single-word fields as not long", () => {
    expect(isLongVariable("genre")).toBe(false)
    expect(isLongVariable("bpm")).toBe(false)
  })
})

describe("buildCompletedPrompt", () => {
  it("substitutes provided values into both brace styles", () => {
    const result = buildCompletedPrompt(
      "Genre: {{genre}}, Mood: {mood}",
      { genre: "Lo-fi", mood: "Chill" },
      ["genre", "mood"],
    )
    expect(result).toBe("Genre: Lo-fi, Mood: Chill")
  })

  it("leaves a placeholder untouched when its value is blank", () => {
    const result = buildCompletedPrompt(
      "Genre: {{genre}}",
      { genre: "   " },
      ["genre"],
    )
    expect(result).toBe("Genre: {{genre}}")
  })

  it("safely handles variable names containing regex-special characters", () => {
    const result = buildCompletedPrompt(
      "Value: {{a.b+c}}",
      { "a.b+c": "ok" },
      ["a.b+c"],
    )
    expect(result).toBe("Value: ok")
  })
})

describe("getMissingVariables", () => {
  it("reports variables with no value or a blank value", () => {
    const missing = getMissingVariables(
      ["genre", "mood", "notes"],
      { genre: "Lo-fi", mood: "   " },
    )
    expect(missing).toEqual(["mood", "notes"])
  })

  it("reports nothing when every variable has a real value", () => {
    const missing = getMissingVariables(["genre"], { genre: "Lo-fi" })
    expect(missing).toEqual([])
  })
})
