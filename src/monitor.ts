import { Messenger } from "./messenger.ts";
import { IMonOp, IState } from "./interface.ts";
import { EComponent, EMonOpType } from "./enumeration.ts";
import { EMType, IMPayload } from "./messages.ts";
import {
  EOpType,
  IClientResponse,
  IRequestPayload,
  IResponsePayload,
} from "./operation.ts";
import { DDAPPS } from "./ddapps.ts";
import { Client } from "./client.ts";
import { M } from "./type.ts";

export class Monitor<
  ReqPayload extends IRequestPayload = IRequestPayload,
  ResPayload extends IResponsePayload = IResponsePayload,
  MPayload extends IMPayload<ReqPayload, ResPayload> = IMPayload<
    ReqPayload,
    ResPayload
  >,
  S extends IState<ReqPayload, ResPayload, MPayload> = IState<
    ReqPayload,
    ResPayload,
    MPayload
  >,
  > extends Messenger<ReqPayload, ResPayload, MPayload, S> {
  protected static readonly MON_WATCH_INTERVAL = 1000;

  private get(key: string) {
    if (key.startsWith("/deno/")) {
      const [_, __, metric] = key.split("/");
      const full = {
        ...JSON.parse(DDAPPS.JSONStr({...Deno.metrics(), ops: undefined})),
        ...JSON.parse(DDAPPS.JSONStr(Deno.systemMemoryInfo())),
        loadavg: Deno.loadavg(),
        hostname: Deno.hostname(),
        memory: Deno.memoryUsage()
      }
      return metric
        ? full[metric] || "NoSuchMetric::" + metric
        : full;
    } else if (key.startsWith("/ddapps/node/state/")) {
      const path = key.substring("/ddapps/node/state/".length);
      const keys = path.split("/");
      // deno-lint-ignore no-explicit-any
      let payload: any = this.state;
      for (const key of keys) {
        if (Object.keys(payload).includes(key)) {
          payload = payload[key];
        } else {
          return "NoSuchKey::" + key;
        }
      }
      return payload;
    } else if (key.startsWith("/ddapps/node/version")) {
      return DDAPPS.PRODUCT;
    } else {
      return "NoSuchKey::" + key;
    }
  }

  private set(key: string, value: string | number | { [key: string]: unknown }) {
    let v: string | number | boolean | { [key: string]: unknown };

    if (value === "true") v = true;
    else if (value === "false") v = false;
    else if (isNaN(parseFloat(value.toString()))) v = value;
    else v = parseFloat(value.toString());

    if (key.startsWith("/deno/") || key.startsWith("/ddapps/node/version")) {
      return "ReadOnlyKey::" + key;
    } else if (key.startsWith("/ddapps/node/state/")) {
      const path = key.substring("/ddapps/node/state/".length);
      const keys = path.split("/");
      // deno-lint-ignore no-explicit-any
      let payload: any = this.state;
      keys.forEach((key, index) => {
        if (Object.keys(payload).includes(key) && index < keys.length - 1) {
          payload = payload[key];
        } else if (index === keys.length - 1) {
          payload[key] = v;
        } else {
          return "NoSuchKey::" + key;
        }
      })
      payload = v;
      return payload;
    } else {
      return "NoSuchKey::" + key;
    }
  }

  protected [EMType.LogMessage]() {
    this.state.mon.stats.debugger++;
  }

  protected [EMType.MonGetRequest](message: M<EMType.MonGetRequest>) {
    const payload = message.payload as IMonOp;
    if (
      /^\/ddapps\/node\/(?:[0-9]{1,3}\.){3}[0-9]{1,3}\//.test(
        payload.metric.key,
      )
    ) {
      const [_, __, ___, ip, ____] = payload.metric.key.split("/");
      const peer = this.peers.find((peer) => peer.hostname.startsWith(ip));
      if (peer) {
        new Client(peer.ip, 8080).co
          .then((ops) => {
            ops.monget(payload.metric.key.replace("/" + ip, ""))
              .then((response) => {
                this.response(EOpType.MonOp, {
                  op: EMonOpType.Get,
                  metric: {
                    key: (response.payload.payload as IMonOp).metric.key,
                    value: (response.payload.payload as IMonOp).metric.value,
                  }
                });
              })
          })
      } else if (ip === Deno.env.get("DDAPPS_NODE_IP")) {
        this.send(EMType.MonGetRequest, {
          ...message.payload,
          metric: {
            ...message.payload.metric,
            key: payload.metric.key.replace("/" + ip, ""),
          },
        }, EComponent.Monitor);
      } else {
        this.response(EOpType.MonOp, {
          op: payload.op,
          metric: {
            key: payload.metric.key,
            value: `Monitor::MonGetRequest::Error::InvalidPeer::${ip}::Available::${[...this.peers.keys()].join(":")}`,
          },
        });
      }
    } else if (payload.metric.key.startsWith("/ddapps/cluster/")) {

      const key = message.payload.metric.key.replace('/cluster/', '/node/');
      const requests = { [Deno.env.get("DDAPPS_NODE_IP") || "Monitor"]: this.get(key) };
      const promises: Promise<void>[] = [];

      this.peers.forEach((peer) => {
        let r: () => void;
        promises.push(new Promise((resolve) => r = resolve))
        new Client(peer.ip, 8080).co
          .then((ops) => {
            ops.monget(message.payload.metric.key.replace('/cluster/', '/node/'))
              .then((response) => {
                requests[peer.ip] = (response.payload.payload as IMonOp).metric.value
                r();
              })
          })
      })

      Promise.all(promises).then(() => {
        this.response(EOpType.MonOp, {
          op: message.payload.op,
          metric: {
            key: message.payload.metric.key,
            value: requests
          }
        })
      })


    } else {
      this.response(EOpType.MonOp, {
        op: payload.op,
        metric: {
          key: payload.metric.key,
          value: this.get(payload.metric.key),
        },
      });
    }
  }

  protected [EMType.MonSetRequest](message: M<EMType.MonSetRequest>) {
    const payload = message.payload as IMonOp;
    if (
      /^\/ddapps\/node\/(?:[0-9]{1,3}\.){3}[0-9]{1,3}\//.test(
        payload.metric.key,
      )
    ) {
      const [_, __, ___, ip, ____] = payload.metric.key.split("/");
      const peer = this.peers.find((peer) => peer.hostname.startsWith(ip))
      if (peer) {
        new Client(peer.ip, 8080).co
          .then((ops) => {
            ops.monset(payload.metric.key.replace("/" + ip, ""), payload.metric.value as string)
              .then((response) => this.response(EOpType.MonOp, response.payload.payload as IMonOp))
          })
      } else if (ip === Deno.env.get("DDAPPS_NODE_IP")) {
        this.send(EMType.MonSetRequest, {
          ...message.payload,
          metric: {
            ...message.payload.metric,
            key: payload.metric.key.replace("/" + ip, ""),
          },
        }, EComponent.Monitor);
      } else {
        this.response(EOpType.MonOp, {
          op: payload.op,
          metric: {
            key: payload.metric.key,
            value: "Monitor::MonSetRequest::NoSuchPeer::" + ip,
          },
        })
      }
    } else {
      this.response(EOpType.MonOp, {
        op: payload.op,
        metric: {
          key: payload.metric.key,
          value: payload.metric.value ? this.set(payload.metric.key, payload.metric.value) : "Monitor::MonSetRequest::MissingValueForKey::" + payload.metric.key,
        },
      });
    }
  }

  protected [EMType.MonWatchRequest](message: M<EMType.MonWatchRequest>) {
    const key = message.payload.key;
    const watcher = this.state.mon.trace[this.context as string].token;
    if (key.startsWith("/ddapps/node/logs")) {
      this.state.mon.loggers.push(watcher);
    } else {
      this.state.mon.watchers[watcher] = {
        expire: message.payload.expire,
        interval: setInterval(() => {
          const expire = this.state.mon.watchers[watcher].expire;
          if (expire === 1) {
            clearInterval(this.state.mon.watchers[watcher].interval);
            this.send(EMType.ClientResponse, {
              token: watcher,
              type: EOpType.MonWatch,
              payload: {
                key: key,
                value: this.get(key),
              },
            } as IClientResponse<ResPayload, EOpType.MonWatch>, this.state.net.requests[watcher]);
          } else {
            // expire is set but not finished
            if (expire > 1) this.state.mon.watchers[watcher].expire--;

            // set or not finished, send notification
            this.send(EMType.ClientNotification, {
              token: watcher,
              type: EOpType.MonWatch,
              payload: {
                key: key,
                value: this.get(key),
              },
            } as IClientResponse<ResPayload, EOpType.MonWatch>, this.state.net.requests[watcher]);
          }
        }, Monitor.MON_WATCH_INTERVAL)
      };
    }
  }
}
