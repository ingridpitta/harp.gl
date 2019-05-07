import { GeoCoordinates, TileKey, TilingScheme } from "@here/harp-geoutils";
import { Vector2 } from "three";
import { DisplacementMap } from "./DisplacementMap";

export interface ElevationProvider {
    /**
     * Get elevation for a given geo point.
     * @param geoPoint geo position to query height for.
     * @param level Optional data level that should be used for getting the elevation.
     *              If undefined the deepest available tile that contains the geoPoint will be
     *              used.
     * @returns The height at geoPoint or undefined if no tile was found that covers the geoPoint.
     */
    getHeight(geoPoint: GeoCoordinates, level?: number): number | undefined;

    /**
     * Cast a ray through the given screen position
     * @param screenPoint screenPoint to cast through
     * @returns GeoCoordinates of the intersection point with the surface or undefined if the
     *          surface was not hit by the ray.
     */
    rayCast(screenPoint: Vector2): GeoCoordinates | undefined;

    /**
     * Get the displacement map for a given tile key. If the displacement map for the given tileKey
     * is not in the cache a lower level tile will be returned.
     * @param tileKey The tile to get the displacement map for.
     * @returns Returns the DisplacmentMap for the given tileKey or a lower level tile. Undefined
     *          if the tile or no parent is in the cache.
     */
    getDisplacementMap(tileKey: TileKey): DisplacementMap | undefined;

    /**
     * @returns the TilingScheme used for the DisplacementMaps returned by [[getDisplacementMap]].
     */
    getTilingSceme(): TilingScheme;
}
