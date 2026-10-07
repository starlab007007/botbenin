import release from "./waouh-release.json" with { type: "json" };

export const releaseHeaders = {
  "X-Waouh-Release": release.release_id,
};
