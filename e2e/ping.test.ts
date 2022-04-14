import { assertEquals } from "std/testing/asserts.ts";
import { parse } from "std/flags/mod.ts";
import { Client } from "../src/client.ts";
import { EOpType } from "../src/operation.ts";

const ARGS = parse(Deno.args);

// Params parsing
const addr: string = typeof ARGS["a"] === "string" ? ARGS["a"] : "127.0.0.1";
const port: number = typeof ARGS["p"] === "number" ? ARGS["p"] : 8080;

Deno.test("E2E::Ping", async () => {
  const ops = await new Client(addr, port).co;
  const response = await ops.ping();

  assertEquals(response.source, addr);
  assertEquals(response.destination, "Client");
  assertEquals(response.payload.type, EOpType.Pong);
});
