export const str = `
import { Command } from "<%= it.CliffyImport %>";
import { ddappsctl } from "ddapps/cli/cli.ts";
import { EOpType } from "ddapps/operation.ts";
import { <%= it.Prefix %>Client } from "../src/client.ddapps.ts";

const <%= it.PrefixLower %>get = new Command()
  .description("Get the value")
  .version("0.2.0")
  .action(async ({ address, port, trace }: { address: string; port: number; trace: boolean; }) => {

    let trc = "";

    await new <%= it.Prefix %>Client(address, port, trace).co
      .then((ops) => {

        if (trace) {
          ops.listen(EOpType.Trace, (message) => {
            trc += message.payload.payload + " -> "
            console.clear();
            console.log("[Trace]", trc)
          })
        }

        return ops.<%= it.PrefixLower %>get();
      }).then(response => {

        if (trace) {
          console.clear();
          console.log("[Trace]", trc + "Client")
        }

        console.dir(response);
        Deno.exit(0);
      }).catch((err) => {
        console.error(err);
        Deno.exit(1);
      });
  });

const <%= it.PrefixLower %>set = new Command()
  .description("Set the value")
  .version("0.2.0")
  .option("-v, --value <value:number>", "Value to set")
  .action(async ({ address, port, value, trace }: {
    address: string;
    port: number;
    value: number;
    trace: boolean;
  }) => {

    let trc = "";

    await new <%= it.Prefix %>Client(address, port, trace).co
      .then((ops) => {

        if (trace) {
          ops.listen(EOpType.Trace, (message) => {
            trc += message.payload.payload + " -> "
            console.clear();
            console.log("[Trace]", trc)
          })
        }

        return ops.<%= it.PrefixLower %>set(value);
      }).then(response => {

        if (trace) {
          console.clear();
          console.log("[Trace]", trc + "Client")
        }

        console.dir(response);
        Deno.exit(0);
      }).catch((err) => {
        console.error(err);
        Deno.exit(1);
      });
  });

await ddappsctl
  .command("get", <%= it.PrefixLower %>get)
  .command("set", <%= it.PrefixLower %>set)
  .parse(Deno.args);
`