import { expect, test, describe } from "bun:test";
import { cn } from "../src/lib/utils";

describe("cn", () => {
  test("concatenates class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
    expect(cn("foo", { bar: true })).toBe("foo bar");
    expect(cn("foo", { bar: false })).toBe("foo");
  });

  test("merges tailwind classes correctly", () => {
    // Basic tailwind-merge functionality
    expect(cn("px-2 py-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  test("handles conditional classes", () => {
    expect(cn("base", true && "conditional")).toBe("base conditional");
    expect(cn("base", false && "conditional")).toBe("base");
  });

  test("handles arrays and nested values", () => {
    expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
    expect(cn(["foo", ["bar", "baz"]])).toBe("foo bar baz");
  });

  test("handles falsy values", () => {
    expect(cn("foo", null, undefined, false)).toBe("foo");
  });

  test("handles complex tailwind conflicts", () => {
    expect(cn("bg-red-500 bg-blue-500")).toBe("bg-blue-500");
    expect(cn("px-2 py-2", "px-4")).toBe("py-2 px-4");
  });
});
