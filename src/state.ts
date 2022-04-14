import { parse } from "std/flags/mod.ts";
import { IState } from "./interface.ts";
import { IMPayload } from "./messages.ts";
import { DClientSet } from "./models/clientset.model.ts";
import { DRemotePeerSet } from "./models/remotepeerset.model.ts";
import { IRequestPayload, IResponsePayload } from "./operation.ts";

const ARGS = parse(Deno.args);

export const state: IState<IRequestPayload, IResponsePayload, IMPayload> = {
  ready: false,

  net: {
    requests: {},
    ready: false,
    peers: new DRemotePeerSet(),
    clients: new DClientSet(),
  },

  log: {
    console: Boolean(ARGS["console-messages"]),
    debug: Boolean(ARGS["debug"]),
    last: new Date().getTime(),
    exclude: [],
  },

  mon: {
    requests: [],
    stats: {},
    watchers: {},
    loggers: [],
    trace: {}
  },

  testing: {
    dummy: ""
  }
};

export function of<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload,
  MPayload extends IMPayload<ReqPayload, ResPayload> = IMPayload<
    ReqPayload,
    ResPayload
  >
>(): IState<
  ReqPayload,
  ResPayload,
  MPayload> {

  return {
    ...state,

    net: {
      ...state.net,
      peers: new DRemotePeerSet<ReqPayload, ResPayload, MPayload>(),
      clients: new DClientSet<ReqPayload, ResPayload>(),
    },
  };

}