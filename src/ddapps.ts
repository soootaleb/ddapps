import { Logger } from "./logger.ts";
import { Peer } from "./peer.ts";
import { Net } from "./net.ts";
import { Api } from "./api.ts";
import { Monitor } from "./monitor.ts";
import { Messenger } from "./messenger.ts";
import { IState } from "./interface.ts";
import { IRequestPayload, IResponsePayload } from "./operation.ts";
import { EMType, IMPayload } from "./messages.ts";
import { Message } from "./models/message.model.ts";
import { EComponent } from "./enumeration.ts";
import { DRemotePeerSet } from "./models/remotepeerset.model.ts";

export class DDAPPS<
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
  > {

  public static readonly PRODUCT = {
    ...Deno.version,
    ddapps: "1.6.3",
  };

  protected boot = ["log", "api", "mon", "peer", "net"];

  protected components: {
    [key: string]: {
      type: new (state: S) => Messenger<ReqPayload, ResPayload, MPayload, S>;
      instance?: Messenger<ReqPayload, ResPayload, MPayload, S>;
    };
    log: {
      type: new (state: S) => Messenger<ReqPayload, ResPayload, MPayload, S>;
      instance?: Logger<ReqPayload, ResPayload, MPayload, S>;
    };
    net: {
      type: new (state: S) => Messenger<ReqPayload, ResPayload, MPayload, S>;
      instance?: Net<ReqPayload, ResPayload, MPayload, S>;
    };
    api: {
      type: new (state: S) => Messenger<ReqPayload, ResPayload, MPayload, S>;
      instance?: Api<ReqPayload, ResPayload, MPayload, S>;
    };
    peer: {
      type: new (state: S) => Messenger<ReqPayload, ResPayload, MPayload, S>;
      instance?: Peer<ReqPayload, ResPayload, MPayload, S>;
    };
    mon: {
      type: new (state: S) => Messenger<ReqPayload, ResPayload, MPayload, S>;
      instance?: Monitor<ReqPayload, ResPayload, MPayload, S>;
    };
  } = {
      log: { type: Logger },
      net: { type: Net },
      api: { type: Api },
      peer: { type: Peer },
      mon: { type: Monitor },
    };

  public static JSONStr(value: unknown) {
    return JSON.stringify(value, (_key: string, value: DRemotePeerSet | WebSocket) => {
      if (value instanceof Map) {
        return [...value.values()];
      } else if (value instanceof WebSocket) {
        return {
          url: value.url,
          readyState: value.readyState,
          protocol: value.protocol
        }
      } else {
        return value;
      }
    })
  }

  public use(component: (new (state: S) => Messenger<ReqPayload, ResPayload, MPayload, S>)): this {
    let parent = Object.getPrototypeOf(component);
    while (parent.constructor.name !== EComponent.ALL) {
      if (parent == Logger) {
        this.components.log.type = component as typeof Logger;
        break;
      } else if (parent === Api) {
        this.components.api.type = component as typeof Api;
        break;
      } else if (parent === Monitor) {
        this.components.mon.type = component as typeof Monitor;
        break;
      } else if (parent === Peer) {
        this.components.peer.type = component as typeof Peer;
        break;
      } else if (parent === Net) {
        this.components.net.type = component as typeof Net;
        break;
      } else if (parent === Messenger) {
        this.boot.push(component.name);
        this.components[component.name] = {
          type: component,
        };
        break;
      }
      parent = Object.getPrototypeOf(parent);
    }

    return this;
  }

  public async run(state: S) {

    Deno.addSignalListener("SIGINT", () => {
      Deno.exit();
    });

    console.table(DDAPPS.PRODUCT);

    this.boot.forEach((component) => {
      console.log(`DDAPPS::Component::Use::${component}::${this.components[component].type.name}`);
      const instance = new this.components[component].type(state);
      this.components[component].instance = instance;

      if (component != "log" && this.components["log"].instance) {
        const logger: Logger<
          ReqPayload,
          ResPayload,
          MPayload,
          S
        > = this.components["log"].instance;
        logger.register(instance.constructor.name)
      }
    });

    const message = new Message<
      EMType.InitialMessage,
      ReqPayload,
      ResPayload,
      MPayload
    >(EMType.InitialMessage, "DDAPPS", EComponent.ALL, null);

    const server = await Deno.listen({ port: 8080 });
    const addr = server.addr as Deno.NetAddr;
    console.log(`DDAPPS::Server::Start::${addr.transport}://${addr.hostname}:${addr.port}`);

    dispatchEvent(new CustomEvent(EComponent.ALL, {
      detail: message
    }))

    for await (const conn of server) {
      this.components.net.instance?.accept(conn);
    }
  }
}
