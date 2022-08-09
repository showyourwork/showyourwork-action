// Imports
const core = require("@actions/core");
const cache = require("@actions/cache");
const shell = require("shelljs");
const constants = require("./constants.js");
const { exec } = require("./utils");

// Exports
module.exports = { setupConda };

// Cache settings
const CONDA_CACHE_NUMBER = core.getInput("conda-cache-number");
const RUNNER_OS = shell.env["RUNNER_OS"];
const conda_key = `conda-${constants.conda_cache_version}-${RUNNER_OS}-${CONDA_CACHE_NUMBER}`;
const conda_restoreKeys = [];
const conda_paths = ["~/.conda", "~/.condarc", "~/conda_pkgs_dir"];

// We'll cache the article unless the user set the cache number to `null` (or empty).
const CACHE_CONDA = (
  !(CONDA_CACHE_NUMBER == null || CONDA_CACHE_NUMBER == "")
);

/**
 * Setup a conda distribution or restore it from cache.
 *
 */
async function setupConda() {

  if (CACHE_CONDA) {
    // Restore conda cache
    core.startGroup("Restore conda cache");
    const conda_cacheKey = await cache.restoreCache(
      conda_paths,
      conda_key,
      conda_restoreKeys
    );
    core.endGroup();
  }

  // Download and setup conda
  if (!shell.test("-d", "~/.conda")) {
    exec(
      "wget --no-verbose https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ./conda.sh", 
      "Download conda"
    );
    exec("bash ./conda.sh -b -p ~/.conda && rm -f ./conda.sh", "Install conda");
    core.startGroup("Configure conda");
    exec("conda config --add pkgs_dirs ~/conda_pkgs_dir");
    exec("conda install -y pip");
    core.endGroup();
  }

  // Always install the latest version of showyourwork
  const syw = core.getInput("pip-install-syw");
  exec(`pip install -U ${syw}`, "Install showyourwork");

  // Display some info
  exec("conda info", "Conda info");

  // Save conda cache (failure OK)
  if (CACHE_CONDA) {
    try {
      core.startGroup("Update conda cache");
      const conda_cacheId = await cache.saveCache(conda_paths, conda_key);
      core.endGroup();
    } catch (error) {
      shell.echo(`WARNING: ${error.message}`);
    }
  }
}
