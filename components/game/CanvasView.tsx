import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface Point {
    x: number;
    y: number;
}

export type DrawTool = 'pen' | 'eraser' | 'rect' | 'circle' | 'fill';

export interface DrawPath {
    id: string;
    points: Point[];
    color: string;
    width: number;
    type?: 'path' | 'rect' | 'circle';
    filled?: boolean;
}

interface CanvasViewProps {
    isDrawer: boolean;
    color?: string;
    strokeWidth?: number;
    tool?: DrawTool;
    initialPaths?: DrawPath[];
    onDrawStart?: () => void;
    onDrawMove?: (point: Point) => void;
    onDrawEnd?: (path: DrawPath) => void;
    paths?: DrawPath[]; // Controlled state
    externalPaths?: DrawPath[]; // Deprecated, merged into paths usually, but kept for compat if needed (we'll ignore)
    onModifyPath?: (pathId: string, updates: { filled?: boolean, color?: string }) => void;
    currentExternalPaths?: Record<string, { points: Point[], color: string, width: number, tool?: DrawTool, filled?: boolean, type?: 'path' | 'rect' | 'circle' }>;
    backgroundColor?: string;
}

export function CanvasView({
    isDrawer,
    color = '#FFFFFF',
    strokeWidth = 4,
    tool = 'pen',
    initialPaths = [],
    onDrawStart,
    onDrawMove,
    onDrawEnd,
    paths = [],
    externalPaths = [], // Ignored
    currentExternalPaths = {},
    backgroundColor = '#1A1A1A',
    onModifyPath
}: CanvasViewProps) {
    // const [paths, setPaths] = useState<DrawPath[]>(initialPaths); // Removed internal state
    const [currentPath, setCurrentPath] = useState<Point[]>([]);
    const [canvasLayout, setCanvasLayout] = useState({ width: 0, height: 0 });

    // Helper: Is point in rect?
    const isPointInRect = (p: Point, rectPoints: Point[]) => {
        if (rectPoints.length < 2) return false;
        const start = rectPoints[0];
        const end = rectPoints[rectPoints.length - 1];
        const xMin = Math.min(start.x, end.x);
        const xMax = Math.max(start.x, end.x);
        const yMin = Math.min(start.y, end.y);
        const yMax = Math.max(start.y, end.y);
        return p.x >= xMin && p.x <= xMax && p.y >= yMin && p.y <= yMax;
    };

    // Helper: Is point in circle?
    const isPointInCircle = (p: Point, circlePoints: Point[]) => {
        if (circlePoints.length < 2) return false;
        const start = circlePoints[0];
        const end = circlePoints[circlePoints.length - 1];
        const r = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)) / 2;
        const cx = (start.x + end.x) / 2;
        const cy = (start.y + end.y) / 2;
        const dist = Math.sqrt(Math.pow(p.x - cx, 2) + Math.pow(p.y - cy, 2));
        return dist <= r;
    };

    // Helper: Is point in polygon (Ray Casting)
    const isPointInPolygon = (p: Point, polyPoints: Point[]) => {
        let inside = false;
        for (let i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
            const xi = polyPoints[i].x, yi = polyPoints[i].y;
            const xj = polyPoints[j].x, yj = polyPoints[j].y;
            const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    };

    // Helper to normalize/denormalize
    const normalize = (p: Point) => ({
        x: p.x / (canvasLayout.width || 1),
        y: p.y / (canvasLayout.height || 1)
    });

    const isNormalized = (points: Point[]) => {
        // Heuristic: If all sample points are <= 2.0, likely normalized
        if (points.length === 0) return false;
        const sample = points.slice(0, 10);
        return !sample.some(p => Math.abs(p.x) > 2.0 || Math.abs(p.y) > 2.0);
    };

    const denormalizePoints = (points: Point[]) => {
        if (!isNormalized(points)) return points;
        return points.map(p => ({
            x: p.x * (canvasLayout.width || 1),
            y: p.y * (canvasLayout.height || 1)
        }));
    };

    // Gesture: Tap for Fill (Instant)
    const tap = useMemo(() => Gesture.Tap()
        .enabled(isDrawer && tool === 'fill')
        .maxDuration(250)
        .onStart((g) => {
            const clickPoint = { x: g.x, y: g.y };
            let caught = false;

            // Check collisions (reverse order)
            const rPaths = [...paths].reverse();
            for (const p of rPaths) {
                // Denormalize the PATH points for checking collision against CLICK point (pixels)
                const screenPoints = denormalizePoints(p.points);
                let hit = false;
                if (p.type === 'rect') hit = isPointInRect(clickPoint, screenPoints);
                else if (p.type === 'circle') hit = isPointInCircle(clickPoint, screenPoints);
                else hit = isPointInPolygon(clickPoint, screenPoints);

                if (hit) {
                    caught = true;
                    if (onModifyPath) {
                        onModifyPath(p.id, { filled: true, color });
                    }
                    break;
                }
            }

            if (!caught) {
                const fillPath: DrawPath = {
                    id: Math.random().toString(36).substr(2, 9),
                    points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], // Normalized Full Screen
                    color,
                    width: 0,
                    type: 'rect',
                    filled: true
                };
                if (onDrawEnd) onDrawEnd(fillPath);
            }
        })
        .runOnJS(true), [isDrawer, tool, paths, color, canvasLayout, onModifyPath, onDrawEnd]);

    const pan = useMemo(() => Gesture.Pan()
        .enabled(isDrawer && tool !== 'fill')
        .minDistance(1)
        .onStart((g) => {
            const point = { x: g.x, y: g.y };
            setCurrentPath([point]);
            if (onDrawStart) onDrawStart();
        })
        .onUpdate((g) => {
            const point = { x: g.x, y: g.y };
            if (tool === 'rect' || tool === 'circle') {
                setCurrentPath(prev => [prev[0], point]);
            } else {
                setCurrentPath((prev) => [...prev, point]);
            }
            if (onDrawMove) onDrawMove(normalize(point)); // Normalize for broadcast
        })
        .onEnd(() => {
            if (currentPath.length > 0) {
                const type = (tool === 'rect' || tool === 'circle') ? tool : 'path';
                const effectiveColor = tool === 'eraser' ? backgroundColor : color;
                const effectiveWidth = tool === 'eraser' ? (strokeWidth || 20) * 3 : strokeWidth; // Wider eraser

                // Normalize for storage
                const normalizedPath = currentPath.map(normalize);

                const newPath: DrawPath = {
                    id: Math.random().toString(36).substr(2, 9),
                    points: normalizedPath,
                    color: effectiveColor,
                    width: effectiveWidth,
                    type,
                    filled: false
                };
                setCurrentPath([]); // Clear local pixels
                if (onDrawEnd) onDrawEnd(newPath); // Send normalized
            }
        })
        .runOnJS(true), [isDrawer, onDrawStart, onDrawMove, onDrawEnd, color, strokeWidth, tool, backgroundColor, currentPath, canvasLayout]);

    // Composed Gesture
    // HACK: We render them conditionally effectively via .enabled(), 
    // but GestureDetector needs one object. Race or Simultaneous?
    // Since fill is mutually exclusive via .enabled(), Race should work fine.
    const gesture = useMemo(() => Gesture.Race(tap, pan), [tap, pan]);

    const pointsToSvgPath = (points: Point[], closed: boolean) => {
        if (points.length === 0) return '';
        const d = points.map((p, i) =>
            i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
        ).join(' ');

        return d + (closed && points.length > 2 ? ' Z' : '');
    };

    const renderShape = (path: { points: Point[], color: string, width: number, type?: string, filled?: boolean }, key?: string) => {
        // Transform Normalized -> Screen Pixels if needed
        const screenPoints = denormalizePoints(path.points);
        if (!screenPoints || screenPoints.length === 0) return null;

        const { color, width, type, filled } = path;

        // Use screenPoints from here on
        const points = screenPoints;

        const fillValue = filled ? color : "none";
        // If filled, we might want the stroke to match or be none?
        // Usually fill bucket means "fill inside", stroke remains? 
        // User said: "only the stroke gets the color, not inside".
        // If we fill, we want the INSIDE to be 'color', and the stroke to be 'color' (or original stroke?)
        // The simple "fill bucket" replaces the color?
        // Let's assume: Filled = Fill is Color, Stroke is Color (or preserved width/color?).
        // If we update { filled: true, color: newColor }, then both change.

        const strokeValue = color; // Stroke is always the path color

        if (type === 'rect') {
            if (points.length < 2) return null;
            const start = points[0];
            const end = points[points.length - 1];
            const x = Math.min(start.x, end.x);
            const y = Math.min(start.y, end.y);
            const w = Math.abs(end.x - start.x);
            const h = Math.abs(end.y - start.y);
            return (
                <Rect
                    key={key}
                    x={x} y={y} width={w} height={h}
                    stroke={strokeValue}
                    strokeWidth={width}
                    fill={fillValue}
                />
            );
        } else if (type === 'circle') {
            if (points.length < 2) return null;
            const start = points[0];
            const end = points[points.length - 1];
            const r = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)) / 2;
            const cx = (start.x + end.x) / 2;
            const cy = (start.y + end.y) / 2;

            return (
                <Circle
                    key={key}
                    cx={cx} cy={cy} r={r}
                    stroke={strokeValue}
                    strokeWidth={width}
                    fill={fillValue}
                />
            );
        } else {
            // Path (Pen/Eraser)
            return (
                <Path
                    key={key}
                    d={pointsToSvgPath(points, !!filled)}
                    stroke={strokeValue}
                    strokeWidth={width}
                    fill={fillValue} // Use fillValue here!
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            );
        }
    };

    // Determine current drawing preview props
    const currentPreviewType = (tool === 'rect' || tool === 'circle') ? tool : 'path';
    const currentPreviewColor = tool === 'eraser' ? backgroundColor : color;
    const currentPreviewWidth = tool === 'eraser' ? 20 : strokeWidth;

    return (
        <View
            style={[styles.container, { backgroundColor }]}
            onLayout={(e) => setCanvasLayout(e.nativeEvent.layout)}
        >
            <GestureDetector gesture={gesture}>
                <View style={styles.canvas} collapsable={false}>
                    <Svg
                        style={StyleSheet.absoluteFill}
                        viewBox={canvasLayout.width ? `0 0 ${canvasLayout.width} ${canvasLayout.height}` : undefined}
                    >
                        {/* Completed Paths */}
                        {paths.map((path) => renderShape(path, path.id))}

                        {/* Remote Current Paths (Real-time) */}
                        {Object.entries(currentExternalPaths).map(([userId, data]) =>
                            renderShape({ ...data, type: data.type || 'path' }, `ghost-${userId}`)
                        )}

                        {/* Current Drawing Path */}
                        {currentPath.length > 0 && renderShape({
                            points: currentPath,
                            color: currentPreviewColor,
                            width: currentPreviewWidth,
                            type: currentPreviewType
                        }, 'current')}
                    </Svg>
                </View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    canvas: {
        flex: 1,
    }
});
