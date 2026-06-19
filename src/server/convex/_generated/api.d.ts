/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as agent_helpers from "../agent_helpers.js";
import type * as catchup from "../catchup.js";
import type * as catchup_helpers from "../catchup_helpers.js";
import type * as crons from "../crons.js";
import type * as email from "../email.js";
import type * as github from "../github.js";
import type * as notes from "../notes.js";
import type * as projects from "../projects.js";
import type * as reminders from "../reminders.js";
import type * as settings from "../settings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  agent_helpers: typeof agent_helpers;
  catchup: typeof catchup;
  catchup_helpers: typeof catchup_helpers;
  crons: typeof crons;
  email: typeof email;
  github: typeof github;
  notes: typeof notes;
  projects: typeof projects;
  reminders: typeof reminders;
  settings: typeof settings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
