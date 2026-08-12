FROM ghcr.io/actions/actions-runner:latest

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        curl \
        git \
        jq \
        sudo \
        tree \
        wget \
        docker.io \
    && rm -rf /var/lib/apt/lists/* \
    && usermod -aG docker runner \
    && echo 'runner ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/runner \
    && chmod 0440 /etc/sudoers.d/runner

USER runner
ENV HOME=/home/runner
ENV RUNNER_ALLOW_RUNASROOT=1

WORKDIR /home/runner
