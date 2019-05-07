import { TileKey } from "@here/harp-geoutils";
import { DataTexture } from "three";

export interface DisplacementMap {
    tileKey: TileKey;

    /**
     * We need DataTexture here to be able to access the raw data for CPU overlay.
     */
    texture: DataTexture;
}
