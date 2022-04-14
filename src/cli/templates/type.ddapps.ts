export const str = `
import { M } from "ddapps/type.ts";
import { I<%= it.Prefix %>RequestPayload, I<%= it.Prefix %>ResponsePayload } from "./operations.ddapps.ts";
import { I<%= it.Prefix %>MPayload } from "./messages.ddapps.ts";

// Use it to type the incoming message in your handlers
export type <%= it.Prefix %>M<T extends keyof I<%= it.Prefix %>MPayload> = M<
  T,
  I<%= it.Prefix %>RequestPayload,
  I<%= it.Prefix %>ResponsePayload,
  I<%= it.Prefix %>MPayload
>;
`