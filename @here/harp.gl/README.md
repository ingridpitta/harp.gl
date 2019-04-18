# @here/harp.gl

## Overview

This is convienience module that provides [`harp.gl`](https://heremaps.github.io/harp.gl/doc/) as JS-friendly bundle, with whole `harp.gl` API exposed in `harp` namespace.

Usage example with `unpkg.com` CDN:
```html
<script src="https://unpkg.com/three@0.102.0/build/three.min.js"></script>
    <!-- harp.gl bundle requires specific threejs version to be already loaded in runtime -->
<script src="https://unpkg.com/@here/harp.gl"></script>
    <!-- latest version of harp.gl bundle -->
<script>
    const canvas = document.getElementById("mapCanvas");

    const map = new harp.MapView({
        canvas,
        theme:
            "https://unpkg.com/@here/harp-map-theme@0.2.2/resources/berlin_tilezen_base.json"
    });
    ...
</script>
```
This snippets loads all required scripts and creates [MapView](https://heremaps.github.io/harp.gl/doc/classes/_here_harp_mapview.mapview.html) with `theme` loaded from `unpkg.com` CDN.

# More info
* [Running example](https://heremaps.github.io/harp.gl/examples/#hello-js_bundle.html)
* [Example source code](https://heremaps.github.io/harp.gl/examples/src/hello-js_bundle.html)
* [`harp.gl` Getting started guide](https://github.com/heremaps/harp.gl/blob/master/docs/GettingStartedGuide.md)



