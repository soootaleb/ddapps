FROM ubuntu as builder

FROM scratch

COPY --from=builder /usr/lib/x86_64-linux-gnu/libnss_dns.so.2 /lib/
COPY --from=builder /usr/lib/x86_64-linux-gnu/libresolv.so.2 /lib/

COPY --from=builder /lib/x86_64-linux-gnu/libdl.so.2 /lib/
COPY --from=builder /lib/x86_64-linux-gnu/libstdc++.so.6 /lib/
COPY --from=builder /lib/x86_64-linux-gnu/libgcc_s.so.1 /lib/
COPY --from=builder /lib/x86_64-linux-gnu/librt.so.1 /lib/
COPY --from=builder /lib/x86_64-linux-gnu/libpthread.so.0 /lib/
COPY --from=builder /lib/x86_64-linux-gnu/libm.so.6 /lib/
COPY --from=builder /lib/x86_64-linux-gnu/libc.so.6 /lib/
COPY --from=builder /lib64/ld-linux-x86-64.so.2 /lib64/    

COPY ./ddapps /

EXPOSE 8080

ENTRYPOINT ["/ddapps"]

CMD ["-c", "deno.json", "--console-messages", "partial", "--debug"]