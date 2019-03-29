/*
 * Copyright (C) 2017-2019 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */
import {
    DecodedTile,
    GeometryKind,
    GeometryKindSet,
    isDashedLineTechnique,
    isExtrudedLineTechnique,
    isExtrudedPolygonTechnique,
    isFillTechnique,
    isLineMarkerTechnique,
    isLineTechnique,
    isPoiTechnique,
    isSegmentsTechnique,
    isSolidLineTechnique,
    isTextTechnique,
    Technique
} from "@here/harp-datasource-protocol";
import { PerformanceTimer } from "@here/harp-utils";

import { PerformanceStatistics } from "../Statistics";
import { Tile } from "../Tile";
import { TileGeometryCreator } from "./TileGeometryCreator";
import { TileGeometryLoader } from "./TileGeometryLoader";

export type PhaseList = GeometryKind[];

/**
 *
 *
 */
export class PhasedTileGeometryLoader implements TileGeometryLoader {
    private m_decodedTile?: DecodedTile;
    private m_isFinished: boolean = false;
    private m_availableGeometryKinds: GeometryKindSet | undefined;
    private m_geometryKindsLoaded: GeometryKindSet = new Set();
    private m_loadPhaseDefinitions: PhaseList[];
    private m_currentPhaseIndex = 0;

    constructor(
        private m_tile: Tile,
        loadPhaseDefinitions: PhaseList[],
        private m_basicGeometryKinds: GeometryKindSet
    ) {
        this.m_loadPhaseDefinitions = loadPhaseDefinitions;
    }

    get currentPhase(): number {
        return this.m_currentPhaseIndex;
    }

    nextPhase(): number | undefined {
        if (this.m_currentPhaseIndex < this.m_loadPhaseDefinitions.length) {
            this.m_currentPhaseIndex++;
        }

        return this.m_currentPhaseIndex < this.m_loadPhaseDefinitions.length
            ? this.m_currentPhaseIndex
            : undefined;
    }

    get numberOfPhases(): number {
        return this.m_loadPhaseDefinitions.length;
    }

    get geometryKindsCreated(): GeometryKindSet {
        return this.m_geometryKindsLoaded;
    }

    get availableGeometryKinds(): GeometryKindSet | undefined {
        return this.m_availableGeometryKinds;
    }

    get basicGeometryLoaded(): boolean {
        for (const phase of this.m_basicGeometryKinds) {
            if (!this.m_geometryKindsLoaded.has(phase)) {
                return false;
            }
        }
        return true;
    }

    get allGeometryLoaded(): boolean {
        return this.currentPhase >= this.m_loadPhaseDefinitions.length;
    }

    get tile(): Tile {
        return this.m_tile;
    }

    setDecodedTile(decodedTile: DecodedTile) {
        this.m_decodedTile = decodedTile;
        this.m_currentPhaseIndex = 0;
        this.m_geometryKindsLoaded.clear();

        if (this.m_decodedTile !== undefined) {
            this.m_availableGeometryKinds = TileGeometryLoader.prepareDecodedTile(
                this.m_decodedTile
            );
        }
    }

    updateCompletely(enabledKinds: GeometryKindSet | undefined): boolean {
        return this.update(enabledKinds, true);
    }

    updateToPhase(toPhase: number, enabledKinds: GeometryKindSet | undefined): boolean {
        let didUpdate = false;
        while (this.currentPhase < toPhase) {
            didUpdate = this.update(enabledKinds);
            if (!didUpdate) {
                break;
            }
        }
        return didUpdate;
    }

    update(enabledKinds: GeometryKindSet | undefined, doFullUpdate: boolean = false): boolean {
        const decodedTile = this.m_decodedTile;
        const loadPhaseDefinitions = this.m_loadPhaseDefinitions;
        const currentPhase = this.currentPhase;
        const tile = this.tile;

        if (decodedTile === undefined && tile.decodedTile !== undefined) {
            this.setDecodedTile(tile.decodedTile);
            this.processTechniques();
        }

        if (!tile.dataSource.cacheable) {
            this.m_currentPhaseIndex = loadPhaseDefinitions.length;
            return false;
        }

        if (decodedTile === undefined || currentPhase >= this.numberOfPhases) {
            return false;
        }

        const stats = PerformanceStatistics.instance;
        let now = 0;

        if (stats.enabled) {
            now = PerformanceTimer.now();
        }

        if (doFullUpdate) {
            const geometryCreator = new TileGeometryCreator();
            geometryCreator.createAllGeometries(tile, decodedTile, enabledKinds);

            // Mark it as finished.
            this.m_currentPhaseIndex = loadPhaseDefinitions.length;
        } else {
            const currentPhaseDefinition = loadPhaseDefinitions[currentPhase];
            const geometryCreator = new TileGeometryCreator();

            for (const kind of currentPhaseDefinition) {
                this.createKind(geometryCreator, enabledKinds, kind);
            }
        }

        if (stats.enabled) {
            stats.currentFrame.addValue(
                "geometry.geometryCreationTime",
                PerformanceTimer.now() - now
            );
        }

        if (this.nextPhase() === undefined) {
            // All done, update the stats
            if (stats.enabled) {
                const currentFrame = stats.currentFrame;

                currentFrame.addValue("geometryCount.numGeometries", decodedTile.geometries.length);
                currentFrame.addValue("geometryCount.numTechniques", decodedTile.techniques.length);
                currentFrame.addValue(
                    "geometryCount.numPoiGeometries",
                    decodedTile.poiGeometries !== undefined ? decodedTile.poiGeometries.length : 0
                );
                currentFrame.addValue(
                    "geometryCount.numTextGeometries",
                    decodedTile.textGeometries !== undefined ? decodedTile.textGeometries.length : 0
                );
                currentFrame.addValue(
                    "geometryCount.numTextPathGeometries",
                    decodedTile.textPathGeometries !== undefined
                        ? decodedTile.textPathGeometries.length
                        : 0
                );
                currentFrame.addMessage(
                    `Decoded tile: ${tile.dataSource.name} # lvl=${tile.tileKey.level} col=${
                        tile.tileKey.column
                    } row=${tile.tileKey.row}`
                );
            }

            this.finish();
        }
        return true;
    }

    getTextElementPriorities(): number[] | undefined {
        if (this.m_decodedTile === undefined) {
            return undefined;
        }

        const priorities: Set<number> = new Set();
        for (const technique of this.m_decodedTile.techniques) {
            if (technique.name !== "text") {
                continue;
            }
            priorities.add(technique.priority !== undefined ? technique.priority : 0);
        }
        const prioritiesArray = Array.from(priorities);
        return prioritiesArray.sort((a: number, b: number) => {
            return b - a;
        });
    }

    get isFinished(): boolean {
        return this.m_isFinished;
    }

    dispose(): void {
        this.m_decodedTile = undefined;
    }

    protected createKind(
        geometryCreator: TileGeometryCreator,
        enabledKinds: GeometryKindSet | undefined,
        kind: GeometryKind
    ): void {
        if (this.m_geometryKindsLoaded.has(kind)) {
            return;
        }
        this.m_geometryKindsLoaded.add(kind);

        const tile = this.tile;
        const decodedTile = this.m_decodedTile;

        if (decodedTile !== undefined) {
            if (!tile.hasGeometry) {
                geometryCreator.createBackground(tile);
            }

            if (kind === GeometryKind.Label) {
                const textFilter = (technique: Technique): boolean => {
                    return (
                        isPoiTechnique(technique) ||
                        isLineMarkerTechnique(technique) ||
                        isTextTechnique(technique)
                    );
                };

                // const textPriorities = this.getTextElementPriorities();

                // TextElements do not get their geometry created by Tile, but are managed on a
                // higher level.
                geometryCreator.createTextElements(tile, decodedTile, textFilter);

                geometryCreator.preparePois(tile, decodedTile);
            } else {
                const filter = (technique: Technique): boolean => {
                    if (technique.kind === undefined) {
                        return true;
                    }
                    if (technique.kind instanceof Set) {
                        for (const techniqueKind of technique.kind as GeometryKindSet) {
                            if (
                                (techniqueKind === kind || kind === GeometryKind.Other) &&
                                (enabledKinds === undefined ||
                                    enabledKinds.hasIntersection(technique.kind))
                            ) {
                                return true;
                            }
                        }
                        return false;
                    } else {
                        return (
                            technique.kind === kind &&
                            (enabledKinds === undefined || enabledKinds.has(technique.kind))
                        );
                    }
                };

                geometryCreator.createObjects(tile, decodedTile, filter);
            }
        }
    }

    protected processTechniques(): void {
        const decodedTile = this.m_decodedTile;

        if (decodedTile === undefined) {
            return;
        }

        for (const technique of decodedTile.techniques) {
            // Make sure that all technique have their geometryKind set, either from the Theme or
            // their default value.
            let geometryKind = technique.kind;

            // Set default kind based on technique.
            if (geometryKind === undefined) {
                if (isFillTechnique(technique)) {
                    geometryKind = GeometryKind.Area;
                } else if (
                    isLineTechnique(technique) ||
                    isDashedLineTechnique(technique) ||
                    isSolidLineTechnique(technique) ||
                    isSegmentsTechnique(technique) ||
                    isExtrudedLineTechnique(technique)
                ) {
                    geometryKind = GeometryKind.Line;
                } else if (isExtrudedPolygonTechnique(technique)) {
                    geometryKind = GeometryKind.Building;
                } else if (
                    isPoiTechnique(technique) ||
                    isLineMarkerTechnique(technique) ||
                    isTextTechnique(technique)
                ) {
                    geometryKind = GeometryKind.Label;
                } else {
                    geometryKind = GeometryKind.Other;
                }

                technique.kind = geometryKind;
            }
        }
    }

    private finish() {
        this.m_decodedTile = undefined;
        this.m_tile.removeDecodedTile();
        this.m_isFinished = true;
    }
}
