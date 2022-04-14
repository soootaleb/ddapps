export const str = `
import { I<%= it.Prefix %>RequestPayload, I<%= it.Prefix %>ResponsePayload } from "./operations.ddapps.ts"
import { I<%= it.Prefix %>MPayload } from "./messages.ddapps.ts"
import { IState } from "ddapps/interface.ts";

export interface I<%= it.Prefix %>State extends IState<
  I<%= it.Prefix %>RequestPayload,
  I<%= it.Prefix %>ResponsePayload,
  I<%= it.Prefix %>MPayload
> {

  // Type your custom properties
  value: number
}
`