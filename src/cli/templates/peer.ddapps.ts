export const str = `
import { Peer } from "ddapps/peer.ts";
import { E<%= it.Prefix %>MType, I<%= it.Prefix %>MPayload } from "./messages.ddapps.ts";
import { <%= it.Prefix %>M } from "./type.ddapps.ts";
import {
  I<%= it.Prefix %>RequestPayload,
  I<%= it.Prefix %>ResponsePayload,
} from "./operations.ddapps.ts";
import { I<%= it.Prefix %>State } from "./interface.ddapps.ts";

export class <%= it.Prefix %>Peer extends Peer<
  I<%= it.Prefix %>RequestPayload,
  I<%= it.Prefix %>ResponsePayload,
  I<%= it.Prefix %>MPayload,
  I<%= it.Prefix %>State
> {
  protected [E<%= it.Prefix %>MType.<%= it.CCAppName %>CustomMessage](message: <%= it.Prefix %>M<E<%= it.Prefix %>MType.<%= it.CCAppName %>CustomMessage>) {
    
    // Implement your first handler here
    this.state.value = message.payload;

  }
}
`