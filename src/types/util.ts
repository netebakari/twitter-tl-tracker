import { AssertionError } from "assert";

export const mustBeString = (arg: any, propertyName: string, undefinedAllowed = false) => {
  const value = arg[propertyName];
  if (undefinedAllowed) {
    if (value !== undefined && typeof value !== "string") {
      throw new AssertionError({ message: `arg.${propertyName} is neigther undefined not a string`, actual: value });
    }
  } else {
    if (typeof value !== "string") {
      throw new AssertionError({ message: `arg.${propertyName} is not a string`, actual: value });
    }
  }
};

export const mustBeNumber = (arg: any, propertyName: string, undefinedAllowed = false) => {
  const value = arg[propertyName];
  if (undefinedAllowed) {
    if (value !== undefined && typeof value !== "number") {
      throw new AssertionError({ message: `arg.${propertyName} is neigther undefined not a number`, actual: value });
    }
  } else {
    if (typeof value !== "number") {
      throw new AssertionError({ message: `arg.${propertyName} is not a number`, actual: value });
    }
  }
};

export const mustBeBoolean = (arg: any, propertyName: string, undefinedAllowed = false) => {
  const value = arg[propertyName];
  if (undefinedAllowed) {
    if (value !== undefined && typeof value !== "boolean") {
      throw new AssertionError({ message: `arg.${propertyName} is neigther undefined not a boolean`, actual: value });
    }
  } else {
    if (typeof value !== "boolean") {
      throw new AssertionError({ message: `arg.${propertyName} is not a boolean`, actual: value });
    }
  }
};

export const mustBeObject = (arg: any) => {
  if (arg === undefined) {
    throw new AssertionError({ message: "arg is undefined" });
  }
  if (arg === null) {
    throw new AssertionError({ message: "arg is null" });
  }
  if (typeof arg !== "object") {
    throw new AssertionError({ message: "arg is not object" });
  }
};

export const mustBeArray = (arg: any, propertyName: string) => {
  if (!Array.isArray(arg[propertyName])) {
    throw new AssertionError({ message: `arg.${propertyName} is not an array`, actual: arg[propertyName] });
  }
};
