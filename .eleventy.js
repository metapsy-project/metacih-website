module.exports = function(eleventyConfig) {

  eleventyConfig.addCollection("allTeamMembers", function(collectionApi) {
    return collectionApi.getFilteredByGlob("./team/en/*.md");
  });

  eleventyConfig.addCollection("allTeamMembersDe", function(collectionApi) {
    return collectionApi.getFilteredByGlob("./team/de/*.md");
  });

  eleventyConfig.addCollection("projects", function(collectionApi) {
    return collectionApi.getFilteredByGlob("./projects/en/*.md");
  });

  eleventyConfig.addCollection("projectsDe", function(collectionApi) {
    return collectionApi.getFilteredByGlob("./projects/de/*.md");
  });

  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");
};