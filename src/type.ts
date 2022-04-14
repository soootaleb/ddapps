import {
  IMessage,
} from "./interface.ts";
import { IMPayload } from "./messages.ts";
import { IRequestPayload, IResponsePayload } from "./operation.ts";

/**
 * EMType Handler (H) is a function accepting an IMessage<EMType>
 */
export type H<
  T extends keyof MPayload,
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload,
  MPayload extends IMPayload<ReqPayload, ResPayload> = IMPayload<
    ReqPayload,
    ResPayload
  >,
> = (
  message: IMessage<T, ReqPayload, ResPayload, MPayload>,
) => void;

export type M<
  T extends keyof MPayload,
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload,
  MPayload extends IMPayload<ReqPayload, ResPayload> = IMPayload<
    ReqPayload,
    ResPayload
  >,
> = IMessage<T, ReqPayload, ResPayload, MPayload>;