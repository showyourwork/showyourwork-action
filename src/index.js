// Imports
const shell = require("shelljs");
const utils = require("./utils");
const github = require("@actions/github");
const { build } = require("./build");

(async () => {
  // Always exit on failure
  shell.set("-e");

  // What we do depends on what triggered this build
  const payload = github.context.payload;
  const eventName = github.context.eventName;
  if (eventName.includes("pull_request")) {
    if (payload.action == "opened") {
      if (
        payload.pull_request.head.repo.full_name ==
        payload.pull_request.base.repo.full_name
      ) {
        // The PR originates from the same repository, so we
        // don't need to worry about potential exploits
        await build();
      } else {
        // This is a new pull request. We won't do anything except
        // post a comment explaining that maintaners must review
        // the PR and add the `safe to test` label if it's deemed
        // safe to build on GH Actions. We'll also create (but not add)
        // the `safe to test` label.
        core.startGroup("Comment on PR");
        await utils.createSafeToTestLabel();
        await utils.createPullRequestInstructionsComment();
        core.endGroup();
      }
    } else if (
      payload.action == "labeled" &&
      payload.label.name == "safe to test"
    ) {
      // This PR has been marked as safe to test, so let's build it
      core.startGroup("Remove `safe to test` label");
      await utils.removeSafeToTestLabel();
      core.endGroup();
      const output_info = await build();
      core.startGroup("Comment on PR");
      await utils.createPullRequestPDFComment(output_info);
      core.endGroup();
    }
  } else {
    // This is not a `pull_request_target`, so we can just build as usual
    await build();
  }
})();
