.. raw:: html

   <div align="center">
   <a href="https://github.com/showyourwork/showyourwork">
   <img src="https://raw.githubusercontent.com/rodluger/showyourwork/img/showyourwork.png" width="450px">
   </img>
   </a>
   <br/>
   </div>
   <br/>

The **showyourwork-action** runs on `GitHub Actions <https://github.com/features/actions>`_ to automatically build a `showyourwork <https://github.com/showyourwork/showyourwork>`_ article on the cloud every time changes are pushed to the remote repository. Under the hood, this action installs ``conda`` and ``showyourwork``, then runs the workflow to generate the article PDF, which it uploads to a separate branch on the remote. Importantly, everything is cached and all timestamps are preserved across builds, so this action will only re-run things that explicitly depend on the files that changed since the last time it ran.

This action is typically called in the workflow files ``.github/workflows/build.yml`` and ``.github/workflows/build-pull-request.yml`` of a `showyourwork <https://github.com/showyourwork/showyourwork>`_ article repository. For more information on GitHub Actions workflow files, see `here <https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions>`_.

Self-hosted runners
-------------------

.. important:: 

   Using self-hosted runners in public repositories is not recommended.
   Forks of your public repository can potentially run dangerous code on your self-hosted runner by creating a pull request.
   Setup your repository settings accordingly to limit who can fork, create PRs and the use of your self-hosted runner to trusted users only.

.. note::

   This is a very first approach to running the **showyourwork-action** on a self-hosted runner. 
   It is not yet fully tested, and there may be some rough edges.
   Maybe there is even an easier way to do this that we haven't thought of yet...
   If you run into issues, please open an issue on `showyourwork-action <https://github.com/showyourwork/showyourwork-action/issues>`_.

The action can also run on a self-hosted runner.
This is useful when the build needs:

- access to a specific machine or private network,
- more computing power or time limits than what is available on GitHub-hosted runners,
- an existing conda installation that is not available on GitHub-hosted runners.

Using Docker
^^^^^^^^^^^^

This is the recommended way if you have access to a Docker installation on the machine you
want to use as it provides a true isolated environment for the runner, the conda installation
and the build output.

This section describes how to setup your own self-hosted runner using Docker after you created your project with _showyourwork_.
The choice of Docker is for keeping the runner isolated from the rest of the host system.

.. note::

   Other containerization solutions might also work, but we have not tested them yet.

After you created a project with showyourwork, you can set up a self-hosted runner as follows:

1. Install `Docker <https://www.docker.com/products/docker-desktop/>`_ on the machine that will host the runner.
   Make sure the Docker daemon is running and that your user can access it.

   .. code-block:: bash

      docker --version
      docker info

2. Build a runner image from the included ``docker/runner.Dockerfile``.

   .. code-block:: bash

      git clone https://github.com/showyourwork/showyourwork-action.git
      cd showyourwork-action
      docker build -f docker/runner.Dockerfile -t local-github-runner .

3. Start the creation of the new self-hosted runner from the GitHub UI of your repository under ``Settings -> Actions -> Runners``,
   but do not proceed with the registration yet. Instead, copy the command that GitHub provides to register the runner, 
   which will look something like this:

   .. code-block:: bash

      ./config.sh --url https://github.com/$YOUR_USERNAME/$REPO --token <RUNNER_TOKEN>

4. Start a persistent runner container so it remains associated with the GitHub runner registration.

   The recommended flow is to start the container in detached mode and register it once.
   The first part of the configuration command is the one you get from the step above.
   Use the token for this repository and then let the runner keep running in the background.

   .. code-block:: bash

      docker run -d --name github-runner \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v "$PWD":/home/runner/work \
        -w /home/runner/work \
        --entrypoint bash \
        local-github-runner -c 'cd /home/runner && ./config.sh --url https://github.com/$YOUR_USERNAME/$REPO --token <RUNNER_TOKEN> --name local-docker-runner --labels self-hosted,linux,arm64 --unattended && ./run.sh'

  .. note::

     Replace ``arm64`` with the architecture of your runner if it differs (for example, ``x64`` on an x86_64 machine).

   If you need to inspect the container interactively after it has already been configured, you can connect to it later with:

   .. code-block:: bash

      docker exec -it github-runner bash

   or by using the Docker Desktop application.

   

   If you prefer to configure the runner interactively before starting it, do so in a temporary container, but keep the long-lived runner itself as a detached container that is not removed automatically.

5. In the workflow file for the sample project, set ``runs-on: [self-hosted, linux, x64]`` (or the labels you configured when registering the runner). This is the key step that selects the self-hosted machine for the build.

   .. code-block:: yaml

      name: build

      on:
        push:
        pull_request:

      jobs:
        build:
          runs-on: [self-hosted, linux, x64]
          steps:
            - uses: actions/checkout@v4
            - uses: showyourwork/showyourwork-action@main
              env:
                SANDBOX_TOKEN: ${{ secrets.SANDBOX_TOKEN }}
                OVERLEAF_TOKEN: ${{ secrets.OVERLEAF_TOKEN }}

6. If the runner host or container already contains conda at a non-standard location, provide that path with the ``conda-installation-path`` input so the action reuses it instead of trying to install a fresh copy in the default location.

   .. code-block:: yaml

      - uses: showyourwork/showyourwork-action@main
        with:
          conda-installation-path: /opt/conda

7. Push the workflow and then trigger the build. The GitHub runner will start inside the Docker container, fetch the repository, and execute the action on the self-hosted machine.

8. If the runner is hosted on a remote server rather than a local machine, SSH can be used to provision it and inspect the host, but the workflow still runs through the GitHub Actions runner itself. Docker remains useful on shared machines because it isolates each build from the rest of the host system.

For a real project, this setup can be reused directly on a dedicated self-hosted machine or on an SSH-accessible host. The important point is that the runner is still the GitHub Actions agent; Docker and SSH are only mechanisms for isolating or reaching the execution environment.

Use runner natively
^^^^^^^^^^^^^^^^^^^

This is the approach you can use if e.g. you cannot use Docker ir similar solutions or you can
but for some reason the image does not build or cannot be used properly.
It is assumed that the machine can connect to GitHub.

1. Go to your project repository under ``Settings -> Actions -> Runners`` and click on ``New self-hosted runner``.
2. Follow the instructions to download and configure the runner on your machine (in a path you control if it is a shared machine).
3. Create a new repository variable to store the path to your conda installation within the runner.
   For example if you installed the runner under /home/me/github_runners/my_runner create a new variable
   called ``CONDA_INSTALLATION_PATH`` with value ``/home/me/github_runners/my_runner/conda_installation``.
4. Update your project build workflow files to use this additional variable as input to the action. For example:

   .. code-block:: yaml

      - uses: showyourwork/showyourwork-action@main
        with:
          conda-installation-path: ${{ vars.CONDA_INSTALLATION_PATH }}

Please, remember that the labels under the `runs-on` key need to coincide with those you specify
when registering the runner.

Permissions
-----------

When setting up your GitHub repository, ensure that the GitHub Actions permissions for the ``GITHUB_TOKEN``
secret are set to ``permissive``. First, go to

.. raw:: html

    <pre>
    https://github.com/<span class="text-highlight">$USER/$REPO</span>/settings/actions
    </pre>

and change the permissions to ``permissive``:

.. image:: https://show-your.work/en/latest/_images/workflow_permissions.png
   :width: 60%
   :align: center

.. note::
  You can stay up-to-date with the latest changes to the **showyourwork-action** by
  looking at its `release notes <https://github.com/showyourwork/showyourwork-action/releases>`_.

Inputs
------

The **showyourwork-action** accepts any of the following inputs, all of which are optional. These are provided using the ``with:`` directive in the ``showyourwork`` step of the ``.yml`` file, one per line (see the example below).

:code:`article-cache-number`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Optional** The **showyourwork-action** caches everything in your repository to speed up future builds. Sometimes, however, it's useful to clear the cache, such as when something breaks. This can be done by incrementing this number, which tells the action which version of the cache to load. Default: :code:`0`. Note that you can disable article caching by setting this variable to `null` or to an empty value.

:code:`build-tarball`
~~~~~~~~~~~~~~~~~~~~~

**Optional** Build a tarball for easy ArXiV submission? This tarball contains the article PDF, the rendered figures, and all the input files needed to compile the manuscript using a standard LaTeX compiler. The tarball is then pushed to the same branch as the article output (see ``force-push`` below). Default :code:`true`.

:code:`conda-cache-number`
~~~~~~~~~~~~~~~~~~~~~~~~~~

**Optional** Bump this number to reset the :code:`conda` cache. The behavior is similar to that of ``article-cache-number`` above. Default: :code:`0`. Note that you can disable conda caching by setting this variable to `null` or to an empty value.

:code:`conda-installation-path`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Optional** Path to an existing conda installation to reuse on the runner. This is useful for self-hosted runners that already provide conda at a non-standard location. Default: :code:`~/.conda`.

:code:`github-token`
~~~~~~~~~~~~~~~~~~~~

**Optional** A token for access to GitHub (e.g. :code:`secrets.GITHUB_TOKEN`). Do not set this value explicitly -- always use a secret! Default: :code:`${{ github.token }}` (usually set automatically).

:code:`output-branch-suffix`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Optional** Force-push output to branch :code:`<current-branch>-<output-branch-suffix>`? For example, if you've pushed a commit to the ``main`` branch, this action will by default compile your paper and force-push the output (the paper PDF as well as the ArXiV tarball, if enabled) to the branch ``main-pdf``. The *force* in *force-push* means this is not a typical ``git`` commit, as it will overwrite everything on that branch. This way, your repository won't get bloated over time with tons of committed output history. Default: :code:`pdf`.

:code:`build-diff-on-pull-request`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Optional** Build the :code:`latexdiff` version of the article, in addition to the regular article? This will build a second PDF of the article, with all changes highlighted with respect to the base branch.

:code:`latexdiff-url`
~~~~~~~~~~~~~~~~~~~~~

**Optional** Specify the URL of the :code:`latexdiff` script to download. You may use this to set a custom version of :code:`latexdiff`.

:code:`latexdiff-options`
~~~~~~~~~~~~~~~~~~~~~~~~~

**Optional** Options passed to `latexdiff` to render diffs on pull requests. See https://ctan.org/pkg/latexdiff?lang=en for details. Default: :code:`-t CFONT`

:code:`latexpand-url`
~~~~~~~~~~~~~~~~~~~~~

**Optional** Specify the URL of the :code:`latexpand` script to download. You may use this to set a custom version of :code:`latexpand`.

:code:`showyourwork-spec`
~~~~~~~~~~~~~~~~~~~~~~~~~

**Optional** The version specification of :code:`showyourwork` to install using :code:`pip`. The code will be installed as :code:`pip install -U <showyourwork-spec>`. Default is :code:`showyourwork` (which resolves to the latest available version on PyPI).

Environment variables
---------------------

There are a few environment variables that may be needed on the ``showyourwork`` side. These include :code:`$SANDBOX_TOKEN` (a Zenodo Sandbox API token that can be used to authenticate when uploading or downloading files from Zenodo Sandbox deposits) and :code:`$OVERLEAF_TOKEN` (credentials for accessing and modifying an Overleaf project repository).
These should be provided through `Action secrets <https://docs.github.com/en/actions/security-guides/encrypted-secrets>`_ using the :code:`env:` directive (see the example below).

Concurrency
-----------

We recommend limiting the concurrency of **showyourwork-action** runs to one per branch. See `the docs <https://docs.github.com/en/actions/using-jobs/using-concurrency>`_ for details,
and check out the example below.

Pull requests
-------------

If the ``showyourwork-action`` has write privileges to the repository (which is the default behavior when an owner/maintainer of the repository pushes to the remote), it force-pushes the compiled article PDF to a separate branch on the remote (if the current branch is called ``main``, the output by default gets pushed to ``main-pdf``). However, this will not work on pull request builds if the person issuing the pull request is not an owner or maintainer of the repository. In this case, the ``$GITHUB_TOKEN`` for the build is given only *read* permissions to the repository to `prevent "pwn requests" <https://securitylab.github.com/research/github-actions-preventing-pwn-requests/>`__. While good for security reasons, this makes it difficult for the maintainer to actually see the article PDF resulting from the pull request.

To help with this, the ``showyourwork-action`` also uploads a zipped `build artifact <https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts>`__ containing the compiled PDF and the article tarball (if requested). Reviewers could manually download this artifact, unzip it, and locally inspect the PDF. But to make things easier, the ``showyourwork-action`` provides a second action, ``showyourwork-action/process-pull-request``, which runs whenever a pull request build completes. This action downloads the build artifact, unzips it, and pushes the PDF to a different branch (by default, ``pull-request-<NUMBER>-pdf``, where ``NUMBER`` is the number of the PR). It also posts a short comment in the pull request thread with a link to the PDF for quick viewing.

Typical ``showyourwork`` repositories therefore have *three* workflow files: ``build.yml``, which builds the article on simple push events (using ``showyourwork-action``), ``build-pull-request.yml``, which builds the article on pull request events (also using ``showyourwork-action``), and ``process-pull-request.yml``, which runs after the pull request build completes and uploads the PDF to a separate branch on the repository (using ``showyourwork-action/process-pull-request``).

One thing to keep in mind is that in addition to not having write access to the repository, pull request builds from external contributors do not have access to any of the repository secrets. This means that variables such as ``$SANDBOX_TOKEN``, ``$OVERLEAF_TOKEN`` will not be available to these builds. 

If your workflow takes advantage of Zenodo caching functionality and the config setting ``run_cache_rules_on_ci`` is set to ``False`` (the default), the PR build will fail if the required cache file has not been published on Zenodo or Zenodo Sandbox. To allow external contributors to access the Zenodo cache when submitting pull requests, we recommend you locally run ``showyourwork cache freeze``, which publishes the latest draft on Zenodo Sandbox --- the cached files can then be downloaded by an unauthenticated ``GET`` request. If, however, the pull request modified anything *upstream* of the cache, there will be no cache hit when the PR build is run, and the workflow will necessarily fail if ``run_cache_rules_on_ci`` is ``False``. In these cases, we recommend that either the issuer of the PR sets ``run_cache_rules_on_ci`` to ``True`` *or* the reviewer checks out the PR and tests it locally.

Finally, if your workflow is integrated with Overleaf, pull request builds will not be able to either pull from or push to the Overleaf project. A warning will be thrown, but the workflow will not fail.


Example usage
-------------

Below is a complete example of a ``.github/workflows/build.yml`` file.

.. code-block:: yaml

  name: build

  on:
    push:
    pull_request:

  jobs:
    build:
      runs-on: ubuntu-latest
      name: Build the article PDF
      concurrency: showyourwork-${{ github.ref }}
      steps:
        - name: Checkout
          uses: actions/checkout@v3
          with:
            fetch-depth: 0

        - name: Build the article PDF
          id: build
          uses: showyourwork/showyourwork-action@v1
          env:
            SANDBOX_TOKEN: ${{ secrets.SANDBOX_TOKEN }}
            OVERLEAF_TOKEN: ${{ secrets.OVERLEAF_TOKEN }}
