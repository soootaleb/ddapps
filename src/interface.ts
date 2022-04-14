import { EComponent } from "./enumeration.ts";
import { IMPayload } from "./messages.ts";
import { IRequestPayload, IResponsePayload } from "./operation.ts";
import { EMonOpType } from "./enumeration.ts";
import { DRemotePeerSet } from "./models/remotepeerset.model.ts";
import { DClientSet } from "./models/clientset.model.ts";

export interface IMessage<
  T extends keyof MPayload = keyof IMPayload,
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload,
  MPayload extends IMPayload<ReqPayload, ResPayload> = IMPayload<
    ReqPayload,
    ResPayload
  >,
  > {
  type: T;
  source: string;
  destination: EComponent | string;
  payload: MPayload[T];
}

export interface IState<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload,
  MPayload extends IMPayload<ReqPayload, ResPayload> = IMPayload<
    ReqPayload,
    ResPayload
  >> {
  ready: boolean;

  net: {
    requests: { [key: string]: string };
    ready: boolean;
    peers: DRemotePeerSet<ReqPayload, ResPayload, MPayload>,
    clients: DClientSet<ReqPayload, ResPayload>
  };

  log: {
    console: boolean;
    debug: boolean;
    exclude: (keyof MPayload)[];
    last: number;
  };

  mon: {
    requests: string[];
    stats: { [key: string]: number };
    watchers: {
      [key: string]: {
        interval: number,
        expire: number
      }
    };
    loggers: string[];

    /**
     * key: Message hash
     * value: {
     *  token: Request token
     *  notify: Send ClientNotification
     * }
     */
    trace: {
      [key: string]: {
        notify: boolean,
        token: string
      }
    }
  };

  testing: {
    dummy: string // Use for e2e tests E2E::Mon::Set
  }
}

export interface IMonOp<T = string | number | { [key: string]: unknown }> {
  op: EMonOpType;
  metric: {
    key: string;
    value?: T;
  };
}

export interface IMonWatch {
  key: string;
  expire: number; // limit of notifies
}
