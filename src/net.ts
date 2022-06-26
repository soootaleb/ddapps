import { Messenger } from "./messenger.ts";
import { EComponent } from "./enumeration.ts";
import { M } from "./type.ts";
import { IMessage, IState } from "./interface.ts";
import { Peer } from "./peer.ts";
import { EMType, IMPayload } from "./messages.ts";
import { IRequestPayload, IResponsePayload } from "./operation.ts";
import { DRemotePeer } from "./models/remotepeer.model.ts";

export class Net<
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

  public shutdown() {
    super.shutdown();
    this.state.net.clients.forEach((client) => removeEventListener(client.hostname, this.sendOnNetwork));
    this.peers.forEach((peer) => removeEventListener(peer.ip, this.sendOnNetwork))
  }

  protected override[EMType.InitialMessage](_message: M<EMType.InitialMessage>) {
    if (this.args.discovery && Deno.env.get("DDAPPS_CLUSTER_HOSTNAME") != Deno.env.get("DDAPPS_NODE_IP")) {
      const endpoint = Deno.env.get("DDAPPS_CLUSTER_HOSTNAME") ||
        this.args.discovery;
      if (endpoint && typeof endpoint === "string") {
        fetch(`http://${endpoint}:8080/discovery`)
          .then((response) => response.text())
          .then((ip) => {
            this.send(EMType.DiscoveryResult, {
              success: true,
              result: ip,
              source: "http_success",
            }, Peer);
          }).catch((error) => {
            this.send(EMType.DiscoveryResult, {
              success: false,
              result: error.message,
              source: "http_fail",
            }, Peer);
          }).finally(() => this.state.net.ready = true);
      } else {
        this.send(EMType.DiscoveryResult, {
          success: false,
          result: `Net::Discovery::Result::InvalidEndpoint::${endpoint}'`,
          source: "http_fail",
        }, Peer).finally(() => this.state.net.ready = true);
      }
    } else {
      this.send(EMType.DiscoveryResult, {
        success: false,
        result: `Net::Discovery::Result::NotActivated`,
        source: "discovery_disabled"
      }, Peer).finally(() => this.state.net.ready = true)
    }
  }

  protected [EMType.PeerConnectionRequest](
    message: M<EMType.PeerConnectionRequest>,
  ) {
    const sock = new WebSocket(`ws://${message.payload.peerIp}:8080/peer`);
    this.peers.set(message.payload.peerIp, new DRemotePeer<
      ReqPayload, ResPayload, MPayload
    >(message.payload.peerIp, sock))


    // FIX ME Not sure called on conn failure, it's for messages failures
    // https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
    sock.onerror = (ev: Event | ErrorEvent) => {
      this.sendLog(`Net::WebSocket::Error::${message.payload.peerIp}`, {
        socket: sock,
        message: ev instanceof ErrorEvent ? ev.message : "Unknown"
      });
    }

    sock.onopen = () => {
      addEventListener(message.payload.peerIp, this.sendOnNetwork);
      this.send(EMType.PeerConnectionSuccess, {
        peerIp: message.payload.peerIp,
      }, EComponent.Logger);
    };

    sock.onmessage = (ev: MessageEvent<string>) => {
      const msg = JSON.parse(ev.data) as IMessage<
        EMType,
        ReqPayload,
        ResPayload,
        MPayload
      >;
      this.send(msg.type, msg.payload, EComponent.Peer, message.payload.peerIp);
    };

    sock.onclose = (_: CloseEvent) => {
      this.send(
        EMType.PeerConnectionClose,
        message.payload.peerIp,
        EComponent.Net,
      );
    };
  }

  private discovery(event: Deno.RequestEvent, conn: Deno.Conn): void {
    const addr = conn.remoteAddr as Deno.NetAddr;

    this.sendLog(`Net::Discovery::EndpointCalled`, addr);

    event.respondWith(new Response(Deno.env.get("DDAPPS_NODE_IP"), {
      status: 200
    })).catch((error) => this.sendLog(`Net::Discovery::Error::${error.message}`));
  }

  private ready(event: Deno.RequestEvent): void {
    event.respondWith(new Response(this.state.ready ? "OK" : "KO", {
      status: this.state.ready ? 200 : 500
    })).catch((error) => this.sendLog(`Net::Ready::Error::${error.message}`));
  }

  private dispatch(event: Deno.RequestEvent, conn: Deno.Conn): void {
    const { socket, response } = Deno.upgradeWebSocket(event.request)

    const addr = conn.remoteAddr as Deno.NetAddr;
    const request = event.request;
    const hostname = `${addr.hostname}-${conn.rid}`;

    // FIX ME Not sure called on conn failure, it's for messages failures
    // https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
    socket.onerror = (ev: Event | ErrorEvent) => {
      removeEventListener(hostname, this.sendOnNetwork);
      this.send(EMType.ClientConnectionClose, hostname, EComponent.Api);
      this.send(EMType.ClientConnectionClose, hostname, EComponent.Logger);
      this.state.net.clients.delete(hostname);
      this.sendLog(`Net::WebSocket::Error::${hostname}`, {
        socket: socket,
        addr: addr,
        request: request,
        hostname: hostname,
        message: ev instanceof ErrorEvent ? ev.message : "Unknown"
      });
    }

    if (request.url.endsWith("/client")) {

      socket.onopen = (_ev: Event) => {
        const client = this.state.net.clients.add(socket, conn);
        addEventListener(client.ip, this.sendOnNetwork);
        if (client.ip != client.hostname) { // To avoid double sending
          addEventListener(client.hostname, this.sendOnNetwork);
        }
        this.send(EMType.ClientConnectionOpen, client, EComponent.Logger);
      }

      socket.onmessage = (ev: MessageEvent) => {
        const msg = JSON.parse(ev.data) as IMessage<EMType, ReqPayload, ResPayload, MPayload>;
        this.send(msg.type, msg.payload, EComponent.Api, hostname);
      }

      // TODO Use the ev.reason in payload
      socket.onclose = (_ev: CloseEvent) => {
        removeEventListener(hostname, this.sendOnNetwork);
        this.send(EMType.ClientConnectionClose, hostname, EComponent.Api);
        this.send(EMType.ClientConnectionClose, hostname, EComponent.Logger);
        this.state.net.clients.delete(hostname);
      }

    } else if (request.url.endsWith("/peer")) {

      this.peers.set(hostname, new DRemotePeer(hostname, socket))
      addEventListener(hostname, this.sendOnNetwork);
      this.send(EMType.PeerConnectionOpen, { hostname: hostname, sock: socket }, EComponent.Logger);
      this.send(EMType.PeerConnectionOpen, { hostname: hostname, sock: socket }, EComponent.Peer);

      socket.onmessage = (ev: MessageEvent) => {
        const msg = JSON.parse(ev.data) as IMessage<EMType, ReqPayload, ResPayload, MPayload>;
        this.send(msg.type, msg.payload, EComponent.Peer, hostname);
      }

      // TODO Use the ev.reason in payload
      socket.onclose = (_ev: CloseEvent) => {
        removeEventListener(hostname, this.sendOnNetwork);
        this.peers.delete(hostname);
        this.send(EMType.PeerConnectionClose, hostname, EComponent.Logger);
      }

    }

    event.respondWith(response).catch((error) => this.sendLog(`Net::Dispatch::Error::${error.message}`));
  }

  public accept(conn: Deno.Conn) { // return Promise & handle in DDAPPS
    return Deno.serveHttp(conn)
      .nextRequest()
      .then((event: Deno.RequestEvent | null) => {
        if (event) {
          const request = event.request;

          try {

            if (request.url.endsWith("/discovery")) {
              this.discovery(event, conn);
            } else if (request.url.endsWith("/ready")) {
              this.ready(event);
            } else {
              this.dispatch(event, conn);
            }

          } catch (error) {

            this.sendLog(`Net::Accept::Error::${error.message}`, {
              url: request.url,
              addr: conn.remoteAddr
            });

            event.respondWith(new Response(error.message, {
              status: 400
            })).catch((error) => this.sendLog(`Net::Accept::Error::${error.message}`));

          }
        }
      }).catch((error) => {
        this.sendLog(`Net::Accept::Error::${error.message}`, conn);
      });
  }

  private sendOnNetwork = (ev: Event) => {
    const event: CustomEvent = ev as CustomEvent;
    const message: M<
      keyof MPayload,
      ReqPayload,
      ResPayload,
      MPayload
    > = event.detail;
    const destination = message.destination;

    if (this.peers.has(destination)) {
      this.peers.get(destination)?.send(message.type, message.payload)
    } else if (this.state.net.clients.has(destination) && message.type === EMType.ClientResponse) {
      const op = (<M<EMType.ClientResponse, ReqPayload, ResPayload, MPayload>>message).payload.type;
      const payload = (<M<EMType.ClientResponse, ReqPayload, ResPayload, MPayload>>message).payload.payload
      const token = (<M<EMType.ClientResponse, ReqPayload, ResPayload, MPayload>>message).payload.token;
      this.state.net.clients.get(destination)?.send(op, payload, token);
    } else if (this.state.net.clients.has(destination) && message.type === EMType.ClientNotification) {
      const op = (<M<EMType.ClientResponse, ReqPayload, ResPayload, MPayload>>message).payload.type;
      const payload = (<M<EMType.ClientResponse, ReqPayload, ResPayload, MPayload>>message).payload.payload
      const token = (<M<EMType.ClientResponse, ReqPayload, ResPayload, MPayload>>message).payload.token;
      this.state.net.clients.get(destination)?.notify(op, payload, token);
    } else {
      this.send(EMType.InvalidMessageDestination, {
        invalidMessageDestination: destination,
        availablePeers: [...this.peers.keys()],
        availableClients: Array.from(this.state.net.clients.keys()),
        // message: message,
      }, EComponent.Logger);
    }
  };
}
