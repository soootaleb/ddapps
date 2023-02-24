# DDAPPS

![CircleCI](https://circleci.com/gh/soootaleb/ddapps/tree/main.svg?style=shield)

DDAPPS is an event-driven / messages Deno framework. It's adapted to build _living_ applications (opposed to the conventional request/response service) like a distributed database (see the example).

- [Docker Hub - Server](https://hub.docker.com/repository/docker/soootaleb/ddapps)
- [Docker Hub - CLI](https://hub.docker.com/repository/docker/soootaleb/ddappsctl)
- [Binaries](https://app.circleci.com/pipelines/github/soootaleb/ddapps?filter=all&status=success) are store on CircleCI in the `DenoBuildServer` & `DenoBuildCLI` jobs ("artifacts" panel)

# Table of content

- [Introduction](#introduction)
- [Getting Started](#getting-started)
  * [Interacting with a server](#interacting-with-a-server)
  * [Adding you own feature](#adding-you-own-feature)
- [Concepts](#concepts)
  * [Naming](#naming)
  * [Messages](#messages)
  * [Components](#components)
    + [Messenger base class](#messenger-base-class)
    + [Receiving messages](#receiving-messages)
    + [Sending messages](#sending-messages)
    + [Shared state](#shared-state)
  * [Operations](#operations)
  * [Typing](#typing)
    + [Messages](#messages-1)
    + [Operations](#operations-1)
  * [State](#state)
- [Usage](#usage)
- [Tooling](#tooling)
  * [App Factory (typed)](#app-factory--typed-)
  * [Client (typed)](#client--typed-)
  * [CLI](#cli)
  * [Testing (typed)](#testing--typed-)
- [Dependencies](#dependencies)

# Introduction

I've used the async nature of JavaScript in order to build distributed systems (see the examples, there are a distributed key-value store like etcd and a blockchain). Deno has great conventional web frameworks based on request/response. I've developed ddapps as an async, distributed, messages oriented framework allowing to build server applications that run and behave without any connected user. This framework is designed with heavy typing in order to help the developer, and provides base components required to build distributed systems.

Those components are:

- Client (SDK) to build your own integration
- CLI to interact with the system & bootstrap your project
- Networking to allow cluster communication
- Monitoring to observe the system
- API for clients' requests handling an routing
- Logging to known what's happening
- Peer as a core component

> Typing is a first class citizen in ddapps. Pretty much everything is "strongly" typed, and the framework relies on it in order to offer a powerful but friendly user experience.

This document offers a high level view of the framework, its philosophy and how to use it. There is [a technical documentation](./src/README.md) in the sources, along with [concrete examples](./example/README.md) on how ddapps can be used for complex applications.

# Getting Started

## Interacting with a server

Ddapps works out of the box, even if it currently doesn't expose any meaningful feature by itself. This section uses [the compiled binary](), but you can find [the associated Docker image](https://hub.docker.com/repository/docker/soootaleb/ddapps). Here is [the CLI Docker image](https://hub.docker.com/repository/docker/soootaleb/ddappsctl).

Start the server by executing `ddapps`. By default it uses the port `8080`.

```Bash
# --console-messages activates console logging
# --debug will display all messages (only clients' requests if ommited)
$ ddapps --console-messages --debug
```

Interact with the server using the CLI. By default it targets `localhost:8080`

```Bash
$ ddappsctl ping
```

You should get a response like
```TypeScript
{
  type: "ClientResponse",
  source: "localhost",
  destination: "Client",
  payload: { token: "px2vydgrs7", type: "Pong", payload: 3, timestamp: 1647610732124 }
}
```

You can see the server logs
```Bash
🔄 12   DDAPPS              Messenger           InitialMessage           null
🔄 3    Net                 Peer                DiscoveryResult          {"success":false,"result":"Discovery is not activated","source":"discovery_disabled"}
🔄 2    Peer                Logger              LogMessage               {"message":"Node is ready after discovery result"}
🔄 4571 Net                 Logger              ClientConnectionOpen     {"_conn":{},"_sock":{"readyState":1,"protocol":null},"_latency":0}
🔵 0    127.0.0.1-7         Api                 ClientRequest            {"token":"aghl4yd21p","type":"Ping","payload":null,"timestamp":1647611045333}
🟢 3    Api                 127.0.0.1-7         ClientResponse           {"token":"aghl4yd21p","type":"Pong","payload":3,"timestamp":1647611045336}
🔄 0    Net                 Api                 ClientConnectionClose    "127.0.0.1-7"
🔄 0    Net                 Logger              ClientConnectionClose    "127.0.0.1-7"
```

> You can compile the server & CLI using Deno tasks `compile-ddapps` & `compile-cli`.

## Adding you own feature

We will use ddapps to get a remote machine's hostname using the ddapps CLI.

Create a file `hostname.ddapps.ts`

```TypeScript
import { DDAPPS, Api, EMType, Message, EOpType, state as base } from "https://deno.land/x/ddapps@1.4.5/mod.ts";

// Extend from the Api component to receive the client message
class HostnameApi extends Api {

  // Override the EMType.ClientRequest handler
  protected override [EMType.ClientRequest](message: Message<EMType.ClientRequest>) {

    // Call the parent method for core mechanics
    super.ClientRequest(message)

    // Send a response of type Any with the machine hostname as a payload
    this.response(message.payload.token, EOpType.Any, Deno.hostname());
  }
}

// Bootstrap you DDAPPS application
new DDAPPS()
  .use(HostnameApi) // Use your custom API instead of the base one
  .run(base); // Start the application listening on the network
```

You don't have to compile it for now, just start the application with Deno CLI.

```Bash
# --unstable is needed to call Deno.hostname()
$ deno run -A --unstable hostname.ddapps.ts
```

In another terminal, you can use the ddapps CLI to send a message `Any` to the server.

```Bash
$ deno run -A --unstable cli/ddapps.ts any
```

> The compiled CLI is available on CircleCI so you don't have to clone the repo to use it. In this case just use `ddappsctl any`. You can find a link to the binaries at the top of this document.

You should get a response of which the payload is you machine's hostname

```TypeScript
{
  type: "ClientResponse",
  source: "localhost",
  destination: "Client",
  payload: {
    token: "hkth7g1fca",
    type: "Any",
    payload: "MacBook-Pro-de-Sofiane.local",
    timestamp: 1647612904435
  }
}
```

This basic example showed you how to bootstrap a ddapps application, extend a base component in order to add some logic, and use the CLI in order to interact with your application. So far we've only used pre-existing structures for types, enums and components. The rest of this document will show you how to create a more advanced ddapps application in order to interact with multiple components, and execute ddapps on multiple machines in order to leverage its distributed and message oriented nature.

> The `ddappsctl` CLI exposes an `init` command that will bootstrap a workspace for you, but you should first understand the next sections before going for it.
 
# Concepts

This section will often use examples from the `example` directory containing a key-value store (KV store) and a blockchain.

## Naming

Some structures' names in ddapps are prefixed depending on their nature (not all are however)

- [I] Interfaces (e.g `IMessage`)
- [E] Enumerations (e.g `EComponent`)

In the example, the KV store structures are also prefexied with `KV` (e.g `KVPeer`), and blockchains' ones are prefixed with `C` or `Chain` (e.g `ChainPeer`).

> The terms Node & Peer are equivalent and refer to the same concept

## Messages

Messages are the building block allowing entities to exchange information (between components, but also remote peers or clients). In ddapps, messages have a `type`, a `payload` (which is typed depending on the `type` of the message) a `source` and a `destination`, much like a TCP packet. The response you got in the Getting Started is a typical message of type `ClientResponse` and a payload containing the information you requested.

```TypeScript
interface IMessage<T> {
  type: T;
  source: string;
  destination: EComponent | string;
  payload: MPayload[T]; // MessagePayload
}
```

> This IMessage interface is simplified for this section, refer to [the typing section](#typing) for the full description

At its core, ddapps relies on (async) events using `Deno.CustomEvent`, `disptachEvent`, `addEventListener` & `removeEventListener`. `CustomEvent` is used for its capability to embed a payload. This payload is always a message matching the interface `IMessage`. User is not supposed to deal with `CustomEvent` since it's only a core transport object. Instead the framework exposes messages transparently.

You can find [the documentation about core messages here](https://doc.deno.land/https://deno.land/x/ddapps@1.4.5/messages.ts/).

## Components

A component is a singleton object that handles (non exclusively) messages. You can create as many as you need, in order to respect the separation of concerns. However there is a minimal set of components that are created out of the box by the DDAPPS factory ([see the associated section](#app-factory-typed) below).

- `Net` for network connectivity
- `Peer` as the main logical component
- `Logger` to make messages readable
- `Monitor` to handle cluster operations & observability
- `Api` to accept clients' requests & route them

**In a ddapps, there can only be at least and only ONE instance of each of those base components or inherited versions.** If you need to tune their behavior, extend the class and use yours. If you need to add unrelated components, inherit from the `Messenger` class (see [the associated section](#messenger-base-class) below).

You can extend any and all of those components for your own needs. They don't necessarily offer specific features but handle some important aspects of ddapps that you may want to fine tune. For example, if you want to extend the logic of adding a new node to the cluster, you may extend `Peer` or `Net`, but extending `Api` won't allow you (out of the box) to handle the related events.

### Messenger base class

All components inherit directly or indirectly from the `Messenger` base class. This base class subscribes the component to the correct messages, calls the correct handler, and exposes the `Messenger#send` method in order to allow components to send typed messages.

> Concretely, a messenger calls `addEventListener(Component)` in order to handle a message when they are the actual destination.

### Receiving messages

Components receive a message when they are the `destination` of the message (i.e the class name is exactly the same as the `destination` value of the message). They handle the message only if they have an associated handler (i.e a class method with a name matching the message `type`).

```TypeScript
// Peer is a core component provided by ddapps, used here as an example
class Peer extends Messenger {
  // Message handlers are class methods accepting a typed message
  protected [EMType.Ping](message: IMessage<EMType.Ping>) {
    console.log("Received a ping");
  }
}
```

The typing of messages helps you on the payload manipulation. The TypeScript signature is reliable and can tell you what is the exact nature of the payload (properties and their types).

> You should always name handlers based on a message types enumeration (here it's `EMType`, the base message types enum).

### Sending messages

To leverage the heavy typing used by ddapps, a `.send()` method is accessible by all components (inherited from the `Messenger` base class). The first argument must be a message typed derived from from `EMType`. The second argument is the `payload` and will only compile if its signature matches the message type. The third argument is the `destination` of the message.

```TypeScript
class Peer extends Messenger {
  // Message handlers are class methods accepting a typed message
  protected [EMType.Ping](message: IMessage<EMType.Ping>) {
    this.sendLog("Messages of type Any are for demo purpose and should be avoided", message);
  }
}
```

Here again, ddapps typing will help you build a safe payload by making you specify all its properties with their correct nature.

**Messages can be sent to peers and clients by specifying an IP as the destination. Ddapps doesn't make much difference between a remote component and a local one. This allows you always use the same approach whether you exchange messages localy or remotely.**

> In [the Getting Start section](#getting-started), the `HostnameApi` calls `this.response`. It's a wrapper around the `this.send` method that allows to type messages exchanged with clients.

### Shared state

All components have access a shared object named `state`. It stores the application data such as configuration, networking resources, and any business logic you need. You can access it simply via `this.state`.

```TypeScript
class Peer extends Messenger {
  // The state is passed to any messenger, no need to override the constructor
  constructor(protected state: IState) {
    this.state.ready = true;
  }
}
```

## Operations

Operations are like messages but for clients. A client sends a message `ClientRequest`, but the end-user API is composed of an operation type, and an operation payload.

```TypeScript
export interface IClientRequest<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ReqType extends keyof ReqPayload = keyof ReqPayload,
> {
  token: string;
  type: ReqType;
  payload: ReqPayload[ReqType];
  timestamp: number;
}
```

`ClientRequest` is a conventional message, but it also has a `token` used to match requests & responses. The `type` and `payload` properties are typed based on `EOpType`. It's the same mechanic than message typing but it prevents clients from sending system-oriented messages. It also allows the `API` to segregate and handle clients' requests from system-oriented messages.

## Typing

Typing is an important part of ddapps, and you will hardly extend it without taking the time to declare your own types. That may seem cumbersome but it's the mechanic that helps the developer to build an application without losing the track of what's manipulated. Apart from limiting the runtime errors, I've spent hours just trying to remember and understand what was the content of a payload. Typing is used to facilitate the development of a ddapps, and makes it extansible for you to build on top of it.

Heavy typing allows the `.send()` methods to alert you when the payload does not match the passed type. You can also use the `M` type in your handlers' declaration in order to understand the content of a message based on its type. Also, configure your IDE to use TypeScript correctly (Deno linter), in order to get advanced auto completion and documentation.

```TypeScript
...
  protected override [EMType.PeerConnectionAccepted](
    message: M<EMType.PeerConnectionAccepted>,
  ) {
    console.log(message.knownPeers); // OK
    console.log(message.randomProperty); // KO this will not compile
  }
...
```

There are 3 concepts that are typed

- The messages exchanged between the peers
- The operations exchanged between the client and the server (operation)
- The shared state

For more information on how to extend types when building with ddapps, [see the usage section](#usage).

### Messages

Messages are typed in [the associated module](./src/messages.ts). `EMType` enumeration lists the messages types. `IMPayload` uses `EMType` to match a message to a typed payload. `IMPayload` is generic and uses operations types in order to type the `ClientRequest`, `ClientNotification` & `ClientResponse` messages;

```TypeScript
export interface IMPayload<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload
  > {

  [EMType.LogMessage]: { message: string; };
}
```

### Operations

Operations are typed in [the associated module](./src/operation.ts). `EOpType` enumeration lists the operations types. `IRequestPayload` & `IResponsePayload` use `EOpType` to match an operation to a typed payload. Note that `ClientNotification` messages have a `IResponsePayload` payload.

```TypeScript
export interface IRequestPayload {
  [EOpType.Crash]: null,
  [EOpType.Any]: unknown;
  [EOpType.Ping]: null;
  [EOpType.Pong]: number;
  [EOpType.MonOp]: IMonOp;
  [EOpType.MonWatch]: IMonWatch;
}
```

## State

The shared state is typed in [the interface module](./src/interface.ts). It's generic in order to be extended.

```TypeScript
export interface IState<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload,
  MPayload extends IMPayload<ReqPayload, ResPayload> = IMPayload<
    ReqPayload,
    ResPayload
  >> {
  ready: boolean;

  net: {
    requests: { [key: string]: string };
    ready: boolean;
    peers: DRemotePeerSet<ReqPayload, ResPayload, MPayload>,
    clients: DClientSet<ReqPayload, ResPayload>
  };

  log: {
    console: boolean;
    exclude: (keyof MPayload)[];
    last: number;
  };

  mon: {
    requests: string[];
    stats: { [key: string]: number };
    watchers: { [key: string]: number };
    loggers: string[];
  };
}
```

# Tooling

This section does not offer a complete technical reference but instead describes some peripheral utilities at your disposal when building with ddapps.

## App Factory (typed)

[DDAPPS class](./src/ddapps.ts) allows you to bootstrap your application without worrying of various subtlties. It's typed so it can handle your custom components, themselves handling custom messages.

The factory handles
- Instanciating and registering all necessary components, only once, in the correct order
- Performing dependency injection of the correct state in all components
- Starting the web server and accepting requests
- Sending an InitialMessage for components initialisation

You will mainly use `DDAPPS.use()` in order to specify what components you want to instanciate in your application.

In the getting start, the last three lines perform this action. DDAPPS relies on method chaining to let you register multiple components (see the example). You must call `DDAPPS.run()` at the end since it actually creates objects and starts the web server (so it's blocking).

```TypeScript
// Bootstrap you DDAPPS application
new DDAPPS()
  .use(HostnameApi) // Use your custom API instead of the base one
  .run(base); // Start the application listening on the network
```

In the example you can find a typed example of DDAPPS

```TypeScript
new DDAPPS<
  IKVRequestPayload,
  IKVResponsePayload,
  IKVMPayload,
  IKVState
>().use(KVLogger)
  .use(KVApi)
  .use(KVMonitor)
  .use(Store)
  .use(KVPeer)
  .run(kvstate);
```

When running the application, you must provide a shared state. The Getting Started uses the default one, but you can also extend it to add your own properties. Pass it to the `.run()` method and the state will be injected in all components you registered.

**As mentioned in [the "Concepts::Components" section](#components), there can only be at least and only ONE of each base component or its derivative.** You can create and use any number of custom components that inherit from `Messenger` but it will still be a singleton. If you use a component that inherits one of the base components (`Net`, `Api`, `Peer`, `Monitor`, `Logger`), the factory will use the one provided and not create the basic one. You should not loose their capabilities since you inherit their behavior.

## Client (typed)

In order to interact with your cluster, you will need to open a WebSocket on the correct endpoint, and send correctly formated messages (a JSON strings). Programmatically, it's handled by the [client](./src/client.ts) class. Like other extandable structure of ddapps, it's typed to you can add your own types of messages.

To add a new feature, inherit from the `Client` class and add a public method (from the example)

```TypeScript
export class KVClient extends Client<
  IKVRequestPayload,
  IKVResponsePayload,
  IKVMPayload
> {
  public kvget(key: string) {
    return this.send(EKVOpType.KVGet, key);
  }
}
```

The base client exposes the `.send<T extends keyof ReqPayload>(type: T, payload: ReqPayload[T])` method. It will handles the build of the `ClientRequest` message, handling the `token` and matching the `ClientResponse` correctly. For you to add a new operation, just expose the method and use `.send()` with the correct operation type and payload.

`Client.send()` returns a `Promise<IMessage<EMType.ClientResponse, ReqPayload, ResPayload, MPayload>`. That means that you can call the operations' methods, and use `.then(response => {})` to handle the server response for your own need. For example, the CLI will format and print it in `stdout`. More information about the CLI [in the next section](#cli).

If you want to extend the client behavior when receiving a message from the server, you can also override the message handlers `ClientResponse`,  `ClientNotification` & `InvalidClientRequestType`. This can be used to fine tune the requests life cycle at a lower level, but is not mandatory to handle your operations' results.

```TypeScript
export class KVClient extends Client<
  IKVRequestPayload,
  IKVResponsePayload,
  IKVMPayload
> {
  protected override [EMType.ClientNotification](
    message: KVM<EMType.ClientNotification>,
  ) {
    super[EMType.ClientNotification](message);
    if (message.payload.type === EKVOpType.KVWatch) {
      const payload = message.payload.payload as unknown as ILog;
      if (Object.keys(this._watchers).includes(payload.next.key)) {
        this._watchers[payload.next.key](message);
      }
    }
  }
}
```

> The `Client` does not inherit from the `Messenger` base class. But it works the same way, using message handlers & a typed `.send()` method.

## CLI

The CLI relies on the `Client` (see [the client section](#client-typed)) and uses the [Cliffy Command](https://deno.land/x/cliffy/command/) Deno package to parse arguments and generate documentation. It's extandable and you can find an implementation in the example.

Out of the box, you can ping a node, get & set monitoring (state) values, sent arbitrary data with `any`, and `crash` a node. In the `cli` directory of the example you can see how to add custom commands. **The CLI init command allows you to create a ddapps boilerplate in order to avoid the initial creation of files and structures**.

```Shell
Usage:   ddappsctl
Version: 1.4.5

Description:

  Interact with ddapps

Options:

  -h, --help     - Show this help.                            
  -V, --version  - Show the version number for this program.  

Commands:

  ping   - Ping the cluster   
  mon    - Monitor the cluster
  any    - Whatever you want  
  crash  - Kill the node
  init   - Initialize repo for a ddapps application
```

To add a new command to the CLI, refer to [the Cliffy documentation](https://deno.land/x/cliffy/command/) and create a `Command` object. Make sure to not `await` the command since it will make it blocking and execute in the current shell.

```TypeScript
const put = new Command()
  .description("Add a key-value pair")
  .version("0.1.0")
  .option("-a, --address <addr:string>", "HTTP endpoint", {
    default: "localhost",
  })
  .option("-p, --port <port:number>", "HTTP port", { default: 8080 })
  .option("-k, --key <key:string>", "Key part")
  .option("-v, --value <value:string>", "Value part")
  .action(async ({ address, port, key, value }: {
    address: string;
    port: number;
    key: string;
    value: string;
  }) => {
    // You may need to customize your own client to send specific messages
    await new KVClient(address, port).co
      .then((ops) => {
        // First, the WebSocket connection is opened and you have access to a Client instance (ops)
        return ops.kvput(key, value);
      }).then(response => {
        // When calling a client operation, the next promise resolves with the ClientResponse form the server
        console.dir(response);
        Deno.exit(0);
      }).catch((err) => {
        console.error(err);
        Deno.exit(1);
      });
  });
```

Then you can import `ddappsctl` and use method chaining to register your commands. When you want to actually expose your CLI and make it executable, use `await` and call your `cli.ts` script in your shell. Refer to [the Cliffy doc](https://deno.land/x/cliffy/command/) for more information.

```TypeScript
import { ddappsctl } from "ddapps/cli.ts";

// This allows your CLI to inherit the base ddappsctl commands
const customCli = ddappsctl.command("put", put);

// You can declare multiple commands in different files and start your CLI in a specific one (see example)
await customCli;
```

## Testing (typed)

In order to test the async messages of your components, some helper are provided.

The function `assertMessages` takes a list of messages that are expected to be sent by a component after it received a message. You may also want to extend a typed state and use the `of()` function from the `state.ts` module. You generally use it to type your custom typed state, and in your tests you directly import your custom state.

```TypeScript
Deno.test("KVPeer::NewTerm::Accept", async () => {
  const s: IKVState = {
    ...kvstate,
    voteGrantedDuringTerm: true,
    heartBeatInterval: 10,
    term: 1,
  };

  // Instanciate the component you want to test
  const component = new KVPeer(s);

  // Type a message to send to the component
  const message: KVM<EKVMType.NewTerm> = {
    type: EKVMType.NewTerm,
    destination: EKVComponent.KVPeer,
    payload: {
      term: 2,
    },
    source: "Source",
  };

  // Expect some messages fired by the component (not ordered due to the async nature of messages)
  await assertMessages([
    {
      type: EKVMType.NewTermAccepted,
      payload: {
        term: 2,
      },
      source: EKVComponent.KVPeer,
      destination: EComponent.Logger,
    },
  ], message);

  // You can also test the state after the message has been handled
  assertEquals(s.term, 2);
  assertEquals(s.voteGrantedDuringTerm, false);

  // Don't forget to shutdown your component to avoid async leaks
  component.shutdown();
});
```

# Usage

This section describes step by step how to use and extend ddapps in order to build an application and leverage the various components. We will build a toy application but the key-value example can provide you a much elaborate use of the framework.

> It's important to understand how to extend ddapps, but when you feel at ease, don't hesitate to use `ddappsctl init --name secret` in order to bootstrap the files and structures.

Our application is called secret, and will allow a user to store a secret on multiple machines. At the end we will connect 2 nodes, define a secret on one node and retrieve it on the other. As a convention, we will use the `S` prefix on our various structures.

> ddapps is currently using the `8080` port, so you will need Docker or VMs to start two nodes.

The steps involved are:
- Extend the state to add a `secret` property
- Declare a `SetSecret` message to update the state
- Implement the storage of the secret on the first node
- Implement the propagation of the secret on the second node
- Add the `SetSecret` & `GetSecret` operations
- Extend the `Api` to expose the feature
- Extend the CLI to allow users to use the new feature

We start by creating all required typings to use them in the next steps. We type the messages, operations, and a custom state. Don't hesitate to declare your structure in various files. Imports are ommited for clarity

```TypeScript
// Messages (ISecretMessagePayload)
export enum ESMType { SetSecret = "SetSecret" }

export interface ISMPayload extends IMPayload<ISRequestPayload, ISResponsePayload> {
  [ESMType.SetSecret]: string // Payload will be a string, the secret
}

// Allows to type the incoming message in handlers
export type SM<T extends keyof ISMPayload> = M<T, ISRequestPayload, ISResponsePayload, ISMPayload>;

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

// State adds a secret property to store the secret
export interface ISState extends IState<ISRequestPayload, ISResponsePayload, ISMPayload> {
  secret: string;
}
```

Then we can start to implement the secret storage on the first node.
- Create a new component that inherits `Peer` (it's the component that will receive messages sent by peers). Indicate your typings to the `Peer` base class.
- Add a handler for the `SetSecret` message. Use the handler type `SM` to type the incoming message. You can observe that the message payload is correctly typed as a string.

The handler will have to store the secret in the state, but also send it to the second node in order to propagate it. You can use the `.send()` method on the `state.peers` in order to broadcast a message.

> Send the message only to the peers that are not the source of the message to avoid an infinite loop caused by the second node sending the secret to the first.

```TypeScript
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
```

Next let's extend the `Api` in order to accept the new operation and forward it to our component. As a component, don't forget to type it also. If the operation type is `SetSecret`, we send the appropriate message to our custom component. Then we respond to the client. If it's `GetSecret`, the `Api` will directly return the value stored in the state to the client.

```TypeScript
export class SApi extends Api<ISRequestPayload, ISResponsePayload, ISMPayload, ISState> {
  protected override [EMType.ClientRequest](message: M<EMType.ClientRequest> | SM<EMType.ClientRequest>) {
    super.ClientRequest(message as M<EMType.ClientRequest>); // Call the parent to keep base operations accessible
    switch (message.payload.type) {
      case ESOpType.SetSecret:
        this.send(
          ESMType.SetSecret,
          message.payload.payload as ISMPayload[ESOpType.SetSecret],
          SecretManager
        ).then(() => { // Called when all handlers have been executed successfully
          this.response(
            message.payload.token,
            ESOpType.SetSecret,
            null
          )
        })
        break;
      case ESOpType.GetSecret:
        this.response( // A utility method that allows to formulate a ClientResponse with typed operation
          message.payload.token,
          ESOpType.GetSecret,
          this.state.secret
        )
        break;
      default:
        break;
    }
  }
}
```

To finish the server side, we will create a state, and bootstrap the application using the factory.

```TypeScript
const state: ISState = {
  ...of(), // Inherit base state properties
  secret: ""
}

new DDAPPS<ISRequestPayload, ISResponsePayload, ISMPayload, ISState>()
  .use(SApi)
  .use(SecretManager)
  .run(state);
```

Now that we've implemented the server side, we will extend the `Client` to add our operations, and add a CLI command to interact with our application. Since the server side is blocking, create a new file for your client side.

First, use the `Client.send()` method to package and send a `ClientRequest` using the typings.

```TypeScript
class SClient extends Client<ISRequestPayload, ISResponsePayload, ISMPayload> {
  public sset(secret: string) {
    return this.send(ESOpType.SetSecret, secret);
  }

  public sget() {
    return this.send(ESOpType.GetSecret, null);
  }
}
```

Second, declare your CLI commands that use your custom client, calling the associated methods. In this example the response is simply printed on `stdout` before exiting Deno.

> Due to a limitation on Cliffy, the address and port arguments must be declared on each command.

```TypeScript
const sset = new Command()
  .description("Set the secret")
  .option("-a, --address <addr:string>", "HTTP endpoint", {
    default: "localhost",
  })
  .option("-p, --port <port:number>", "HTTP port", { default: 8080 })
  .option("-v, --value <value:string>", "Secret value")
  .action(async ({ address, port, value }: {
    address: string;
    port: number;
    value: string
  }) => {
    await new SClient(address, port).co
      .then((ops) => {
        return ops.sset(value);
      }).then((response) => {
        console.dir(response, { depth: 10 });
        Deno.exit(0);
      }).catch((err) => {
        console.error(err);
        Deno.exit(1);
      });
  })

const sget = new Command()
  .description("Retrieve the secret")
  .option("-a, --address <addr:string>", "HTTP endpoint", {
    default: "localhost",
  })
  .option("-p, --port <port:number>", "HTTP port", { default: 8080 })
  .action(async ({ address, port }: {
    address: string;
    port: number;
  }) => {
    await new SClient(address, port).co
      .then((ops) => {
        return ops.sget();
      }).then((response) => {
        console.dir(response, { depth: 10 });
        Deno.exit(0);
      }).catch((err) => {
        console.error(err);
        Deno.exit(1);
      });
  })
```

Finally, you can extend the `ddappsctl` to add your custom commands. Then use `await` to make the CLI executable at the end of the script.

```TypeScript
const sctl = ddappsctl
  .description("Manage the secret")
  .command("sset", sset)
  .command("sget", sget)

await sctl.parse(Deno.args);
```

> You should not have your declarations and your bootstrap in the same file. That's because the CLI file needs to import your declarations, and will start the server if present in the module.

You can start the server with `deno run -A --unstable server.secret.ddapps.ts`. If you add `--console-messages`, the server will log in the console (only the client messages). You can add `--debug` to display all internal messages.

```Bash
┌────────────┬──────────────┐
│ (idx)      │ Values       │
├────────────┼──────────────┤
│ deno       │ "1.20.1"     │
│ v8         │ "10.0.139.6" │
│ typescript │ "4.6.2"      │
│ ddapps     │ "1.4.5"      │
└────────────┴──────────────┘
[INFO] DDAPPS::Component::Use::log::Logger
[INFO] DDAPPS::Component::Use::api::SApi
[INFO] DDAPPS::Component::Use::mon::Monitor
[INFO] Logger::AlreadyRegistered::Monitor
[INFO] DDAPPS::Component::Use::peer::SecretManager
[INFO] DDAPPS::Component::Use::net::Net
[INFO] Logger::AlreadyRegistered::Net
[INFO] DDAPPS::Server::Start::tcp://0.0.0.0:8080
```

We can observe that `DDAPPS` correctly used `SApi` & `SecretManager` components as the api & peer. Then define a secret with your custom CLI `deno run -A --unstable cli.secret.ddapps.ts sset -v "my-secret"`

```Bash
{
  type: "ClientResponse",
  source: "localhost",
  destination: "Client",
  payload: { token: "flszhonhzy4", type: "SetSecret", payload: null, timestamp: 1647795375248 }
}
```

You can retrieve your secret with `deno run -A --unstable cli.secret.ddapps.ts sget`

```Bash
{
  type: "ClientResponse",
  source: "localhost",
  destination: "Client",
  payload: {
    token: "u97o6kwg7n",
    type: "GetSecret",
    payload: "my-secret",
    timestamp: 1647795171896
  }
}
```

Try starting a second instance of your application. For the two nodes to connect, you need to define two environment variables (on each node).

- `DDAPPS_NODE_IP` is the IP of the current node
- `DDAPPS_CLUSTER_HOSTNAME` is the IP or DNS of the node to connect to

Then, start the second node with the flag `--discovery` to activate the connection to the first node (based on the environement variables). Use the same CLI to set a secret on the first node (using the `--address` argument since it shouldn't be localhost anymore), and try to retrieve the secret from the second node. Congratulations, you've implemented a distributed application that can dispatch a value on multiple machines. Note that we've made the effort to use types as much as possible, and we used many aspect of ddapps framework. But as a framework, you can also use only a subset of it, for example you may not need to implement your own client & CLI if you only want to extend the monitoring behavior and use the base tooling.

For more information on internals and base structures, you can go in [the technical documentation](./src/README.md).

# Dependencies

I try to use as few as possible dependencies. For now ddapps relies on

- [Cliffy](https://deno.land/x/cliffy) to develop the ddappsctl CLI
- [Eta](https://deno.land/x/eta) template engine for the CLI to init a project
- [Standard Library](https://deno.land/x/std) for various utilities such as HTTP server or logging colors
