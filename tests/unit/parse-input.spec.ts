import { test } from "@japa/runner";
import { inferTypeAndName, parseInputName } from "../../src/commands/new/parse-input.ts";

test.group("parseInputName", () => {
  test("splits on hyphen", ({ assert }) => {
    const result = parseInputName("my-button");
    assert.deepEqual(result, { slug: "my-button", name: "MyButton" });
  });

  test("splits on underscore and normalizes to hyphen slug", ({ assert }) => {
    const result = parseInputName("my_component");
    assert.deepEqual(result, { slug: "my-component", name: "MyComponent" });
  });

  test("single word stays single word", ({ assert }) => {
    const result = parseInputName("header");
    assert.deepEqual(result, { slug: "header", name: "Header" });
  });

  test("does NOT split on forward slash", ({ assert }) => {
    const result = parseInputName("nested/path");
    assert.deepEqual(result, { slug: "nested/path", name: "Nested/path" });
  });

  test("splits on whitespace", ({ assert }) => {
    const result = parseInputName("my cool widget");
    assert.deepEqual(result, { slug: "my-cool-widget", name: "MyCoolWidget" });
  });
});

test.group("inferTypeAndName", () => {
  test("leading slash -> route type", ({ assert }) => {
    const result = inferTypeAndName(["node", "qwik", "new", "/dashboard"]);
    assert.deepEqual(result, {
      typeArg: "route",
      nameArg: "/dashboard",
    });
  });

  test("no slash -> component type", ({ assert }) => {
    const result = inferTypeAndName(["node", "qwik", "new", "counter"]);
    assert.deepEqual(result, {
      typeArg: "component",
      nameArg: "counter",
    });
  });

  test(".md extension -> markdown type, extension stripped", ({ assert }) => {
    const result = inferTypeAndName(["node", "qwik", "new", "/blog/post.md"]);
    assert.deepEqual(result, {
      typeArg: "markdown",
      nameArg: "/blog/post",
    });
  });

  test(".mdx extension -> mdx type, extension stripped", ({ assert }) => {
    const result = inferTypeAndName(["node", "qwik", "new", "/blog/post.mdx"]);
    assert.deepEqual(result, {
      typeArg: "mdx",
      nameArg: "/blog/post",
    });
  });

  test("no input -> undefined/undefined", ({ assert }) => {
    const result = inferTypeAndName(["node", "qwik", "new"]);
    assert.deepEqual(result, {
      typeArg: undefined,
      nameArg: undefined,
    });
  });

  test("flags are filtered out", ({ assert }) => {
    const result = inferTypeAndName(["node", "qwik", "new", "--qwik", "/dashboard"]);
    assert.deepEqual(result, {
      typeArg: "route",
      nameArg: "/dashboard",
    });
  });
});
