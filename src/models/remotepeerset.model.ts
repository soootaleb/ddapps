import { IMPayload } from "../messages.ts";
import { IRequestPayload, IResponsePayload } from "../operation.ts";
import { DRemotePeer } from "./remotepeer.model.ts";


export class DRemotePeerSet<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload,
  MPayload extends IMPayload<ReqPayload, ResPayload> = IMPayload<
    ReqPayload,
    ResPayload
  >> extends Map<string, DRemotePeer<
    ReqPayload, ResPayload, MPayload
  >> {

  public filter(fn: (peer: DRemotePeer<ReqPayload, ResPayload, MPayload>) => boolean): DRemotePeerSet<ReqPayload, ResPayload, MPayload> {
    const rps = new DRemotePeerSet<ReqPayload, ResPayload, MPayload>();
    this.forEach((peer, ip) => {
      if (fn(peer)) {
        rps.set(ip, peer);
      }
    })
    return rps;
  }

  public find(fn: (peer: DRemotePeer<ReqPayload, ResPayload, MPayload>) => boolean): DRemotePeer<ReqPayload, ResPayload, MPayload> | null {
    for (const peer of this.values()) {
      if (fn(peer)) return peer;
    }
    return null;
  }

  public send<T extends keyof MPayload>(
    type: T,
    payload: MPayload[T],
  ) {
    this.forEach((peer) => peer.send(type, payload))
  }

  public get ips(): string[] {
    return [...this.keys()]
      .map((ip) => ip.includes("-") ? ip.split("-")[0] : ip)
      .reduce((acc, curr) => acc.includes(curr) ? acc : [...acc, curr], [] as string[])
  }

  public get all(): string[] {
    return [...this.keys()]
  }

  public quorum(): number {
    return Math.floor((this.ips.length + 1) / 2) + 1;
  }

  public count(): number {
    return this.ips.length;
  }
}