// app/polyfills.ts

// 1) Make JSON.stringify(BigInt) safe
// Some environments (or error overlays) will try to JSON.stringify
// objects that contain BigInts and throw "Do not know how to serialize a BigInt".
if (typeof BigInt !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (BigInt.prototype as any).toJSON = function () {
    // Serialize as a decimal string so it can be logged / inspected
    return this.toString();
  };
}

// 2) Optional safety guard: on *very* old JS engines with no BigInt,
// define a stub that always throws. Your components already check
// typeof BigInt, so they won't actually call this, but it avoids
// some weird "BigInt is not defined" crashes in bundled code.
if (typeof BigInt === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).BigInt = function () {
    throw new Error(
      "BigInt is not supported in this browser. Please open Basebots in a modern browser.",
    );
  };
}

export {};
