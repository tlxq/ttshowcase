/**
 * The line drawn with a paint marker's chisel tip. A flat
 * chisel held at one angle leaves a broad mark going across it and a thin one going along it (Tom 11-11).
 */

/** The chisel's angle on the screen (y down), and its broad and thin sides, as shares of the
 * line's width. */
export const NIB = { angle: (-38 * Math.PI) / 180, broad: 4.2, thin: 0.9 } as const;
