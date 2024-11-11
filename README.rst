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
