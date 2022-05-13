// Imports
const core = require("@actions/core");
const shell = require("shelljs");
const { setupConda } = require("./conda");
const { buildArticle } = require("./article");
const { buildTarball } = require("./arxiv");
const { publishOutput } = require("./publish");
const { publishLogs } = require("./logs");
const utils = require("./utils");

(async () => {

  // DEBUG!

  // Exit on failure
  shell.set("-e");

  // Create the `safe to test` label if it doesn't exist
  await utils.createSafeToTestLabel()

  const github = require("@actions/github");
  const payload = github.context.payload;
  if (github.context.eventName == "pull_request_target") {
    if (payload.action == "opened") {
      if (payload.pull_request.head.repo.full_name == payload.pull_request.base.repo.full_name) {
        // pass
      } else {
        utils.createPullRequestInstructionsComment();
      }
    }
  }

  

  //shell.echo(JSON.stringify(payload));


  return;


  try {
    
    // Exit on failure
    shell.set("-e");

    // Setup conda or restore from cache
    await setupConda();

    // Build the article
    await buildArticle();

    // Build arxiv tarball
    if (core.getInput("build-tarball") == "true") {
      await buildTarball();
    }

    // Publish the article output
    await publishOutput();

    // Publish the logs
    await publishLogs();

  } catch (error) {

    // Publish the logs
    try {
      await publishLogs();
    } catch (error) {
      core.error("Unable to upload the build logs.");
      core.setFailed(error.message);
    }

    // Exit gracefully
    core.setFailed(error.message);

  }
})();
