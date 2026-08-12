// Imports
const core = require("@actions/core");
const cache = require("@actions/cache");
const shell = require("shelljs");
const constants = require("./constants.js");
const {
  exec,
  getCondaActivationScriptPath,
  getCondaInstallationPath,
  getCondaPythonVersionSpec,
  getMinicondaInstallerUrl,
} = require("./utils");

// Exports
module.exports = { setupConda };

// Cache settings
const CONDA_CACHE_NUMBER = core.getInput("conda-cache-number");
const SHOWYOUWORK_SPEC = core.getInput("showyourwork-spec");
const RUNNER_OS = shell.env["RUNNER_OS"];
const conda_key = `conda-${constants.conda_cache_version}-${RUNNER_OS}-${CONDA_CACHE_NUMBER}`;
const conda_restoreKeys = [];
const CONDA_INSTALLATION_PATH = getCondaInstallationPath();
const conda_paths = [CONDA_INSTALLATION_PATH, "~/.condarc", "~/conda_pkgs_dir"];

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
  if (!shell.test("-f", getCondaActivationScriptPath(CONDA_INSTALLATION_PATH))) {
    const minicondaInstallerUrl = getMinicondaInstallerUrl(process.arch);
    exec(
      `wget --no-verbose ${minicondaInstallerUrl} -O ./conda.sh`,
      "Download conda"
    );
    exec(`bash ./conda.sh -b -p ${CONDA_INSTALLATION_PATH} && rm -f ./conda.sh`, "Install conda");
    core.startGroup("Configure conda");
    exec("conda config --add pkgs_dirs ~/conda_pkgs_dir");
    exec(`conda install -y "${getCondaPythonVersionSpec()}" pip`);
    core.endGroup();
  }

  // Install showyourwork
  exec(`pip install -U ${SHOWYOUWORK_SPEC}`, "Install showyourwork");

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