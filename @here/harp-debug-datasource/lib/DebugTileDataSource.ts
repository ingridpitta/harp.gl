/*
 * Copyright (C) 2017-2019 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

import { TilingScheme } from "@here/harp-geoutils";
import { TileKey } from "@here/harp-geoutils/lib/tiling/TileKey";
import { DataSource, TextElement, Tile } from "@here/harp-mapview";
import {
    FontUnit,
    HorizontalAlignment,
    TextLayoutStyle,
    TextRenderStyle,
    VerticalAlignment
} from "@here/harp-text-canvas";

import * as THREE from "three";

const debugMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
    linewidth: 1,
    depthTest: false
});

// Set maximum priority.
const PRIORITY_ALWAYS = Number.MAX_SAFE_INTEGER;

// Size/scale of text showing the tiles key
const TEXT_SCALE = 0.8;

export class DebugTile extends Tile {
    private readonly geometry = new THREE.Geometry();
    private readonly m_labelPositions = new THREE.BufferAttribute(new Float32Array(3), 3);

    private m_textRenderStyle = new TextRenderStyle({
        fontSize: {
            unit: FontUnit.Pixel,
            size: 16,
            backgroundSize: 0
        },
        color: new THREE.Color("#ff0000")
    });
    private m_textLayoutStyle = new TextLayoutStyle({
        verticalAlignment: VerticalAlignment.Below,
        horizontalAlignment: HorizontalAlignment.Left
    });

    constructor(dataSource: DataSource, tileKey: TileKey) {
        super(dataSource, tileKey);

        const tileBounds = this.boundingBox.clone();

        tileBounds.min.sub(this.center);
        tileBounds.max.sub(this.center);
        this.geometry.vertices.push(
            new THREE.Vector3(tileBounds.min.x, tileBounds.min.y, 0),
            new THREE.Vector3(tileBounds.max.x, tileBounds.min.y, 0),
            new THREE.Vector3(tileBounds.max.x, tileBounds.max.y, 0),
            new THREE.Vector3(tileBounds.min.x, tileBounds.max.y, 0),
            new THREE.Vector3(tileBounds.min.x, tileBounds.min.y, 0)
        );
        const lineObject = new THREE.Line(this.geometry, debugMaterial);
        lineObject.renderOrder = 100;
        this.objects.push(lineObject);

        this.m_labelPositions.setXYZ(0, 0, 0, 0);

        const text = `(${tileKey.row}, ${tileKey.column}, ${tileKey.level})`;
        const textElement = new TextElement(
            text,
            new THREE.Vector2(tileBounds.min.x * 0.95, tileBounds.max.y * 0.95),
            this.m_textRenderStyle,
            this.m_textLayoutStyle,
            PRIORITY_ALWAYS,
            TEXT_SCALE
        );
        textElement.mayOverlap = true;
        textElement.reserveSpace = false;
        textElement.alwaysOnTop = true;
        textElement.ignoreDistance = true;

        this.addTextElement(textElement);
    }
}

export class DebugTileDataSource extends DataSource {
    constructor(
        private m_tilingScheme: TilingScheme,
        name = "debug",
        public maxDbgZoomLevel: number = 20
    ) {
        super(name, undefined, 1, 20, -1);

        this.cacheable = true;
    }

    getTilingScheme(): TilingScheme {
        return this.m_tilingScheme;
    }

    getTile(tileKey: TileKey): DebugTile {
        const tile = new DebugTile(this, tileKey);
        return tile;
    }

    shouldRender(zoomLevel: number, tileKey: TileKey): boolean {
        if (tileKey.level > this.maxDbgZoomLevel) {
            return false;
        }
        return super.shouldRender(zoomLevel, tileKey);
    }
}
