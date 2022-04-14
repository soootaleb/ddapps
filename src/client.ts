import { EMonOpType } from "./enumeration.ts";
import { M } from "./type.ts";
import { EMType, IMPayload } from "./messages.ts";
import { EOpType, IRequestPayload, IResponsePayload } from "./operation.ts";
import { IMessage } from "./interface.ts";

export class Client<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload,
  MPayload extends IMPayload<ReqPayload, ResPayload> = IMPayload<
    ReqPayload,
    ResPayload
  >,
  > extends Object {
  public static DEFAULT_SERVER_ADDR = "127.0.0.1";
  public static DEFAULT_SERVER_PORT = 8080;

  private _server = {
    addr: Client.DEFAULT_SERVER_ADDR,
    port: Client.DEFAULT_SERVER_PORT,
  };

  private get endpoint() {
    const protocol = this._server.port === 443 ? "wss" : "ws";
    return `${protocol}://` + this._server.addr + ":" + this._server.port +
      "/client";
  }

  private ws: WebSocket;

  protected _requests: {
    [key: string]: {
      resolve: (
        value: IMessage<EMType.ClientResponse, ReqPayload, ResPayload, MPayload>,
      ) => void;
      reject: (
        value: IMessage<EMType.InvalidClientRequestType, ReqPayload, ResPayload, MPayload>,
      ) => void
    };
  } = {};

  protected _listeners: {
    [op in keyof ResPayload]?: (
      notification: IMessage<
        EMType.ClientNotification,
        ReqPayload,
        ResPayload,
        MPayload
      >,
    ) => void;
  } = {};

  protected _connection: {
    promise: Promise<Client<ReqPayload, ResPayload, MPayload>>;
    resolve: (client: Client<ReqPayload, ResPayload, MPayload>) => void;
    reject: (error: Event | ErrorEvent) => void;
  } = {} as {
    promise: Promise<Client<ReqPayload, ResPayload, MPayload>>;
    resolve: (client: Client<ReqPayload, ResPayload, MPayload>) => void;
    reject: (error: Event | ErrorEvent) => void;
  };

  public get co(): Promise<this> {
    return this._connection.promise as Promise<this>;
  }

  public disconnect(): void {
    this.ws.close();
  }

  constructor(
    addr: string = Client.DEFAULT_SERVER_ADDR,
    port: number = Client.DEFAULT_SERVER_PORT,
    private trace = false
  ) {
    super();

    this._server.addr = addr;
    this._server.port = port;

    this.ws = new WebSocket(this.endpoint);

    this._connection.promise = new Promise((resolve, reject) => {
      this._connection.resolve = resolve;
      this._connection.reject = reject;
    });

    this.ws.onopen = ((_) => {
      this._connection.resolve(this);
    });

    let methods: (string | symbol)[] = [];

    let parent = Object.getPrototypeOf(this);

    while (parent.constructor.name !== "Object") {
      methods = methods.concat(Reflect.ownKeys(parent))
      parent = Object.getPrototypeOf(parent);
    }

    this.ws.onmessage = (ev: MessageEvent) => {
      const message = JSON.parse(ev.data);
      // deno-lint-ignore no-explicit-any no-this-alias
      const self: any = this;
      if (methods.includes(message.type)) {
        self[message.type]({
          ...message,
          source: this._server.addr,
          destination: "Client",
        });
      } else {
        console.warn(`${this.constructor.name}::MissingHandlerFor::${message.type}`);
      }
    };

    this.ws.onerror = (error) => {
      this._connection.reject(error);
    }
  }

  protected send<T extends keyof ReqPayload>(
    type: T,
    payload: ReqPayload[T],
  ): Promise<
    IMessage<EMType.ClientResponse, ReqPayload, ResPayload, MPayload>
  > {
    const token = Math.random().toString(36).substring(2);

    this.ws.send(JSON.stringify({
      type: EMType.ClientRequest,
      source: "Client",
      destination: this._server.addr,
      payload: {
        trace: this.trace,
        token: token,
        type: type,
        payload: payload,
        timestamp: new Date().getTime(),
      },
    }));

    return new Promise((resolve, reject) => {
      this._requests[token] = {
        resolve: (v) => {
          resolve(v);
          this.disconnect();
        },
        reject: reject
      }
    })
  }

  protected [EMType.ClientResponse](message: M<EMType.ClientResponse, ReqPayload, ResPayload, MPayload>) {
    if (Object.keys(this._requests).includes(message.payload.token)) {
      this._requests[message.payload.token].resolve(message);
      delete this._requests[message.payload.token];
      delete this._listeners[message.payload.type];
    } else {
      console.log(`Client::ClientResponse::Error::InvalidToken::${message.payload.token}`)
    }
  }

  protected [EMType.ClientNotification](message: M<EMType.ClientNotification, ReqPayload, ResPayload, MPayload>) {
    const handler = this._listeners[message.payload.type];
    if (handler) {
      handler(message);
    } else {
      console.log(`Client::ClientNotification::Error::InvalidToken::${message.payload.token}`)
    }
  }

  protected [EMType.InvalidClientRequestType](message: M<EMType.InvalidClientRequestType, ReqPayload, ResPayload, MPayload>) {
    if (Object.keys(this._requests).includes(message.payload.token)) {
      this._requests[message.payload.token].reject(message);
      delete this._requests[message.payload.token];
    } else {
      console.error(`Client::InvalidClientRequestType::Error::InvalidToken::${message.payload.token}`);
    }
  }

  public monop(op: EMonOpType, key: string, value?: string) {
    return this.send(EOpType.MonOp, {
      op: op,
      metric: {
        key: key,
        value: value,
      },
    });
  }

  public monget(key: string) {
    return this.send(EOpType.MonOp, {
      op: EMonOpType.Get,
      metric: { key: key },
    });
  }

  public monset(key: string, value: string) {
    return this.send(EOpType.MonOp, {
      op: EMonOpType.Set,
      metric: {
        key: key,
        value: value
      },
    });
  }

  public monwatch(
    key: string,
    expire = -1,
  ) {

    return this.send(EOpType.MonWatch, {
      key: key,
      expire: expire,
    })
  }

  public ping() {
    return this.send(EOpType.Ping, null)
  }

  public any(payload: unknown) {
    return this.send(EOpType.Any, payload)
  }

  public crash() {
    return this.send(EOpType.Crash, null)
  }

  public listen<T extends keyof ResPayload>(type: T, callback: (message: M<EMType.ClientNotification, ReqPayload, ResPayload>) => void): void  {
    this._listeners[type] = callback;
  }
}
