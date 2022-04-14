export const str = `
import { I<%= it.Prefix %>RequestPayload, I<%= it.Prefix %>ResponsePayload } from "./operations.ddapps.ts"
import { IMPayload } from "ddapps/messages.ts"

/**
 * List of Messages available. Use it for a stronger typing.
 */
export enum E<%= it.Prefix %>MType {
  
  /**
   * Document the use of your messages & their payload
   * @param {unknown} The payload
   */
  <%= it.CCAppName %>CustomMessage = "<%= it.CCAppName %>CustomMessage"
}

/**
 * Type the payload of your messages
 */
export interface I<%= it.Prefix %>MPayload extends IMPayload<I<%= it.Prefix %>RequestPayload, I<%= it.Prefix %>ResponsePayload> {

  /**
   * Document the use of your messages & their payload
   * @param {unknown} The payload
   */
  [E<%= it.Prefix %>MType.<%= it.CCAppName %>CustomMessage]: number;

}
`