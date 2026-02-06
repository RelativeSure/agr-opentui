import { existsSync, readFileSync, writeFileSync } from "node:fs";

export type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type SpawnedProcess = {
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  exited: Promise<number>;
};

export interface AppDeps {
  cwd: () => string;
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: BufferEncoding) => string;
  writeFileSync: (path: string, data: string, encoding: BufferEncoding) => void;
  now: () => number;
  setTimeout: (callback: () => void, ms: number) => unknown;
  spawn: (args: string[], options: { stdout: "pipe"; stderr: "pipe"; cwd: string; env: NodeJS.ProcessEnv }) => SpawnedProcess;
  env: () => NodeJS.ProcessEnv;
}

export const defaultAppDeps: AppDeps = {
  cwd: () => process.cwd(),
  existsSync,
  readFileSync,
  writeFileSync,
  now: () => Date.now(),
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  spawn: (args, options) => Bun.spawn(args, options) as SpawnedProcess,
  env: () => process.env,
};
