import { EComponent } from "./enumeration.ts";
import { Messenger } from "./messenger.ts";
import { M } from "./type.ts";
import { Api } from "./api.ts";
import { EMType, IMPayload } from "./messages.ts";
import {
  EOpType,
  IClientRequest,
  IClientResponse,
  IRequestPayload,
  IResponsePayload,
} from "./operation.ts";
import { IState } from "./interface.ts";

export class Peer<
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

  protected [EMType.Any](message: M<EMType.Any>) {
    this.sendLog("Messages of type Any are for demo purpose and should be avoided", message)

    const payload = message.payload as {
      token?: string,
      type?: EOpType,
      // deno-lint-ignore no-explicit-any
      payload?: any
    };

    const type = payload.type || EOpType.Any;

    this.response(type, payload.payload, Api);
  }

  protected [EMType.PeerConnectionAccepted](
    message: M<EMType.PeerConnectionAccepted>,
  ) {
    const unknownPeers = message.payload.knownPeers
      .filter((peer: string) => this.peers.ips.includes(peer));

    // If some peers are uknown and left to be connected to, do it
    if (unknownPeers.length) {
      for (const peerIp of unknownPeers) {
        this.send(EMType.PeerConnectionRequest, {
          peerIp: peerIp,
        }, EComponent.Net);
      }
    } else { // If all peers are known (all are connected), then go follower
      this.state.ready = true;

      this.sendLog(`Peer::ReadyAfter::PeerConnectionAccepted`, message);
    }
  }

  protected [EMType.PeerConnectionOpen](message: M<EMType.PeerConnectionOpen>) {
    // Duplicate known peers before adding the new one (it already knows itself...)
    const knownPeers = this.peers.ips.filter((peer) => peer != message.payload.hostname.split("-")[0]); // because peer connections are in parallel

    this.send(EMType.PeerConnectionAccepted, {
      knownPeers: knownPeers,
    }, message.payload.hostname);
  }

  protected [EMType.DiscoveryResult](message: M<EMType.DiscoveryResult>) {
    if (message.payload.success) {
      this.send(EMType.PeerConnectionRequest, {
        peerIp: message.payload.result,
      }, EComponent.Net);
    } else {
      this.state.ready = true;

      this.sendLog(`Peer::ReadyAfter::DiscoveryResult::${message.payload.source}`, message);
    }
  }

  /**
   * Node self sends ClientResponse &&
   * Can receive it from another node in case of ClientRequestForward
   * TODO: Implement a ClientResponseForward
   * @param message
   */
  protected [EMType.ClientResponse](message: M<EMType.ClientResponse>) {
    this.send(
      EMType.ClientResponse,
      message.payload as IClientResponse<ResPayload, keyof ResPayload>,
      Api,
    );
  }

  protected [EMType.ClientRequest](
    message: M<EMType.ClientRequest>,
  ) {
    this.send(
      EMType.ClientRequest,
      message.payload as IClientRequest<ReqPayload, keyof ReqPayload>,
      EComponent.Api,
      message.source,
    );
  }
}
