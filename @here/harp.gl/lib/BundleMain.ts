/*
 * Copyright (C) 2017-2019 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConcurrentDecoderFacade, MapViewDefaults, MapViewOptions } from "@here/harp-mapview";
import { WorkerLoader } from "@here/harp-mapview/lib/workers/WorkerLoader";
import { baseUrl, setDefaultUrlResolver } from "@here/harp-utils";

/**
 * Default decoder url for bundled map component.
 */
export const DEFAULT_DECODER_SCRIPT_URL = "harp.gl:harp-decoders.js";

/**
 * Default map theme bundled with map component.
 * @hidden
 */
export const DEFAULT_BUNDLE_THEME = "harp.gl:map-theme/berlin_tilezen_base.json";

/**
 * Basename of map bundle script - used by [[getMapBundleScriptUrl]] as fallback, when
 * `document.currentScript` is not present.
 *
 * @hidden
 */
export const BUNDLE_SCRIPT_BASENAME = "harp";

/**
 * Guess `harp-gl.bundle(.min).js` script URL.
 *
 * Required to find default URLs for theme and `map-decoders.bundle.js` which are hosted together,
 * not necessarily with base URL of current page.
 *
 * @see https://stackoverflow.com/questions/2976651
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/currentScript
 * @hidden
 */
export function getMapBundleScriptUrl(): string | undefined | null {
    if (mapBundleScriptUrl !== undefined) {
        return mapBundleScriptUrl;
    }

    const baseScript =
        (document.currentScript as HTMLScriptElement) ||
        document.querySelector(`script[src*='/${BUNDLE_SCRIPT_BASENAME}.min.js']`) ||
        document.querySelector(`script[src*='/${BUNDLE_SCRIPT_BASENAME}.js']`) ||
        document.querySelector(`script[src='${BUNDLE_SCRIPT_BASENAME}.min.js']`) ||
        document.querySelector(`script[src='${BUNDLE_SCRIPT_BASENAME}.js']`);

    if (baseScript) {
        mapBundleScriptUrl = baseScript.src;
        return mapBundleScriptUrl;
    } else {
        mapBundleScriptUrl = null;
        return undefined;
    }
}

export function getScriptUrl(name: string): string | undefined | null {
    const scriptElement =
        document.querySelector(`script[src*='/${name}.min.js']`) ||
        document.querySelector(`script[src='${name}.min.js']`) ||
        document.querySelector(`script[src*='/${name}.js']`) ||
        document.querySelector(`script[src='${name}.js']`);

    if (scriptElement) {
        return (scriptElement as HTMLScriptElement).src;
    } else {
        return undefined;
    }
}

const HARP_GL_BUNDLED_ASSETS_PREFIX = "harp.gl:";

/**
 * Resolve URLs with support for Harp4Web bundle specific URLs.
 *
 * URLs with prefix `harp.gl:` are resolved relatively to Harp4Web Map bundle's base URL.
 *
 * @hidden
 */
export function resolveBundledUrl(url: string) {
    // TODO: Decide about protocol prefix before public release.
    if (url.startsWith(HARP_GL_BUNDLED_ASSETS_PREFIX)) {
        const bundleSriptUrl = getMapBundleScriptUrl();
        if (bundleSriptUrl === null || bundleSriptUrl === undefined) {
            throw new Error(
                `harp.gl: resolveBundledUrl cannot resolve ${url} because harp.gl base url is ` +
                    `not set.`
            );
        } else {
            url = url.substring(HARP_GL_BUNDLED_ASSETS_PREFIX.length);
            if (url.startsWith("/")) {
                url = url.substring(1);
            }
            return baseUrl(bundleSriptUrl) + url;
        }
    }
    return url;
}

/**
 * Guess decoder script URL.
 *
 * Assumes that decoder script - `harp-decoders.js` is in same place as main bundle and
 * calculates it's URL.
 *
 * Hooks in [[ConcurrentDecoderFacade]] to warn developer that detection of `harp.js` URL failed and
 * that he should take care of providing `decoderUrl` manually using datasources that use decoders.
 *
 * Minified version of `harp.js` bundle loads minified version of decoder.
 *
 * @hidden
 */
function installDefaultDecoderUrlHook() {
    ConcurrentDecoderFacade.defaultScriptUrl = "";
    WorkerLoader.dependencyUrlMapping.three = getScriptUrl("three")!;

    const oldGetWorkerSet = ConcurrentDecoderFacade.getWorkerSet;
    ConcurrentDecoderFacade.getWorkerSet = (scriptUrl?: string) => {
        if (scriptUrl === undefined && ConcurrentDecoderFacade.defaultScriptUrl === "") {
            const baseScriptUrl = getMapBundleScriptUrl();
            const isMinified = baseScriptUrl && baseScriptUrl.endsWith(".min.js");
            const decoderScriptName = !isMinified
                ? DEFAULT_DECODER_SCRIPT_URL
                : DEFAULT_DECODER_SCRIPT_URL.replace(".js$", ".min.js");
            const newScriptUrl = resolveBundledUrl(decoderScriptName);

            ConcurrentDecoderFacade.defaultScriptUrl = newScriptUrl;
        }
        return oldGetWorkerSet.apply(ConcurrentDecoderFacade, [scriptUrl]);
    };
}

/**
 * Override [[MapViewDefaults.getDefaultTheme]] so it resolves bundle specific default theme.
 * @hidden
 */
function installMapViewDefaults() {
    const writatebleMapViewDefaults = MapViewDefaults as MapViewOptions;
    writatebleMapViewDefaults.fontCatalog = "harp.gl:./resources/fonts/Default_FontCatalog.json";
    writatebleMapViewDefaults.theme = DEFAULT_BUNDLE_THEME;
}

/**
 * Initialize Map Component aka Map Bundle.
 *
 * Install specific default decoder & theme urls into [[ConcurrentDecoderFacade]] and [[MapView]].
 * @hidden
 */
export function mapBundleMain() {
    const mapBundleUrl = getMapBundleScriptUrl();
    if (mapBundleUrl !== null && mapBundleUrl !== undefined) {
        setDefaultUrlResolver(resolveBundledUrl);
    }
    installMapViewDefaults();
    installDefaultDecoderUrlHook();
}

let mapBundleScriptUrl: string | undefined | null;
