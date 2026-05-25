## Welcome to the HYG star database archive.  The most current version of the database will always be found here.

### Versions and Licensing:

#### Current version: HYG v4.2 (directory: hyg/CURRENT/hyg_v42.csv.gz)

HYG 4.2 contains 1 update:

1. Since the last version, 34 stars have been updated with an IAU-approved proper name. These names were all made official in late 2024 or early 2025. The new names are given in the file hyg/CURRENT/v42_name_updates.md.

### License:

This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License][cc-by-sa].

[cc-by-sa]: http://creativecommons.org/licenses/by-sa/4.0/

---

### HYG (Hipparcos-Yale-Gliese)
#### Directory /data/hyg - Currently 119,614 stars


See data/hyg/README.md for details about the HYG catalog.

This is the original focus of this data collection. HYG combines every identifiable star in the HIPPARCOS, Yale Bright Star, and Gliese (nearby star) catalogs into a combined dataset of the stars' currently best-known positions, brightnesses, spectral types, and various additional catalog IDs such as traditional names and Bayer designations.

The current HYG catalog is v4.2. Versions since v4.0 are licensed as above (CC-BY-SA 4.0). Earlier versions use the CC-BY-SA v2.5 license.

### SVG chart exports

The main all-sky chart and Gaia inset charts are generated as separate SVG targets:

```bash
npm run export:svg:main
npm run export:svg:pleiades
npm run export:svg:scorpio
npm run export:svg:lyra
```

You can also choose a target manually:

```bash
npm run export:svg -- --chart main
npm run export:svg -- --chart pleiades --output exports/pleiades.svg
npm run export:svg -- --chart lyra --output exports/lyra.svg
npm run export:svg -- --chart all
```

The print preview accepts the same chart IDs at `/print?chart=main`, `/print?chart=pleiades`, `/print?chart=scorpio`, and `/print?chart=lyra`.

The previous version series, v3.x, was originally compiled in 2014. There have been a few notable changes since then, mostly to add additional ID/label information and to correct a few errors. The most significant was a change in March 2023, to merge a PR that added the official star names from the IAU Working Group on Star Names in 2018, as well as to add a few additional old catalog designations for some nearby stars (e.g., "Ross 128") that may as well be proper names at this point. Details of the version history are in data/hyg/version-info.md.

The final version of v3, v3.8, has only very minor differences from v4.2 in data content; the major version update (v3->4)  was done largely to make updated licensing easier. 

All versions prior to v3.8 have known errors or inconsistencies in star data or IDs, or are significantly incomplete compared to later versions;  These versions are no longer kept in this repository; please contact the maintainer of this repository if you are interested in any of them.


### AT-HYG (Tycho-2/Gaia based) HYGLike Subset
#### Directory /data/athyg_v3 - Currently 118,971 stars

This is a subset of the larger AT-HYG database (https://codeberg.org/astronexus/athyg) that mimics the original HYG database as closely as possible. The HYGLike subset contains all the data updates (such as Gaia DR3 distances and velocities) the AT-HYG build was able to collect for HYG stars.

See data/athyg_v3/README.md for more details.

### Miscellany
#### Directory /data/misc

The catalog misc/dso.csv contains a list of approximately 220K deep-sky objects, mostly galaxies, used in applications on https://www.astronexus.com. 

See data/misc/README.md for details about this catalog.
