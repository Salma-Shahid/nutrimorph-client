// Local Lottie animation registry.
//
// Metro only bundles files that are `require`d statically, so every animation
// is registered here by name. To add or replace one:
//   1. Drop the exported Lottie `.json` file into this folder.
//   2. Add or update a line below, e.g. `celebrate: require("./celebrate.json"),`
// Any name that is missing here simply falls back to an icon in
// <LottieFeedback />, so the app never crashes or waits on a network URL.
//
// `success` and `scanning` are small original animations made for NutriMorph.
// They can be swapped for richer files (keep the same names).
const LOTTIE_ASSETS = {
  success: require("./success.json"),
  scanning: require("./scanning.json"),
  // celebrate: require("./celebrate.json"), // milestones / badge unlocked
};

export default LOTTIE_ASSETS;
