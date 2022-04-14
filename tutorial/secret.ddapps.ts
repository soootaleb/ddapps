import { IState } from "ddapps/interface.ts";
import { EMType, IMPayload } from "ddapps/messages.ts";
import { M } from "ddapps/type.ts";
import { IRequestPayload, IResponsePayload } from "ddapps/operation.ts";
import { Api } from "ddapps/api.ts";
import { Peer } from "../src/peer.ts";

// Messages (ISecretMessagePayload)
enum ESMType { SetSecret = "SetSecret" }
export interface ISMPayload extends IMPayload<ISRequestPayload, ISResponsePayload> { [ESMType.SetSecret]: string }
type SM<T extends keyof ISMPayload> = M<T, ISRequestPayload, ISResponsePayload, ISMPayload>;

// Operations
export enum ESOpType { SetSecret = "SetSecret", GetSecret = "GetSecret" }
export interface ISRequestPayload extends IRequestPayload {
  [ESOpType.SetSecret]: string
  [ESOpType.GetSecret]: null
}
export interface ISResponsePayload extends IResponsePayload {
  [ESOpType.GetSecret]: string
  [ESOpType.SetSecret]: null
}

// State
export interface ISState extends IState<ISRequestPayload, ISResponsePayload, ISMPayload> {
  secret: string;
}

// Component from a typed messenger to adapt the state and send()
export class SecretManager extends Peer<ISRequestPayload, ISResponsePayload, ISMPayload, ISState> {
  // Type your incoming message
  protected [ESMType.SetSecret](message: SM<ESMType.SetSecret>): void {
    const secret: string = message.payload; // Payload type OK
    this.state.secret = secret; // We update the local shared state
    this.peers // Filter the peers to avoid the second peer to send the message back
      .filter((peer) => peer.hostname != message.source)
      .send(ESMType.SetSecret, message.payload);
  }
}

export class SApi extends Api<ISRequestPayload, ISResponsePayload, ISMPayload, ISState> {
  protected override [EMType.ClientRequest](
    message: M<EMType.ClientRequest> | SM<EMType.ClientRequest>,
  ) {
    super.ClientRequest(message as M<EMType.ClientRequest>);
    switch (message.payload.type) {
      case ESOpType.SetSecret:
        this.send(
          ESMType.SetSecret,
          message.payload.payload as ISMPayload[ESOpType.SetSecret],
          SecretManager
        ).then(() => {
          this.response(ESOpType.SetSecret, null);
        })
        break;
      case ESOpType.GetSecret:
        this.response(ESOpType.GetSecret, this.state.secret);
        break;
      default:
        break;
    }
  }
}