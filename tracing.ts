import { Client } from "./src/client.ts";

const pclients = [...Array(1).keys()].map((_) => {
  return new Client().co.then((client) => {
    client.keepalive()
    return client
  })
})

Promise.all(pclients)
  .then((clients) => {
    const ppings = clients.map((client) => [...Array(2).keys()].map((_) => client.monget("/ddapps/node/version/" + Math.random().toString(36).substring(2))))
    return Promise.all(ppings.flat()).then((_) => clients.forEach((client) => client.disconnect()))
  })
