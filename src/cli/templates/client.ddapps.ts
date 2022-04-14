export const str = `
import { Client } from "ddapps/client.ts";
import { I<%= it.Prefix %>MPayload } from "./messages.ddapps.ts";
import {
  E<%= it.Prefix %>OpType,
  I<%= it.Prefix %>RequestPayload,
  I<%= it.Prefix %>ResponsePayload,
} from "./operations.ddapps.ts";

export class <%= it.Prefix %>Client extends Client<
  I<%= it.Prefix %>RequestPayload,
  I<%= it.Prefix %>ResponsePayload,
  I<%= it.Prefix %>MPayload
> {

  public <%= it.PrefixLower %>get() {
    return this.send(E<%= it.Prefix %>OpType.<%= it.Prefix %>Get, null);
  }

  public <%= it.PrefixLower %>set(value: number) {
    return this.send(E<%= it.Prefix %>OpType.<%= it.Prefix %>Set, value);
  }
}
`