import { EComponent } from "../src/enumeration.ts";
import { Net } from "../src/net.ts";
import { IMessage, IState } from "../src/interface.ts";
import { assertEquals } from "std/testing/asserts.ts";
import { EMType } from "../src/messages.ts";
import { getAssert } from "../src/testing.ts";
import { state } from "../src/state.ts";

const assertMessages = getAssert();
Deno.test("Net::InitialMessage::DiscoveryDisabled", async () => {
  
  const s: IState = { ...state };

  const component = new Net(s);

  const message: IMessage<EMType.InitialMessage> = {
    type: EMType.InitialMessage,
    source: "Source",
    destination: EComponent.Net,
    payload: null,
  };

  await assertMessages([
    {
      type: EMType.DiscoveryResult,
      source: EComponent.Net,
      destination: EComponent.Peer,
      payload: {
        success: false,
        result: `Net::Discovery::Result::NotActivated`,
        source: "discovery_disabled"
      }
    }
  ], message)

  assertEquals(true, s.net.ready, "Net not ready after DiscoveryResult")

  component.shutdown();
});
