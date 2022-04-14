export const str = `
import { Api } from "ddapps/api.ts";
import { EMType } from "ddapps/messages.ts";
import { M } from "ddapps/type.ts";
import { I<%= it.Prefix %>State } from "./interface.ddapps.ts";
import { E<%= it.Prefix %>MType, I<%= it.Prefix %>MPayload } from "./messages.ddapps.ts";
import {
  E<%= it.Prefix %>OpType,
  I<%= it.Prefix %>RequestPayload,
  I<%= it.Prefix %>ResponsePayload,
} from "./operations.ddapps.ts";
import { <%= it.Prefix %>M } from "./type.ddapps.ts";
import { <%= it.Prefix %>Peer } from "./peer.ddapps.ts";

export class <%= it.Prefix %>Api extends Api<
  I<%= it.Prefix %>RequestPayload,
  I<%= it.Prefix %>ResponsePayload,
  I<%= it.Prefix %>MPayload,
  I<%= it.Prefix %>State
> {
  protected override [EMType.ClientRequest](message: M<EMType.ClientRequest> | <%= it.Prefix %>M<EMType.ClientRequest>) {
    super.ClientRequest(message as M<EMType.ClientRequest>);
    switch (message.payload.type) {
      case E<%= it.Prefix %>OpType.<%= it.Prefix %>Set:
        this.send(
          E<%= it.Prefix %>MType.<%= it.CCAppName %>CustomMessage,
          message.payload.payload as I<%= it.Prefix %>MPayload[E<%= it.Prefix %>MType.<%= it.CCAppName %>CustomMessage],
          <%= it.Prefix %>Peer
        ).then(() => {
          this.response(
            E<%= it.Prefix %>OpType.<%= it.Prefix %>Set,
            null
          )
        })
        break;
      case E<%= it.Prefix %>OpType.<%= it.Prefix %>Get:
        this.response( // A utility method that allows to formulate a ClientResponse with typed operation
          E<%= it.Prefix %>OpType.<%= it.Prefix %>Get,
          this.state.value
        )
        break;
      default:
        break;
    }
  }
}
`