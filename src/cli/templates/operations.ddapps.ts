export const str = `
import { IRequestPayload, IResponsePayload } from "ddapps/operation.ts";

export enum E<%= it.Prefix %>OpType {
  <%= it.Prefix %>Get = "<%= it.Prefix %>Get",
  <%= it.Prefix %>Set = "<%= it.Prefix %>Set"
}

export interface I<%= it.Prefix %>RequestPayload extends IRequestPayload {
  [E<%= it.Prefix %>OpType.<%= it.Prefix %>Get]: null;
  [E<%= it.Prefix %>OpType.<%= it.Prefix %>Set]: number;
}

export interface I<%= it.Prefix %>ResponsePayload extends IResponsePayload {
  [E<%= it.Prefix %>OpType.<%= it.Prefix %>Get]: number;
  [E<%= it.Prefix %>OpType.<%= it.Prefix %>Set]: null;
}
`