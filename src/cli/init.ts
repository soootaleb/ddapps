import { render, configure } from "eta";
import { Command } from "cliffy";
import { DDAPPS } from "../ddapps.ts";
import { str as appTpl } from "./templates/app.ddapps.ts"
import { str as apiTpl } from "./templates/api.ddapps.ts"
import { str as peerTpl } from "./templates/peer.ddapps.ts"
import { str as typerTpl } from "./templates/type.ddapps.ts"
import { str as stateTpl } from "./templates/state.ddapps.ts"
import { str as interfTpl } from "./templates/interface.ddapps.ts"
import { str as cliTpl } from "./templates/cli.ddapps.ts"
import { str as clientTpl } from "./templates/client.ddapps.ts"
import { str as messagesTpl } from "./templates/messages.ddapps.ts"
import { str as operationsTpl } from "./templates/operations.ddapps.ts"
import { str as denoJsonTpl } from "./templates/deno.json.ts"
import { str as importMapTpl } from "./templates/import_map.json.ts"
import { str as gitignoreTpl } from "./templates/gitignore.ts"

configure({ views: `${Deno.cwd()}/src/cli/templates/` })

export const init = new Command()
  .description("Initialize repo for a ddapps application")
  .option("-n, --name <name:string>", "Application name")
  .option("-d, --ddapps <ddapps:string>", "DDAPPS version to use", { default: DDAPPS.PRODUCT.ddapps })
  .action(async ({ name, ddapps }: {
    name: string;
    ddapps: string
  }) => {

    try {
      console.log(`DDAPPSS::Init::Name::${name}`)
      Deno.mkdirSync(name);
      Deno.mkdirSync(`${name}/src`);
      Deno.mkdirSync(`${name}/cli`);
    } catch (error) {
      console.error(`DDAPPSS::Init::Error::${name}::${error}`)
      Deno.exit(1)
    }

    const AppName = name;
    const CCAppName = AppName.split("-").map((words) => words[0].toUpperCase() + words.substring(1)).join("")
    const Prefix = AppName.split("-").map((words) => words[0].toUpperCase()).join("")
    
    const vars = {
      Prefix: Prefix,
      PrefixLower: Prefix.toLowerCase(),
      AppName: AppName,
      CCAppName: CCAppName,
      DDAPPSVersion: ddapps,
      DDAPPSImport: ddapps === "local" ? "../src/" : `https://deno.land/x/ddapps@${ddapps}/`,
      CliffyImport: `https://deno.land/x/cliffy@v0.19.5/command/mod.ts`
    }

    const app = await render(appTpl, vars)
    const api = await render(apiTpl, vars)
    const peer = await render(peerTpl, vars)
    const typer = await render(typerTpl, vars)
    const state = await render(stateTpl, vars)
    const interf = await render(interfTpl, vars)
    const cli = await render(cliTpl, vars)
    const client = await render(clientTpl, vars)
    const messages = await render(messagesTpl, vars)
    const operations = await render(operationsTpl, vars)
    const importMap = await render(importMapTpl, vars)
    const deno = await render(denoJsonTpl, vars)
    const gitignore = await render(gitignoreTpl, vars)
    
    const encoder = new TextEncoder();

    if (app && api && messages && operations && state && interf && peer && typer && client && cli && importMap && deno && gitignore) {
      await Deno.writeFile(`${Deno.cwd()}/${name}/${name}.ddapps.ts`, encoder.encode(app));
      await Deno.writeFile(`${Deno.cwd()}/${name}/src/api.ddapps.ts`, encoder.encode(api));
      await Deno.writeFile(`${Deno.cwd()}/${name}/src/type.ddapps.ts`, encoder.encode(typer));
      await Deno.writeFile(`${Deno.cwd()}/${name}/src/peer.ddapps.ts`, encoder.encode(peer));
      await Deno.writeFile(`${Deno.cwd()}/${name}/src/messages.ddapps.ts`, encoder.encode(messages));
      await Deno.writeFile(`${Deno.cwd()}/${name}/src/state.ddapps.ts`, encoder.encode(state));
      await Deno.writeFile(`${Deno.cwd()}/${name}/src/interface.ddapps.ts`, encoder.encode(interf));
      await Deno.writeFile(`${Deno.cwd()}/${name}/src/operations.ddapps.ts`, encoder.encode(operations));
      await Deno.writeFile(`${Deno.cwd()}/${name}/src/client.ddapps.ts`, encoder.encode(client));
      await Deno.writeFile(`${Deno.cwd()}/${name}/cli/cli.ddapps.ts`, encoder.encode(cli));
      await Deno.writeFile(`${Deno.cwd()}/${name}/import_map.json`, encoder.encode(importMap));
      await Deno.writeFile(`${Deno.cwd()}/${name}/deno.json`, encoder.encode(deno));
      await Deno.writeFile(`${Deno.cwd()}/${name}/.gitignore`, encoder.encode(gitignore));
    }
  })