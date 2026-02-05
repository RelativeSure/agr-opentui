import { join } from "node:path";
import type { AppDeps } from "../deps";
import { defaultAppDeps } from "../deps";

function readAgrToml(input: { cwd: string; deps?: Pick<AppDeps, "existsSync" | "readFileSync"> }): string | null {
  const deps = input.deps ?? defaultAppDeps;
  const path = join(input.cwd, "agr.toml");
  if (!deps.existsSync(path)) {
    return null;
  }
  return deps.readFileSync(path, "utf-8");
}

export function verifyAgrTomlContainsWithUi(input: {
  cwd: string;
  handle: string;
  label: string;
  handleVariants: (handle: string) => string[];
  openVerify: (message: string, details?: string[]) => void;
  logEvent: (message: string) => void;
  deps?: Pick<AppDeps, "existsSync" | "readFileSync">;
}): void {
  const text = readAgrToml({ cwd: input.cwd, deps: input.deps });
  if (!text) {
    input.openVerify("agr.toml is missing after command.");
    input.logEvent(`Verify ${input.label}: agr.toml missing`);
    return;
  }
  const variants = input.handleVariants(input.handle);
  const found = variants.some((v) => text.includes(v));
  if (!found) {
    input.openVerify("agr.toml missing handle:", [input.handle]);
    input.logEvent(`Verify ${input.label}: handle not found (${input.handle})`);
  }
}

export function verifyAgrTomlContainsManyWithUi(input: {
  cwd: string;
  handles: string[];
  label: string;
  handleVariants: (handle: string) => string[];
  openVerify: (message: string, details?: string[]) => void;
  logEvent: (message: string) => void;
  deps?: Pick<AppDeps, "existsSync" | "readFileSync">;
}): void {
  const text = readAgrToml({ cwd: input.cwd, deps: input.deps });
  if (!text) {
    input.openVerify("agr.toml is missing after command.");
    input.logEvent(`Verify ${input.label}: agr.toml missing`);
    return;
  }
  const missing = input.handles.filter((h) => !text.includes(h));
  if (missing.length > 0) {
    const filtered = missing.filter((h) => !input.handleVariants(h).some((v) => text.includes(v)));
    if (filtered.length === 0) {
      return;
    }
    input.openVerify("agr.toml missing handles:", filtered);
    input.logEvent(`Verify ${input.label}: missing ${filtered.join(", ")}`);
  }
}

export function verifyAgrTomlMissingWithUi(input: {
  cwd: string;
  handle: string;
  label: string;
  handleVariants: (handle: string) => string[];
  openVerify: (message: string, details?: string[]) => void;
  logEvent: (message: string) => void;
  deps?: Pick<AppDeps, "existsSync" | "readFileSync">;
}): void {
  const text = readAgrToml({ cwd: input.cwd, deps: input.deps });
  if (!text) {
    return;
  }
  const variants = input.handleVariants(input.handle);
  const found = variants.some((v) => text.includes(v));
  if (found) {
    input.openVerify("agr.toml still contains handle:", [input.handle]);
    input.logEvent(`Verify ${input.label}: handle still present (${input.handle})`);
  }
}

export function verifyAgrTomlMissingManyWithUi(input: {
  cwd: string;
  handles: string[];
  label: string;
  handleVariants: (handle: string) => string[];
  openVerify: (message: string, details?: string[]) => void;
  logEvent: (message: string) => void;
  deps?: Pick<AppDeps, "existsSync" | "readFileSync">;
}): void {
  const text = readAgrToml({ cwd: input.cwd, deps: input.deps });
  if (!text) {
    return;
  }
  const present = input.handles.filter((h) => text.includes(h));
  if (present.length > 0) {
    const filtered = present.filter((h) => input.handleVariants(h).some((v) => text.includes(v)));
    if (filtered.length === 0) {
      return;
    }
    input.openVerify("agr.toml still contains:", filtered);
    input.logEvent(`Verify ${input.label}: still present ${filtered.join(", ")}`);
  }
}

export function verifyAgrTomlHasAnyWithUi(input: {
  cwd: string;
  label: string;
  openVerify: (message: string, details?: string[]) => void;
  logEvent: (message: string) => void;
  deps?: Pick<AppDeps, "existsSync" | "readFileSync">;
}): void {
  const text = readAgrToml({ cwd: input.cwd, deps: input.deps });
  if (!text) {
    input.openVerify("agr.toml is missing after sync.");
    input.logEvent(`Verify ${input.label}: agr.toml missing`);
    return;
  }
  if (!/dependencies\s*=|\[\[dependencies\]\]/.test(text)) {
    input.openVerify("agr.toml has no dependencies after sync.");
    input.logEvent(`Verify ${input.label}: no dependencies found`);
  }
}
