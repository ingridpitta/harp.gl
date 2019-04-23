/*
 * Copyright (C) 2017-2019 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */

// tslint:disable:only-arrow-functions
//    Mocha discourages using arrow functions, see https://mochajs.org/#arrow-functions

import { assert } from "chai";

import { SphericalGeometrySubdivisionModifier } from "../lib/SphericalGeometrySubdivisionModifier";

import * as THREE from "three";

import * as geo from "@here/harp-geoutils";

import * as fs from "fs";

describe("SphericalGeometrySubdivisionModifier", function() {
    it("SubdivideTileBounds", function() {
        const geoPoint = new geo.GeoCoordinates(53.3, 13.4);

        const tileKey = geo.webMercatorTilingScheme.getTileKey(geoPoint, 3);

        assert.isDefined(tileKey);

        const { south, north, east, west } = geo.webMercatorTilingScheme.getGeoBox(tileKey!);

        const geometry = new THREE.Geometry();

        geometry.vertices.push(
            geo.sphereProjection.projectPoint(
                new geo.GeoCoordinates(south, west),
                new THREE.Vector3()
            ),
            geo.sphereProjection.projectPoint(
                new geo.GeoCoordinates(south, east),
                new THREE.Vector3()
            ),
            geo.sphereProjection.projectPoint(
                new geo.GeoCoordinates(north, west),
                new THREE.Vector3()
            ),
            geo.sphereProjection.projectPoint(
                new geo.GeoCoordinates(north, east),
                new THREE.Vector3()
            )
        );

        geometry.faces.push(new THREE.Face3(0, 1, 2), new THREE.Face3(2, 1, 3));

        const quality = THREE.Math.degToRad(2);

        const modifier = new SphericalGeometrySubdivisionModifier(quality);

        modifier.modify(geometry);

        assert.equal(geometry.vertices.length, 617);

        for (const face of geometry.faces) {
            const a = geometry.vertices[face.a];
            const b = geometry.vertices[face.b];
            const c = geometry.vertices[face.c];

            assert.isAtMost(a.angleTo(b), quality);
            assert.isAtMost(b.angleTo(c), quality);
            assert.isAtMost(c.angleTo(a), quality);

            assert.isAbove(a.angleTo(b), 0);
            assert.isAbove(b.angleTo(c), 0);
            assert.isAbove(c.angleTo(a), 0);
        }
    });
});
