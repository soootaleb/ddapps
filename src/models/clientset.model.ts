import { IRequestPayload, IResponsePayload } from "../operation.ts";
import { DClient } from "./client.model.ts";

export class DClientSet<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload
  > extends Map<string, DClient<ReqPayload, ResPayload>> {

  public send<T extends keyof ResPayload>(op: T, payload: ResPayload[T], token: string): void {
    this.forEach((client) => {
      client.send(op, payload, token);
    })
  }

  public filter(fn: (client: DClient<ReqPayload, ResPayload>) => boolean): DClientSet<ReqPayload, ResPayload> {
    const set = new DClientSet<ReqPayload, ResPayload>();
    this.forEach((client) => {
      if (fn(client)) set.set(client.hostname, client);
    })
    return set;
  }

  public find(fn: (client: DClient<ReqPayload, ResPayload>) => boolean): DClient<ReqPayload, ResPayload> {
    for (const client of this.values()) {
      if (fn(client)) return client;
    }
    throw new Error(`Client::Find::NotFound::${fn}`);
  }

  public add(ws: WebSocket, conn: Deno.Conn): DClient<ReqPayload, ResPayload> {
    const client = new DClient<ReqPayload, ResPayload>(ws, conn);
    this.set(client.hostname, client);
    return client;
  }
}
