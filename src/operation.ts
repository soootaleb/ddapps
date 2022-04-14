import { EComponent } from "./enumeration.ts";
import { IMonOp, IMonWatch } from "./interface.ts";

export enum EOpType {
  Any = "Any",
  Ping = "Ping",
  Pong = "Pong",
  MonOp = "MonOp",
  MonWatch = "MonWatch",
  Crash = "Crash",
  Trace = "Trace"
}

export interface IRequestPayload {
  [EOpType.Crash]: null,
  [EOpType.Any]: unknown;
  [EOpType.Ping]: null;
  [EOpType.Pong]: number;
  [EOpType.MonOp]: IMonOp;
  [EOpType.MonWatch]: IMonWatch;
}

export interface IResponsePayload {
  [EOpType.Crash]: null,
  [EOpType.Any]: unknown;
  [EOpType.Ping]: null;
  [EOpType.Pong]: number;
  [EOpType.MonOp]: IMonOp;
  [EOpType.Trace]: string | EComponent;
  [EOpType.MonWatch]: {
    key: string,
    value: unknown
  };
}

export interface IClientRequest<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ReqType extends keyof ReqPayload = keyof ReqPayload,
> {
  token: string;
  type: ReqType;
  trace: boolean;
  payload: ReqPayload[ReqType];
  timestamp: number;
}

export interface IClientResponse<
  ResPayload extends IResponsePayload = IResponsePayload,
  ResType extends keyof ResPayload = keyof ResPayload,
> {
  token: string;
  type: ResType;
  payload: ResPayload[ResType];
  timestamp: number;
}
