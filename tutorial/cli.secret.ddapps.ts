import { Command } from "cliffy";
import { ESOpType, ISMPayload } from "./secret.ddapps.ts";
import { ISResponsePayload } from "./secret.ddapps.ts";
import { ISRequestPayload } from "./secret.ddapps.ts";
import { ddappsctl } from "ddapps/cli.ts";
import { Client } from "ddapps/client.ts";

class SClient extends Client<ISRequestPayload, ISResponsePayload, ISMPayload> {
  public sset(secret: string) {
    return this.send(ESOpType.SetSecret, secret);
  }

  public sget() {
    return this.send(ESOpType.GetSecret, null);
  }
}

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

const sctl = ddappsctl
  .description("Manage the secret")
  .command("sset", sset)
  .command("sget", sget)

await sctl.parse(Deno.args);