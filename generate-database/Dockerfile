FROM ghcr.io/prefix-dev/pixi:0.39.4 AS pixi
# copy the source code and pixi.toml to the container
COPY . /env
WORKDIR /env
# run the `install` command. This will install the dependencies into `/env/.pixi`
RUN pixi install
# create the shell-hook bash script to activate the environment
RUN pixi shell-hook > /shell-hook.sh
# extend the shell-hook script to run the command passed to the container
RUN echo 'exec "$@"' >> /shell-hook.sh

FROM debian:12-slim AS production
WORKDIR /app
COPY --from=pixi /env/.pixi/envs/default /env/.pixi/envs/default
COPY --from=pixi /shell-hook.sh /shell-hook.sh
# set the entrypoint to the shell-hook script (activate the environment and run the command)
ENTRYPOINT ["/bin/bash", "/shell-hook.sh"]
