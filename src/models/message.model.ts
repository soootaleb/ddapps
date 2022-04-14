import { Hash } from "std/hash/_wasm/hash.ts";
import { EComponent } from "../enumeration.ts";
import { IMessage } from "../interface.ts";
import { IMPayload } from "../messages.ts";
import { IRequestPayload, IResponsePayload } from "../operation.ts";


export class Message<
  T extends keyof MPayload = keyof IMPayload,
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload,
  MPayload extends IMPayload<ReqPayload, ResPayload> = IMPayload<
    ReqPayload,
    ResPayload
  >,
  > implements IMessage<T, ReqPayload, ResPayload, MPayload> {

  public type: T;
  public source: string;
  public destination: EComponent | string;
  public payload: MPayload[T];

  constructor(
    type: T,
    source: string,
    destination: EComponent | string,
    payload: MPayload[T],
  ) {
    this.type = type;
    this.source = source;
    this.destination = destination;
    this.payload = payload;
  }

  public return<T extends keyof MPayload>(
    type: T,
    payload: MPayload[T]
  ): void {
    dispatchEvent(
      new CustomEvent(this.source, {
        detail: new Message<T, ReqPayload, ResPayload, MPayload>(
          type,
          this.destination,
          this.source,
          payload
        )
      })
    )
  }

  public static hash(value: unknown): string {
    const hash = new Hash("sha256")
    hash.update(JSON.stringify(value));
    return hash.toString();
  }
}