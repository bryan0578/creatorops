import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createPersistedListStore,
  mergeById,
  PROMPTS_KEY,
  loadPrompts,
  savePrompts,
} from "@/lib/storage"
import { SEED_PROMPTS } from "@/lib/seed-data"

// lib/storage.ts branches on `typeof window === "undefined"` to stay
// SSR-safe. These tests exercise the "real browser" branch, so we stub a
// minimal in-memory localStorage rather than pulling in a full DOM env.
function installFakeLocalStorage() {
  const data = new Map<string, string>()
  const fakeLocalStorage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
    clear: () => data.clear(),
  }
  vi.stubGlobal("window", {})
  vi.stubGlobal("localStorage", fakeLocalStorage)
  return fakeLocalStorage
}

describe("loadPrompts / savePrompts", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it("falls back to seed data when localStorage has never been written", () => {
    installFakeLocalStorage()
    expect(loadPrompts()).toEqual(SEED_PROMPTS)
  })

  it("falls back to seed data when localStorage holds malformed JSON", () => {
    const fake = installFakeLocalStorage()
    fake.setItem(PROMPTS_KEY, "{not valid json")
    expect(loadPrompts()).toEqual(SEED_PROMPTS)
  })

  it("round-trips real data through save then load", () => {
    installFakeLocalStorage()
    const custom = [{ ...SEED_PROMPTS[0], id: "custom-1", name: "Custom prompt" }]
    savePrompts(custom)
    expect(loadPrompts()).toEqual(custom)
  })

  it("returns seed data on the server, without touching localStorage", () => {
    // no window/localStorage stub installed — simulates SSR
    expect(loadPrompts()).toEqual(SEED_PROMPTS)
  })
})

describe("mergeById", () => {
  it("overwrites existing entries with incoming ones sharing an id", () => {
    const existing = [{ id: "a", value: 1 }, { id: "b", value: 2 }]
    const incoming = [{ id: "a", value: 99 }]
    expect(mergeById(existing, incoming)).toEqual([
      { id: "a", value: 99 },
      { id: "b", value: 2 },
    ])
  })

  it("appends incoming entries whose id doesn't already exist", () => {
    const existing = [{ id: "a", value: 1 }]
    const incoming = [{ id: "b", value: 2 }]
    expect(mergeById(existing, incoming)).toEqual([
      { id: "a", value: 1 },
      { id: "b", value: 2 },
    ])
  })
})

describe("createPersistedListStore", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it("getServerSnapshot always returns the stable seed reference", () => {
    const seed: { id: string }[] = []
    const store = createPersistedListStore(
      seed,
      () => [{ id: "x" }],
      () => {},
    )
    expect(store.getServerSnapshot()).toBe(seed)
    expect(store.getServerSnapshot()).toBe(store.getServerSnapshot())
  })

  it("getSnapshot loads once from the client source and caches the result", () => {
    installFakeLocalStorage()
    const load = vi.fn(() => [{ id: "loaded" }])
    const store = createPersistedListStore([], load, () => {})

    const first = store.getSnapshot()
    const second = store.getSnapshot()

    expect(load).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)
    expect(first).toEqual([{ id: "loaded" }])
  })

  it("set() persists the new value and notifies subscribers", () => {
    installFakeLocalStorage()
    const save = vi.fn()
    const store = createPersistedListStore<{ id: string }>([], () => [], save)
    const listener = vi.fn()
    store.subscribe(listener)

    store.set((prev) => [...prev, { id: "new" }])

    expect(store.getSnapshot()).toEqual([{ id: "new" }])
    expect(save).toHaveBeenCalledWith([{ id: "new" }])
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("unsubscribe stops further notifications", () => {
    installFakeLocalStorage()
    const store = createPersistedListStore<{ id: string }>([], () => [], () => {})
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    unsubscribe()

    store.set((prev) => [...prev, { id: "new" }])

    expect(listener).not.toHaveBeenCalled()
  })
})
