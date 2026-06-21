// Eleventy config — Phase 0 migration of the EBiM Benchmark site.
//
// The build output (_site/) must remain byte-for-byte equivalent to the
// previously hand-authored static HTML. Shared chrome (head tail, navbar,
// footer, back-to-top, script tags) now lives in _includes/; each page is a
// thin .njk template that extends _includes/layouts/base.njk.
//
// Static assets (css/js/img + robots.txt/.nojekyll) are copied through verbatim,
// preserving their exact output paths (css/…, js/…, img/…). sitemap.xml is
// rendered from src/sitemap.njk (locale-aware, per-page gated on the
// site.zhPublished map).
import { EleventyI18nPlugin } from "@11ty/eleventy";

export default function (eleventyConfig) {
  // i18n plugin (ships with Eleventy core). EN is the default language and
  // stays at the root with no /en/ prefix; the zh locale lives under /zh/.
  // Registering it only adds locale-aware filters — it changes no EN output.
  eleventyConfig.addPlugin(EleventyI18nPlugin, {
    defaultLanguage: "en",
    errorMode: "allow-fallback",
  });

  // Passthrough copy — object form pins the exact output path regardless of
  // the input directory, so assets land at _site/<name> (not _site/src/<name>).
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/img": "img" });
  eleventyConfig.addPassthroughCopy({ "src/fonts": "fonts" });
  // sitemap.xml is rendered from src/sitemap.njk (locale-aware, per-page gated
  // on the site.zhPublished map) — not a static passthrough.
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
  eleventyConfig.addPassthroughCopy({ "src/.nojekyll": ".nojekyll" });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
    // Phase 0 ships only Nunjucks page templates; everything else is passthrough.
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
