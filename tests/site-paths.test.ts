import assert from "node:assert/strict"
import test from "node:test"

import { normalizeBasePath } from "../lib/site-paths.ts"

test("normalizeBasePath handles an empty or root base path", () => {
  assert.equal(normalizeBasePath(""), "")
  assert.equal(normalizeBasePath("/"), "")
})

test("normalizeBasePath adds a leading slash when needed", () => {
  assert.equal(normalizeBasePath("aether-study-timer"), "/aether-study-timer")
})

test("normalizeBasePath removes trailing slashes", () => {
  assert.equal(normalizeBasePath("/aether-study-timer/"), "/aether-study-timer")
  assert.equal(normalizeBasePath("/aether-study-timer///"), "/aether-study-timer")
})

test("normalizeBasePath preserves nested path segments", () => {
  assert.equal(normalizeBasePath("portfolio/aether/"), "/portfolio/aether")
})
