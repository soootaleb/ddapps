import { ISMPayload, ISRequestPayload, ISResponsePayload, ISState, SApi, SecretManager } from "./secret.ddapps.ts";
import { DDAPPS } from "ddapps/ddapps.ts";
import { of } from "ddapps/state.ts";

const state: ISState = {
  ...of(), // Inherit base state properties
  secret: ""
}

new DDAPPS<
  ISRequestPayload, ISResponsePayload, ISMPayload, ISState
>()
  .use(SApi)
  .use(SecretManager)
  .run(state);