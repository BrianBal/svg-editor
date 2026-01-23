class SmartPencilTool {
    constructor(canvas) {
        this.canvas = canvas;
        this.rawPoints = [];
        this.isDrawing = false;
        this.recognitionTimeout = null;
        this.previewPath = null;
        this.lastCaptureTime = 0;

        // Constants
        this.CAPTURE_INTERVAL = 16; // ~60fps
        this.RECOGNITION_DELAY = 1500; // 1.5 seconds
        this.SIMPLIFICATION_TOLERANCE = 2.0;
        this.MIN_POINTS = 5;
        this.CLOSURE_THRESHOLD = 20;

        // Recognition algorithm selector
        this.recognitionAlgorithm = 'threshold'; // or 'coverage'

        // Shape recognition thresholds - based on real trackpad data
        this.CIRCLE_CIRCULARITY_MIN = 0.93; // Raised to 0.93 to avoid triangle confusion (circles are 0.98+)
        this.ELLIPSE_CIRCULARITY_MIN = 0.82; // Lowered based on data (was 0.85)
        this.RECT_CORNER_ANGLE_MIN = 116;   // Based on data analysis
        this.RECT_CORNER_ANGLE_MAX = 180;   // Very lenient for rough corners
        this.LINE_ASPECT_RATIO_MIN = 3;     // Lowered - some lines weren't that extreme
        this.CORNER_ANGLE_THRESHOLD = 130;  // VERY AGGRESSIVE - detect even smooth corners (was 140)
        this.CORNER_LOOK_AHEAD = 2;         // VERY SMALL - more sensitive to direction changes (was 3)
        this.DEBUG_CORNERS = false;         // Set to true to see corner detection details

        // Coverage algorithm thresholds
        this.COVERAGE_CIRCLE_THRESHOLD = 0.60;
        this.COVERAGE_RECT_THRESHOLD = 0.55;
        this.COVERAGE_TRIANGLE_THRESHOLD = 0.50;
        this.COVERAGE_LINE_DISTANCE_THRESHOLD = 5; // pixels
        this.COVERAGE_GRID_SIZE = 50; // base grid resolution
    }

    onMouseDown(e, pos) {
        this.isDrawing = true;
        this.rawPoints = [pos];
        this.lastCaptureTime = Date.now();

        // Create preview path
        this.previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.previewPath.setAttribute('fill', 'none');
        this.previewPath.setAttribute('stroke', '#4A90E2');
        this.previewPath.setAttribute('stroke-width', '2');
        this.previewPath.setAttribute('stroke-linecap', 'round');
        this.previewPath.setAttribute('stroke-linejoin', 'round');
        this.previewPath.setAttribute('pointer-events', 'none');
        this.canvas.handlesLayer.appendChild(this.previewPath);
    }

    onMouseMove(e, pos) {
        if (!this.isDrawing) return;

        // Throttle point capture to ~60fps
        const now = Date.now();
        if (now - this.lastCaptureTime < this.CAPTURE_INTERVAL) return;
        this.lastCaptureTime = now;

        this.rawPoints.push(pos);
        this.updatePreview();
    }

    onMouseUp(e, pos) {
        if (!this.isDrawing) return;

        this.isDrawing = false;
        this.rawPoints.push(pos);

        // Discard if too few points
        if (this.rawPoints.length < this.MIN_POINTS) {
            this.cleanup();
            return;
        }

        // Add recognition indicator animation
        this.previewPath.setAttribute('stroke-dasharray', '5,5');
        this.previewPath.style.animation = 'pulse 0.5s ease-in-out infinite';

        // Start recognition after delay
        this.recognitionTimeout = setTimeout(() => {
            this.recognizeAndReplace();
        }, this.RECOGNITION_DELAY);
    }

    cancel() {
        if (this.recognitionTimeout) {
            clearTimeout(this.recognitionTimeout);
            this.recognitionTimeout = null;
        }
        this.cleanup();
    }

    cleanup() {
        if (this.previewPath) {
            this.previewPath.remove();
            this.previewPath = null;
        }
        this.rawPoints = [];
        this.isDrawing = false;
    }

    updatePreview() {
        if (!this.previewPath || this.rawPoints.length < 2) return;

        // Build path data from raw points
        let pathData = `M ${this.rawPoints[0].x} ${this.rawPoints[0].y}`;
        for (let i = 1; i < this.rawPoints.length; i++) {
            pathData += ` L ${this.rawPoints[i].x} ${this.rawPoints[i].y}`;
        }
        this.previewPath.setAttribute('d', pathData);
    }

    // ============================================
    // Point Simplification (Ramer-Douglas-Peucker)
    // ============================================

    simplifyPoints(points, tolerance = this.SIMPLIFICATION_TOLERANCE) {
        if (points.length <= 2) return points;

        // Find point with maximum perpendicular distance
        let maxDistance = 0;
        let maxIndex = 0;
        const lineStart = points[0];
        const lineEnd = points[points.length - 1];

        for (let i = 1; i < points.length - 1; i++) {
            const distance = this.perpendicularDistance(points[i], lineStart, lineEnd);
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }

        // If max distance is greater than tolerance, recursively simplify
        if (maxDistance > tolerance) {
            const left = this.simplifyPoints(points.slice(0, maxIndex + 1), tolerance);
            const right = this.simplifyPoints(points.slice(maxIndex), tolerance);
            return [...left.slice(0, -1), ...right];
        } else {
            return [lineStart, lineEnd];
        }
    }

    perpendicularDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;

        // Handle case where line is a point
        if (dx === 0 && dy === 0) {
            return Math.sqrt(
                Math.pow(point.x - lineStart.x, 2) +
                Math.pow(point.y - lineStart.y, 2)
            );
        }

        // Calculate perpendicular distance using cross product
        const numerator = Math.abs(
            dy * point.x - dx * point.y +
            lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
        );
        const denominator = Math.sqrt(dx * dx + dy * dy);

        return numerator / denominator;
    }

    // ============================================
    // Geometric Property Calculations
    // ============================================

    calculateProperties(points) {
        const bounds = this.getBounds(points);
        const centroid = this.getCentroid(points);
        const isClosed = this.isClosedShape(points);

        const width = bounds.width || 1;
        const height = bounds.height || 1;
        const aspectRatio = width / height;

        const circularity = this.calculateCircularity(points, centroid);
        const corners = this.detectCorners(points);

        return {
            bounds,
            centroid,
            isClosed,
            aspectRatio,
            circularity,
            corners,
            width,
            height
        };
    }

    getBounds(points) {
        if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

        let minX = points[0].x;
        let minY = points[0].y;
        let maxX = points[0].x;
        let maxY = points[0].y;

        for (const point of points) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    getCentroid(points) {
        if (points.length === 0) return { x: 0, y: 0 };

        let sumX = 0;
        let sumY = 0;

        for (const point of points) {
            sumX += point.x;
            sumY += point.y;
        }

        return {
            x: sumX / points.length,
            y: sumY / points.length
        };
    }

    isClosedShape(points) {
        if (points.length < 3) return false;

        const first = points[0];
        const last = points[points.length - 1];
        const distance = Math.sqrt(
            Math.pow(last.x - first.x, 2) +
            Math.pow(last.y - first.y, 2)
        );

        return distance < this.CLOSURE_THRESHOLD;
    }

    calculateCircularity(points, centroid) {
        if (points.length === 0) return 0;

        // Calculate average radius
        let sumRadii = 0;
        for (const point of points) {
            const radius = Math.sqrt(
                Math.pow(point.x - centroid.x, 2) +
                Math.pow(point.y - centroid.y, 2)
            );
            sumRadii += radius;
        }
        const avgRadius = sumRadii / points.length;

        // Calculate variance of radii
        let sumSquaredDiff = 0;
        for (const point of points) {
            const radius = Math.sqrt(
                Math.pow(point.x - centroid.x, 2) +
                Math.pow(point.y - centroid.y, 2)
            );
            sumSquaredDiff += Math.pow(radius - avgRadius, 2);
        }
        const variance = sumSquaredDiff / points.length;

        // Convert variance to circularity score (0-1, where 1 is perfect circle)
        // Lower variance = higher circularity
        const normalizedVariance = variance / (avgRadius * avgRadius);
        return Math.max(0, 1 - normalizedVariance);
    }

    detectCorners(points) {
        if (points.length < 5) return [];

        const corners = [];
        const lookAhead = this.CORNER_LOOK_AHEAD;
        const angles = []; // For debugging

        // Look at points with a wider window to detect rounded corners better
        for (let i = lookAhead; i < points.length - lookAhead; i++) {
            const prev = points[i - lookAhead];
            const curr = points[i];
            const next = points[i + lookAhead];

            const angle = this.calculateAngle(prev, curr, next);

            if (this.DEBUG_CORNERS) {
                angles.push({ index: i, angle: angle.toFixed(1) });
            }

            if (angle < this.CORNER_ANGLE_THRESHOLD) {
                // Avoid duplicates - only add if not too close to previous corner
                const isDuplicate = corners.some(corner =>
                    Math.abs(corner.index - i) < lookAhead * 2
                );

                if (!isDuplicate) {
                    corners.push({
                        index: i,
                        point: curr,
                        angle: angle
                    });
                }
            }
        }

        if (this.DEBUG_CORNERS) {
            console.log(`Corner Detection (threshold=${this.CORNER_ANGLE_THRESHOLD}, lookAhead=${lookAhead}):`);
            console.log(`  Total points: ${points.length}`);
            console.log(`  Min angles found:`, angles.sort((a, b) => parseFloat(a.angle) - parseFloat(b.angle)).slice(0, 10));
            console.log(`  Corners detected: ${corners.length}`, corners.map(c => `${c.angle.toFixed(1)}°`));
        }

        return corners;
    }

    calculateAngle(p1, p2, p3) {
        // Calculate angle at p2 between vectors (p1->p2) and (p2->p3)
        const v1x = p1.x - p2.x;
        const v1y = p1.y - p2.y;
        const v2x = p3.x - p2.x;
        const v2y = p3.y - p2.y;

        const dot = v1x * v2x + v1y * v2y;
        const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
        const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

        if (mag1 === 0 || mag2 === 0) return 180;

        const cosAngle = dot / (mag1 * mag2);
        const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
        return angleRad * (180 / Math.PI);
    }

    // ============================================
    // Shape Recognition Pipeline
    // ============================================

    recognizeAndReplace() {
        if (this.recognitionAlgorithm === 'coverage') {
            this.recognizeAndReplaceCoverageAlgorithm();
        } else {
            this.recognizeAndReplaceThresholdAlgorithm();
        }
    }

    recognizeAndReplaceThresholdAlgorithm() {
        // Simplify points
        const simplified = this.simplifyPoints(this.rawPoints);

        if (simplified.length < 2) {
            this.cleanup();
            return;
        }

        // Calculate geometric properties on simplified points
        const props = this.calculateProperties(simplified);

        // BUT detect corners on RAW points (simplification removes corners!)
        props.cornersRaw = this.detectCorners(this.rawPoints);

        // Attempt recognition in priority order
        // Only recognize 4 basic shapes: Line, Circle, Rectangle, Triangle
        // Everything else falls back to polyline
        let shape = null;

        shape = shape || this.recognizeLine(simplified, props);
        shape = shape || this.recognizeCircle(simplified, props);
        shape = shape || this.recognizeRectangle(simplified, props);
        shape = shape || this.recognizeTriangle(simplified, props);

        // Diamond, Polygon, Ellipse disabled - fall back to polyline instead

        // Fallback to polyline
        shape = shape || this.fallbackToPolyline(simplified);

        // Replace preview with final shape
        if (shape) {
            this.replaceWithShape(shape);
        } else {
            this.cleanup();
        }
    }

    recognizeLine(points, props) {
        // Line: NOT closed + (low circularity OR extreme aspect ratio)
        // Based on data: lines are 0% closed, circularity 0.47-0.74, aspect 0.04-8.9

        const isLineLike = !props.isClosed && (
            props.circularity < 0.75 ||  // Low circularity
            props.aspectRatio > this.LINE_ASPECT_RATIO_MIN ||  // Very wide
            props.aspectRatio < 1 / this.LINE_ASPECT_RATIO_MIN  // Very tall
        );

        if (isLineLike || points.length === 2) {
            const start = points[0];
            const end = points[points.length - 1];
            return new Line(start.x, start.y, end.x, end.y);
        }

        return null;
    }

    recognizeCircle(points, props) {
        // Circle: high circularity + aspect ratio very close to 1:1 + closed + FEW corners
        // Based on data: circles are 0.92-1.07 aspect, 0.908-0.976 circularity, 60% closed

        // Must be closed (key discriminator vs lines which are 0% closed)
        if (!props.isClosed) return null;

        // Must have good circularity
        if (props.circularity < this.CIRCLE_CIRCULARITY_MIN) return null;

        // CRITICAL: Reject shapes with 3+ corners (those are rectangles/triangles!)
        const cornerCount = props.cornersRaw ? props.cornersRaw.length : props.corners.length;
        if (cornerCount >= 3) return null;

        // Aspect ratio must be VERY close to 1:1 (this is key discriminator vs ellipse)
        const isRound = props.aspectRatio >= 0.85 && props.aspectRatio <= 1.15;

        if (isRound) {
            // Calculate average radius from all points to centroid
            let sumRadius = 0;
            for (const point of points) {
                const radius = Math.sqrt(
                    Math.pow(point.x - props.centroid.x, 2) +
                    Math.pow(point.y - props.centroid.y, 2)
                );
                sumRadius += radius;
            }
            const avgRadius = sumRadius / points.length;

            return new Ellipse(
                props.centroid.x,
                props.centroid.y,
                avgRadius,
                avgRadius
            );
        }

        return null;
    }

    recognizeEllipse(points, props) {
        // Ellipse: good circularity + elongated aspect ratio (NOT 1:1) + closed + FEW corners
        // Based on data: ellipses are 1.12-2.10 aspect, 0.841-0.952 circularity, 60% closed

        // Must be closed (like circles)
        if (!props.isClosed) return null;

        // Must have decent circularity
        if (props.circularity < this.ELLIPSE_CIRCULARITY_MIN) return null;

        // CRITICAL: Reject shapes with 3+ corners (those are rectangles/triangles!)
        const cornerCount = props.cornersRaw ? props.cornersRaw.length : props.corners.length;
        if (cornerCount >= 3) return null;

        // Aspect ratio must be elongated (NOT close to 1:1 like circles)
        const isElongated = props.aspectRatio < 0.8 || props.aspectRatio > 1.2;

        // Should not be TOO elongated (that's a line)
        const notTooExtreme = props.aspectRatio > 0.3 && props.aspectRatio < 3.0;

        if (isElongated && notTooExtreme) {
            const rx = props.width / 2;
            const ry = props.height / 2;
            const cx = props.bounds.x + rx;
            const cy = props.bounds.y + ry;

            return new Ellipse(cx, cy, rx, ry);
        }

        return null;
    }

    recognizeRectangle(points, props) {
        // Rectangle: closed + has 4-ish corners (on raw points!) + reasonable aspect ratio
        // Based on data: rectangles have 2-4 corners (rough trackpad!), aspect 0.33-1.38, circularity 0.89-0.98

        if (!props.isClosed) return null;

        // Use corners detected on RAW points (not simplified!)
        const cornerCount = props.cornersRaw ? props.cornersRaw.length : props.corners.length;

        // Rectangles should have 2-6 corners (4 ideally, but rough trackpad drawings detect fewer)
        const hasRectCorners = cornerCount >= 2 && cornerCount <= 6;

        // CRITICAL: If only 2 corners, must have low circularity to distinguish from circles
        // Circles with 2 corners have circularity > 0.95, rectangles with 2 corners have < 0.90
        if (cornerCount === 2 && props.circularity > 0.90) return null;

        // Aspect ratio should not be extreme (not a line)
        const reasonableAspect = props.aspectRatio > 0.25 && props.aspectRatio < 4;

        // If it has the right number of corners and reasonable aspect, it's a rectangle
        if (hasRectCorners && reasonableAspect) {
            return new Rectangle(
                props.bounds.x,
                props.bounds.y,
                props.bounds.width,
                props.bounds.height
            );
        }

        return null;
    }

    recognizeTriangle(points, props) {
        // Triangle: closed + 2-5 corners (on raw points!) + not a perfect circle
        // Rough trackpad drawings can detect 2-5 corners for triangles

        if (!props.isClosed) return null;

        // Use corners detected on RAW points
        const cornerCount = props.cornersRaw ? props.cornersRaw.length : props.corners.length;

        // Accept 2-5 corners (triangles have 3, but rough drawings vary widely)
        // This is checked AFTER rectangle (4-6 corners) so rectangles don't match
        const hasThreeishCorners = cornerCount >= 2 && cornerCount <= 5;

        // Circularity should be lower than perfect circles
        const notTooRound = props.circularity < 0.94;

        if (hasThreeishCorners && notTooRound) {
            // Calculate radius from centroid to furthest point
            let maxRadius = 0;
            for (const point of points) {
                const radius = Math.sqrt(
                    Math.pow(point.x - props.centroid.x, 2) +
                    Math.pow(point.y - props.centroid.y, 2)
                );
                maxRadius = Math.max(maxRadius, radius);
            }

            return new Star(
                props.centroid.x,
                props.centroid.y,
                maxRadius,
                maxRadius,
                3
            );
        }

        return null;
    }

    recognizeDiamond(points, props) {
        // Diamond: 4 corners with sharp angles (not 90°), ~1:1 aspect ratio
        const cornerCount = props.cornersRaw ? props.cornersRaw.length : props.corners.length;
        const corners = props.cornersRaw || props.corners;

        if (cornerCount === 4 && props.isClosed &&
            props.aspectRatio >= 0.7 && props.aspectRatio <= 1.3) {

            // Check if angles are NOT right angles (diamond has sharp/obtuse angles)
            const notRightAngles = corners.some(corner =>
                corner.angle < this.RECT_CORNER_ANGLE_MIN ||
                corner.angle > this.RECT_CORNER_ANGLE_MAX
            );

            if (notRightAngles) {
                const radius = Math.max(props.width, props.height) / 2;

                const star = new Star(
                    props.centroid.x,
                    props.centroid.y,
                    radius,
                    radius,
                    4
                );

                // Rotate 45° to make it a diamond
                star.setRotation(45);

                return star;
            }
        }

        return null;
    }

    recognizePolygon(points, props) {
        // Polygon: 5-8 evenly-spaced corners, closed
        const cornerCount = props.cornersRaw ? props.cornersRaw.length : props.corners.length;
        const corners = props.cornersRaw || props.corners;

        if (cornerCount >= 5 && cornerCount <= 8 && props.isClosed) {
            // Check if corners are roughly evenly spaced
            if (this.areCornersSufficientlySpaced(corners, points.length)) {
                let maxRadius = 0;
                for (const point of points) {
                    const radius = Math.sqrt(
                        Math.pow(point.x - props.centroid.x, 2) +
                        Math.pow(point.y - props.centroid.y, 2)
                    );
                    maxRadius = Math.max(maxRadius, radius);
                }

                const innerRadius = maxRadius * 0.85;

                return new Star(
                    props.centroid.x,
                    props.centroid.y,
                    innerRadius,
                    maxRadius,
                    cornerCount
                );
            }
        }

        return null;
    }

    areCornersSufficientlySpaced(corners, totalPoints) {
        if (corners.length < 2) return false;

        // Calculate average spacing between corners
        let totalSpacing = 0;
        for (let i = 0; i < corners.length; i++) {
            const curr = corners[i];
            const next = corners[(i + 1) % corners.length];
            const spacing = Math.abs(next.index - curr.index);
            totalSpacing += spacing;
        }
        const avgSpacing = totalSpacing / corners.length;

        // Check if all spacings are within 50% of average
        for (let i = 0; i < corners.length; i++) {
            const curr = corners[i];
            const next = corners[(i + 1) % corners.length];
            const spacing = Math.abs(next.index - curr.index);

            if (spacing < avgSpacing * 0.5 || spacing > avgSpacing * 1.5) {
                return false;
            }
        }

        return true;
    }

    fallbackToPolyline(points) {
        // Convert simplified points to polyline format
        const polylinePoints = points.map(p => ({ x: p.x, y: p.y }));
        return new Polyline(polylinePoints);
    }

    // ============================================
    // Coverage-Based Recognition Algorithm
    // ============================================

    recognizeAndReplaceCoverageAlgorithm() {
        const simplified = this.simplifyPoints(this.rawPoints);
        if (simplified.length < 2) {
            this.cleanup();
            return;
        }

        const props = this.calculateProperties(simplified);

        // Try line first (distance-based)
        let shape = this.recognizeLineByDistance(simplified);
        if (shape) {
            this.replaceWithShape(shape);
            return;
        }

        // Try coverage-based for closed shapes
        if (props.isClosed) {
            const candidates = [];
            const templates = [
                { type: 'circle', threshold: this.COVERAGE_CIRCLE_THRESHOLD },
                { type: 'rectangle', threshold: this.COVERAGE_RECT_THRESHOLD },
                { type: 'triangle', threshold: this.COVERAGE_TRIANGLE_THRESHOLD }
            ];

            for (const template of templates) {
                const templateShape = this.createTemplateShape(template.type, props);
                const overlap = this.calculateOverlap(simplified, templateShape);

                if (overlap.overlapPercentage >= template.threshold) {
                    candidates.push({
                        type: template.type,
                        shape: templateShape.toShape(),
                        score: overlap.overlapPercentage
                    });
                }
            }

            // Select best candidate
            if (candidates.length > 0) {
                candidates.sort((a, b) => b.score - a.score);
                shape = candidates[0].shape;
            }
        }

        // Fallback to polyline
        if (!shape) {
            shape = this.fallbackToPolyline(simplified);
        }

        this.replaceWithShape(shape);
    }

    recognizeLineByDistance(points) {
        const start = points[0];
        const end = points[points.length - 1];

        // Calculate average perpendicular distance to line
        let totalDistance = 0;
        for (const point of points) {
            const dist = this.perpendicularDistance(point, start, end);
            totalDistance += dist;
        }
        const avgDistance = totalDistance / points.length;

        // Threshold: small average distance = line
        if (avgDistance < this.COVERAGE_LINE_DISTANCE_THRESHOLD) {
            return new Line(start.x, start.y, end.x, end.y);
        }
        return null;
    }

    createTemplateShape(type, props) {
        const bounds = props.bounds;
        const centroid = props.centroid;

        switch (type) {
            case 'circle': {
                const radius = (bounds.width + bounds.height) / 4;
                return {
                    type: 'circle',
                    cx: centroid.x,
                    cy: centroid.y,
                    radius: radius,
                    toShape: () => new Ellipse(centroid.x, centroid.y, radius, radius)
                };
            }

            case 'rectangle': {
                return {
                    type: 'rectangle',
                    x: bounds.x,
                    y: bounds.y,
                    width: bounds.width,
                    height: bounds.height,
                    toShape: () => new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height)
                };
            }

            case 'triangle': {
                const radius = Math.max(bounds.width, bounds.height) / 2;
                return {
                    type: 'triangle',
                    cx: centroid.x,
                    cy: centroid.y,
                    radius: radius,
                    toShape: () => new Star(centroid.x, centroid.y, radius, radius, 3)
                };
            }
        }
    }

    calculateOverlap(userPoints, template) {
        const bounds = this.getBounds(userPoints);

        // Expand bounds with padding
        const padding = 5;
        const minX = bounds.x - padding;
        const minY = bounds.y - padding;
        const maxX = bounds.x + bounds.width + padding;
        const maxY = bounds.y + bounds.height + padding;

        // Dynamic grid resolution
        const gridSize = Math.max(this.COVERAGE_GRID_SIZE, Math.min(bounds.width, bounds.height) / 2);
        const stepX = (maxX - minX) / gridSize;
        const stepY = (maxY - minY) / gridSize;

        let userPixels = 0;
        let templatePixels = 0;
        let overlapPixels = 0;

        // Sample grid
        for (let x = minX; x < maxX; x += stepX) {
            for (let y = minY; y < maxY; y += stepY) {
                const point = { x, y };
                const inUser = this.isPointInPolygon(point, userPoints);
                const inTemplate = this.isPointInTemplateShape(point, template);

                if (inUser) userPixels++;
                if (inTemplate) templatePixels++;
                if (inUser && inTemplate) overlapPixels++;
            }
        }

        // Jaccard similarity: intersection over union
        const union = userPixels + templatePixels - overlapPixels;
        const overlapPercentage = union > 0 ? overlapPixels / union : 0;

        return { overlapPercentage };
    }

    isPointInTemplateShape(point, template) {
        switch (template.type) {
            case 'circle': {
                const dx = point.x - template.cx;
                const dy = point.y - template.cy;
                return (dx * dx + dy * dy) <= (template.radius * template.radius);
            }

            case 'rectangle': {
                return point.x >= template.x &&
                       point.x <= template.x + template.width &&
                       point.y >= template.y &&
                       point.y <= template.y + template.height;
            }

            case 'triangle': {
                const vertices = this.getTriangleVertices(template);
                return this.isPointInPolygon(point, vertices);
            }
        }
        return false;
    }

    getTriangleVertices(template) {
        const { cx, cy, radius } = template;
        const points = [];
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
            points.push({
                x: cx + Math.cos(angle) * radius,
                y: cy + Math.sin(angle) * radius
            });
        }
        return points;
    }

    isPointInPolygon(point, polygon) {
        // Ray casting algorithm
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;
        }
        return inside;
    }

    // ============================================
    // Shape Replacement
    // ============================================

    replaceWithShape(shape) {
        // Remove preview
        this.cleanup();

        // Apply default styles from appState
        shape.stroke = window.appState.defaultStroke;
        shape.fill = window.appState.defaultFill;
        shape.strokeWidth = window.appState.defaultStrokeWidth;

        // Add shape to canvas
        this.canvas.addShape(shape);

        // Select the new shape
        window.appState.selectShape(shape.id);

        // Switch to select tool
        window.appState.setTool('select');
    }
}
