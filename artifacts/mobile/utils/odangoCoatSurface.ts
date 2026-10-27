type Point = [number, number, number];
type Vertex = {p: Point; u: number; sideU: number; v: number; sideWeight: number};
export type CoatTriangle = [Vertex, Vertex, Vertex];

/** Reuse the original faceless coat on a volume; the rear uses the same white
 * fur, with no invented markings. UVs stay inside the source's opaque coat. */
export function odangoCoatSurface(r: Point): CoatTriangle[] {
  const rings = 16, slices = 32;
  const vertex = (i: number, j: number): Vertex => {
    const latitude = Math.PI * i / rings, longitude = Math.PI * 2 * j / slices;
    const x = Math.sin(latitude) * Math.cos(longitude), y = -Math.cos(latitude), z = Math.sin(latitude) * Math.sin(longitude);
    return {p: [r[0] * x, r[1] * y, r[2] * z], u: .5 + x * .41, sideU: .5 + z * .41, v: .50 + y * .37, sideWeight: x*x/(x*x+z*z||1)};
  };
  const triangles: CoatTriangle[] = [];
  for (let i = 0; i < rings; i++) for (let j = 0; j < slices; j++) {
    const a = vertex(i, j), b = vertex(i + 1, j), c = vertex(i, j + 1), d = vertex(i + 1, j + 1);
    if (i > 0) triangles.push([a, b, c]);
    if (i < rings - 1) triangles.push([c, b, d]);
  }
  return triangles;
}

export function paintOdangoCoat(ctx: CanvasRenderingContext2D, texture: HTMLImageElement, mesh: CoatTriangle[], project: (p: Point) => Point) {
  const visible = mesh.map(triangle => ({triangle, q: triangle.map(v => project(v.p))})).filter(t => t.q.reduce((z, q) => z + q[2], 0) > 0);
  visible.sort((a, b) => a.q.reduce((z, q) => z + q[2], 0) - b.q.reduce((z, q) => z + q[2], 0));
  const w = texture.naturalWidth, h = texture.naturalHeight;
  for (const {triangle, q} of visible) {
   // Blend front and side projections in model space: the long coat retains
   // its strand width on a profile instead of becoming horizontal streaks.
   const sideWeight=triangle.reduce((sum,v)=>sum+v.sideWeight,0)/3;
   for(const side of [false,true]){
    if(side&&sideWeight<.005)continue;
    const [a, b, c] = triangle.map(v => [(side?v.sideU:v.u) * w, v.v * h]);
    const u1 = b[0] - a[0], v1 = b[1] - a[1], u2 = c[0] - a[0], v2 = c[1] - a[1], det = u1 * v2 - u2 * v1;
    if (Math.abs(det) < .001) continue;
    const x1 = q[1][0] - q[0][0], y1 = q[1][1] - q[0][1], x2 = q[2][0] - q[0][0], y2 = q[2][1] - q[0][1];
    const aa = (x1 * v2 - x2 * v1) / det, bb = (y1 * v2 - y2 * v1) / det;
    const cc = (x2 * u1 - x1 * u2) / det, dd = (y2 * u1 - y1 * u2) / det;
    const center = [(q[0][0] + q[1][0] + q[2][0]) / 3, (q[0][1] + q[1][1] + q[2][1]) / 3];
    ctx.save();if(side)ctx.globalAlpha*=sideWeight;ctx.beginPath();
    q.forEach((p, i) => {
      // A tiny overlap hides raster seams without revealing the source boundary.
      const dx = p[0] - center[0], dy = p[1] - center[1], scale = 1 + .13 / Math.max(.1, Math.hypot(dx, dy));
      const x = center[0] + dx * scale, y = center[1] + dy * scale;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.closePath();ctx.clip();
    ctx.transform(aa, bb, cc, dd, q[0][0] - aa * a[0] - cc * a[1], q[0][1] - bb * a[0] - dd * a[1]);
    ctx.drawImage(texture, 0, 0);ctx.restore();
   }
  }
}
