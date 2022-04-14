import { Messenger } from "./messenger.ts";
import {
  assertEquals,
  assertObjectMatch,
} from "std/testing/asserts.ts";
import { of } from "./state.ts";
import { IMPayload } from "./messages.ts";
import { IRequestPayload, IResponsePayload } from "./operation.ts";
import { M } from "./type.ts";
import { EComponent } from "./enumeration.ts";

function expect<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload,
  MPayload extends IMPayload<ReqPayload, ResPayload> = IMPayload<
    ReqPayload,
    ResPayload
  >,
  >(
    expected: M<keyof MPayload, ReqPayload, ResPayload, MPayload>[],
    after: M<keyof MPayload, ReqPayload, ResPayload, MPayload>,
) {
  const messages = new Messenger<
    ReqPayload,
    ResPayload,
    MPayload
  >({ ...of<ReqPayload, ResPayload, MPayload>() });
  const promises = [];
  const tests: { [key: string]: (ev: Event) => void } = {};

  for (const current of expected) {
    let resolve: (v: unknown) => void;
    const p = new Promise((r) => resolve = r);

    promises.push(p);

    const timeout = setTimeout(() => {
      removeEventListener(
        current.destination,
        tests[current.destination + current.type],
      );
      resolve(false);
    }, 1000);

    tests[current.destination + current.type] = (ev: Event) => {
      const event: CustomEvent = ev as CustomEvent;
      const message: M<keyof MPayload, ReqPayload, ResPayload, MPayload> =
        event.detail;

      if (
        message.destination === after.destination &&
        message.source === after.source &&
        message.type === after.type
      ) {
        return;
      }

      clearInterval(timeout);

      assertObjectMatch({
        ...message,
      } as Record<PropertyKey, unknown>, {
        ...current,
      } as Record<PropertyKey, unknown>);

      resolve(true);
    };

    addEventListener(current.destination, tests[current.destination + current.type]);
  }

  messages.send(after.type, after.payload, after.destination, after.source);

  return Promise.all(promises).then((ok) => {
    for (let index = 0; index < ok.length; index++) {
      if (!ok[index]) {
        console.error(`\n🛑 ${expected[index].source}::${expected[index].destination}::${expected[index].type}`);
      }
    }

    for (const current of expected) {
      removeEventListener(
        current.destination,
        tests[current.destination + current.type],
      );
    }

    return ok.includes(false) ? ok.findIndex((v) => !v) : -1;
  });
}

/**
 * assert a list of messages are emited after a given message is sent
 * @param expected - The list of expected messages
 * @param after - The message sent as a trigger
 */
export function getAssert<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload,
  MPayload extends IMPayload<ReqPayload, ResPayload> = IMPayload<
    ReqPayload,
    ResPayload
  >,
  >() {
  return async function assertMessages(
    expected: M<keyof MPayload, ReqPayload, ResPayload, MPayload>[],
    after: M<keyof MPayload, ReqPayload, ResPayload, MPayload>,
  ) {
    const exp = await expect<ReqPayload, ResPayload, MPayload>(expected, after);
    assertEquals(
      exp,
      -1,
      `Testing::AssertionError::MessageNotReceived::${expected[exp]?.type}::${expected[exp]?.destination}`,
    );
  };
}

export function getAwaitMessages<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload,
  MPayload extends IMPayload<ReqPayload, ResPayload> = IMPayload<
    ReqPayload,
    ResPayload
  >,
  >() {
  return function awaitMessages(
    destinations: (EComponent | string)[],
    message: M<keyof MPayload, ReqPayload, ResPayload, MPayload>,
  ) {
    const messenger = new Messenger<
      ReqPayload,
      ResPayload,
      MPayload
    >({ ...of<ReqPayload, ResPayload, MPayload>() });
    const messages = [] as M<
      keyof MPayload,
      ReqPayload,
      ResPayload,
      MPayload
    >[];
    let resolve: (
      v: M<keyof MPayload, ReqPayload, ResPayload, MPayload>[],
    ) => void;

    const add: (ev: Event) => void = (ev: Event) => {
      const event: CustomEvent = ev as CustomEvent;
      const message: M<keyof MPayload, ReqPayload, ResPayload, MPayload> =
        event.detail;
      messages.push(message);
    };

    setTimeout(() => {
      destinations.forEach((destination) => {
        removeEventListener(destination, add);
      });
      resolve(messages);
    }, 1000);

    destinations.forEach((destination) => {
      addEventListener(destination, add);
    });

    messenger.send(message.type, message.payload, message.destination, message.source);

    return new Promise<M<keyof MPayload, ReqPayload, ResPayload, MPayload>[]>((
      r,
    ) => resolve = r);
  };
}
