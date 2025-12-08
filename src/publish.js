// Imports
const core = require("@actions/core");
const shell = require("shelljs");
const { DefaultArtifactClient } = require('@actions/artifact')
const github = require("@actions/github");

// Exports
module.exports = { publishOutput };

/**
 * Publish the article output.
 *
 */
async function publishOutput() {
  // Infer the manuscript name
  const GITHUB_WORKSPACE = shell.env["GITHUB_WORKSPACE"];
  const config = require(`${GITHUB_WORKSPACE}/.showyourwork/config.json`);
  const output = [config["ms_pdf"]];

  // Include the arxiv tarball?
  if (core.getInput("build-tarball") == "true") {
    output.push("arxiv.tar.gz");
  }

  // Include the DAG?
  if (config["dag"]["render"]) {
    output.push("dag.pdf");
  }

  // If this is a PR, record some metadata
  const GITHUB_EVENT_NAME = shell.env["GITHUB_EVENT_NAME"];
  const OUTPUT_BRANCH_SUFFIX = core.getInput("output-branch-suffix");
  if (GITHUB_EVENT_NAME.includes("pull_request")) {
    const PR_NUMBER = github.context.payload.pull_request.number;

    // Build PDF diff
    if (core.getInput("build-diff-on-pull-request") == "true") {
      try {
        const LATEXDIFF_URL = core.getInput("latexdiff-url");
        const LATEXPAND_URL = core.getInput("latexpand-url");
        const LATEXDIFF_OPTS = core.getInput("latexdiff-options");
        const BASE_REF = github.context.payload.pull_request.base.sha;

        core.startGroup("Build article diff");
        shell.exec(`cp ${config["ms_pdf"]} .bkup.pdf`);

        // Download latexdiff and latexpand
        shell.exec(`wget ${LATEXDIFF_URL} && chmod +x latexdiff`);
        shell.exec(`wget ${LATEXPAND_URL} && chmod +x latexpand`);

        // Install perl and texlive packages:
        shell.exec(
          `sudo apt-get update -y && sudo apt-get install -y libalgorithm-diff-perl texlive-base`
        );

        // Checkout base version of ms.tex
        shell.exec(
          `./latexpand src/tex/${config["ms_name"]}.tex -o .flat_new.tex`
        );
        shell.exec(`git checkout ${BASE_REF} src/tex`);
        shell.exec(
          `./latexpand src/tex/${config["ms_name"]}.tex -o .flat_old.tex`
        );

        // Compute diff, and build
        shell.exec(
          `./latexdiff ${LATEXDIFF_OPTS} .flat_old.tex .flat_new.tex > tmp.tex`
        );
        // Patch for aastex to force exiting vertical mode before trying to render strikeout text.
        // If the first character of any paragraph or section is deleted, the diff will _not_
        // compile because the strikeout (\sout) command fails in vertical mode.
        shell.exec(
          `sed -i 's/\\\\RequirePackage\\[normalem\\]{ulem}/\\\\RequirePackage\\[normalem\\]{ulem} \\\\let\\\\oldsout\\\\sout \\\\renewcommand\\\\sout\\[1\\]{\\\\leavevmode\\\\oldsout{#1}}/' tmp.tex`
        );
        shell.exec(`mv tmp.tex src/tex/${config["ms_name"]}.tex`);
        shell.exec(`showyourwork build`);
        shell.exec(`cp ${config["ms_pdf"]} diff.pdf`);
        shell.exec(`cp .bkup.pdf ${config["ms_pdf"]}`);
        output.push("diff.pdf");
        core.endGroup();
      } catch (error) {
        // Raise warning, but don't fail the action
        shell.echo(`::warning ::Failed to generate diff with ${error.message}`);
      }
    }

    output.forEach(function (file) {
      shell.exec(`echo ${file} >> output.txt`);
    });
    output.push("output.txt");
    shell.exec(`echo ${PR_NUMBER} > pr_number.txt`);
    output.push("pr_number.txt");
    shell.exec(`echo ${config["ms_pdf"]} > article_pdf.txt`);
    output.push("article_pdf.txt");
    shell.exec(`echo ${OUTPUT_BRANCH_SUFFIX} > branch_suffix.txt`);
    output.push("branch_suffix.txt");
  }

  // Upload an artifact
  core.startGroup("Uploading output");
  const artifactClient = new DefaultArtifactClient()
  const { id, size } = await artifactClient.uploadArtifact("showyourwork-output", output, ".", {
    continueOnError: false,
  });
  console.log(`Created artifact with id: ${id} (bytes: ${size}`)

  // Force-push output to a separate branch
  if (!GITHUB_EVENT_NAME.includes("pull_request")) {
    const GITHUB_SLUG = shell.env["GITHUB_REPOSITORY"];
    const GITHUB_REF = shell.env["GITHUB_REF"];
    const GITHUB_TOKEN = core.getInput("github-token");
    const GITHUB_BRANCH = GITHUB_REF.split("/")[2];
    const TARGET_DIRECTORY = shell
      .exec("mktemp -d")
      .replace(/(\r\n|\n|\r)/gm, "");
    const TARGET_BRANCH = `${GITHUB_BRANCH}-${OUTPUT_BRANCH_SUFFIX}`;
    shell.cp("-R", ".", `${TARGET_DIRECTORY}`);
    shell.cd(`${TARGET_DIRECTORY}`);
    shell.exec(`git checkout --orphan ${TARGET_BRANCH}`);
    shell.exec("git rm --cached -rf .", { silent: true });
    for (const out of output) {
      shell.exec(`git add -f ${out}`);
    }
    shell.exec(
      "git -c user.name='showyourwork' -c user.email='showyourwork' " +
      "commit -m 'force-push article output'"
    );
    shell.exec(
      "git push --force " +
      `https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_SLUG} ` +
      `${TARGET_BRANCH}`
    );
    shell.cd(GITHUB_WORKSPACE);
  }
  core.endGroup();
}
