import { state } from "../src/state.ts";
import { Peer } from "../src/peer.ts";
import {
  EComponent
} from "../src/enumeration.ts";
import { IMessage, IState } from "../src/interface.ts";
import { assertEquals } from "std/testing/asserts.ts";
import { EMType } from "../src/messages.ts";
import { EOpType } from "../src/operation.ts";
import { getAssert } from "../src/testing.ts";

const assertMessages = getAssert();

Deno.test("Peer::ClientResponse", async () => {
  const s: IState = { ...state };

  const component = new Peer(s);

  const request = {
    token: "token",
    type: EOpType.Ping,
    timestamp: 12345678,
    payload: null,
  };

  const message: IMessage<EMType.ClientResponse> = {
    type: EMType.ClientResponse,
    destination: EComponent.Peer,
    payload: request,
    source: "Source",
  };

  await assertMessages([
    {
      type: EMType.ClientResponse,
      payload: request,
      source: EComponent.Peer,
      destination: EComponent.Api,
    },
  ], message);

  component.shutdown();
});

Deno.test("Peer::DiscoveryResult::Success", async () => {
  const s: IState = {
    ...state
  };

  const component = new Peer(s);

  const message: IMessage<EMType.DiscoveryResult> = {
    type: EMType.DiscoveryResult,
    destination: EComponent.Peer,
    payload: {
      success: true,
      result: "127.0.0.1",
      source: "http"
    },
    source: "Source",
  };

  await assertMessages([
    {
      type: EMType.PeerConnectionRequest,
      payload: {
        peerIp: "127.0.0.1"
      },
      source: EComponent.Peer,
      destination: EComponent.Net,
    }
  ], message);

  component.shutdown();
});

Deno.test("Peer::DiscoveryResult::NotSuccess", async () => {
  const s: IState = {
    ...state
  };

  const component = new Peer(s);

  const message: IMessage<EMType.DiscoveryResult> = {
    type: EMType.DiscoveryResult,
    destination: EComponent.Peer,
    payload: {
      success: false,
      result: "127.0.0.1",
      source: "http"
    },
    source: "Source",
  };

  await assertMessages([
    {
      type: EMType.LogMessage,
      payload: { message: `Peer::ReadyAfter::DiscoveryResult::${message.payload.source}` },
      source: EComponent.Peer,
      destination: EComponent.Logger,
    }
  ], message);

  assertEquals(s.ready, true);

  component.shutdown();
});

/**
 * MISSING
 * 
 * M - PeerConnectionOpen
 * L - PeerConnectionAccepted
 * L - CallForVoteResponse
 */