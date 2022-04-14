import { EComponent, EMonOpType } from "./enumeration.ts";
import { IMonOp, IMonWatch, IState } from "./interface.ts";
import { EMType, IMPayload } from "./messages.ts";
import { Logger } from "./logger.ts";
import { Peer } from "./peer.ts";
import { Messenger } from "./messenger.ts";
import { M } from "./type.ts";
import {
  EOpType,
  IClientRequest,
  IClientResponse,
  IRequestPayload,
  IResponsePayload,
} from "./operation.ts";

export class Api<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload,
  MPayload extends IMPayload<ReqPayload, ResPayload> = IMPayload<
    ReqPayload,
    ResPayload
  >,
  S extends IState<ReqPayload, ResPayload, MPayload> = IState<
    ReqPayload,
    ResPayload,
    MPayload
  >,
  > extends Messenger<
  ReqPayload,
  ResPayload,
  MPayload,
  S
  > {

  /**
   * Api has a context and is in charge of starting a tracing
   * @param {IClientRequest } message The client request
   */
  private init(message: M<EMType.ClientRequest>): void {
    // Match a token to a source to return the response
    this.state.net.requests[message.payload.token] = message.source

    // Match a context to a token
    this.state.mon.trace[this.context as string] = {
      notify: message.payload.trace,
      token: message.payload.token
    };
  }

  protected [EMType.ClientRequest](message: M<EMType.ClientRequest>) {

    this.init(message);

    if (message.payload.trace) {
      this.notification(EOpType.Trace, this.constructor.name, this.state.net.requests[message.payload.token])
    }

    switch (message.payload.type) {
      case EOpType.Ping: {
        this.response(
          EOpType.Pong,
          Date.now() - message.payload.timestamp,
          message.source
        )
        break;
      }
      case EOpType.MonOp: {
        const payload = message.payload.payload as IMonOp;

        if (payload.op === EMonOpType.Get) {
          this.send(EMType.MonGetRequest, {
            op: payload.op,
            metric: {
              key: payload.metric.key,
            },
          }, EComponent.Monitor);
        } else if (payload.op === EMonOpType.Set) {
          this.send(EMType.MonSetRequest, {
            op: payload.op,
            metric: {
              key: payload.metric.key,
              value: payload.metric.value,
            },
          }, EComponent.Monitor);
        } else {
          this.sendLog(`Api::ClientRequest::MonOp::InvalidType::${payload.op}`, message)
        }
        break;
      }
      case EOpType.MonWatch: {
        const payload = message.payload.payload as IMonWatch;
        this.send(EMType.MonWatchRequest, payload, EComponent.Monitor);
        break;
      }
      case EOpType.Any: {
        this.send(EMType.Any, message.payload, Peer);
        break;
      }
      case EOpType.Crash: {
        Deno.exit(1);
        break;
      }
      default:
        // Only send if root Api, else the inherited Api may handle the operation
        if (this.constructor.name === EComponent.Api) {
          this.invalid(message);
        }
        break;
    }
  }

  /**
   * Usually components should use Messenger.response() to not have to handle token
   * But for async watchers, context is not sufficient to perform the matching
   * Thus component may formulate complete ClientResponse and send them to Api
   * @param message 
   */
  protected [EMType.ClientResponse](message: M<EMType.ClientResponse>) {
    const token = message.payload.token;
    if (Object.keys(this.state.net.requests).includes(token)) {
      this.send(
        EMType.ClientResponse,
        message.payload as IClientResponse<ResPayload>,
        this.state.net.requests[token],
      );
      delete this.state.net.requests[token];
      for (const entry of Object.entries(this.state.mon.trace)) {
        const [key, value] = entry;
        if (value.token === token) delete this.state.mon.trace[key]
      }
    } else {
      this.sendLog(`Api::ClientResponse::InvalidRequestToken::${token}`, message);
    }
  }

  /**
   * Messages sent to clients watching values
   * @param message watch operation
   */
  protected [EMType.ClientNotification](message: M<EMType.ClientNotification>) {
    if (Object.keys(this.state.net.requests).includes(message.payload.token)) {
      this.send(EMType.ClientNotification, message.payload as IClientResponse<ResPayload>, this.state.net.requests[message.payload.token])
    } else {
      this.sendLog(`Api::ClientNotification::InvalidRequestToken::${message.payload.token}`, this.state.net.requests);
    }
  }

  /**
   * Removes the tokens related to the closed connection
   * @param message the related peer
   */
  protected [EMType.ClientConnectionClose](
    message: M<EMType.ClientConnectionClose>,
  ) {
    const requests = Object.entries(this.state.net.requests).filter((o) => o[1] === message.payload);

    // Requests
    for (const request of requests) {
      delete this.state.net.requests[request[0]];

      if (Object.keys(this.state.mon.watchers).includes(request[0])) {
        clearInterval(this.state.mon.watchers[request[0]].interval);
      }

      // Traces
      for (const trace of Object.entries(this.state.mon.trace)) {
        const [context, t] = trace;
        if (t.token === request[0]) {
          delete this.state.mon.trace[context];
        }
      }
      
    }
    
    // MonWatch on logs
    this.state.mon.loggers = this.state.mon.loggers.filter((o) => !requests.map((o) => o[0]).includes(o));
  }

  /**
   * Call this in you default switch case when the operation did not match
   * It returns EMType.InvalidClientRequestType to the client & a log to the Logger
   * @param message The client request (message.payload)
   */
  protected invalid(message: M<EMType.ClientRequest>): void {
    this.send(
      EMType.InvalidClientRequestType,
      message.payload as IClientRequest<ReqPayload>,
      message.source
    )
    this.sendLog(`${this.constructor.name}::ClientRequest::InvalidClientRequestType::${message.payload.type}`, message)
  }
}
