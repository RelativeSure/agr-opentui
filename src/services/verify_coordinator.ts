import type { AppDeps } from "../deps";
import {
  verifyAgrTomlContainsManyWithUi,
  verifyAgrTomlContainsWithUi,
  verifyAgrTomlHasAnyWithUi,
  verifyAgrTomlMissingManyWithUi,
  verifyAgrTomlMissingWithUi,
} from "./verify";

type VerifyFn<T> = (input: T) => void;

export function createVerifyCoordinator(input: {
  cwd: string;
  deps: Pick<AppDeps, "existsSync" | "readFileSync">;
  handleVariants: (handle: string) => string[];
  openVerify: (message: string, details?: string[]) => void;
  logEvent: (message: string) => void;
  verifyContainsImpl?: VerifyFn<{
    cwd: string;
    handle: string;
    label: string;
    handleVariants: (handle: string) => string[];
    openVerify: (message: string, details?: string[]) => void;
    logEvent: (message: string) => void;
    deps?: Pick<AppDeps, "existsSync" | "readFileSync">;
  }>;
  verifyContainsManyImpl?: VerifyFn<{
    cwd: string;
    handles: string[];
    label: string;
    handleVariants: (handle: string) => string[];
    openVerify: (message: string, details?: string[]) => void;
    logEvent: (message: string) => void;
    deps?: Pick<AppDeps, "existsSync" | "readFileSync">;
  }>;
  verifyMissingImpl?: VerifyFn<{
    cwd: string;
    handle: string;
    label: string;
    handleVariants: (handle: string) => string[];
    openVerify: (message: string, details?: string[]) => void;
    logEvent: (message: string) => void;
    deps?: Pick<AppDeps, "existsSync" | "readFileSync">;
  }>;
  verifyMissingManyImpl?: VerifyFn<{
    cwd: string;
    handles: string[];
    label: string;
    handleVariants: (handle: string) => string[];
    openVerify: (message: string, details?: string[]) => void;
    logEvent: (message: string) => void;
    deps?: Pick<AppDeps, "existsSync" | "readFileSync">;
  }>;
  verifyHasAnyImpl?: VerifyFn<{
    cwd: string;
    label: string;
    openVerify: (message: string, details?: string[]) => void;
    logEvent: (message: string) => void;
    deps?: Pick<AppDeps, "existsSync" | "readFileSync">;
  }>;
}): {
  verifyAgrTomlContains: (handle: string, label: string) => void;
  verifyAgrTomlContainsMany: (handles: string[], label: string) => void;
  verifyAgrTomlMissing: (handle: string, label: string) => void;
  verifyAgrTomlMissingMany: (handles: string[], label: string) => void;
  verifyAgrTomlHasAny: (label: string) => void;
} {
  const verifyContains = input.verifyContainsImpl ?? verifyAgrTomlContainsWithUi;
  const verifyContainsMany = input.verifyContainsManyImpl ?? verifyAgrTomlContainsManyWithUi;
  const verifyMissing = input.verifyMissingImpl ?? verifyAgrTomlMissingWithUi;
  const verifyMissingMany = input.verifyMissingManyImpl ?? verifyAgrTomlMissingManyWithUi;
  const verifyHasAny = input.verifyHasAnyImpl ?? verifyAgrTomlHasAnyWithUi;

  return {
    verifyAgrTomlContains: (handle, label) => {
      verifyContains({
        cwd: input.cwd,
        handle,
        label,
        handleVariants: input.handleVariants,
        openVerify: input.openVerify,
        logEvent: input.logEvent,
        deps: input.deps,
      });
    },
    verifyAgrTomlContainsMany: (handles, label) => {
      verifyContainsMany({
        cwd: input.cwd,
        handles,
        label,
        handleVariants: input.handleVariants,
        openVerify: input.openVerify,
        logEvent: input.logEvent,
        deps: input.deps,
      });
    },
    verifyAgrTomlMissing: (handle, label) => {
      verifyMissing({
        cwd: input.cwd,
        handle,
        label,
        handleVariants: input.handleVariants,
        openVerify: input.openVerify,
        logEvent: input.logEvent,
        deps: input.deps,
      });
    },
    verifyAgrTomlMissingMany: (handles, label) => {
      verifyMissingMany({
        cwd: input.cwd,
        handles,
        label,
        handleVariants: input.handleVariants,
        openVerify: input.openVerify,
        logEvent: input.logEvent,
        deps: input.deps,
      });
    },
    verifyAgrTomlHasAny: (label) => {
      verifyHasAny({
        cwd: input.cwd,
        label,
        openVerify: input.openVerify,
        logEvent: input.logEvent,
        deps: input.deps,
      });
    },
  };
}
