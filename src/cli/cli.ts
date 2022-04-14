import { Command } from "cliffy";
import { Client } from "../client.ts";
import { DDAPPS } from "../ddapps.ts";
import { EOpType } from "../operation.ts";
import { init } from "./init.ts";

const ping = new Command()
  .description("Ping the cluster")
  .action(async ({ address, port, trace }: { address: string; port: number, trace: boolean }) => {

    let trc = "";

    await new Client(address, port, trace).co
      .then((ops) => {

        if (trace) {
          ops.listen(EOpType.Trace, (message) => {
            trc += message.payload.payload + " -> "
            console.clear();
            console.log("[Trace]", trc)
          })
        }

        return ops.ping();
      }).then((response) => {

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

const get = new Command()
  .description("Get a key's value")
  .option("-k, --key <key:string>", "The key to retrieve")
  .action(async ({ address, port, key, trace }: {
    address: string;
    port: number;
    key: string;
    trace: boolean;
  }) => {

    let trc = "";

    await new Client(address, port, trace).co
      .then((ops) => {


        if (trace) {
          ops.listen(EOpType.Trace, (message) => {
            trc += message.payload.payload + " -> "
            console.clear();
            console.log("[Trace]", trc)
          })
        }

        return ops.monget(key);
      }).then((response) => {

        if (trace) {
          console.clear();
          console.log("[Trace]", trc + "Client")
        }

        console.dir(response, { depth: 10 });
        Deno.exit(0);
      }).catch((err) => {
        console.error(err);
        Deno.exit(1);
      });
  });

const set = new Command()
  .description("Set a key's value")
  .option("-k, --key <key:string>", "The key to set")
  .option("-v, --value <key:string>", "The value to assign")
  .action(async ({ address, port, key, value, trace }: {
    address: string;
    port: number;
    key: string;
    value: string;
    trace: boolean
  }) => {

    let trc = "";

    await new Client(address, port, trace).co
      .then((ops) => {

        if (trace) {
          ops.listen(EOpType.Trace, (message) => {
            trc += message.payload.payload + " -> "
            console.clear();
            console.log("[Trace]", trc)
          })
        }

        return ops.monset(key, value);
      }).then((response) => {

        if (trace) {
          console.clear();
          console.log("[Trace]", trc + "Client")
        }

        console.dir(response, { depth: 10 });
        Deno.exit(0);
      }).catch((err) => {
        console.error(err);
        Deno.exit(1);
      });
  });

const watch = new Command()
  .description("Watch a key's changes")
  .option("-k, --key <key:string>", "The key to watch")
  .option("-e, --expire <expire:number>", "The key to watch", { default: -1 })
  .action(async ({ address, port, key, expire, trace }: {
    address: string;
    port: number;
    key: string;
    expire: number;
    trace: boolean
  }) => {

    let trc = "";

    await new Client(address, port, trace).co
      .then((ops) => {

        if (trace) {
          ops.listen(EOpType.Trace, (message) => {
            trc += message.payload.payload + " -> "
            console.clear();
            console.log("[Trace]", trc)
          })
        }

        ops.listen(EOpType.MonWatch, (notification) => {
          const payload = notification.payload.payload as {
            key: string,
            value: string | number
          }
          console.log(payload.value)
        })

        return ops.monwatch(key, expire);
      }).then((response) => {

        if (trace) {
          console.clear();
          console.log("[Trace]", trc + "Client")
        }

        const payload = response.payload.payload as {
          key: string,
          value: string | number
        }
        console.log(payload.value);
        Deno.exit(0);
      }).catch((message) => {
        console.error(message);
        Deno.exit(1);
      });
  });

const any = new Command()
  .description("Whatever you want")
  .option("-d, --data <key:string>", "The payload data")
  .action(async ({ address, port, data, trace }: {
    address: string;
    port: number;
    data: unknown;
    trace: boolean
  }) => {

    let trc = "";

    await new Client(address, port, trace).co
      .then((ops) => {

        if (trace) {
          ops.listen(EOpType.Trace, (message) => {
            trc += message.payload.payload + " -> "
            console.clear();
            console.log("[Trace]", trc)
          })
        }

        return ops.any(data);
      }).then((response) => {

        if (trace) {
          console.clear();
          console.log("[Trace]", trc + "Client")
        }

        console.dir(response, { depth: 10 });
        Deno.exit(0);
      }).catch((err) => {
        console.error(err);
        Deno.exit(1);
      });
  });

const crash = new Command()
  .description("Kill the node")
  .action(async ({ address, port, trace }: {
    address: string;
    port: number;
    trace: boolean
  }) => {
    
    let trc = "";

    await new Client(address, port, trace).co
      .then((ops) => {

        if (trace) {
          ops.listen(EOpType.Trace, (message) => {
            trc += message.payload.payload + " -> "
            console.clear();
            console.log("[Trace]", trc)
          })
        }
        
        return ops.crash();
      }).then((response) => {

        if (trace) {
          console.clear();
          console.log("[Trace]", trc + "Client")
        }
        
        console.dir(response, { depth: 10 });
        Deno.exit(0);
      }).catch((err) => {
        console.error(err);
        Deno.exit(1);
      });
  });


const mon = new Command()
  .description("Monitor the cluster")
  .command("get", get)
  .command("set", set)
  .command("watch", watch);

export const ddappsctl = new Command()
  .name("ddappsctl")
  .version(DDAPPS.PRODUCT.ddapps)
  .description("Interact with ddapps")
  .option("-a, --address <addr:string>", "HTTP endpoint", { default: "localhost", global: true })
  .option("-p, --port <port:number>", "HTTP port", { default: 8080, global: true })
  .option("-t, --trace [trace:boolean]", "Activate tracing", { default: false, global: true })
  .command("ping", ping)
  .command("mon", mon)
  .command("any", any)
  .command("crash", crash)
  .command("init", init)