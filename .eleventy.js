// Eleventy config — Phase 0 migration of the EBiM Benchmark site.
//
// The build output (_site/) must remain byte-for-byte equivalent to the
// previously hand-authored static HTML. Shared chrome (head tail, navbar,
// footer, back-to-top, script tags) now lives in _includes/; each page is a
// thin .njk template that extends _includes/layouts/base.njk.
//
// Static assets (css/js/img + sitemap.xml/robots.txt/.nojekyll) are copied
// through verbatim, preserving their exact output paths (css/…, js/…, img/…).
export default function (eleventyConfig) {
  // Passthrough copy — object form pins the exact output path regardless of
  // the input directory, so assets land at _site/<name> (not _site/src/<name>).
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/img": "img" });
  eleventyConfig.addPassthroughCopy({ "src/sitemap.xml": "sitemap.xml" });
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
