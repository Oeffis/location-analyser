// This is a workaround for a bug in geolib, see https://github.com/manuelbieh/geolib/issues/129
// Stryker disable all
import { getDistance } from "geolib";
import { GeolibInputCoordinates } from "geolib/es/types";

// Returns the minimum distance from a point to a line
export const getDistanceFromLine = (
    point: GeolibInputCoordinates,
    lineStart: GeolibInputCoordinates,
    lineEnd: GeolibInputCoordinates,
    accuracy = 1
): number => {
    const d1 = getDistance(lineStart, point, accuracy);
    const d2 = getDistance(point, lineEnd, accuracy);
    const d3 = getDistance(lineStart, lineEnd, accuracy);

    // alpha is the angle between the line from start to point, and from start to end
    const alpha = Math.acos(
        robustAcos((d1 * d1 + d3 * d3 - d2 * d2) / (2 * d1 * d3))
    );

    // beta is the angle between the line from end to point and from end to start //
    const beta = Math.acos(
        robustAcos((d2 * d2 + d3 * d3 - d1 * d1) / (2 * d2 * d3))
    );

    const pointAtLineStart = d1 === 0;
    const pointAtLineEnd = d2 === 0;
    if (pointAtLineStart || pointAtLineEnd) {
        return 0;
    }

    const lineLengthZero = d3 === 0;
    if (lineLengthZero) {
        return d1;
    }

    // if the angle is greater than 90 degrees, then the minimum distance is the
    // line from the start to the point
    if (alpha > Math.PI / 2) {
        return d1;
    }

    if (beta > Math.PI / 2) {
        // same for the beta
        return d2;
    }

    // console.log(Math.sin(alpha), Math.sin(alpha) * d1);
    // otherwise the minimum distance is achieved through a line perpendicular
    // to the start-end line, which goes from the start-end line to the point
    return Math.sin(alpha) * d1;
};
const robustAcos = (value: number): number => {
    if (value > 1) {
        return 1;
    }
    if (value < -1) {
        return -1;
    }

    return value;
};
