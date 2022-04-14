import { EComponent } from "./enumeration.ts";
import { IMonOp, IMonWatch } from "./interface.ts";
import { DClient } from "./models/client.model.ts";
import { IClientRequest, IClientResponse, IRequestPayload, IResponsePayload } from "./operation.ts";

/**
 * List of Messages available. Use it for a stronger typing.
 */
export enum EMType {

  /**
   * Send arbitrary data to a peer, to avoid
   * @param {unknown} The data
   */
  Any = "Any",

  /**
   *  Send a LogMessage, usually to the Logger
   * @param {string} message The string message to log
   */
  LogMessage = "LogMessage",

  /**
   * Message sent by DDAPPS to all components just after the server started.
   * Use it an initialisation hook
   * @param {null} Nothing
   */
  InitialMessage = "InitialMessage",

  // DISCOVERY
  /**
   * Emitted during the network initialisation to indicate whether a peer to join has been found.
   * The message is always emitted even if --discovery is disabled
   * @param {boolean} success If the discovery found a peer to connect to
   * @param {string} result Message explaining how the discovery phase ended
   * @param {string} source Coded version of the result, if need to react depending on it
   */
  DiscoveryResult = "DiscoveryResult",

  /**
   * A peer exposes the /discovery endpoint that returns the peer IP (legacy)
   * This message is sent to Logger to indicate a peer has call the endpoint (the remote peer is thus in the discovery phase)
   * @param {Deno.NetAddr} The remote addr of the peer which called the endpoint
   */
  DiscoveryEndpointCalled = "DiscoveryEndpointCalled",

  // CLIENT

  /**
   * Message sent by clients to formulate requests
   * It contains the operation to perform
   * @param {IClientRequest<ReqPayload>} Contains the request token, operation type and operation request payload (also timestamp)
   */
  ClientRequest = "ClientRequest",

  /**
   * Message sent to clients to respond to requests
   * It contains the operation that has been performed
   * @param {IClientResponse<ResPayload>} Contains the request token, operation type and operation response payload (also timestamp)
   */
  ClientResponse = "ClientResponse",

  /**
   * Message sent to clients as a notification (client won't close connection on reception)
   * It contains the operation that has been performed
   * @param {IClientResponse<ResPayload>} Contains the request token, operation type and operation response payload (also timestamp)
   */
  ClientNotification = "ClientNotification",

  /**
   * Indicates a Client has opened a connection to the server
   * @param {DClient} The DClient created and stored in the state
   */
  ClientConnectionOpen = "ClientConnectionOpen",

  /**
   * Client connection has been closed
   * @param {string} the hostname of the client
   */
  ClientConnectionClose = "ClientConnectionClose",

  // PEER CONNECTION

  /**
   * Connect to a peer
   * @param {string} peerIp the IP adresse of the peer to connect to
   */
  PeerConnectionRequest = "PeerConnectionRequest",

  /**
   * Indicates to a peer that its incoming connection has been accepted.
   * It provides a list of other peers to connect to
   * @param {string[]} knownPeers IPs of the peers the incoming peer may connect to (known by the receiving peer)
   */
  PeerConnectionAccepted = "PeerConnectionAccepted",

  /**
   * A peer just opened a new connection
   * @param {string} hostname composed of ip-rid 
   * @param {DenoWS} sock the websocket object
   */
  PeerConnectionOpen = "PeerConnectionOpen",

  /**
   * The connection to a peer succeeded (the WebSocket it opened)
   * @param {string} peerIp The IP of the peer just connected
   */
  PeerConnectionSuccess = "PeerConnectionSuccess",

  /**
   * Peer connection has been closed
   * @param {string} the hostname of the peer
   */
  PeerConnectionClose = "PeerConnectionClose",

  // MONOPERATIONS
  /**
   * Fetch a monitoring value (from state, or not, see the Monitor implementation)
   * @param {IMonOp} payload Request data containing the key to retreive
   */
  MonGetRequest = "MonGetRequest",

  /**
   * Return a value from the state (or other source like Deno.metrics())
   * @param {IMonOp} payload Request data containing the key to retreive, along with its value
   */
  MonGetResponse = "MonGetResponse",

  /**
   * Set a state value
   * @param {IMonOp} payload Request data containing the key to retreive, along with its value
   */
  MonSetRequest = "MonSetRequest",

  /**
   * Response to a MonSetRequest
   * @param {IMonOp} Request data containing the key to retreive, along with its value
   */
  MonSetResponse = "MonSetResponse",

  /**
   * Get notified when a monitoring value changes.
   * Monitor will send ClientNotification to notify the initiator
   * @param {string} token Token used by the initiator (e.g Client) to match the response
   * @param {EOpType.MonOp} type Fixed, it's a EOpType.MonOp
   * @param {IMonOp} payload Request data containing the key to retreive
   * @param {number} timestamp Timestamp when the request has been formulated by the initiator
   */
  MonWatchRequest = "MonWatchRequest",

  // ERROR MESSAGES

  /**
   * When a message destination is an IP or a Hostname, the Net will try to send it on the network
   * This message is emitted if Net didn't find the corresponding Client or RemotePeer
   * @param {EComponent | string} invalidMessageDestination The message destination
   * @param {string[]} availablePeers The current connected RemotePeers
   * @param {string[]} availableClients The current connected Clients
   */
  InvalidMessageDestination = "InvalidMessageDestination",

  /**
   * Currently only used by Client but not emitted by server
   * Indicates that the Client formulated an invalid ClientRequest
   * @param {IClientRequest<ReqPayload, keyof ReqPayload>} The request sent by the client
   */
  InvalidClientRequestType = "InvalidClientRequestType",
}

/**
 * Interface used to type the payloads based on a Message type.
 * @template ReqPayload extends IRequestPayload used to type the ClientRequest
 * @template ResPayload extends IResponsePayload used to type the ClientResponse & ClientNotification
 */
export interface IMPayload<ReqPayload extends IRequestPayload = IRequestPayload, ResPayload extends IResponsePayload = IResponsePayload> {

  /**
   * Send arbitrary data to a peer, to avoid
   * @param {unknown} The data
   */
  [EMType.Any]: unknown;

  /**
   * Send a LogMessage, usually to the Logger
   * @param {string} message The string message to log
   */
  [EMType.LogMessage]: {
    message: string;
    detail?: unknown
  };

  /**
   * Message sent by DDAPPS to all components just after the server started.
   * Use it an initialisation hook
   * @param {null} Nothing
   */
  [EMType.InitialMessage]: null;

  /**
   * Emitted during the network initialisation to indicate whether a peer to join has been found.
   * The message is always emitted even if --discovery is disabled
   * @param {boolean} success If the discovery found a peer to connect to
   * @param {string} result Message explaining how the discovery phase ended
   * @param {string} source Coded version of the result, if need to react depending on it
   */
  [EMType.DiscoveryResult]: {
    success: boolean;
    result: string;
    source: string;
  };

  /**
   * A peer exposes the /discovery endpoint that returns the peer IP (legacy)
   * This message is sent to Logger to indicate a peer has call the endpoint (the remote peer is thus in the discovery phase)
   * @param {Deno.NetAddr} The remote addr of the peer which called the endpoint
   */
  [EMType.DiscoveryEndpointCalled]: Deno.Addr;

  /**
   * Message sent by clients to formulate requests
   * It contains the operation to perform
   * @param {IClientRequest<ReqPayload>} Contains the request token, operation type and operation request payload (also timestamp)
   */
  [EMType.ClientRequest]: IClientRequest<ReqPayload>;

  /**
   * Message sent to clients as a notification (client won't close connection on reception)
   * It contains the operation that has been performed
   * @param {IClientResponse<ResPayload>} Contains the request token, operation type and operation response payload (also timestamp)
   */
  [EMType.ClientNotification]: IClientResponse<ResPayload>;

  /**
   * Message sent to clients to respond to requests
   * It contains the operation that has been performed
   * @param {IClientResponse<ResPayload>} Contains the request token, operation type and operation response payload (also timestamp)
   */
  [EMType.ClientResponse]: IClientResponse<ResPayload>;

  /**
   * Indicates a Client has opened a connection to the server
   * @param {DClient} The DClient created and stored in the state
   */
  [EMType.ClientConnectionOpen]: DClient<ReqPayload, ResPayload>;

  /**
   * A Client has closed the connection
   * @param {string} The client's hostname (composed of ip-rid)
   */
  [EMType.ClientConnectionClose]: string;

  /**
   * Connect to a peer
   * @param {string} peerIp the IP adresse of the peer to connect to
   */
  [EMType.PeerConnectionRequest]: {
    peerIp: string;
  };

  /**
   * A peer just opened a new connection
   * @param {string} hostname composed of ip-rid 
   * @param {DenoWS} sock the websocket object
   */
  [EMType.PeerConnectionOpen]: {
    hostname: string;
    sock: WebSocket
  };

  /**
   * The connection to a peer succeeded (the WebSocket it opened)
   * @param {string} peerIp The IP of the peer just connected
   */
  [EMType.PeerConnectionSuccess]: {
    peerIp: string;
  };

  /**
   * The connection with a peer closed (the WebSocket closed)
   * @param {string} The peer hostname (composed of ip-rid)
   */
  [EMType.PeerConnectionClose]: string;

  /**
   * Indicates to a peer that its incoming connection has been accepted.
   * It provides a list of other peers to connect to
   * @param {string[]} knownPeers IPs of the peers the incoming peer may connect to (known by the receiving peer)
   */
  [EMType.PeerConnectionAccepted]: {
    knownPeers: string[];
  };

  /**
   * Fetch a monitoring value (from state, or not, see the Monitor implementation)
   * @param {IMonOp} Request data containing the key to retreive
   */
  [EMType.MonGetRequest]: IMonOp;

  /**
   * Return a value from the state (or other source like Deno.metrics())
   * @param {IMonOp} Request data containing the key to retreive, along with its value
   */
  [EMType.MonGetResponse]: IMonOp;

  /**
   * Set a state value
   * @param {IMonOp} Request data containing the key to retreive, along with its value
   */
  [EMType.MonSetRequest]: IMonOp;

  /**
   * Confirm a MonSetRequest
   * @param {IMonOp} Request data containing the key to retreive, along with its value
   */
   [EMType.MonSetResponse]: IMonOp;

  /**
   * Get notified when a monitoring value changes.
   * Monitor will send ClientNotification to notify the initiator
   * @param {IMonOp} Request data containing the key to retreive
   */
  [EMType.MonWatchRequest]: IMonWatch;

  /**
   * When a message destination is an IP or a Hostname, the Net will try to send it on the network
   * This message is emitted if Net didn't find the corresponding Client or RemotePeer
   * @param {EComponent | string} invalidMessageDestination The message destination
   * @param {string[]} availablePeers The current connected RemotePeers
   * @param {string[]} availableClients The current connected Clients
   */
  [EMType.InvalidMessageDestination]: {
    invalidMessageDestination: EComponent | string;
    availablePeers: string[];
    availableClients: string[];
  };

  /**
   * Currently only used by Client but not emitted by server
   * Indicates that the Client formulated an invalid ClientRequest
   * @param {IClientRequest<ReqPayload, keyof ReqPayload>} The request sent by the client
   */
  [EMType.InvalidClientRequestType]: IClientRequest<ReqPayload>;
}
