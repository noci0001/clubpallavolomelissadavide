module.exports = function (eleventyConfig) {
  // Copy static files straight through to _site
  eleventyConfig.addPassthroughCopy({ "src/style.css": "style.css" });
  eleventyConfig.addPassthroughCopy({ "src/manifest.webmanifest": "manifest.webmanifest" });
  eleventyConfig.addPassthroughCopy({ "src/sw.js": "sw.js" });
  eleventyConfig.addPassthroughCopy({ "src/icons": "icons" });

  return {
    dir: {
      input: "src",
      output: "_site",
    },
  };
};
