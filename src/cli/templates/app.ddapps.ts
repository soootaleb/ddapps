export const str = `
import { DDAPPS } from "ddapps/ddapps.ts";
import { state } from "./src/state.ddapps.ts";
import { I<%= it.Prefix %>State } from "./src/interface.ddapps.ts";
import { I<%= it.Prefix %>RequestPayload, I<%= it.Prefix %>ResponsePayload } from "./src/operations.ddapps.ts";
import { I<%= it.Prefix %>MPayload } from "./src/messages.ddapps.ts";
import { <%= it.Prefix %>Peer } from "./src/peer.ddapps.ts";
import { <%= it.Prefix %>Api } from "./src/api.ddapps.ts";

new DDAPPS<
  I<%= it.Prefix %>RequestPayload,
  I<%= it.Prefix %>ResponsePayload,
  I<%= it.Prefix %>MPayload,
  I<%= it.Prefix %>State
>().use(<%= it.Prefix %>Peer)
  .use(<%= it.Prefix %>Api)
  .run(state);
`