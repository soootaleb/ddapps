import {
  IMessage,
  IState,
} from "./interface.ts";
import { Args, parse } from "std/flags/mod.ts";
import { EComponent } from "./enumeration.ts";
import { EMType, IMPayload } from "./messages.ts";
import { EOpType, IRequestPayload, IResponsePayload } from "./operation.ts";
import { Message } from "./models/message.model.ts";
import { DRemotePeerSet } from "./models/remotepeerset.model.ts";
import { DClientSet } from "./models/clientset.model.ts";
import { M } from "./type.ts";

/**
 * Messenger components can simply implement methods of [EMType.Message] to leverage messages' typing
 * Message handlers are functions type with H (from types.ts)
 * Messenger components can send messages with the .send() method to get payload typing based on the EMType.Message
 */
export class Messenger<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload,
  MPayload extends IMPayload<ReqPayload, ResPayload> = IMPayload<
    ReqPayload,
    ResPayload
  >,
  S extends IState<ReqPayload, ResPayload, MPayload> = IState<ReqPayload, ResPayload, MPayload>
  > extends Object {

  protected args: Args = parse(Deno.args);

  protected context: string | null = null;

  private handle = async (ev: Event) => {

    let methods: (string | symbol)[] = [];

    let parent = Object.getPrototypeOf(this);

    while (parent.constructor.name !== "Object") {
      methods = methods.concat(Reflect.ownKeys(parent))
      parent = Object.getPrototypeOf(parent);
    }

    const event: CustomEvent = ev as CustomEvent;
    const message: IMessage<EMType> = event.detail;

    this.context = Message.hash(message);

    if (this.constructor.name != EComponent.Logger && this.state.mon.trace[this.context]?.notify) {
      const token = this.state.mon.trace[this.context].token;
      if (token) {
        this.notification(EOpType.Trace, this.constructor.name, this.state.net.requests[token]);
      }
    }

    // Yes, a bit ugly but...
    // Added deno lint ignore...
    // deno-lint-ignore no-explicit-any no-this-alias
    const self: any = this;
    if (methods.includes(message.type)) {

      await new Promise((_resolve, _reject) => {
        self[message.type](message);
      }).catch((error) => {
        this.sendLog(`${this.constructor.name}::${message.type}::Error::${error.message}`, message)
      });

    } else if (this.constructor.name != EComponent.Logger) {
      this.send(
        EMType.LogMessage,
        { message: `${this.constructor.name}::MissingHandlerFor::${message.type}` },
        EComponent.Logger,
      );
    }
  };

  protected get peers(): DRemotePeerSet<ReqPayload, ResPayload, MPayload> {
    return this.state.net.peers;
  }

  protected get clients(): DClientSet<ReqPayload, ResPayload> {
    return this.state.net.clients;
  }

  /**
   * Messenger will subscribe to Messages with type corresponding to its classname
   * To allow inheritance, it does register itself, but also its parents classes (stops when parent is Messenger)
   * @param state
   */
  constructor(protected state: S) {
    super(state);

    let parent = Object.getPrototypeOf(this);

    while (parent.constructor.name !== "Object") {
      // Subscribe to parent class too to allow users to use base classes
      // e.g Logger is not instanciated (instead KVLogger), but some base classes
      // may send messages to Logger (e.g Messenger, Net) to stay agnostic to application
      addEventListener(parent.constructor.name, this.handle);

      parent = Object.getPrototypeOf(parent);
    }
  }

  protected [EMType.InitialMessage](_message: M<EMType.InitialMessage>) { }

  /**
   * Used to prevent the object from listening events
   * Used for unit tests
   * Objective is to make sure not async operations are pending after the call
   * 
   * Call this if you want the GC to effectively remove your object
   */
  public shutdown() {
    let parent = Object.getPrototypeOf(this);
    while (parent.constructor.name !== "Object") {
      removeEventListener(parent.constructor.name, this.handle);
      parent = Object.getPrototypeOf(parent);
    }
  }

  /**
   * Allows to send messages with typed payloads
   * @param type EMType
   * @param payload Associated payload
   * @param destination The component to send the message to
   * @param source if necessary, define the source to override the sender's class name. At your own risk...
   */
  public send<T extends keyof MPayload>(
    type: T,
    payload: MPayload[T],
    destination: EComponent | string | (new (state: S) => Messenger<ReqPayload, ResPayload, MPayload, S>), // string is used for peers & clients (IPs)
    source?: string, // to forward messages transparently like the API
  ): Promise<Message<T, ReqPayload, ResPayload, MPayload>> {
    const d = typeof destination === typeof Messenger ? (destination as typeof Messenger).name : destination as EComponent | string

    let ok: (message: Message<T, ReqPayload, ResPayload, MPayload>) => void;
    let ko: (message: Message<T, ReqPayload, ResPayload, MPayload>) => void;

    const promise = new Promise<Message<T, ReqPayload, ResPayload, MPayload>>((resolve, reject) => {
      ok = resolve;
      ko = reject;
    });

    const message = new Message<T, ReqPayload, ResPayload, MPayload>(type, source || this.constructor.name, d, payload)
    const event = new CustomEvent(d, { detail: message, cancelable: true })

    /**
     * Update the traces only if there is a context (not first message) &
     * there is a matching trace (tracing activated e.g for ClientRequest, or if a component did it on its own)
     * 
     * In case of a first message sent (i.e no context) its for edge cases like
     * new Messenger().send(); // e.g for testing purpose
     * 
     */
    if (this.context && this.state.mon.trace[this.context]) {
      const hash = Message.hash(message);
      this.state.mon.trace[hash] = this.state.mon.trace[this.context];
    }

    setTimeout(() => {
      const handled = dispatchEvent(event);

      if (handled) {
        ok(message);
      } else {
        ko(message);
      }

    }, 0);

    return promise;
  }

  protected response<T extends keyof ResPayload>(
    type: T,
    payload: ResPayload[T],
    destination: EComponent | string | (new (state: S) => Messenger<ReqPayload, ResPayload, MPayload, S>) = EComponent.Api, // string is used for peers & clients (IPs)
  ): Promise<Message<EMType.ClientResponse, ReqPayload, ResPayload, MPayload>> {
    return this.send(EMType.ClientResponse, {
      token: this.state.mon.trace[this.context as string]?.token || `Unknown`,
      type: type,
      payload: payload,
      timestamp: Date.now()
    }, destination)
  }

  protected notification<T extends keyof ResPayload>(
    type: T,
    payload: ResPayload[T],
    destination: EComponent | string | (new (state: S) => Messenger<ReqPayload, ResPayload, MPayload, S>) = EComponent.Api, // string is used for peers & clients (IPs)
  ): Promise<Message<EMType.ClientNotification, ReqPayload, ResPayload, MPayload>> {
    return this.send(EMType.ClientNotification, {
      token: this.state.mon.trace[this.context as string]?.token || `Unknown`,
      type: type,
      payload: payload,
      timestamp: Date.now()
    }, destination)
  }

  protected sendLog(message: string, detail?: unknown): Promise<Message<EMType.LogMessage, ReqPayload, ResPayload, MPayload>> {
    return this.send(EMType.LogMessage, {
      message: message,
      detail: detail
    }, EComponent.Logger);
  }
}
