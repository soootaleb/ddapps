export const str = `
import { of } from "ddapps/state.ts";
import { I<%= it.Prefix %>State } from "./interface.ddapps.ts";
import { I<%= it.Prefix %>RequestPayload, I<%= it.Prefix %>ResponsePayload } from "./operations.ddapps.ts";
import { I<%= it.Prefix %>MPayload } from "./messages.ddapps.ts";

export const state: I<%= it.Prefix %>State = {
  ...of<I<%= it.Prefix %>RequestPayload, I<%= it.Prefix %>ResponsePayload, I<%= it.Prefix %>MPayload>(),

  // Add your state properties here

  value: 69
};
`