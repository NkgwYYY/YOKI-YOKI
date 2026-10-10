export const EVOLVED_SHAPES = {
    odango: { radius: [43, 39, 36], floor: 36, eyeY: -3, mouthY: 10, sprout: false },
    stage3: { radius: [41, 35, 34], floor: 33, eyeY: 0, mouthY: 12, sprout: true },
    stage4: { radius: [41, 35, 34], floor: 33, eyeY: 0, mouthY: 12, sprout: true },
};
const norm = (a) => { const n = Math.hypot(...a) || 1; return a.map(v => v / n); };
const add = (a, b, s = 1) => a.map((v, i) => v + b[i] * s);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const random = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); };
export function evolvedRotation(rx, ry, rz) {
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    return [cy * cz, cy * sz, -sy, sx * sy * cz - cx * sz, sx * sy * sz + cx * cz, sx * cy, cx * sy * cz + sx * sz, cx * sy * sz - sx * cz, cx * cy];
}
export const EVOLVED_CAMERA_SCALE = .92;
export function evolvedGroundOffset(form, rotation) {
    const r = EVOLVED_SHAPES[form].radius;
    // Support point of the rotated ellipsoid, including the fur, stays grounded.
    let support = Math.sqrt((rotation[1] * r[0]) ** 2 + (rotation[4] * r[1]) ** 2 + (rotation[7] * r[2]) ** 2);
    if (EVOLVED_SHAPES[form].sprout)
        for (const p of [[-15, -r[1] - 17, -1.8], [15, -r[1] - 17, 1.8]])
            support = Math.max(support, rotation[1] * p[0] + rotation[4] * p[1] + rotation[7] * p[2]);
    return 91 - support * EVOLVED_CAMERA_SCALE - 2;
}
// Position, normal, hair tangent, ribbon side/width, material, variation.
const STRIDE = 14;
function vertex(out, p, n, t = [0, 1, 0], edge = 0, width = 0, material = 0, variation = 0) { out.push(...p, ...n, ...t, edge, width, material, variation, 0); }
function tube(out, points, radius, material) {
    for (let i = 0; i < points.length - 1; i++) {
        const t = norm(add(points[i + 1], points[i], -1)), a = norm(cross(t, [0, 0, 1])), b = norm(cross(t, a));
        const at = (k, j) => { const angle = j * Math.PI / 4, n = add(a.map(v => v * Math.cos(angle)), b, Math.sin(angle)); return { p: add(points[k], n, radius), n }; };
        for (let j = 0; j < 8; j++)
            for (const [k, l] of [[i, j], [i + 1, j], [i, j + 1], [i, j + 1], [i + 1, j], [i + 1, j + 1]]) {
                const q = at(k, l);
                vertex(out, q.p, q.n, undefined, 0, 0, material);
            }
    }
}
export function createEvolvedLeafMesh(form) {
    const shape = EVOLVED_SHAPES[form], r = shape.radius, leaves = [];
    if (shape.sprout) {
        tube(leaves, [[0, -r[1] + 1, 0], [.2, -r[1] - 4, .4], [1, -r[1] - 9, 0]], .8, 6);
        for (const side of [-1, 1]) {
            const base = [.6, -r[1] - 5, 0], tip = [side * 15, -r[1] - 17, side * 1.8];
            const point = (t, w) => { const width = Math.sin(Math.PI * t) * 5.3; return [base[0] + (tip[0] - base[0]) * t + side * width * w * .45, base[1] + (tip[1] - base[1]) * t + width * w * .5, base[2] + (tip[2] - base[2]) * t + width * (1 - w * w) * .48 + width * w * .75]; };
            for (let i = 0; i < 12; i++)
                for (let j = 0; j < 6; j++) {
                    const a = i / 12, b = (i + 1) / 12, c = j / 3 - 1, d = (j + 1) / 3 - 1;
                    for (const tri of [[[a, c], [b, c], [a, d]], [[a, d], [b, c], [b, d]]]) {
                        const points = tri.map(([t, w]) => point(t, w));
                        const n = norm(cross(add(points[1], points[0], -1), add(points[2], points[0], -1)));
                        for (const p of points)
                            vertex(leaves, p, n, undefined, 0, 0, 7);
                    }
                }
            tube(leaves, Array.from({ length: 13 }, (_, i) => add(point(i / 12, 0), [0, 0, .12])), .17, 8);
            for (const t of [.3, .48, .66])
                for (const w of [-1, 1])
                    tube(leaves, [add(point(t, 0), [0, 0, .13]), add(point(t + .16, w * .82), [0, 0, .13])], .07, 8);
        }
    }
    return new Float32Array(leaves);
}
/** Canvas projection works on devices without WebGL. Geometry and hair
 * stay attached in 3D; only their final rasterization uses the 2D context. */
export function createEvolvedRenderer(canvas, form, detail = 'portrait') {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx)
        throw new Error('Canvas unavailable');
    const shape = EVOLVED_SHAPES[form], r = shape.radius;
    const colors = [[255, 229, 155], [200, 233, 184], [175, 220, 228], [192, 185, 230], [221, 183, 219], [174, 222, 198], [251, 193, 201], [255, 210, 192]];
    const coat = (p) => {
        let c = [250, 247, 238];
        if (form === 'stage4') {
            // Broad pastel patches continue around the body without a seam.
            const angle = Math.atan2(p[0], -p[1]) + p[2] * .004;
            const index = ((angle / (Math.PI / 4)) % 8 + 8) % 8, lo = Math.floor(index), t = (1 - Math.cos((index - lo) * Math.PI)) / 2;
            c = colors[lo].map((v, i) => v * (1 - t) + colors[(lo + 1) % 8][i] * t);
            const center = Math.exp(-(p[0] ** 2 + (p[1] + 9) ** 2) / 150) * .65;
            c = c.map((v, i) => v * (1 - center) + [255, 230, 155][i] * center);
        }
        if (p[2] > 20) {
            const cheek = (Math.exp(-(((p[0] + 18) / 6.2) ** 2) - ((p[1] - shape.eyeY - 8) / 3.9) ** 2) + Math.exp(-(((p[0] - 18) / 6.2) ** 2) - ((p[1] - shape.eyeY - 8) / 3.9) ** 2)) * .55 * Math.min(1, (p[2] - 20) / 9);
            c = c.map((v, i) => v * (1 - cheek) + [242, 161, 166][i] * cheek);
        }
        return c;
    };
    const fibreCount = detail === 'room' ? 7200 : 14000;
    const hairs = Array.from({ length: fibreCount }, (_, i) => {
        const y = 1 - 2 * (i + .5) / fibreCount, a = i * 2.399963229728653 + (random(i + 108) - .5) * .18, s = Math.sqrt(1 - y * y);
        const p = [r[0] * s * Math.cos(a), Math.min(shape.floor, r[1] * y), r[2] * s * Math.sin(a)];
        const n = norm([p[0] / r[0] ** 2, p[1] / r[1] ** 2, p[2] / r[2] ** 2]);
        const down = [p[0] * .018, .5 + p[1] * .013, p[2] * .009], tangent = norm(add(down, n, -dot(down, n)));
        const length = 1.4 + random(i) * 2.1, bend = 1.5 + random(i + 8) * 2.3;
        const mid = add(add(p, n, length * .55), tangent, bend * .2), tip = add(add(p, n, length), tangent, bend);
        mid[1] = Math.min(shape.floor + 1.3, mid[1]);
        tip[1] = Math.min(shape.floor + 1.3, tip[1]);
        return { p, n, mid, tip, color: coat(p), variation: random(i + 49) };
    });
    const leafMesh = createEvolvedLeafMesh(form);
    let disposed = false;
    return {
        render(pose) {
            if (disposed)
                return;
            const started = performance.now();
            const m = evolvedRotation(pose.rx, pose.ry, pose.rz), origin = evolvedGroundOffset(form, m);
            const rot = (p) => [m[0] * p[0] + m[3] * p[1] + m[6] * p[2], m[1] * p[0] + m[4] * p[1] + m[7] * p[2], m[2] * p[0] + m[5] * p[1] + m[8] * p[2]];
            const surface = (x, y) => [x, y, r[2] * Math.sqrt(Math.max(0, 1 - (x / r[0]) ** 2 - (y / r[1]) ** 2))];
            const normalAt = (p) => norm([p[0] / r[0] ** 2, p[1] / r[1] ** 2, p[2] / r[2] ** 2]);
            ctx.setTransform(canvas.width / 100, 0, 0, canvas.height / 100, 0, 0);
            ctx.clearRect(0, 0, 100, 100);
            ctx.translate(50, origin);
            ctx.scale(EVOLVED_CAMERA_SCALE, EVOLVED_CAMERA_SCALE);
            // Covariance of the projected ellipsoid gives its exact smooth silhouette.
            const ellipse = (center, radii) => {
                const xx = (m[0] * radii[0]) ** 2 + (m[3] * radii[1]) ** 2 + (m[6] * radii[2]) ** 2;
                const yy = (m[1] * radii[0]) ** 2 + (m[4] * radii[1]) ** 2 + (m[7] * radii[2]) ** 2;
                const xy = m[0] * m[1] * radii[0] ** 2 + m[3] * m[4] * radii[1] ** 2 + m[6] * m[7] * radii[2] ** 2;
                const delta = Math.sqrt((xx - yy) ** 2 + 4 * xy * xy), a = Math.sqrt((xx + yy + delta) / 2), b = Math.sqrt(Math.max(.01, (xx + yy - delta) / 2));
                const q = rot(center);
                ctx.beginPath();
                ctx.ellipse(q[0], q[1], a, b, .5 * Math.atan2(2 * xy, xx - yy), 0, Math.PI * 2);
                return q;
            };
            const light = norm([-.45, -.68, .8]);
            const color = (c, shade = 1) => `rgb(${c.map((v, i) => Math.round(Math.min(255, v * shade * (pose.night ? [.91, .94, 1][i] : 1)))).join(',')})`;
            // Leaves behind the head are painted before the coat; front leaves after.
            const drawLeaves = (front) => {
                const triangles = [];
                for (let i = 0; i < leafMesh.length; i += STRIDE * 3) {
                    const p = [0, 1, 2].map(j => rot([leafMesh[i + j * STRIDE], leafMesh[i + j * STRIDE + 1], leafMesh[i + j * STRIDE + 2]]));
                    const z = p.reduce((sum, q) => sum + q[2], 0) / 3;
                    if ((z >= 0) !== front)
                        continue;
                    triangles.push({ p, n: rot([leafMesh[i + 3], leafMesh[i + 4], leafMesh[i + 5]]), z, material: leafMesh[i + 11] });
                }
                triangles.sort((a, b) => a.z - b.z);
                for (const t of triangles) {
                    ctx.beginPath();
                    ctx.moveTo(t.p[0][0], t.p[0][1]);
                    ctx.lineTo(t.p[1][0], t.p[1][1]);
                    ctx.lineTo(t.p[2][0], t.p[2][1]);
                    ctx.closePath();
                    ctx.fillStyle = color(t.material === 8 ? [179, 208, 102] : [126, 177, 49], .77 + .23 * Math.abs(dot(t.n, light)));
                    ctx.strokeStyle = ctx.fillStyle;
                    ctx.lineWidth = .1;
                    ctx.fill();
                    ctx.stroke();
                }
            };
            drawLeaves(false);
            ellipse([0, 0, 0], r);
            const bodyGradient = ctx.createRadialGradient(-14, -18, 4, 3, 4, 49);
            bodyGradient.addColorStop(0, color(form === 'stage4' ? [239, 228, 187] : [255, 254, 247]));
            bodyGradient.addColorStop(.6, color(form === 'stage4' ? [205, 213, 195] : [241, 240, 229]));
            bodyGradient.addColorStop(1, color(form === 'stage4' ? [167, 169, 178] : [174, 181, 174]));
            ctx.fillStyle = bodyGradient;
            ctx.fill();
            ctx.save();
            ctx.clip();
            if (form === 'stage4') {
                const patches = hairs.filter((_, i) => i % 700 === 0).map(h => ({ p: h.p, q: rot(h.p) })).filter(h => h.q[2] > 0).sort((a, b) => a.q[2] - b.q[2]);
                for (const patch of patches) {
                    const c = coat(patch.p), g = ctx.createRadialGradient(patch.q[0], patch.q[1], 0, patch.q[0], patch.q[1], 25);
                    g.addColorStop(0, color(c));
                    g.addColorStop(1, `rgba(${c.join(',')},0)`);
                    ctx.fillStyle = g;
                    ctx.fillRect(-50, -50, 100, 100);
                }
            }
            ctx.restore();
            const groups = new Map();
            for (const hair of hairs) {
                const n = rot(hair.n);
                if (n[2] < -.06)
                    continue;
                const p = rot(hair.p), mid = rot(hair.mid), tip = rot(hair.tip);
                const shade = (.82 + .18 * Math.max(0, dot(n, light)) - .05 * Math.max(0, hair.p[1] / r[1])) * (.92 + .10 * hair.variation);
                const c = hair.color.map(v => Math.round(v * shade / 4) * 4);
                const key = color(c);
                let path = groups.get(key);
                if (!path) {
                    path = new Path2D();
                    groups.set(key, path);
                }
                path.moveTo(p[0], p[1]);
                path.quadraticCurveTo(mid[0], mid[1], tip[0], tip[1]);
            }
            ctx.lineCap = 'round';
            ctx.lineWidth = .115;
            for (const [c, path] of groups) {
                ctx.strokeStyle = c;
                ctx.stroke(path);
            }
            const visible = (p) => rot(normalAt(p))[2] > .04;
            for (const x of [-18, 18]) {
                const p = surface(x, shape.eyeY + 8);
                if (!visible(p))
                    continue;
                const q = rot(p), facing = Math.max(.05, rot(normalAt(p))[2]);
                ctx.save();
                ctx.translate(q[0], q[1]);
                ctx.rotate(pose.rz);
                ctx.scale(facing, .61);
                const blush = ctx.createRadialGradient(0, 0, 0, 0, 0, 7.6);
                blush.addColorStop(0, 'rgba(240,151,157,.44)');
                blush.addColorStop(.55, 'rgba(240,167,171,.20)');
                blush.addColorStop(1, 'rgba(240,180,183,0)');
                ctx.fillStyle = blush;
                ctx.fillRect(-8, -8, 16, 16);
                ctx.restore();
            }
            for (const x of [-10.1, 10.1]) {
                const p = surface(x, shape.eyeY);
                if (!visible(p))
                    continue;
                p[2] += .7;
                const shut = pose.sleepy ? 1 : pose.blink, ey = 4.6 * Math.max(.11, 1 - shut);
                ellipse(p, [4.6, ey + .65, 1.9]);
                ctx.fillStyle = 'rgba(121,125,110,.36)';
                ctx.fill();
                p[2] += 1.5;
                const q = ellipse(p, [4.1, ey, 2.1]);
                const eye = ctx.createRadialGradient(q[0] - 1.3, q[1] - 1.8, .3, q[0], q[1], 4.8);
                eye.addColorStop(0, '#454b42');
                eye.addColorStop(.35, '#151c16');
                eye.addColorStop(1, '#070d09');
                ctx.fillStyle = eye;
                ctx.fill();
                if (shut < .5) {
                    ctx.save();
                    ctx.clip();
                    ctx.fillStyle = 'rgba(255,255,255,.94)';
                    ctx.beginPath();
                    ctx.ellipse(q[0] + 1.1, q[1] - 1.6, 1, 1.15, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,.42)';
                    ctx.beginPath();
                    ctx.arc(q[0] - 1.1, q[1] + 1.3, .43, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
            if (pose.mouthOpen > .08) {
                const p = surface(0, shape.mouthY);
                if (visible(p)) {
                    p[2] += 2;
                    ellipse(p, [4.1, 4.7 * pose.mouthOpen, .5]);
                    ctx.fillStyle = '#654442';
                    ctx.fill();
                }
            }
            else {
                ctx.beginPath();
                let connected = false;
                for (let i = 0; i <= 30; i++) {
                    const x = -7.5 + i * .5, y = shape.mouthY + (pose.happy ? 1 : -1) * 2.2 * (1 - (x / 8.5) ** 2), p = surface(x, y);
                    if (!visible(p)) {
                        connected = false;
                        continue;
                    }
                    p[2] += 2.1;
                    const q = rot(p);
                    if (connected)
                        ctx.lineTo(q[0], q[1]);
                    else
                        ctx.moveTo(q[0], q[1]);
                    connected = true;
                }
                ctx.lineWidth = 1.7;
                ctx.strokeStyle = '#252d21';
                ctx.stroke();
            }
            drawLeaves(true);
            if (pose.smoking) {
                const p = surface(7.5, shape.mouthY);
                if (visible(p)) {
                    p[2] += 3;
                    const at = (x) => rot([p[0] + x, p[1] - .04 * x, p[2] + .22 * x]);
                    for (const [a, b, c] of [[0, 5, '#c5a174'], [5, 18, '#f3eee1'], [18, 19, '#e99461']]) {
                        const q = at(a), end = at(b);
                        ctx.beginPath();
                        ctx.moveTo(q[0], q[1]);
                        ctx.lineTo(end[0], end[1]);
                        ctx.lineWidth = 1.65;
                        ctx.strokeStyle = c;
                        ctx.stroke();
                    }
                    const q = at(19);
                    ctx.beginPath();
                    ctx.moveTo(q[0], q[1] - 2);
                    ctx.bezierCurveTo(q[0] + 6, q[1] - 12, q[0] - 4, q[1] - 17, q[0] + 1, q[1] - 25);
                    ctx.strokeStyle = 'rgba(231,233,225,.65)';
                    ctx.lineWidth = .65;
                    ctx.stroke();
                }
            }
            canvas.dataset.renderMs = (performance.now() - started).toFixed(1);
        },
        dispose() { disposed = true; },
    };
}
