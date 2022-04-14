import { EComponent } from "../enumeration.ts";
import { EMType, IMPayload } from "../messages.ts";
import {
  IRequestPayload,
  IResponsePayload,
} from "../operation.ts";
import { Message } from "./message.model.ts";
import { DDAPPS } from "../ddapps.ts";

export class DRemotePeer<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload,
  MPayload extends IMPayload<ReqPayload, ResPayload> = IMPayload<
    ReqPayload,
    ResPayload
  >> extends Object {

  private static WS_CONTENT_SIZE_LIMIT = Math.pow(2, 24) + 2;

  constructor(public hostname: string, private sock?: WebSocket) {
    super(hostname);
  }

  private _log(message: string, detail?: unknown) {
    dispatchEvent(
      new CustomEvent(EComponent.Logger, {
        detail: new Message<EMType.LogMessage, ReqPayload, ResPayload, MPayload>(
          EMType.LogMessage,
          this.constructor.name,
          EComponent.Logger,
          {
            message: message,
            detail: detail
          }
        ),
      }),
    );
  }

  private _ssend(message: Message<keyof MPayload, ReqPayload, ResPayload, MPayload>) {
    setTimeout(() => {
      const content = DDAPPS.JSONStr(message)
      if (content.length < DRemotePeer.WS_CONTENT_SIZE_LIMIT) {
        this.sock?.send(content);
      } else {
        throw RangeError(`RemotePeer::Send::Error::ContentTooLong::${content.length}`)
      }
    }, 0);
  }

  public get ip(): string {
    if (this.hostname.includes("-")) {
      return this.hostname.split("-")[0];
    } else {
      return this.hostname;
    }
  }

  public send<T extends keyof MPayload>(
    type: T,
    payload: MPayload[T]
  ) {
    try {
      const message = new Message<T, ReqPayload, ResPayload, MPayload>(
        type,
        "Peer",
        this.ip,
        payload
      )
      this._ssend(message);
    } catch (error) {
      this._log(`RemotePeer::Send::${this.hostname}::Error::${error.message}`, error)
    }
  }
}
