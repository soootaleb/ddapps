import * as c from "std/fmt/colors.ts";
import type { IState } from "./interface.ts";
import { EComponent } from "./enumeration.ts";
import { Messenger } from "./messenger.ts";
import { M } from "./type.ts";
import { EMType, IMPayload } from "./messages.ts";
import { EOpType, IClientResponse, IRequestPayload, IResponsePayload } from "./operation.ts";
import { DDAPPS } from "./ddapps.ts";

export class Logger<
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
  > extends Messenger<ReqPayload, ResPayload, MPayload, S> {

  private registrations: (EComponent | string)[] = [];

  /**
   * Messages will print only if every filter is passed (returns True)
   */
  protected get filters(): ((message: M<keyof MPayload, ReqPayload, ResPayload, MPayload>) => boolean)[] {
    return [
      (message) => !this.state.log.exclude.includes(message.type), // if message is not excluded (e.g HeartBeat)

      (message) =>
        // only log i/o with clients & log messages (to Logger) except if --debug
        this.state.net.clients.has(message.source) ||
        this.state.net.clients.has(message.destination) ||
        message.destination === EComponent.Logger ||
        this.state.log.debug,
    ];
  }

  constructor(protected state: S) {
    super(state);

    for (const component of Object.values(EComponent)) {
      this.register(component)
    }
  }

  protected filter(message: M<keyof MPayload, ReqPayload, ResPayload, MPayload>): boolean {
    for (const filter of this.filters) {
      if (typeof filter === "function" && !filter(message)) {
        return false;
      } else if (!filter) {
        return false;
      }
    }
    return true;
  }

  protected log(message: M<keyof MPayload, ReqPayload, ResPayload, MPayload>) {
    if (this.filter(message)) {

      if (this.state.log.console) this.print(message);

      for (const logger of this.state.mon.loggers) {
        const token = (message.payload as unknown as { token?: string })?.token || "";
        // [FIXME] Bug on ClientConnectionClose (sending the notif to a closed socket....)
        if (!this.state.mon.loggers.includes(token)) {
          this.send(EMType.ClientNotification, {
            token: logger,
            type: EOpType.MonWatch,
            payload: {
              key: "/ddapps/logs",
              value: message,
            },
          } as IClientResponse<ResPayload, EOpType.MonWatch>, this.state.net.requests[logger]);
        }
      }
    }
  }

  private print(message: M<keyof MPayload, ReqPayload, ResPayload, MPayload>) {
    let icon = "🔄".padEnd(1);
    let source = message.source.padEnd(20);
    let destination = message.destination.padEnd(20);

    if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(-[0-9]+)?$/.test(message.destination)) {
      icon = "🟢";
      destination = c.green(destination);
    } else if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(-[0-9]+)?$/.test(message.source)) {
      icon = "🔵";
      source = c.blue(source);
    }

    let payload = DDAPPS.JSONStr(message.payload);
    switch (this.args["console-messages"]) {
      case "":
        break;
      case "full":
        break;
      case undefined:
        payload = "";
        break;
      case "partial":
        payload = payload.substring(0, 180);
        break;
      default:
        break;
    }

    const now = new Date().getTime();
    const time = Math.min(now - this.state.log.last, 9999);
    this.state.log.last = now;

    const log = `${icon.padEnd(3)}${time.toString().padEnd(5)}${source}${destination}${message.type.toString().padEnd(25)}${payload}`;

    console.log(log);
  }

  /**
   * Keep this "method" as a property (of type Function) to that
   * the "this" reference is correct when formatAndLog is passed to addEventListener
   * @param ev
   */
  protected formatAndLog = (ev: Event) => {
    const event: CustomEvent = ev as CustomEvent;
    const message: M<keyof MPayload, ReqPayload, ResPayload, MPayload> = event.detail;
    this.log(message);
  };

  public register(component: EComponent | string): void {
    if (!this.registrations.includes(component)) {
      this.registrations.push(component);
      addEventListener(component, this.formatAndLog);
    } else {
      console.log(`Logger::AlreadyRegistered::${component}`);
    }
  }

  public unregister(component: EComponent | string): void {
    if (this.registrations.includes(component)) {
      this.registrations = [...this.registrations.filter((registered) => registered !== component)];
      addEventListener(component, this.formatAndLog);
    } else {
      console.log(`Logger::NotRegistered::${component}`);
    }
    removeEventListener(component, this.formatAndLog);
  }

  protected [EMType.LogMessage](_message: M<EMType.LogMessage>) { }

  protected [EMType.ClientConnectionOpen](
    message: M<EMType.ClientConnectionOpen>,
  ) {
    this.register(message.payload.hostname);
  }

  protected [EMType.ClientConnectionClose](
    message: M<EMType.ClientConnectionClose>,
  ) {
    this.unregister(message.payload);
  }

  protected [EMType.PeerConnectionClose](
    message: M<EMType.PeerConnectionClose>,
  ) {
    this.unregister(message.payload);
  }

  protected [EMType.PeerConnectionOpen](message: M<EMType.PeerConnectionOpen>) {
    this.register(message.payload.hostname);
  }

  protected [EMType.PeerConnectionSuccess](
    message: M<EMType.PeerConnectionSuccess>,
  ) {
    this.register(message.payload.peerIp);
  }
}
