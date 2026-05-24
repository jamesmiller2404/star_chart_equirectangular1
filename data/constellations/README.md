# Constellation Line Data

`stellarium-western-index.json` and `stellarium-western-description.md` are downloaded from the Stellarium Western sky culture:

https://github.com/Stellarium/stellarium-skycultures/tree/master/western

The `index.json` file contains constellation line paths keyed by Hipparcos star numbers. `scripts/build-star-chart-data.mjs` converts those paths into the compact `constellations` section embedded in the generated `public/data/stars-mag-6_5.json` and `poc/stars-mag-6_5.json` files.

The upstream description states:

- Authors: Stellarium's team.
- Text and data license: CC BY-SA.
- Illustrations license: Free Art License.
