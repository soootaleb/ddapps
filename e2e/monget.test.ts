import { assertEquals } from "std/testing/asserts.ts";
import { parse } from "std/flags/mod.ts";
import { Client } from "../src/client.ts";
import { EOpType } from "../src/operation.ts";
import { EMonOpType } from "../src/enumeration.ts";
import { DDAPPS } from "../src/ddapps.ts";
import { IMonOp } from "../src/interface.ts";

const ARGS = parse(Deno.args);

// Params parsing
const addr: string = typeof ARGS["a"] === "string" ? ARGS["a"] : "127.0.0.1";
const port: number = typeof ARGS["p"] === "number" ? ARGS["p"] : 8080;

Deno.test("E2E::Mon::Get", async () => {
  const ops = await new Client(addr, port).co;
  const response = await ops.monop(EMonOpType.Get, "/ddapps/node/version");

  const payload = response.payload.payload as unknown as IMonOp<{ ddapps: string }>

  assertEquals(response.source, addr);
  assertEquals(response.destination, "Client");
  assertEquals(response.payload.type, EOpType.MonOp);
  assertEquals(payload.metric.value?.ddapps, DDAPPS.PRODUCT.ddapps);
});