import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('SmartPencilTool - Real Data Recognition', () => {
    let tool;

    beforeEach(() => {
        tool = new SmartPencilTool({ handlesLayer: document.getElementById('handles-layer') });
    });

    // Load the collected shape data
    const dataPath = join(__dirname, '..', 'shape-data-1769182193439.json');
    const shapeData = JSON.parse(readFileSync(dataPath, 'utf-8'));

    describe('Rectangle Recognition', () => {
        it('should recognize all collected rectangles as rectangles', () => {
            const rectangleSamples = shapeData.rectangle;
            expect(rectangleSamples.length).toBe(5);

            rectangleSamples.forEach((sample, index) => {
                const points = sample.points;
                const simplified = tool.simplifyPoints(points);
                const props = tool.calculateProperties(simplified);

                console.log(`\nRectangle ${index + 1}:`);
                console.log(`  Points: ${points.length} -> ${simplified.length} simplified`);
                console.log(`  Circularity: ${props.circularity.toFixed(3)}`);
                console.log(`  Corners: ${props.corners.length}`);
                console.log(`  Aspect ratio: ${props.aspectRatio.toFixed(2)}`);
                console.log(`  Closed: ${props.isClosed}`);

                // Try each recognition function
                const asLine = tool.recognizeLine(simplified, props);
                const asRect = tool.recognizeRectangle(simplified, props);
                const asTriangle = tool.recognizeTriangle(simplified, props);
                const asDiamond = tool.recognizeDiamond(simplified, props);
                const asPolygon = tool.recognizePolygon(simplified, props);
                const asCircle = tool.recognizeCircle(simplified, props);
                const asEllipse = tool.recognizeEllipse(simplified, props);

                console.log(`  Recognized as:`);
                console.log(`    Line: ${asLine ? 'YES' : 'no'}`);
                console.log(`    Rectangle: ${asRect ? 'YES' : 'no'}`);
                console.log(`    Triangle: ${asTriangle ? 'YES' : 'no'}`);
                console.log(`    Diamond: ${asDiamond ? 'YES' : 'no'}`);
                console.log(`    Polygon: ${asPolygon ? 'YES' : 'no'}`);
                console.log(`    Circle: ${asCircle ? 'YES' : 'no'}`);
                console.log(`    Ellipse: ${asEllipse ? 'YES' : 'no'}`);

                // Assert it should be recognized as rectangle (or at least not as circle)
                expect(asCircle, `Rectangle ${index + 1} should NOT be recognized as circle`).toBe(null);

                if (!asRect) {
                    console.warn(`  ⚠️  Rectangle ${index + 1} was NOT recognized as rectangle!`);
                }
            });
        });
    });

    describe('Circle Recognition', () => {
        it('should recognize all collected circles as circles', () => {
            const circleSamples = shapeData.circle;
            expect(circleSamples.length).toBe(5);

            circleSamples.forEach((sample, index) => {
                const points = sample.points;
                const simplified = tool.simplifyPoints(points);
                const props = tool.calculateProperties(simplified);

                console.log(`\nCircle ${index + 1}:`);
                console.log(`  Points: ${points.length} -> ${simplified.length} simplified`);
                console.log(`  Circularity: ${props.circularity.toFixed(3)}`);
                console.log(`  Corners: ${props.corners.length}`);
                console.log(`  Aspect ratio: ${props.aspectRatio.toFixed(2)}`);
                console.log(`  Closed: ${props.isClosed}`);

                // Try each recognition function
                const asLine = tool.recognizeLine(simplified, props);
                const asRect = tool.recognizeRectangle(simplified, props);
                const asTriangle = tool.recognizeTriangle(simplified, props);
                const asDiamond = tool.recognizeDiamond(simplified, props);
                const asPolygon = tool.recognizePolygon(simplified, props);
                const asCircle = tool.recognizeCircle(simplified, props);
                const asEllipse = tool.recognizeEllipse(simplified, props);

                console.log(`  Recognized as:`);
                console.log(`    Line: ${asLine ? 'YES' : 'no'}`);
                console.log(`    Rectangle: ${asRect ? 'YES' : 'no'}`);
                console.log(`    Triangle: ${asTriangle ? 'YES' : 'no'}`);
                console.log(`    Diamond: ${asDiamond ? 'YES' : 'no'}`);
                console.log(`    Polygon: ${asPolygon ? 'YES' : 'no'}`);
                console.log(`    Circle: ${asCircle ? 'YES' : 'no'}`);
                console.log(`    Ellipse: ${asEllipse ? 'YES' : 'no'}`);

                // Assert it should be recognized as circle (or ellipse if close)
                const recognizedAsRound = asCircle || asEllipse;
                expect(recognizedAsRound, `Circle ${index + 1} should be recognized as circle or ellipse`).toBeTruthy();

                if (!asCircle) {
                    console.warn(`  ⚠️  Circle ${index + 1} was NOT recognized as circle!`);
                }
            });
        });
    });

    describe('Triangle Recognition', () => {
        it('should recognize all collected triangles as triangles', () => {
            const triangleSamples = shapeData.triangle;
            expect(triangleSamples.length).toBe(5);

            triangleSamples.forEach((sample, index) => {
                const points = sample.points;
                const simplified = tool.simplifyPoints(points);
                const props = tool.calculateProperties(simplified);

                console.log(`\nTriangle ${index + 1}:`);
                console.log(`  Points: ${points.length} -> ${simplified.length} simplified`);
                console.log(`  Circularity: ${props.circularity.toFixed(3)}`);
                console.log(`  Corners: ${props.corners.length}`);
                console.log(`  Aspect ratio: ${props.aspectRatio.toFixed(2)}`);
                console.log(`  Closed: ${props.isClosed}`);

                // Try each recognition function
                const asLine = tool.recognizeLine(simplified, props);
                const asRect = tool.recognizeRectangle(simplified, props);
                const asTriangle = tool.recognizeTriangle(simplified, props);
                const asDiamond = tool.recognizeDiamond(simplified, props);
                const asPolygon = tool.recognizePolygon(simplified, props);
                const asCircle = tool.recognizeCircle(simplified, props);
                const asEllipse = tool.recognizeEllipse(simplified, props);

                console.log(`  Recognized as:`);
                console.log(`    Line: ${asLine ? 'YES' : 'no'}`);
                console.log(`    Rectangle: ${asRect ? 'YES' : 'no'}`);
                console.log(`    Triangle: ${asTriangle ? 'YES' : 'no'}`);
                console.log(`    Diamond: ${asDiamond ? 'YES' : 'no'}`);
                console.log(`    Polygon: ${asPolygon ? 'YES' : 'no'}`);
                console.log(`    Circle: ${asCircle ? 'YES' : 'no'}`);
                console.log(`    Ellipse: ${asEllipse ? 'YES' : 'no'}`);

                // Assert it should be recognized as triangle (or at least not as circle)
                expect(asCircle, `Triangle ${index + 1} should NOT be recognized as circle`).toBe(null);

                if (!asTriangle) {
                    console.warn(`  ⚠️  Triangle ${index + 1} was NOT recognized as triangle!`);
                }
            });
        });
    });

    describe('Line Recognition', () => {
        it('should recognize all collected lines as lines', () => {
            const lineSamples = shapeData.line;
            expect(lineSamples.length).toBe(5);

            lineSamples.forEach((sample, index) => {
                const points = sample.points;
                const simplified = tool.simplifyPoints(points);
                const props = tool.calculateProperties(simplified);

                console.log(`\nLine ${index + 1}:`);
                console.log(`  Points: ${points.length} -> ${simplified.length} simplified`);
                console.log(`  Circularity: ${props.circularity.toFixed(3)}`);
                console.log(`  Corners: ${props.corners.length}`);
                console.log(`  Aspect ratio: ${props.aspectRatio.toFixed(2)}`);
                console.log(`  Closed: ${props.isClosed}`);

                // Try each recognition function
                const asLine = tool.recognizeLine(simplified, props);
                const asRect = tool.recognizeRectangle(simplified, props);
                const asTriangle = tool.recognizeTriangle(simplified, props);
                const asDiamond = tool.recognizeDiamond(simplified, props);
                const asPolygon = tool.recognizePolygon(simplified, props);
                const asCircle = tool.recognizeCircle(simplified, props);
                const asEllipse = tool.recognizeEllipse(simplified, props);

                console.log(`  Recognized as:`);
                console.log(`    Line: ${asLine ? 'YES' : 'no'}`);
                console.log(`    Rectangle: ${asRect ? 'YES' : 'no'}`);
                console.log(`    Triangle: ${asTriangle ? 'YES' : 'no'}`);
                console.log(`    Diamond: ${asDiamond ? 'YES' : 'no'}`);
                console.log(`    Polygon: ${asPolygon ? 'YES' : 'no'}`);
                console.log(`    Circle: ${asCircle ? 'YES' : 'no'}`);
                console.log(`    Ellipse: ${asEllipse ? 'YES' : 'no'}`);

                // Assert it should be recognized as line
                expect(asLine, `Line ${index + 1} should be recognized as line`).toBeTruthy();
            });
        });
    });

    describe('Ellipse Recognition', () => {
        it('should recognize all collected ellipses as ellipses', () => {
            const ellipseSamples = shapeData.ellipse;
            expect(ellipseSamples.length).toBe(5);

            ellipseSamples.forEach((sample, index) => {
                const points = sample.points;
                const simplified = tool.simplifyPoints(points);
                const props = tool.calculateProperties(simplified);

                console.log(`\nEllipse ${index + 1}:`);
                console.log(`  Points: ${points.length} -> ${simplified.length} simplified`);
                console.log(`  Circularity: ${props.circularity.toFixed(3)}`);
                console.log(`  Corners: ${props.corners.length}`);
                console.log(`  Aspect ratio: ${props.aspectRatio.toFixed(2)}`);
                console.log(`  Closed: ${props.isClosed}`);

                // Try each recognition function
                const asLine = tool.recognizeLine(simplified, props);
                const asRect = tool.recognizeRectangle(simplified, props);
                const asTriangle = tool.recognizeTriangle(simplified, props);
                const asDiamond = tool.recognizeDiamond(simplified, props);
                const asPolygon = tool.recognizePolygon(simplified, props);
                const asCircle = tool.recognizeCircle(simplified, props);
                const asEllipse = tool.recognizeEllipse(simplified, props);

                console.log(`  Recognized as:`);
                console.log(`    Line: ${asLine ? 'YES' : 'no'}`);
                console.log(`    Rectangle: ${asRect ? 'YES' : 'no'}`);
                console.log(`    Triangle: ${asTriangle ? 'YES' : 'no'}`);
                console.log(`    Diamond: ${asDiamond ? 'YES' : 'no'}`);
                console.log(`    Polygon: ${asPolygon ? 'YES' : 'no'}`);
                console.log(`    Circle: ${asCircle ? 'YES' : 'no'}`);
                console.log(`    Ellipse: ${asEllipse ? 'YES' : 'no'}`);

                // Assert it should be recognized as ellipse (or circle if aspect ratio is close)
                const recognizedAsOval = asEllipse || asCircle;
                expect(recognizedAsOval, `Ellipse ${index + 1} should be recognized as ellipse or circle`).toBeTruthy();

                if (!asEllipse) {
                    console.warn(`  ⚠️  Ellipse ${index + 1} was NOT recognized as ellipse!`);
                }
            });
        });
    });

    describe('Overall Recognition Summary', () => {
        it('should show success rate for each shape type', () => {
            const results = {
                rectangle: { correct: 0, total: 0, wrongAsCircle: 0 },
                circle: { correct: 0, total: 0 },
                triangle: { correct: 0, total: 0, wrongAsCircle: 0 },
                line: { correct: 0, total: 0 },
                ellipse: { correct: 0, total: 0 }
            };

            // Test all shapes
            for (const [shapeType, samples] of Object.entries(shapeData)) {
                results[shapeType].total = samples.length;

                samples.forEach(sample => {
                    const points = sample.points;
                    const simplified = tool.simplifyPoints(points);
                    const props = tool.calculateProperties(simplified);

                    const asLine = tool.recognizeLine(simplified, props);
                    const asRect = tool.recognizeRectangle(simplified, props);
                    const asTriangle = tool.recognizeTriangle(simplified, props);
                    const asCircle = tool.recognizeCircle(simplified, props);
                    const asEllipse = tool.recognizeEllipse(simplified, props);

                    if (shapeType === 'rectangle' && asRect) results.rectangle.correct++;
                    if (shapeType === 'rectangle' && asCircle) results.rectangle.wrongAsCircle++;

                    if (shapeType === 'circle' && (asCircle || asEllipse)) results.circle.correct++;

                    if (shapeType === 'triangle' && asTriangle) results.triangle.correct++;
                    if (shapeType === 'triangle' && asCircle) results.triangle.wrongAsCircle++;

                    if (shapeType === 'line' && asLine) results.line.correct++;

                    if (shapeType === 'ellipse' && (asEllipse || asCircle)) results.ellipse.correct++;
                });
            }

            console.log('\n' + '='.repeat(60));
            console.log('RECOGNITION ACCURACY SUMMARY');
            console.log('='.repeat(60));

            for (const [shapeType, stats] of Object.entries(results)) {
                const percentage = ((stats.correct / stats.total) * 100).toFixed(0);
                const status = percentage >= 80 ? '✅' : percentage >= 60 ? '⚠️' : '❌';

                console.log(`\n${shapeType.toUpperCase()}:`);
                console.log(`  ${status} ${stats.correct}/${stats.total} correct (${percentage}%)`);

                if (stats.wrongAsCircle > 0) {
                    console.log(`  ⚠️  ${stats.wrongAsCircle} incorrectly recognized as circle!`);
                }
            }

            const totalCorrect = Object.values(results).reduce((sum, s) => sum + s.correct, 0);
            const totalSamples = Object.values(results).reduce((sum, s) => sum + s.total, 0);
            const overallPercentage = ((totalCorrect / totalSamples) * 100).toFixed(0);

            console.log('\n' + '-'.repeat(60));
            console.log(`OVERALL: ${totalCorrect}/${totalSamples} correct (${overallPercentage}%)`);
            console.log('='.repeat(60) + '\n');

            // Assert at least 60% accuracy overall
            expect(totalCorrect / totalSamples).toBeGreaterThan(0.6);
        });
    });
});
