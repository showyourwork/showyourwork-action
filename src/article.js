// Imports
const core = require("@actions/core");
const cache = require("@actions/cache");
const shell = require("shelljs");
const constants = require("./constants.js");
const { makeId, exec } = require("./utils");

// Exports
module.exports = { buildArticle };

/**
 * Build the article.
 *
 */
async function buildArticle() {
  // Article cache settings. We only cache the contents of
  // `.snakemake/conda`, `${HOME}/.showyourwork`, `src/tex/figures`, and
  // `src/tex/output` (if it exists).
  // Note that the GITHUB_REF (branch) is part of the cache key
  // so we don't mix up the caches for different branches!
  const ARTICLE_CACHE_NUMBER = core.getInput("article-cache-number");
  const RUNNER_OS = shell.env["RUNNER_OS"];
  const GITHUB_REF = shell.env["GITHUB_REF"];
  const randomId = makeId(8);
  const article_key = `article-${constants.article_cache_version}-${RUNNER_OS}-${GITHUB_REF}-${ARTICLE_CACHE_NUMBER}-${randomId}`;
  const article_restoreKeys = [
    `article-${constants.article_cache_version}-${RUNNER_OS}-${GITHUB_REF}-${ARTICLE_CACHE_NUMBER}`,
  ];
  const article_paths = [
    ".snakemake/conda",
    "~/.showyourwork",
    "src/tex/figures",
    "src/tex/output",
  ];

  // We'll cache the article unless the user set the cache number to `null` (or empty).
  const CACHE_ARTICLE = !(
    ARTICLE_CACHE_NUMBER == null || ARTICLE_CACHE_NUMBER == ""
  );

  // Restore the article cache
  if (CACHE_ARTICLE) {
    core.startGroup("Restore article cache");
    const article_cacheKey = await cache.restoreCache(
      article_paths,
      article_key,
      article_restoreKeys
    );
    exec("showyourwork cache restore");
    core.endGroup();
  }

  // Build the article
  core.startGroup("Build article");
  exec("showyourwork build");
  core.endGroup();

  // Save article cache
  if (CACHE_ARTICLE) {
    core.startGroup("Update article cache");
    exec("showyourwork cache update");
    const article_cacheId = await cache.saveCache(article_paths, article_key);
    core.endGroup();
  }
}
