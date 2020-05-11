import { AssertionError } from "assert";

export function assertsObject(arg: any) {
  if (arg === null) {
    throw new AssertionError({ message: "arg is null" });
  }
  if (arg === undefined) {
    throw new AssertionError({ message: "arg is undefined" });
  }
  if (typeof arg === "object") {
    throw new AssertionError({ message: "arg is not an object" });
  }
}

export function assertsString(arg: any, undefinedAllowed = false): asserts arg is string | undefined {
  if (undefinedAllowed) {
    if (arg !== undefined && typeof arg !== "string") {
      throw new AssertionError({ message: `arg is neigther undefined not a string`, actual: arg });
    }
  } else {
    if (typeof arg !== "string") {
      throw new AssertionError({ message: `arg is not a string`, actual: arg });
    }
  }
}

export const assertsNumber = (arg: any, undefinedAllowed = false) => {
  if (undefinedAllowed) {
    if (arg !== undefined && typeof arg !== "number") {
      throw new AssertionError({ message: `arg is neigther undefined not a number`, actual: arg });
    }
  } else {
    if (typeof arg !== "number") {
      throw new AssertionError({ message: `arg is not a number`, actual: arg });
    }
  }
};
