export const str = `
{
  "importMap": "import_map.json",
  "tasks": {
    "start": "deno run -A --unstable <%= it.AppName %>.ddapps.ts --console-messages --debug",
    "cli": "deno run -A --unstable cli/cli.ddapps.ts",
    "compile": "deno task compile-cli && deno task compile-<%= it.AppName %>",
    "compile-cli": "deno compile --allow-all --unstable --output <%= it.PrefixLower %>ctl --import-map=import_map.json cli/cli.ddapps.ts",
    "compile-<%= it.AppName %>": "deno compile --allow-all --unstable --output <%= it.PrefixLower %> --import-map=import_map.json <%= it.AppName %>.ddapps.ts"
  },
  "fmt": {
    "options": {
      "lineWidth": 180
    }
  }
}
`