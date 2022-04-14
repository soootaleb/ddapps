import { EComponent } from "../enumeration.ts";
import { Message } from "./message.model.ts";
import { EMType } from "../messages.ts";
import { IRequestPayload, IResponsePayload } from "../operation.ts";
import { DDAPPS } from "../ddapps.ts";

export class DClient<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload
  > extends Object {

  private static WS_CONTENT_SIZE_LIMIT = Math.pow(2, 24);

  private _conn: Deno.Conn;
  private _sock: WebSocket;

  constructor(sock: WebSocket, conn: Deno.Conn) {
    super(sock);
    this._sock = sock;
    this._conn = conn;
  }

  public get addr(): Deno.NetAddr {
    return (<Deno.NetAddr>this._conn.remoteAddr);
  }

  public get ip(): string {
    return (<Deno.NetAddr>this._conn.remoteAddr).hostname;
  }

  public get hostname(): string {
    return `${this.ip}-${this._conn.rid}`;
  }

  public get sock(): WebSocket {
    return this._sock;
  }

  private _ssend(message: Message<EMType, ReqPayload, ResPayload>) {
    setTimeout(() => {
      try {
        const content = DDAPPS.JSONStr(message)
        const size = content.length < DClient.WS_CONTENT_SIZE_LIMIT;
        const opened = this.sock.readyState === WebSocket.OPEN;

        if (!size) throw RangeError(`ContentTooLong::${content.length}`)
        if (!opened) throw new Deno.errors.NotConnected(`ReadyStateNotOpen::${this.sock.readyState}`)

        this.sock.send(content);

      } catch (error) {
        this._log(`DClient::Send::Error::${error.message}`, message)
      }
    }, 0);
  }

  private _log(message: string, detail?: unknown) {
    dispatchEvent(
      new CustomEvent(EComponent.Logger, {
        detail: new Message<EMType.LogMessage, ReqPayload, ResPayload>(
          EMType.LogMessage,
          this.constructor.name,
          EComponent.Logger,
          {
            message: message,
            detail: detail
          },
        ),
      }),
    );
  }

  public send<T extends keyof ResPayload>(op: T, payload: ResPayload[T], token: string): void {
    try {
      this._ssend(new Message<EMType.ClientResponse, ReqPayload, ResPayload>(
        EMType.ClientResponse,
        "Server",
        this.hostname,
        {
          token: token,
          type: op,
          payload: payload,
          timestamp: new Date().getTime()
        },
      ));
    } catch (error) {
      this._log(`Client::${this.ip}::SendMessageFail::Error::${error.message}`, error)
    }
  }

  public notify<T extends keyof ResPayload>(op: T, payload: ResPayload[T], token: string) {
    try {
      this._ssend(new Message<EMType.ClientNotification, ReqPayload, ResPayload>(
        EMType.ClientNotification,
        "Server",
        this.hostname,
        {
          token: token,
          type: op,
          payload: payload,
          timestamp: new Date().getTime()
        },
      ));
    } catch (error) {
      this._log(`Client::${this.ip}::SendNotificationFail::Error::${error.message}`, error);
    }
  }
}