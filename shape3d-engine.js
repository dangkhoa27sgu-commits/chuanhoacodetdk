/* ===== shape3d-engine.js — KMath · Hình 3D: lõi dựng & vẽ khối không gian (không phụ thuộc giao diện).
   Dùng chung cho tab "Hình 3D" (shape3d.js) và lệnh khoi3d(...) trong tab Tạo video (app.js).
   Phép chiếu song song xiên chuẩn SGK (A sau-trái, B trước-trái, C trước-phải, D sau-phải) hoặc vuông góc;
   nét khuất nét đứt, nhãn tự tránh chồng, mặt logic để tô, trải phẳng (tự tìm hình trải không chồng),
   khối tròn xoay có góc quét, xuất TikZ thuần. Danh mục hình nằm ở shape3d-catalog.js. Lộ ra window.KHinh3D. ===== */
(() => {
"use strict";
const DEG = Math.PI / 180, TAU = Math.PI * 2;
/* ================= Vectơ & quaternion ================= */
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(a[0], a[1], a[2]);
const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const qMul = (a, b) => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
const qAxis = (ax, ang) => { const s = Math.sin(ang / 2); return [Math.cos(ang / 2), ax[0] * s, ax[1] * s, ax[2] * s]; };
const qNorm = q => { const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return q.map(x => x / l); };
const qToMat = q => { const [w, x, y, z] = q; return [
  [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
  [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
  [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]]; };
const matToQ = m => {
  const t = m[0][0] + m[1][1] + m[2][2]; let w, x, y, z, s;
  if (t > 0) { s = Math.sqrt(t + 1) * 2; w = .25 * s; x = (m[2][1] - m[1][2]) / s; y = (m[0][2] - m[2][0]) / s; z = (m[1][0] - m[0][1]) / s; }
  else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) { s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2; w = (m[2][1] - m[1][2]) / s; x = .25 * s; y = (m[0][1] + m[1][0]) / s; z = (m[0][2] + m[2][0]) / s; }
  else if (m[1][1] > m[2][2]) { s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2; w = (m[0][2] - m[2][0]) / s; x = (m[0][1] + m[1][0]) / s; y = .25 * s; z = (m[1][2] + m[2][1]) / s; }
  else { s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2; w = (m[1][0] - m[0][1]) / s; x = (m[0][2] + m[2][0]) / s; y = (m[1][2] + m[2][1]) / s; z = .25 * s; }
  return qNorm([w, x, y, z]);
};
const slerp = (a, b, t) => {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (d < 0) { b = b.map(x => -x); d = -d; }
  if (d > .9995) return qNorm(a.map((x, i) => x + (b[i] - x) * t));
  const th = Math.acos(d), s = Math.sin(th);
  return a.map((x, i) => (x * Math.sin((1 - t) * th) + b[i] * Math.sin(t * th)) / s);
};
/* Camera nhìn từ hướng (θ, φ): hàng ma trận = phải, lên, hướng về người xem. Oz hướng lên khi φ ∈ (−90°; 90°). */
const qTuGoc = (th, ph) => {
  th *= DEG; ph *= DEG;
  const d = [Math.cos(ph) * Math.cos(th), Math.cos(ph) * Math.sin(th), Math.sin(ph)];
  const r = [-Math.sin(th), Math.cos(th), 0];
  return matToQ([r, cross(d, r), d]);
};
/* Góc nhìn vuông góc (dùng cho video và nút "Vuông góc 3D") */
const GOC = { sgk: [28, 17], vuong: [28, 17], truoc: [0, 0], tren: [0, 89.9], nghieng: [45, 35.26], xuong: [0, 56] };
/* Phép chiếu song song xiên kiểu SGK: Oy nằm ngang sang phải, Oz thẳng đứng, Ox hướng về người xem
   vẽ chéo xuống trái (hệ số rút ngắn k, góc a). Đúng bố cục: A sau-trái, B trước-trái, C trước-phải, D sau-phải. */
const MAT_SGK = [[0, 1, 0], [0, 0, 1], [1, 0, 0]], MAT_NGANG = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const XIEN_SGK = { k: .5, a: 40 * DEG };
function maTranChieu(q, xien) {
  const R = qToMat(q);
  if (!xien) return { Rq: R, r0: R[0], r1: R[1], dv: R[2] };
  const kx = xien.k * Math.cos(xien.a), ky = xien.k * Math.sin(xien.a);
  return { Rq: R, r0: sub(R[0], mul(R[2], kx)), r1: sub(R[1], mul(R[2], ky)), dv: norm(add(add(mul(R[0], kx), mul(R[1], ky)), R[2])) };
}
/* camera theo tên góc nhìn: sgk = song song xiên (theo hướng riêng của từng hình), còn lại vuông góc */
function camGoc(ten, S) {
  if (ten === "sgk") { const g = S && S.gocSgk; if (g && g.q) return { q: g.q, xien: null }; return { q: matToQ(g || MAT_SGK), xien: XIEN_SGK }; } // khối tròn: vuông góc (đường tròn → elip nằm ngang)
  const g = GOC[ten] || GOC.vuong; return { q: qTuGoc(g[0], g[1]), xien: null };
}

/* ================= Định dạng số kiểu Việt Nam ================= */
const so = (v, n = 2) => (Math.abs(v) < 1e-9 ? 0 : v).toLocaleString("vi-VN", { maximumFractionDigits: n });
const boDau = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/* ================= Bộ dịch biểu thức f(x) (không dùng eval) ================= */
const HAM = { sin: Math.sin, cos: Math.cos, tan: Math.tan, cot: x => 1 / Math.tan(x), sqrt: Math.sqrt, can: Math.sqrt, exp: Math.exp, ln: Math.log, log: Math.log10, abs: Math.abs, asin: Math.asin, acos: Math.acos, atan: Math.atan, arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan };
const HANG = { pi: Math.PI, e: Math.E };
const TU = [...Object.keys(HAM), ...Object.keys(HANG), "x"].sort((a, b) => b.length - a.length);
function bienDich(src) {
  const s = String(src).replace(/\s+/g, "").replace(/,/g, ".").replace(/√/g, "sqrt").replace(/π/g, "pi").replace(/[×·]/g, "*").replace(/−/g, "-").replace(/²/g, "^2").replace(/³/g, "^3");
  if (!s) throw new Error("Hãy nhập hàm số f(x).");
  const tk = []; let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/[0-9.]/.test(ch)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; const t = s.slice(i, j); if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) throw new Error("Số không hợp lệ: " + t); tk.push({ t: "n", v: parseFloat(t) }); i = j; continue; }
    if (/[a-z]/i.test(ch)) {
      let j = i; while (j < s.length && /[a-z]/i.test(s[j])) j++;
      let w = s.slice(i, j).toLowerCase(); i = j;
      while (w) { const k = TU.find(x => w.startsWith(x)); if (!k) throw new Error("Không hiểu “" + w + "”. Dùng: x, sin, cos, tan, sqrt, exp, ln, log, abs, pi, e."); tk.push({ t: "w", v: k }); w = w.slice(k.length); }
      continue;
    }
    if ("+-*/^()".includes(ch)) { tk.push({ t: ch }); i++; continue; }
    throw new Error("Ký tự không hợp lệ: " + ch);
  }
  let p = 0;
  const an = t => (tk[p] && tk[p].t === t ? (p++, true) : false);
  const bieuThuc = () => { let a = hang(); for (;;) { if (an("+")) { const l = a, r = hang(); a = x => l(x) + r(x); } else if (an("-")) { const l = a, r = hang(); a = x => l(x) - r(x); } else return a; } };
  const hang = () => { let a = motNgoi(); for (;;) {
    if (an("*")) { const l = a, r = motNgoi(); a = x => l(x) * r(x); }
    else if (an("/")) { const l = a, r = motNgoi(); a = x => l(x) / r(x); }
    else if (tk[p] && (tk[p].t === "n" || tk[p].t === "w" || tk[p].t === "(")) { const l = a, r = motNgoi(); a = x => l(x) * r(x); }
    else return a; } };
  const motNgoi = () => { if (an("-")) { const u = motNgoi(); return x => -u(x); } if (an("+")) return motNgoi(); return luyThua(); };
  const luyThua = () => { const b = coSo(); if (an("^")) { const e = motNgoi(); return x => Math.pow(b(x), e(x)); } return b; };
  const coSo = () => {
    const t = tk[p]; if (!t) throw new Error("Biểu thức chưa hoàn chỉnh.");
    if (t.t === "n") { p++; const v = t.v; return () => v; }
    if (t.t === "(") { p++; const e = bieuThuc(); if (!an(")")) throw new Error("Thiếu dấu “)”."); return e; }
    if (t.t === "w") { p++;
      if (t.v === "x") return x => x;
      if (t.v in HANG) { const v = HANG[t.v]; return () => v; }
      const f = HAM[t.v];
      if (an("(")) { const e = bieuThuc(); if (!an(")")) throw new Error("Thiếu dấu “)”."); return x => f(e(x)); }
      const e = luyThua(); return x => f(e(x));
    }
    throw new Error("Không hiểu dấu “" + t.t + "”.");
  };
  const f = bieuThuc();
  if (p < tk.length) throw new Error("Thừa ký tự gần “" + (tk[p].v ?? tk[p].t) + "”.");
  return f;
}

/* ================= Hình học phẳng: tam giác hoá đa giác (cả đa giác lõm), pháp tuyến Newell ================= */
const cheo2 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const dtCo = pts => { let s = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; s += p[0] * q[1] - q[0] * p[1]; } return s / 2; };
function catTamGiac(p2) { // trả các bộ ba chỉ số; đa giác đơn bất kỳ, thuật toán cắt tai
  const n = p2.length; if (n < 3) return [];
  let V = [...Array(n).keys()]; if (dtCo(p2) < 0) V.reverse();
  const out = [], trong = (p, a, b, c) => cheo2(a, b, p) >= -1e-12 && cheo2(b, c, p) >= -1e-12 && cheo2(c, a, p) >= -1e-12;
  let lap = 0;
  while (V.length > 3 && lap++ < 5000) {
    let cat = false;
    for (let i = 0; i < V.length; i++) {
      const ia = V[(i + V.length - 1) % V.length], ib = V[i], ic = V[(i + 1) % V.length], a = p2[ia], b = p2[ib], c = p2[ic];
      if (cheo2(a, b, c) <= 1e-12) continue;
      let co = false; for (const j of V) { if (j === ia || j === ib || j === ic) continue; const p = p2[j]; if ((p[0] !== a[0] || p[1] !== a[1]) && (p[0] !== c[0] || p[1] !== c[1]) && trong(p, a, b, c)) { co = true; break; } }
      if (co) continue;
      out.push([ia, ib, ic]); V.splice(i, 1); cat = true; break;
    }
    if (!cat) { for (let i = 1; i < V.length - 1; i++) out.push([V[0], V[i], V[i + 1]]); return out; }
  }
  if (V.length === 3) out.push([V[0], V[1], V[2]]);
  return out;
}
const phapNewell = pts => { let n = [0, 0, 0]; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; n = add(n, [(p[1] - q[1]) * (p[2] + q[2]), (p[2] - q[2]) * (p[0] + q[0]), (p[0] - q[0]) * (p[1] + q[1])]); } return norm(n); };
function heMatPhang(n) { const a = Math.abs(n[0]) < .9 ? [1, 0, 0] : [0, 1, 0], u = norm(cross(n, a)); return [u, cross(n, u)]; }
function tamGiacHoa3(pts) { const n = phapNewell(pts), [u, v] = heMatPhang(n); return catTamGiac(pts.map(p => [dot(p, u), dot(p, v)])); }

/* ================= Bao lồi 3D (cho khối đều, bán đều) ================= */
function baoLoi(P) {
  const n = P.length, E = 1e-9;
  let i0 = 0, i1 = -1, i2 = -1, i3 = -1, d = -1;
  for (let i = 1; i < n; i++) { const t = len(sub(P[i], P[i0])); if (t > d) { d = t; i1 = i; } }
  d = -1; for (let i = 0; i < n; i++) { const t = len(cross(sub(P[i1], P[i0]), sub(P[i], P[i0]))); if (t > d) { d = t; i2 = i; } }
  const n0 = norm(cross(sub(P[i1], P[i0]), sub(P[i2], P[i0])));
  d = -1; for (let i = 0; i < n; i++) { const t = Math.abs(dot(n0, sub(P[i], P[i0]))); if (t > d) { d = t; i3 = i; } }
  const ct = mul(add(add(P[i0], P[i1]), add(P[i2], P[i3])), .25);
  const mk = (a, b, c) => { let f = [a, b, c], nn = norm(cross(sub(P[b], P[a]), sub(P[c], P[a]))); if (dot(nn, sub(ct, P[a])) > 0) { f = [a, c, b]; nn = mul(nn, -1); } return { v: f, n: nn, d: dot(nn, P[f[0]]) }; };
  let F = [mk(i0, i1, i2), mk(i0, i1, i3), mk(i0, i2, i3), mk(i1, i2, i3)];
  for (let i = 0; i < n; i++) {
    if (i === i0 || i === i1 || i === i2 || i === i3) continue;
    const thay = F.filter(f => dot(f.n, P[i]) - f.d > E); if (!thay.length) continue;
    const canh = new Set(); thay.forEach(f => { for (let k = 0; k < 3; k++) canh.add(f.v[k] + "_" + f.v[(k + 1) % 3]); });
    const vien = []; canh.forEach(k => { const [a, b] = k.split("_"); if (!canh.has(b + "_" + a)) vien.push([+a, +b]); });
    F = F.filter(f => !thay.includes(f));
    vien.forEach(([a, b]) => { const nn = norm(cross(sub(P[b], P[a]), sub(P[i], P[a]))); F.push({ v: [a, b, i], n: nn, d: dot(nn, P[a]) }); });
  }
  // gộp các tam giác đồng phẳng kề nhau thành một mặt đa giác
  const nhom = F.map((_, i) => i), goc = i => nhom[i] === i ? i : (nhom[i] = goc(nhom[i]));
  const theoCanh = new Map(); F.forEach((f, i) => { for (let k = 0; k < 3; k++) theoCanh.set(f.v[k] + "_" + f.v[(k + 1) % 3], i); });
  F.forEach((f, i) => { for (let k = 0; k < 3; k++) { const j = theoCanh.get(f.v[(k + 1) % 3] + "_" + f.v[k]); if (j != null && dot(f.n, F[j].n) > 1 - 1e-7) nhom[goc(i)] = goc(j); } });
  const ds = new Map(); F.forEach((f, i) => { const g = goc(i); if (!ds.has(g)) ds.set(g, []); ds.get(g).push(f); });
  const mat = [];
  for (const fs of ds.values()) {
    const ra = new Map(); fs.forEach(f => { for (let k = 0; k < 3; k++) ra.set(f.v[k] + "_" + f.v[(k + 1) % 3], [f.v[k], f.v[(k + 1) % 3]]); });
    const tiep = new Map(); for (const [k, [a, b]] of ra) if (!ra.has(b + "_" + a)) tiep.set(a, b);
    const s = tiep.keys().next().value, loop = [s]; let u = tiep.get(s), g = 0;
    while (u !== s && g++ < 100) { loop.push(u); u = tiep.get(u); }
    mat.push(loop);
  }
  return mat;
}
/* đặt khối nằm trên mặt Oxy: mặt fi (chỉ số đỉnh) úp xuống đáy, cạnh f[0]→f[1] song song Ox, tâm hộp bao tại gốc */
function datMatDay(P, f) {
  const pts = f.map(i => P[i]), n = phapNewell(pts), ct = P.reduce((a, p) => add(a, p), [0, 0, 0]).map(x => x / P.length);
  const nn = dot(n, sub(pts[0], ct)) < 0 ? mul(n, -1) : n; // pháp tuyến hướng ra ngoài
  const z = mul(nn, -1), x0 = norm(sub(pts[1], pts[0])), y0 = cross(z, x0);
  let Q = P.map(p => [dot(p, x0), dot(p, y0), dot(p, z)]);
  const mn = [0, 1, 2].map(i => Math.min(...Q.map(p => p[i]))), mx = [0, 1, 2].map(i => Math.max(...Q.map(p => p[i])));
  return Q.map(p => [p[0] - (mn[0] + mx[0]) / 2, p[1] - (mn[1] + mx[1]) / 2, p[2] - mn[2]]);
}

/* ================= Lưới tam giác có "mặt logic" ================= */
class Luoi {
  constructor() { this.v = []; this.t = []; this.g = []; this.canh = []; this.phu = []; this.nhan = []; this.wire = []; this.neo = []; this.noiBat = []; this.ghiChu = ""; this.tt = ""; }
  diem(p) { this.v.push(p); return this.v.length - 1; }
  mat(ten, o) { this.g.push(Object.assign({ ten, phang: false, tron: false, poly: null }, o || {})); return this.g.length - 1; }
  /* tam giác, tự đảo chiều để pháp tuyến hướng ra ngoài khối (ra: vectơ hoặc hàm của trọng tâm) */
  tg(a, b, c, g, ra) {
    const A = this.v[a], B = this.v[b], C = this.v[c], n = cross(sub(B, A), sub(C, A));
    if (len(n) < 1e-12) return;
    const tam = mul(add(add(A, B), C), 1 / 3), o = typeof ra === "function" ? ra(tam) : ra;
    this.t.push(dot(n, o) < 0 ? [a, c, b, g] : [a, b, c, g]);
  }
  daGiac(pts, g, ra) { const id = pts.map(p => this.diem(p)); for (const [a, b, c] of tamGiacHoa3(pts)) this.tg(id[a], id[b], id[c], g, ra); return id; }
  quat(tam, vien, g, ra, kin) { const c = this.diem(tam), id = vien.map(p => this.diem(p)), m = kin ? id.length : id.length - 1; for (let k = 0; k < m; k++) this.tg(c, id[k], id[(k + 1) % id.length], g, ra); }
  luoiUV(nu, nv, fn, g, ra, vong) {
    const cot = vong ? nu : nu + 1, id = [];
    for (let i = 0; i < cot; i++) { const r = []; for (let j = 0; j <= nv; j++) r.push(this.diem(fn(i, j))); id.push(r); }
    for (let i = 0; i < nu; i++) { const i1 = vong ? (i + 1) % nu : i + 1;
      for (let j = 0; j < nv; j++) { this.tg(id[i][j], id[i1][j], id[i1][j + 1], g, ra); this.tg(id[i][j], id[i1][j + 1], id[i][j + 1], g, ra); } }
    return id;
  }
}
const dienTichDaGiac = pts => { let s = [0, 0, 0]; for (let i = 0; i < pts.length; i++) s = add(s, cross(pts[i], pts[(i + 1) % pts.length])); return len(s) / 2; };
const giao2D = (p1, p2, p3, p4) => { const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]); if (Math.abs(d) < 1e-12) return [(p1[0] + p3[0]) / 2, (p1[1] + p3[1]) / 2];
  const a = p1[0] * p2[1] - p1[1] * p2[0], b = p3[0] * p4[1] - p3[1] * p4[0];
  return [(a * (p3[0] - p4[0]) - (p1[0] - p2[0]) * b) / d, (a * (p3[1] - p4[1]) - (p1[1] - p2[1]) * b) / d]; };
function theTichLuoi(L) { let V = 0; for (const [a, b, c] of L.t) V += dot(L.v[a], cross(L.v[b], L.v[c])) / 6; return Math.abs(V); }
function trongTam(L) {
  let V = 0, c = [0, 0, 0];
  for (const [a, b, d] of L.t) { const A = L.v[a], Bv = L.v[b], C = L.v[d], v = dot(A, cross(Bv, C)) / 6; V += v; c = add(c, mul(add(add(A, Bv), C), v / 4)); }
  return Math.abs(V) < 1e-12 ? [0, 0, 0] : mul(c, 1 / V);
}

/* ================= Bộ dựng chung: đa diện từ danh sách đỉnh + mặt ================= */
// mặt nào có pháp tuyến ngược sẽ được lật nhờ đếm số lần tia cắt (đúng cả với khối lõm)
function tiaCat(o, d, A, B, C) { const e1 = sub(B, A), e2 = sub(C, A), p = cross(d, e2), det = dot(e1, p); if (Math.abs(det) < 1e-12) return false;
  const iv = 1 / det, s = sub(o, A), u = dot(s, p) * iv; if (u < 0 || u > 1) return false; const q = cross(s, e1), v = dot(d, q) * iv; if (v < 0 || u + v > 1) return false; return dot(e2, q) * iv > 1e-9; }
function daDien(L, ten, P, mats, o) {
  o = o || {};
  const ds = mats.map(m => Array.isArray(m) ? { ds: m } : m), tri = [];
  ds.forEach((m, fi) => { const pts = m.ds.map(i => P[i]); tamGiacHoa3(pts).forEach(([a, b, c]) => tri.push([pts[a], pts[b], pts[c], fi])); });
  const daCanh = new Set(), tenMat = m => m.ten || (m.ds.every(i => ten[i]) ? "Mặt " + m.ds.map(i => ten[i]).join("") : "Mặt " + (ds.indexOf(m) + 1));
  ds.forEach((m, fi) => {
    const pts = m.ds.map(i => P[i]); let n = phapNewell(pts);
    const t0 = tri.find(t => t[3] === fi); if (!t0) return;
    const c = mul(add(add(t0[0], t0[1]), t0[2]), 1 / 3), dir = norm(add(n, [.0123, .0071, .0049])), goc0 = add(c, mul(n, 1e-6));
    let dem = 0; for (const t of tri) if (t[3] !== fi && tiaCat(goc0, dir, t[0], t[1], t[2])) dem++;
    if (dem % 2) n = mul(n, -1);
    L.daGiac(pts, L.mat(tenMat(m), Object.assign({ phang: true, poly: pts }, m.o || {})), n);
    if (!m.khongCanh) for (let k = 0; k < m.ds.length; k++) { const a = m.ds[k], b = m.ds[(k + 1) % m.ds.length], key = a < b ? a + "_" + b : b + "_" + a;
      if (!daCanh.has(key) && !(o.boCanh && o.boCanh.has(key))) { daCanh.add(key); L.canh.push([P[a], P[b]]); } }
  });
  ten.forEach((t, i) => { if (t) L.nhan.push([t, P[i]]); });
  return L;
}

/* ================= Bộ dựng chung: khối tròn xoay có góc quét =================
   doan: các đoạn biên của miền phẳng sinh khối trong nửa mặt phẳng (r ≥ 0, s dọc trục); mỗi đoạn là một mặt logic.
   quet: góc quét (độ); truc: "z" | "x" | "y". */
const MAP_TRUC = { z: p => p, x: p => [p[2], p[0], p[1]], y: p => [p[0], p[2], -p[1]] };
const u0Truc = truc => truc === "x" || truc === "y" ? 0 : -Math.PI / 2;
function khoiXoay(L, o) {
  const truc = o.truc || "z", M = MAP_TRUC[truc], phi = Math.min(360, Math.max(.5, o.quet == null ? 360 : o.quet)) * DEG;
  const du = o.u0 != null ? o.u0 : u0Truc(truc), day = phi >= TAU - 1e-6, nu = o.nu || 72, nk = day ? nu : Math.max(2, Math.ceil(nu * phi / TAU));
  let doan = o.doan.filter(d => d.pts.length > 1).map(d => Object.assign({}, d, { pts: d.pts.slice() }));
  let vong = []; doan.forEach(d => d.pts.forEach((p, i) => { if (!(vong.length && i === 0)) vong.push(p); }));
  if (vong.length > 2 && Math.hypot(vong[0][0] - vong[vong.length - 1][0], vong[0][1] - vong[vong.length - 1][1]) < 1e-9) vong.pop();
  if (dtCo(vong) < 0) { doan = doan.reverse().map(d => Object.assign({}, d, { pts: d.pts.slice().reverse() })); vong = vong.reverse(); }
  const goc = k => du + phi * k / nk, P = (r, s, u) => M([r * Math.cos(u), r * Math.sin(u), s]);
  const thamSo = L.thamSo || (L.thamSo = []), hang = [];
  doan.forEach((d, di) => {
    const g = L.mat(d.ten, { phang: !!d.phang, tron: !d.phang, mau: d.mau });
    const rows = d.pts.map(([r, s]) => {
      if (r < 1e-9) { const i = L.diem(P(0, s, 0)); thamSo[i] = { d: di, r: 0, s, u: 0 }; return { cuc: true, i }; }
      const idx = []; for (let k = 0; k <= nk; k++) { const u = goc(k), i = L.diem(P(r, s, u)); thamSo[i] = { d: di, r, s, u }; idx.push(i); }
      return { cuc: false, idx };
    });
    for (let j = 0; j < rows.length - 1; j++) {
      const [r1, s1] = d.pts[j], [r2, s2] = d.pts[j + 1], nr = s2 - s1, ns = -(r2 - r1), a = rows[j], b = rows[j + 1];
      if ((a.cuc && b.cuc) || Math.hypot(nr, ns) < 1e-12) continue;
      for (let k = 0; k < nk; k++) {
        const um = goc(k + .5), ra = M([nr * Math.cos(um), nr * Math.sin(um), ns]);
        if (a.cuc) L.tg(a.i, b.idx[k], b.idx[k + 1], g, ra);
        else if (b.cuc) L.tg(a.idx[k], a.idx[k + 1], b.i, g, ra);
        else { L.tg(a.idx[k], a.idx[k + 1], b.idx[k + 1], g, ra); L.tg(a.idx[k], b.idx[k + 1], b.idx[k], g, ra); }
      }
    }
    hang.push(rows);
    if (d.vanh !== false && !rows[0].cuc && !(di === 0 && doan.length === 1)) L.canh.push(rows[0].idx.map(i => L.v[i]));
    if (!d.phang && d.luoi !== false) { // đường lưới: vĩ tuyến
      const buoc = Math.max(1, Math.round((rows.length - 1) / (d.soVT || 5)));
      for (let j = buoc; j < rows.length - 1; j += buoc) if (!rows[j].cuc) L.wire.push(rows[j].idx.map(i => L.v[i]));
    }
  });
  // kinh tuyến
  const bk = Math.max(1, Math.round(nk / (day ? 12 : Math.max(2, Math.round(12 * phi / TAU)))));
  for (let k = 0; k <= (day ? nk - 1 : nk); k += bk) L.wire.push(vong.map(([r, s]) => P(r, s, goc(k))));
  let capDau = null, capCuoi = null;
  if (!day) { // hai miền phẳng ở hai đầu góc quét
    const a0 = du, a1 = du + phi, p0 = vong.map(([r, s]) => P(r, s, a0)), p1 = vong.map(([r, s]) => P(r, s, a1));
    capDau = L.mat(o.tenDau || "Miền phẳng ban đầu", { phang: true, poly: p0, mau: o.mauDau === undefined ? { c: "#5EEBFF", a: .3 } : o.mauDau });
    L.daGiac(p0, capDau, M([Math.sin(a0), -Math.cos(a0), 0]));
    capCuoi = L.mat(o.tenCuoi || "Miền phẳng sinh khối (đang quay)", { phang: true, poly: p1, mau: o.mauCuoi === undefined ? { c: "#F59E0B", a: .55 } : o.mauCuoi });
    L.daGiac(p1, capCuoi, M([-Math.sin(a1), Math.cos(a1), 0]));
    L.canh.push([...p0, p0[0]], [...p1, p1[0]]);
    if (o.noiBat !== false) L.noiBat.push([...p1, p1[0]]);
  } else if (o.vienSinh) L.noiBat.push(vong.map(([r, s]) => P(r, s, du)).concat(o.vienKin ? [P(vong[0][0], vong[0][1], du)] : []));
  return { M, P, hang, day, phi, du, nk, nu, doan, vong, truc };
}
/* trải phẳng hình trụ, nón, nón cụt (mặt xung quanh lăn ra, đáy lật quanh điểm tiếp xúc) */
function moTronXoay(L, X, kieu, kt) {
  // kt: { r (đáy dưới), r2 (đáy trên, nón cụt), h }
  const { M, du } = X, uc = du + Math.PI, th = L.thamSo, Minv = { z: p => p, x: p => [p[1], p[2], p[0]], y: p => [p[0], -p[2], p[1]] }[X.truc];
  const quayZ = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];
  const quayY = (p, c, a) => { const x = p[0] - c[0], z = p[2] - c[2], ca = Math.cos(a), sa = Math.sin(a); return [c[0] + x * ca + z * sa, p[1], c[2] - x * sa + z * ca]; };
  const ham = t => {
    t = Math.min(1, Math.max(0, t)); const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, xoayVe = uc * (1 - e);
    let f;
    if (kieu === "tru") {
      const r = kt.r, h = kt.h, rho = r / Math.max(1e-4, 1 - e);
      f = q => { const { d, r: rr, s, u } = q, w = u - uc;
        if (d === 1) { const sg = r * w; return e > .9999 ? [r, sg, s] : [r - rho + rho * Math.cos(sg / rho), rho * Math.sin(sg / rho), s]; }
        const p = [rr * Math.cos(w), rr * Math.sin(w), s];
        return d === 0 ? quayY(p, [r, 0, 0], -Math.PI / 2 * e) : quayY(p, [r, 0, h], Math.PI / 2 * e); };
    } else {
      const R = kt.r, r2 = kt.r2 || 0, h = kt.h, l = Math.hypot(R, h * R / (R - r2)), hcFull = h * R / (R - r2), Th = TAU * R / l;
      const W = TAU + (Th - TAU) * e, rho = l * Th / W, hc = Math.sqrt(Math.max(0, l * l - rho * rho)), l1 = l * r2 / R;
      const lat = (sap, w) => { const az = w * W / TAU; return [sap * rho / l * Math.cos(az), sap * rho / l * Math.sin(az), hc * (1 - sap / l)]; };
      f = q => { const { d, r: rr, s, u } = q, w = u - uc;
        if (d === 1) { const sap = Math.hypot(rr, hcFull - s); return lat(sap, w); }
        if (d === 0) return quayY([rho - R + rr * Math.cos(w), rr * Math.sin(w), 0], [rho, 0, 0], -Math.PI * e); // đáy luôn tiếp xúc cung tròn tại điểm lăn
        const pc = lat(l1, 0); return [pc[0] - r2 + rr * Math.cos(w), rr * Math.sin(w), pc[2]]; };
    }
    // nón, nón cụt: hình trải nằm ngang thì dựng đứng dần lên mặt phẳng hướng về người xem (hình quạt treo dưới đỉnh)
    const dung = kieu === "tru" ? (p => p) : (p => [p[2] * Math.sin(Math.PI / 2 * e) + p[0] * Math.cos(Math.PI / 2 * e), p[1], p[2] * Math.cos(Math.PI / 2 * e) - p[0] * Math.sin(Math.PI / 2 * e)]);
    const anh = q => M(quayZ(dung(f(q)), xoayVe));
    const v = L.v.map((p, i) => th[i] ? anh(th[i]) : p);
    const canh = [];
    X.hang.forEach(rows => rows.forEach((r, j) => { if (!r.cuc && (j === 0 || j === rows.length - 1)) canh.push(r.idx.map(i => v[i])); }));
    const lat = X.hang[1]; if (lat) { const a = lat[0], b = lat[lat.length - 1];
      const dau = (rw, k) => rw.cuc ? v[rw.i] : v[rw.idx[k]]; canh.push([dau(a, 0), dau(b, 0)], [dau(a, X.nk), dau(b, X.nk)]); }
    const nhan = L.nhan.map(([n, p]) => { const i = L.v.findIndex(x => len(sub(x, p)) < 1e-9); return [n, i >= 0 ? v[i] : p]; });
    return { v, canh, nhan };
  };
  return ham;
}

/* ================= Sổ đăng ký hình (shape3d-catalog.js điền vào) ================= */
const B = {}, MUC = [], MUC_ID = {}, ICO = {}, TEN_NHOM = { dadien: "Khối đa diện", tronxoay: "Khối tròn xoay", ungdung: "Ứng dụng tích phân & thực tế 12" }, MAU_F = [];
function dangKy(o) {
  Object.assign(B, o.B || {}); Object.assign(ICO, o.ICO || {});
  (o.MUC || []).forEach(m => { const x = Array.isArray(m) ? { id: m[0], nhom: m[1], con: m[2], ten: m[3], ico: m[4], dung: m[5], mau: m[6], tu: m[7] || "" } : m; MUC.push(x); MUC_ID[x.id] = x; });
  if (o.MAU_F) MAU_F.push(...o.MAU_F);
}

/* ================= Trải phẳng: lật các mặt quanh cạnh bản lề theo cây mặt ================= */
const mat3 = (A, Bm) => A.map(r => [0, 1, 2].map(j => r[0] * Bm[0][j] + r[1] * Bm[1][j] + r[2] * Bm[2][j]));
const nhanMat = (R, p) => [dot(R[0], p), dot(R[1], p), dot(R[2], p)];
const BIEN_DOI_DON = { R: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], t: [0, 0, 0] };
const quayQuanh = (u, e, a) => { // quay góc a quanh trục đi qua u, hướng e (Rodrigues)
  const [x, y, z] = e, c = Math.cos(a), s = Math.sin(a), C = 1 - c;
  const R = [[c + x * x * C, x * y * C - z * s, x * z * C + y * s], [y * x * C + z * s, c + y * y * C, y * z * C - x * s], [z * x * C - y * s, z * y * C + x * s, c + z * z * C]];
  return { R, t: sub(u, nhanMat(R, u)) };
};
const ghep = (M1, M2) => ({ R: mat3(M1.R, M2.R), t: add(nhanMat(M1.R, M2.t), M1.t) });
const apBD = (M, p) => add(nhanMat(M.R, p), M.t);
const gocKy = (n1, n2, e) => Math.atan2(dot(cross(n1, n2), e), dot(n1, n2)); // góc có dấu đưa n1 về n2 quanh e
const khoaMo = p => p.map(v => (Math.abs(v) < 5e-6 ? 0 : v).toFixed(5)).join(",");
function phapMat(S, i) { return S.n0 ? S.n0[S.theoMat[i][0]] : S.n[S.theoMat[i][0]]; }
function taoMo(S, cfg) {
  const nMat = S.g.length, phap = S.g.map((g, i) => phapMat(S, i));
  const vMat = new Int32Array(S.v0.length).fill(-1); S.t.forEach(t => { vMat[t[0]] = vMat[t[1]] = vMat[t[2]] = t[3]; });
  const banLe = cfg.cay.map(([c, p]) => {
    const kp = new Set(S.g[p].poly.map(khoaMo)), chung = S.g[c].poly.filter(q => kp.has(khoaMo(q)));
    const u = chung[0], e = norm(sub(chung[1], chung[0]));
    return { c, p, u, e, phi: gocKy(phap[c], phap[p], e) };
  });
  let gocPhang = null; const n = phap[cfg.goc], dich = [0, 0, -1], cr = cross(n, dich);
  const tamGoc = S.g[cfg.goc].poly.reduce((a, p) => add(a, p), [0, 0, 0]).map(x => x / S.g[cfg.goc].poly.length);
  if (len(cr) > 1e-6) gocPhang = { u: tamGoc, e: norm(cr), phi: Math.atan2(len(cr), dot(n, dich)) };
  else if (dot(n, dich) < 0) gocPhang = { u: tamGoc, e: [1, 0, 0], phi: Math.PI };
  return { goc: cfg.goc, banLe, gocPhang, vMat, nMat };
}
function bienDoiMo(mo, t) {
  const M = new Array(mo.nMat).fill(BIEN_DOI_DON);
  M[mo.goc] = mo.gocPhang ? quayQuanh(mo.gocPhang.u, mo.gocPhang.e, mo.gocPhang.phi * t) : BIEN_DOI_DON;
  for (const b of mo.banLe) M[b.c] = ghep(M[b.p], quayQuanh(b.u, b.e, b.phi * t));
  return M;
}
/* tự tìm cây trải phẳng không chồng mặt: thử BFS rồi các cây ngẫu nhiên, chọn cây ít chồng nhất */
function timCay(S) {
  const nf = S.g.length; if (S.g.some(g => !g.poly)) return null;
  const canhMat = new Map();
  S.g.forEach((g, f) => g.poly.forEach((p, k) => { const q = g.poly[(k + 1) % g.poly.length], a = khoaMo(p), b = khoaMo(q), key = a < b ? a + "|" + b : b + "|" + a; if (!canhMat.has(key)) canhMat.set(key, []); canhMat.get(key).push(f); }));
  const ke = S.g.map(() => new Set()); for (const ds of canhMat.values()) if (ds.length === 2) { ke[ds[0]].add(ds[1]); ke[ds[1]].add(ds[0]); }
  let goc = 0, best = 1e9; for (let f = 0; f < nf; f++) { const z = phapMat(S, f)[2]; if (z < best - 1e-9) { best = z; goc = f; } }
  let hat = 12345; const rnd = () => (hat = (hat * 1103515245 + 12345) % 2147483648) / 2147483648;
  const keDs = ke.map(s => [...s]);
  const taoCay = kieu => { const cha = new Array(nf).fill(-2); cha[goc] = -1;
    if (kieu === 0) { const hang = [goc]; while (hang.length) { const f = hang.shift(); for (const g of keDs[f]) if (cha[g] === -2) { cha[g] = f; hang.push(g); } } }
    else { let f = goc, conLai = nf - 1, buoc = 0; while (conLai && buoc++ < 20000) { const ds = keDs[f]; if (!ds.length) break; const g = ds[Math.floor(rnd() * ds.length)]; if (cha[g] === -2) { cha[g] = f; conLai--; } f = g; } } // Aldous–Broder: cây khung ngẫu nhiên đều
    if (cha.some(c => c === -2)) return null;
    const con = S.g.map(() => []); cha.forEach((c, f) => { if (c >= 0) con[c].push(f); });
    const cay = [], hang = [goc]; while (hang.length) { const f = hang.shift(); for (const g of con[f]) { cay.push([g, f]); hang.push(g); } }
    return cay; };
  const tamGiac = S.t.map(t => t);
  const demChong = cay => {
    const mo = taoMo(S, { goc, cay }), M = bienDoiMo(mo, 1);
    const tg2 = tamGiac.map(([a, b, c, f]) => { const ps = [a, b, c].map(i => apBD(M[f], S.v0[i])), ct = mul(add(add(ps[0], ps[1]), ps[2]), 1 / 3);
      const q = ps.map(p => { const r = lerp3(ct, p, .97); return [r[0], r[1]]; }); return { q, f, x0: Math.min(q[0][0], q[1][0], q[2][0]), x1: Math.max(q[0][0], q[1][0], q[2][0]), y0: Math.min(q[0][1], q[1][1], q[2][1]), y1: Math.max(q[0][1], q[1][1], q[2][1]) }; });
    let dem = 0;
    for (let i = 0; i < tg2.length; i++) for (let j = i + 1; j < tg2.length; j++) { const A = tg2[i], Bt = tg2[j]; if (A.f === Bt.f || A.x1 < Bt.x0 || Bt.x1 < A.x0 || A.y1 < Bt.y0 || Bt.y1 < A.y0) continue;
      if (giaoTG(A.q, Bt.q)) { dem++; if (dem > 40) return dem; } }
    return dem;
  };
  let tot = null, it = 1e9;
  for (let lan = 0; lan < (nf <= 12 ? 1500 : 300); lan++) { const cay = taoCay(lan === 0 ? 0 : 1); if (!cay) continue; const d = demChong(cay); if (d < it) { it = d; tot = cay; } if (!d) break; }
  return tot ? { goc, cay: tot, chong: it } : null;
}
function giaoTG(A, B) { // hai tam giác phẳng (đã co nhẹ) có phần trong chung? — định lí trục tách
  for (const T of [A, B]) for (let k = 0; k < 3; k++) {
    const p = T[k], q = T[(k + 1) % 3], nx = q[1] - p[1], ny = p[0] - q[0];
    let a0 = 1e18, a1 = -1e18, b0 = 1e18, b1 = -1e18;
    for (const v of A) { const d = v[0] * nx + v[1] * ny; if (d < a0) a0 = d; if (d > a1) a1 = d; }
    for (const v of B) { const d = v[0] * nx + v[1] * ny; if (d < b0) b0 = d; if (d > b1) b1 = d; }
    if (a1 <= b0 + 1e-9 || b1 <= a0 + 1e-9) return false;
  }
  return true;
}
/* chuẩn bị dữ liệu trải phẳng (làm một lần, khi lần đầu cần) */
function damBaoMo(S) {
  if (S.mo) return true; if (!S.coMo) return false;
  if (S.moHam) S.mo = { ham: true };
  else { const cfg = S.moCfg === "tudong" ? (S.cayMo || (S.cayMo = timCay(S))) : S.moCfg; if (!cfg) { S.coMo = false; return false; } S.mo = taoMo(S, cfg); }
  S.vMo1 = [.25, .5, .75, 1].flatMap(t => apDungMo(S, t, true));
  return true;
}
/* t = 0: khối kín · t = 1: hình trải phẳng. chiTinh = true: chỉ trả về toạ độ đỉnh (để căn khung). */
function apDungMo(S, t, chiTinh) {
  if (!S.mo || t <= 0) {
    if (chiTinh) return S.v0;
    S.v = S.v0; S.n = S.n0; S.canh = S.canh0; S.nhan = S.nhan0; S.phu = S.phu0; S.noiBat = S.noiBat0; S.tam = S.tam0; S.haiMat = false; S.polyNay = S.g.map(g => g.poly); S.moT = 0; return;
  }
  if (S.mo.ham) {
    const r = S.moHam(t); if (chiTinh) return r.v;
    S.v = r.v; S.canh = r.canh; S.nhan = r.nhan; S.haiMat = true; S.phu = []; S.noiBat = []; S.polyNay = S.g.map(() => null);
  } else {
    const M = bienDoiMo(S.mo, t), vMat = S.mo.vMat;
    const v = S.v0.map((p, i) => vMat[i] < 0 ? p : apBD(M[vMat[i]], p));
    if (chiTinh) return v;
    S.v = v; S.haiMat = true; S.phu = []; S.noiBat = [];
    S.polyNay = S.g.map((g, i) => g.poly ? g.poly.map(p => apBD(M[i], p)) : null);
    // cạnh: biên từng mặt (bỏ trùng); nhãn: mỗi mặt mang tên đỉnh của nó, gộp các bản sao trùng chỗ
    const tenTheoKhoa = new Map(S.nhan0.map(([n, p]) => [khoaMo(p), n]));
    const canhDa = new Set(), canhMoi = [], nhanMoi = [], nhanDa = new Set();
    S.polyNay.forEach((poly, i) => { if (!poly) return; const goc0 = S.g[i].poly;
      poly.forEach((p, k) => {
        const q = poly[(k + 1) % poly.length], k1 = khoaMo(p), k2 = khoaMo(q), kc = k1 < k2 ? k1 + "|" + k2 : k2 + "|" + k1;
        if (!canhDa.has(kc)) { canhDa.add(kc); canhMoi.push([p, q]); }
        const n = tenTheoKhoa.get(khoaMo(goc0[k])); if (n && !nhanDa.has(k1)) { nhanDa.add(k1); nhanMoi.push([n, p]); }
      }); });
    S.canh = canhMoi; S.nhan = nhanMoi;
  }
  S.n = S.t.map(([a, b, c]) => norm(cross(sub(S.v[b], S.v[a]), sub(S.v[c], S.v[a]))));
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const p of S.v) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); }
  S.tam = mul(add(mn, mx), .5); S.moT = t;
}
function dinhTruc(S) {
  const tip = [];
  for (let i = 0; i < 3; i++) { const e = Math.max(S.mx[i], 0) + .35 * S.co; tip.push(Math.max(e, .6 * S.co)); }
  return [["x", [tip[0], 0, 0]], ["y", [0, tip[1], 0]], ["z", [0, 0, tip[2]]]];
}
/* ================= Bảng màu vẽ (nét đậm, rõ khi chiếu lên bảng) ================= */
const PAL = {
  toi: { nen: [182, 200, 228], canh: "#0A1226", lot: "rgba(255,255,255,.88)", khuat: "#14213D", lotKhuat: "rgba(255,255,255,.55)", canhSang: "#F4F8FF", khuatSang: "#C9D7F2",
    chu: "#0B1020", vienChu: "rgba(255,255,255,.96)", vienChuMong: "rgba(255,255,255,.82)", truc: "#06B6D4", lotTruc: "rgba(2,6,23,.55)", luoi: "rgba(148,163,184,.28)", wire: "rgba(30,41,59,.30)", wireSang: "rgba(226,232,240,.35)", noiBat: "#F59E0B", w: 2.3 },
  giay: { nen: [236, 240, 246], canh: "#000000", lot: null, khuat: "#1F2937", lotKhuat: null, canhSang: "#000000", khuatSang: "#1F2937",
    chu: "#000000", vienChu: "rgba(255,255,255,.96)", truc: "#111827", lotTruc: null, luoi: "rgba(0,0,0,.15)", wire: "rgba(0,0,0,.26)", wireSang: "rgba(0,0,0,.26)", noiBat: "#B45309", w: 2 }
};
const hexRgb = h => { const s = h.replace("#", ""); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); };
const MAU = ["#E8001C", "#F59E0B", "#FACC15", "#22C55E", "#5EEBFF", "#3B82F6", "#A855F7", "#EC4899"];
/* ================= Phép chiếu + kiểm tra che khuất (dùng chung cho màn hình, PNG, video và TikZ) ================= */
function chieu(S, cam, W, H, k) {
  const MT = maTranChieu(cam.q, cam.xien), r0 = MT.r0, r1 = MT.r1, r2 = MT.dv;
  const z = cam.zoom * k, ox = W / 2 + cam.px * k, oy = H / 2 + cam.py * k;
  const prj = p => [ox + (r0[0] * p[0] + r0[1] * p[1] + r0[2] * p[2]) * z, oy - (r1[0] * p[0] + r1[1] * p[1] + r1[2] * p[2]) * z, (r2[0] * p[0] + r2[1] * p[1] + r2[2] * p[2]) * z];
  const n = S.v.length, X = new Float64Array(n), Y = new Float64Array(n), D = new Float64Array(n);
  for (let i = 0; i < n; i++) { const q = prj(S.v[i]); X[i] = q[0]; Y[i] = q[1]; D[i] = q[2]; }
  const nt = S.t.length, truoc = new Uint8Array(nt);
  for (let i = 0; i < nt; i++) truoc[i] = dot(S.n[i], r2) > 0 ? 1 : 0;
  // lưới ô để tra nhanh tam giác mặt trước phủ lên một điểm
  const CS = 22 * k, gw = Math.ceil(W / CS) + 1, gh = Math.ceil(H / CS) + 1, o = new Array(gw * gh);
  for (let i = 0; i < nt; i++) { if (!truoc[i] && !S.haiMat) continue; const [a, b, c] = S.t[i];
    const x0 = Math.max(0, Math.floor(Math.min(X[a], X[b], X[c]) / CS)), x1 = Math.min(gw - 1, Math.floor(Math.max(X[a], X[b], X[c]) / CS));
    const y0 = Math.max(0, Math.floor(Math.min(Y[a], Y[b], Y[c]) / CS)), y1 = Math.min(gh - 1, Math.floor(Math.max(Y[a], Y[b], Y[c]) / CS));
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const id = gy * gw + gx; (o[id] || (o[id] = [])).push(i); } }
  const eps = .5 * k;
  const timTG = (x, y, cb) => { const gx = Math.floor(x / CS), gy = Math.floor(y / CS); if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) return; const ds = o[gy * gw + gx]; if (!ds) return;
    for (const i of ds) { const [a, b, c] = S.t[i], ax = X[a], ay = Y[a], bx = X[b], by = Y[b], cx = X[c], cy = Y[c];
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(den) < 1e-6) continue;
      const w1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den; if (w1 < -1e-4) continue;
      const w2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den; if (w2 < -1e-4) continue;
      const w3 = 1 - w1 - w2; if (w3 < -1e-4) continue;
      if (cb(i, w1 * D[a] + w2 * D[b] + w3 * D[c])) return; } };
  const che = (x, y, d) => { let k2 = false; timTG(x, y, (i, dd) => { if (dd > d + eps) { k2 = true; return true; } return false; }); return k2; };
  const chon = (x, y) => { let best = -1, bd = -1e18; timTG(x, y, (i, dd) => { if (dd > bd) { bd = dd; best = i; } return false; }); return best < 0 ? -1 : S.t[best][3]; };
  return { R: [r0, r1, r2], Rq: MT.Rq, z, ox, oy, prj, X, Y, D, truoc, che, chon, W, H, k, buoc: 6 };
}
/* chia một đường gấp khúc thành các đoạn thấy / khuất */
function tachNet(pl, F) {
  const runs = []; let cur = null, st = F.buoc * F.k;
  for (let i = 0; i < pl.length - 1; i++) {
    const A = pl[i], Bp = pl[i + 1], pa = F.prj(A), pb = F.prj(Bp);
    const m = Math.max(1, Math.min(90, Math.ceil(Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) / st)));
    for (let j = 0; j < m; j++) {
      const pm = F.prj(lerp3(A, Bp, (j + .5) / m)), thay = !F.che(pm[0], pm[1], pm[2]);
      if (!cur || cur.thay !== thay) { cur = { thay, pts: [lerp3(A, Bp, j / m)] }; runs.push(cur); }
      cur.pts.push(lerp3(A, Bp, (j + 1) / m));
    }
  }
  return runs;
}
/* ---- xếp nhãn: đẩy ra xa tâm hình, tránh đè cạnh, tránh đè nhau ---- */
function catHop(s, x0, y0, x1, y1) {
  const [ax, ay, bx, by] = s;
  if (Math.max(ax, bx) < x0 || Math.min(ax, bx) > x1 || Math.max(ay, by) < y0 || Math.min(ay, by) > y1) return false;
  let t0 = 0, t1 = 1; const dx = bx - ax, dy = by - ay;
  for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
    if (Math.abs(p) < 1e-12) { if (q < 0) return false; continue; }
    const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return t0 <= t1;
}
function xepNhan(ctx, ds, segs, cham, W, H, k, font, nhanh) {
  ctx.font = font; const daDat = [], out = [];
  const RADII = nhanh ? [11] : [10, 14, 19], NG = nhanh ? 12 : 16;
  for (const it of ds) {
    const w = ctx.measureText(it.t).width + 3 * k, h = 13 * k, g0 = Math.atan2(it.dy, it.dx);
    let best = null, bs = 1e18;
    for (const rr of RADII) for (let j = 0; j < NG; j++) {
      const dg = (j % 2 ? 1 : -1) * Math.ceil(j / 2) * (360 / NG) * DEG, g = g0 + dg;
      const r = rr * k + (Math.abs(Math.cos(g)) * w / 2 + Math.abs(Math.sin(g)) * h / 2) * .55;
      const cx = it.x + Math.cos(g) * r, cy = it.y + Math.sin(g) * r, x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
      let s = Math.abs(dg) * 9 + (rr - RADII[0]) * 1.5 * (it.uuTien || 1);
      if (x0 < 2 || y0 < 2 || x1 > W - 2 || y1 > H - 2) s += 500;
      for (const b of daDat) if (x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]) s += 1000;
      for (const p of cham) if (p !== it && p.x > x0 - 2 * k && p.x < x1 + 2 * k && p.y > y0 - 2 * k && p.y < y1 + 2 * k) s += 350;
      if (s < bs) for (const sg of segs) if (catHop(sg, x0 + 1.5 * k, y0 + 1.5 * k, x1 - 1.5 * k, y1 - 1.5 * k)) { s += 70; if (s >= bs) break; }
      if (s < bs) { bs = s; best = { x: cx, y: cy, g, hop: [x0, y0, x1, y1] }; }
    }
    daDat.push(best.hop); out.push(Object.assign({ t: it.t, i: it.i, loai: it.loai }, best));
  }
  return out;
}
/* ================= Vẽ ================= */
let offCv = null;
const FT = '"Source Serif 4","Noto Serif","Times New Roman",serif';
function ve(ctx, S, cam, W, H, k, o) {
  const pal = o.giay ? PAL.giay : PAL.toi, F = chieu(S, cam, W, H, k), { X, Y, D, truoc, Rq } = F;
  if (o.nhanh) F.buoc = 10;
  const khung = o.che === "khung", trongSuot = o.che === "trong", mau = o.mau || {};
  const den = norm(add(add(mul(Rq[0], -.45), mul(Rq[1], .62)), mul(Rq[2], .64)));
  const nt = S.t.length;
  // —— mặt (thuật toán hoạ sĩ trên các tam giác mặt trước)
  if (!khung) {
    let tc = ctx;
    if (trongSuot) { if (!offCv) offCv = document.createElement("canvas"); if (offCv.width !== W || offCv.height !== H) { offCv.width = W; offCv.height = H; } tc = offCv.getContext("2d"); tc.clearRect(0, 0, W, H); }
    const thuTu = [], sau = new Float64Array(nt);
    for (let i = 0; i < nt; i++) if (truoc[i] || S.haiMat) { const [a, b, c] = S.t[i]; sau[i] = D[a] + D[b] + D[c]; thuTu.push(i); }
    thuTu.sort((p, q) => sau[p] - sau[q]);
    const coSan = S.g.map((g, gi) => { const m = mau[gi] || g.mau; if (!m) return pal.nen; const c = hexRgb(m.c); return pal.nen.map((v, i) => v * (1 - m.a) + c[i] * m.a); });
    tc.lineWidth = .9 * k; tc.lineJoin = "round";
    for (const i of thuTu) {
      const [a, b, c, g] = S.t[i], nn = truoc[i] ? S.n[i] : mul(S.n[i], -1);
      let sh = .62 + .38 * Math.max(0, dot(nn, den)) + .06 * dot(nn, Rq[2]);
      if (g === o.hover) sh += .1;
      const base = coSan[g], col = "rgb(" + Math.min(255, base[0] * sh | 0) + "," + Math.min(255, base[1] * sh | 0) + "," + Math.min(255, base[2] * sh | 0) + ")";
      tc.fillStyle = col; tc.strokeStyle = col;
      tc.beginPath(); tc.moveTo(X[a], Y[a]); tc.lineTo(X[b], Y[b]); tc.lineTo(X[c], Y[c]); tc.closePath(); tc.fill(); tc.stroke();
    }
    if (trongSuot) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * .36; ctx.drawImage(offCv, 0, 0, W, H); ctx.globalAlpha = ga; }
  }
  const sang = !o.giay && (khung || trongSuot); // nền tối không có mặt che: nét sáng
  const mCanh = sang ? pal.canhSang : pal.canh, mKhuat = sang ? pal.khuatSang : pal.khuat, lot = sang ? null : pal.lot, lotK = sang ? null : pal.lotKhuat;
  const duong = (pts, dash, mauNet, w, lotMau, lotW) => { if (pts.length < 2) return; ctx.beginPath(); pts.forEach((p, i) => { const q = F.prj(p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
    if (lotMau) { ctx.setLineDash(dash); ctx.strokeStyle = lotMau; ctx.lineWidth = w + lotW; ctx.stroke(); }
    ctx.setLineDash(dash); ctx.strokeStyle = mauNet; ctx.lineWidth = w; ctx.stroke(); };
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  const seg = []; const themSeg = pts => { for (let i = 0; i < pts.length - 1; i++) { const a = F.prj(pts[i]), b = F.prj(pts[i + 1]); seg.push([a[0], a[1], b[0], b[1]]); } };
  // —— lưới Oxy
  F.luoiOxy = [];
  if (o.oxyz && o.luoiOxy) {
    const G = Math.ceil(Math.max(Math.abs(S.mn[0]), Math.abs(S.mx[0]), Math.abs(S.mn[1]), Math.abs(S.mx[1]))) + 1;
    for (let i = -G; i <= G; i++) for (const pl of [[[i, -G, 0], [i, G, 0]], [[-G, i, 0], [G, i, 0]]]) {
      const runs = tachNet(pl, F); F.luoiOxy.push(runs);
      runs.forEach(r => { if (r.thay || khung || trongSuot) duong(r.pts, [], pal.luoi, k); });
    }
  }
  // —— đường lưới trên mặt cong
  F.wire = [];
  const mWire = sang ? pal.wireSang : pal.wire;
  if ((o.luoiMat || khung) && !(o.nhanh && !khung)) S.wire.forEach(pl => { const runs = tachNet(pl, F); F.wire.push(runs); runs.forEach(r => { if (r.thay) duong(r.pts, [], mWire, 1 * k); else if (khung && o.khuat) duong(r.pts, [3 * k, 4 * k], mWire, .9 * k); }); });
  // —— cạnh, đường phụ
  F.net = [];
  S.canh.forEach(pl => F.net.push({ loai: "canh", runs: tachNet(pl, F) }));
  if (o.phu) S.phu.forEach(pl => F.net.push({ loai: "phu", runs: tachNet(pl, F) }));
  const w = pal.w * k * (o.doDam || 1);
  if (o.khuat) F.net.forEach(n => n.runs.forEach(r => { if (!r.thay) { const ww = (n.loai === "phu" ? .62 : .72) * w; duong(r.pts, [7 * k, 5 * k], mKhuat, ww, lotK, 2 * k); } }));
  F.net.forEach(n => n.runs.forEach(r => { if (r.thay) duong(r.pts, [], mCanh, n.loai === "phu" ? w * .7 : w, lot, 2.2 * k); }));
  F.net.forEach(n => n.runs.forEach(r => themSeg(r.pts)));
  // —— đường viền mặt cong (silhouette)
  F.sil = [];
  for (const [a, b, t1, t2] of S.sil) if (truoc[t1] !== truoc[t2]) { if (!F.che((X[a] + X[b]) / 2, (Y[a] + Y[b]) / 2, (D[a] + D[b]) / 2)) F.sil.push([a, b]); }
  ctx.setLineDash([]);
  if (lot) { ctx.strokeStyle = lot; ctx.lineWidth = w + 2.2 * k; ctx.beginPath(); for (const [a, b] of F.sil) { ctx.moveTo(X[a], Y[a]); ctx.lineTo(X[b], Y[b]); } ctx.stroke(); }
  ctx.strokeStyle = mCanh; ctx.lineWidth = w; ctx.beginPath();
  for (const [a, b] of F.sil) { ctx.moveTo(X[a], Y[a]); ctx.lineTo(X[b], Y[b]); seg.push([X[a], Y[a], X[b], Y[b]]); }
  ctx.stroke();
  // —— đường nổi bật (miền phẳng sinh khối, thiết diện)
  F.noiBat = [];
  (S.noiBat || []).forEach(pl => { const runs = tachNet(pl, F); F.noiBat.push(runs);
    runs.forEach(r => { if (r.thay) duong(r.pts, [], pal.noiBat, w * 1.15, lot, 2 * k); else duong(r.pts, [6 * k, 4 * k], pal.noiBat, w * .8, null, 0); themSeg(r.pts); }); });
  // —— hệ trục Oxyz
  F.truc = [];
  const nhanCho = [];
  if (o.oxyz) {
    const O = F.prj([0, 0, 0]);
    for (const [ten, tip] of dinhTruc(S)) {
      const runs = tachNet([[0, 0, 0], tip], F); F.truc.push({ ten, tip, runs });
      runs.forEach(r => { if (r.thay) duong(r.pts, [], pal.truc, 1.7 * k, pal.lotTruc, 1.6 * k); else if (o.khuat) duong(r.pts, [5 * k, 4 * k], pal.truc, 1.3 * k, null, 0); themSeg(r.pts); });
      const T = F.prj(tip), dx = T[0] - O[0], dy = T[1] - O[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
      if (runs[runs.length - 1].thay && l > 6 * k) { const s = 10 * k; ctx.setLineDash([]); ctx.fillStyle = pal.truc; ctx.beginPath(); ctx.moveTo(T[0], T[1]); ctx.lineTo(T[0] - ux * s - uy * s * .42, T[1] - uy * s + ux * s * .42); ctx.lineTo(T[0] - ux * s * .7, T[1] - uy * s * .7); ctx.lineTo(T[0] - ux * s + uy * s * .42, T[1] - uy * s - ux * s * .42); ctx.closePath(); ctx.fill(); }
      nhanCho.push({ t: ten, x: T[0], y: T[1], dx: ux, dy: uy, loai: "truc", uuTien: 3 });
    }
    const trung = S.nhan.some(([, p]) => len(p) < 1e-6);
    if (!(trung && o.nhan)) { const C = F.prj(S.tam); let dx = O[0] - C[0], dy = O[1] - C[1]; if (Math.hypot(dx, dy) < 4 * k) { dx = -1; dy = 1; } const l = Math.hypot(dx, dy); nhanCho.push({ t: "O", x: O[0], y: O[1], dx: dx / l, dy: dy / l, loai: "O", uuTien: 2 }); }
  }
  // —— nhãn đỉnh (đẩy ra ngoài tâm hình, tự tránh đè nét và đè nhau)
  F.nhanViTri = [];
  const cham = [];
  if (o.nhan) {
    const C = F.prj(S.tam);
    S.nhan.forEach(([t, p], i) => { const q = F.prj(p); let dx = q[0] - C[0], dy = q[1] - C[1]; const l = Math.hypot(dx, dy); if (l < 4 * k) { dx = 0; dy = -1; } else { dx /= l; dy /= l; }
      const it = { t, i, x: q[0], y: q[1], dx, dy, loai: "dinh", xa: l }; nhanCho.push(it); cham.push(it); });
  }
  if (nhanCho.length) {
    nhanCho.sort((a, b) => (b.uuTien || 1) - (a.uuTien || 1) || (b.xa || 0) - (a.xa || 0));
    const fnt = "italic 700 " + 15.5 * k + "px " + FT, dat = xepNhan(ctx, nhanCho, seg, cham, W, H, k, fnt, o.nhanh);
    ctx.setLineDash([]);
    for (const it of cham) { ctx.fillStyle = pal.chu; ctx.strokeStyle = pal.vienChu; ctx.lineWidth = 1.1 * k; ctx.beginPath(); ctx.arc(it.x, it.y, 2.3 * k, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.font = fnt; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    for (const d of dat) { ctx.lineWidth = 2.6 * k; ctx.strokeStyle = pal.vienChuMong || pal.vienChu; ctx.strokeText(d.t, d.x, d.y + .5 * k); ctx.fillStyle = d.loai === "truc" && !o.giay ? "#075985" : pal.chu; ctx.fillText(d.t, d.x, d.y + .5 * k);
      F.nhanViTri.push({ t: d.t, i: d.i, loai: d.loai, goc: -d.g / DEG }); }
  }
  // —— điểm đang xem toạ độ: vòng sáng, đường gióng xuống mặt Oxy và các trục, nhãn toạ độ
  for (const d of o.diem || []) {
    const P = d.p, q = F.prj(P), mg = o.giay ? "#B45309" : "#FBBF24";
    if (o.oxyz) for (const [u, v] of duongGiong(P)) { duong([u, v], [4 * k, 3.5 * k], mg, 1.3 * k, null, 0); const c = F.prj(v); ctx.setLineDash([]); ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(c[0], c[1], 2.2 * k, 0, TAU); ctx.fill(); }
    ctx.setLineDash([]); ctx.strokeStyle = mg; ctx.lineWidth = 2.2 * k; ctx.beginPath(); ctx.arc(q[0], q[1], 7.5 * k, 0, TAU); ctx.stroke();
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(q[0], q[1], 2.8 * k, 0, TAU); ctx.fill();
    const tx = d.ten + "(" + so(P[0]) + "; " + so(P[1]) + "; " + so(P[2]) + ")";
    ctx.font = "700 " + 12.5 * k + "px " + FU; const w2 = ctx.measureText(tx).width + 16 * k, h = 22 * k, x = q[0] + 12 * k, y = q[1] + 9 * k;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w2, h, 11 * k) : ctx.rect(x, y, w2, h);
    ctx.fillStyle = o.giay ? "rgba(255,255,255,.95)" : "rgba(2,6,23,.86)"; ctx.fill(); ctx.strokeStyle = mg; ctx.lineWidth = 1.2 * k; ctx.stroke();
    ctx.fillStyle = o.giay ? "#7C2D12" : "#FDE68A"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(tx, x + 8 * k, y + h / 2 + .5 * k);
  }
  ctx.setLineDash([]);
  return F;
}
const FU = '"Be Vietnam Pro",system-ui,sans-serif';
const toaDoChu = p => "(" + so(p[0]) + "; " + so(p[1]) + "; " + so(p[2]) + ")";
/* đường gióng của P(x; y; z): P → P'(x; y; 0) → hai chân trên Ox, Oy */
function duongGiong(P) {
  const [x, y, z] = P, e = 1e-9, Pp = [x, y, 0], out = [];
  if (Math.abs(z) > e && (Math.abs(x) > e || Math.abs(y) > e)) out.push([P, Pp]);
  if (Math.abs(z) > e && Math.abs(x) < e && Math.abs(y) < e) return out;
  if (Math.abs(x) > e && Math.abs(y) > e) { out.push([Pp, [x, 0, 0]]); out.push([Pp, [0, y, 0]]); }
  if (Math.abs(z) > e) out.push([P, [0, 0, z]]);
  return out;
}
const khoaDiem = p => p.map(v => v.toFixed(4)).join(",");
function dp(pts, tol) { // Douglas–Peucker, giữ hai đầu
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1]; let mx = -1, mi = 0;
  const L = Math.hypot(bx - ax, by - ay);
  for (let i = 1; i < pts.length - 1; i++) { const [px, py] = pts[i]; const d = L < 1e-12 ? Math.hypot(px - ax, py - ay) : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / L; if (d > mx) { mx = d; mi = i; } }
  if (mx <= tol) return [pts[0], pts[pts.length - 1]];
  const l = dp(pts.slice(0, mi + 1), tol), r = dp(pts.slice(mi), tol); return l.slice(0, -1).concat(r);
}
/* ================= Xuất TikZ thuần (đúng mẫu KMath: \foreach toạ độ, \draw gộp, \foreach nhãn) ================= */
function taoTikz(S, F, o) {
  if (!S || !F) return "";
  const [r0, r1] = F.R, P2 = p => [dot(r0, p), dot(r1, p)];
  const pts = S.v.map(P2); (o.diem || []).forEach(d => pts.push(P2(d.p))); if (o.oxyz) { pts.push([0, 0]); F.truc.forEach(a => pts.push(P2(a.tip))); }
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const s = Math.min(9 / ((x1 - x0) || 1), 8 / ((y1 - y0) || 1));
  const T2 = p => { const q = P2(p); return [(q[0] - x0) * s, (q[1] - y0) * s]; };
  const f = v => { let x = Math.round(v * 100) / 100; if (Math.abs(x) < .005) x = 0; return String(x); };
  // khi trải phẳng một đỉnh có nhiều bản sao (S, S2, S3…): tên toạ độ riêng, nhãn vẫn là S
  const dem = {}, nhanX = [...S.nhan.map(([t, p], i) => [t, p, i]), ...(o.diem || []).filter(d => d.rieng).map(d => [d.ten, d.p, -1])]
    .map(([t, p, i]) => { dem[t] = (dem[t] || 0) + 1; return { id: dem[t] === 1 ? t : t + dem[t], t, p, i }; });
  const ten = new Map(); nhanX.forEach(x => { if (!ten.has(khoaDiem(x.p))) ten.set(khoaDiem(x.p), x.id); });
  let tenO = ten.get(khoaDiem([0, 0, 0])); const themO = o.oxyz && !tenO; if (themO) { tenO = "O"; ten.set(khoaDiem([0, 0, 0]), "O"); }
  const toaDo = p => { const t = ten.get(khoaDiem(p)); if (t) return "(" + t + ")"; const q = T2(p); return "(" + f(q[0]) + "," + f(q[1]) + ")"; };
  const rutGon = ds3 => { const mang = ds3.map(p => { const q = T2(p); q.p = p; return q; }); return dp(mang, .012).map(q => q.p); };
  // nối các đường gấp khúc chung đầu mút thành chuỗi dài: (B)--(C)--(D)--(S)
  const noi = ds => {
    const con = ds.map(pl => rutGon(pl)).filter(pl => pl.length > 1), out = [];
    while (con.length) {
      let pl = con.shift(), doi = true;
      while (doi) { doi = false;
        for (let i = 0; i < con.length; i++) { const q = con[i], a = khoaDiem(pl[pl.length - 1]), b = khoaDiem(pl[0]);
          if (khoaDiem(q[0]) === a) { pl = pl.concat(q.slice(1)); }
          else if (khoaDiem(q[q.length - 1]) === a) { pl = pl.concat(q.slice(0, -1).reverse()); }
          else if (khoaDiem(q[q.length - 1]) === b) { pl = q.concat(pl.slice(1)); }
          else if (khoaDiem(q[0]) === b) { pl = q.slice(1).reverse().concat(pl); }
          else continue;
          con.splice(i, 1); doi = true; break; } }
      out.push(pl.map(toaDo).join("--"));
    }
    return out;
  };
  const dongVe = (lenh, ds) => { if (!ds.length) return []; const out = []; let dong = "\t" + lenh + " ";
    ds.forEach((c, i) => { const them = (i ? " " : "") + c; if (dong.length + them.length > 96 && i) { out.push(dong); dong = "\t\t" + c; } else dong += them; });
    out.push(dong + ";"); return out; };
  const L = [];
  L.push("%Tác giả web: ThS. Trương Đăng Khoa");
  L.push("% KMath · Hình 3D — " + S.ten + (o.xien ? " (phép chiếu song song kiểu SGK)" : " (phép chiếu vuông góc theo góc nhìn hiện tại)"));
  L.push("\\begin{tikzpicture}[scale=1,font=\\footnotesize,line join=round,line cap=round,>=stealth]");
  const daCo = new Set(), dsToaDo = [];
  [...nhanX.map(x => [x.id, x.p]), ...(themO ? [["O", [0, 0, 0]]] : [])].forEach(([t, p]) => { if (daCo.has(t)) return; daCo.add(t); const q = T2(p); dsToaDo.push(t + "/" + f(q[0]) + "/" + f(q[1])); });
  if (dsToaDo.length) { L.push("\t\\foreach \\p/\\x/\\y in {" + dsToaDo.join(",") + "}"); L.push("\t\t\\path (\\x,\\y) coordinate (\\p);"); }
  // —— tô mặt
  const mau = Object.assign({}, ...S.g.map((g, i) => g.mau ? { [i]: g.mau } : {}), o.mau || {}), ds = Object.keys(mau).map(Number).filter(g => g < S.g.length);
  if (ds.length) {
    const tenMau = {}; let n = 0;
    ds.forEach(g => { const c = mau[g].c; if (!tenMau[c]) { tenMau[c] = "mau" + (++n); L.push("\t\\definecolor{" + tenMau[c] + "}{RGB}{" + hexRgb(c).join(",") + "}"); } });
    const doSau = g => { const ts = S.theoMat[g]; let t = 0; ts.forEach(i => { const [a, b, c] = S.t[i]; t += F.D[a] + F.D[b] + F.D[c]; }); return t / (ts.length || 1); };
    ds.sort((a, b) => doSau(a) - doSau(b));
    for (const g of ds) {
      const G = S.g[g]; let dg;
      if (G.phang && (S.polyNay[g] || G.poly)) dg = noi([(S.polyNay[g] || G.poly).concat([(S.polyNay[g] || G.poly)[0]])]).map(c => c + "--cycle");
      else dg = bienMat(S, g, F).map(v => noi([v.concat([v[0]])])[0] + "--cycle");
      if (dg.length) L.push(...dongVe("\\fill[" + tenMau[mau[g].c] + ",fill opacity=" + f(mau[g].a) + "]", dg));
    }
  }
  // —— nét
  const khuat = [], thay = [], phuThay = [], noiBatT = [];
  F.net.forEach(nt => nt.runs.forEach(r => { if (!r.thay) { if (o.khuat) khuat.push(r.pts); } else thay.push(r.pts); }));
  noiVien(S, F).forEach(pl => thay.push(pl));
  if (o.che === "khung" || o.luoiMat) F.wire.forEach(rs => rs.forEach(r => { if (r.thay) phuThay.push(r.pts); }));
  (F.noiBat || []).forEach(rs => rs.forEach(r => noiBatT.push(r)));
  L.push(...dongVe("\\draw[dashed]", noi(khuat)));
  L.push(...dongVe("\\draw", noi(thay)));
  L.push(...dongVe("\\draw[gray!60,very thin]", noi(phuThay)));
  if (noiBatT.length) { L.push(...dongVe("\\draw[orange!80!black,thick]", noi(noiBatT.filter(r => r.thay).map(r => r.pts)))); L.push(...dongVe("\\draw[orange!80!black,dashed]", noi(noiBatT.filter(r => !r.thay).map(r => r.pts)))); }
  const gocNhan = new Map(), gocTruc = new Map(); let gocO = null;
  (F.nhanViTri || []).forEach(n => { const g = Math.round(n.goc / 5) * 5; if (n.loai === "dinh") gocNhan.set(n.i, g); else if (n.loai === "truc") gocTruc.set(n.t, g); else if (n.loai === "O") gocO = g; });
  if (o.oxyz) {
    if (o.luoiOxy) L.push(...dongVe("\\draw[gray!35,very thin]", noi(F.luoiOxy.flatMap(rs => rs.filter(r => r.thay).map(r => r.pts)))));
    const O2 = T2([0, 0, 0]);
    F.truc.forEach(({ ten: tt, tip, runs }) => {
      runs.forEach((r, i) => { const cuoi = i === runs.length - 1; if (r.thay) L.push("\t\\draw" + (cuoi ? "[->]" : "") + " " + noi([r.pts])[0] + ";"); else if (o.khuat) L.push("\t\\draw[dashed] " + noi([r.pts])[0] + ";"); });
      const q = T2(tip), g = gocTruc.has(tt) ? gocTruc.get(tt) : Math.round(Math.atan2(q[1] - O2[1], q[0] - O2[0]) / DEG);
      L.push("\t\\path (" + f(q[0]) + "," + f(q[1]) + ")+(" + g + ":2.5mm) node{$" + tt + "$};");
    });
    if (gocO != null || themO) L.push("\t\\path (" + tenO + ")+(" + (gocO != null ? gocO : -135) + ":3mm) node{$O$};");
    const dsD = (o.diem || []);
    if (dsD.length) { L.push("\t% Đường gióng toạ độ: " + dsD.map(d => d.ten + "(" + d.p.map(f).join("; ") + ")").join(", "));
      dsD.forEach(d => duongGiong(d.p).forEach(([u, v]) => L.push("\t\\draw[dashed,thin] " + toaDo(u) + "--" + toaDo(v) + ";"))); }
  }
  if (o.nhan && nhanX.length) {
    const C = T2(S.tam), gocCua = x => { if (gocNhan.has(x.i)) return gocNhan.get(x.i); const q = T2(x.p), dx = q[0] - C[0], dy = q[1] - C[1]; return Math.hypot(dx, dy) < .05 ? 90 : Math.round(Math.atan2(dy, dx) / DEG / 5) * 5; };
    if (nhanX.every(x => x.id === x.t)) L.push("\t\\foreach \\p/\\g in {" + nhanX.map(x => x.id + "/" + gocCua(x)).join(",") + "}{\\fill (\\p) circle (1pt); \\path (\\p)+(\\g:3mm) node{$\\p$};}");
    else L.push("\t\\foreach \\p/\\g/\\n in {" + nhanX.map(x => x.id + "/" + gocCua(x) + "/" + x.t).join(",") + "}{\\fill (\\p) circle (1pt); \\path (\\p)+(\\g:3mm) node{$\\n$};}");
  }
  L.push("\\end{tikzpicture}");
  return L.join("\n");
}
/* biên vùng nhìn thấy của một mặt cong: cộng các tam giác mặt trước, khử cạnh chung, nối thành vòng kín */
function bienMat(S, g, F) {
  let ts = S.theoMat[g].filter(i => F.truoc[i]); if (!ts.length) ts = S.theoMat[g];
  const canhCo = new Map();
  for (const i of ts) { const t = S.t[i]; for (let e = 0; e < 3; e++) { const a = t[e], b = t[(e + 1) % 3], nguoc = b + "_" + a; if (canhCo.has(nguoc)) canhCo.delete(nguoc); else canhCo.set(a + "_" + b, [a, b]); } }
  const tiep = new Map(); for (const [a, b] of canhCo.values()) { if (!tiep.has(a)) tiep.set(a, []); tiep.get(a).push(b); }
  const vong = [];
  for (const batDau of [...tiep.keys()]) {
    while (tiep.get(batDau) && tiep.get(batDau).length) {
      const pl = [S.v[batDau]]; let u = batDau, buoc = 0;
      while (buoc++ < 20000) { const ds = tiep.get(u); if (!ds || !ds.length) break; const v = ds.pop(); if (v === batDau) break; pl.push(S.v[v]); u = v; }
      if (pl.length > 2) vong.push(pl);
    }
  }
  return vong;
}
/* nối các đoạn viền mặt cong thấy được thành đường liền */
function noiVien(S, F) {
  const ke = new Map(), dung = new Set(), out = [];
  F.sil.forEach(([a, b], i) => { [a, b].forEach(v => { if (!ke.has(v)) ke.set(v, []); ke.get(v).push(i); }); });
  const di = (v, pl) => { for (;;) { const ds = (ke.get(v) || []).filter(i => !dung.has(i)); if (!ds.length) return; const i = ds[0]; dung.add(i); const [a, b] = F.sil[i]; v = a === v ? b : a; pl.push(S.v[v]); } };
  const ds = [...ke.keys()].sort((a, b) => ke.get(a).length - ke.get(b).length);
  for (const v of ds) { if ((ke.get(v) || []).every(i => dung.has(i))) continue; const pl = [S.v[v]]; di(v, pl); if (pl.length > 1) out.push(pl); }
  return out;
}
/* ================= Điểm phụ, đường phụ, ký hiệu góc vuông ================= */
const TEN_LOAI_PHU = { trung: "trung điểm", trongTam: "trọng tâm", tamNgoai: "tâm đường tròn ngoại tiếp", chia: "điểm chia", chieuMP: "hình chiếu lên mặt phẳng", chieuDT: "hình chiếu lên đường thẳng", giao: "giao điểm", doan: "đoạn nối" };
const SO_DIEM_PHU = { trung: 2, trongTam: [2, 6], tamNgoai: 3, chia: 2, chieuMP: 4, chieuDT: 3, giao: 4, doan: 2 };
function dungPhu(L, ds, loi) {
  L.vuong = L.vuong || [];
  const tim = t => { for (let i = L.nhan.length - 1; i >= 0; i--) if (L.nhan[i][0] === t) return L.nhan[i][1]; return null; };
  for (const d of ds || []) {
    const ten = d.ds || [], P = ten.map(tim), bao = m => loi.push((d.ten ? d.ten + ": " : "") + m);
    const vang = ten.filter((t, i) => !P[i]); if (vang.length) { bao("chưa có điểm " + vang.join(", ")); continue; }
    let q = null;
    if (d.loai === "doan") { if (len(sub(P[0], P[1])) < 1e-9) bao("hai điểm trùng nhau"); else L.phu.push([P[0], P[1]]); continue; }
    if (d.loai === "trung") q = mul(add(P[0], P[1]), .5);
    else if (d.loai === "trongTam") q = mul(P.reduce((a, b) => add(a, b), [0, 0, 0]), 1 / P.length);
    else if (d.loai === "chia") q = lerp3(P[0], P[1], +d.k);
    else if (d.loai === "tamNgoai") { const ab = sub(P[1], P[0]), ac = sub(P[2], P[0]), n = cross(ab, ac), n2 = dot(n, n); if (n2 < 1e-12) { bao("ba điểm thẳng hàng"); continue; }
      q = add(P[0], mul(add(mul(cross(n, ab), dot(ac, ac)), mul(cross(ac, n), dot(ab, ab))), 1 / (2 * n2))); }
    else if (d.loai === "chieuMP") { const n = cross(sub(P[2], P[1]), sub(P[3], P[1])); if (len(n) < 1e-9) { bao("ba điểm của mặt phẳng thẳng hàng"); continue; } const e = norm(n); q = sub(P[0], mul(e, dot(sub(P[0], P[1]), e)));
      if (len(sub(P[0], q)) > 1e-6) { L.phu.push([P[0], q]); const ref = [P[1], P[2], P[3]].find(r => len(sub(r, q)) > 1e-6); if (ref) L.vuong.push([q, P[0], ref]); } }
    else if (d.loai === "chieuDT") { const e = norm(sub(P[2], P[1])); q = add(P[1], mul(e, dot(sub(P[0], P[1]), e)));
      if (len(sub(P[0], q)) > 1e-6) { L.phu.push([P[0], q]); const ref = [P[1], P[2]].find(r => len(sub(r, q)) > 1e-6); if (ref) L.vuong.push([q, P[0], ref]); } }
    else if (d.loai === "giao") { const u = sub(P[1], P[0]), v = sub(P[3], P[2]), w = sub(P[0], P[2]), a = dot(u, u), b = dot(u, v), c = dot(v, v), dd = dot(u, w), e = dot(v, w), D = a * c - b * b;
      if (Math.abs(D) < 1e-10) { bao("hai đường thẳng song song"); continue; }
      const s1 = (b * e - c * dd) / D, s2 = (a * e - b * dd) / D, q1 = add(P[0], mul(u, s1)), q2 = add(P[2], mul(v, s2));
      if (len(sub(q1, q2)) > 1e-3 * (1 + len(u) + len(v))) { bao("hai đường thẳng " + ten[0] + ten[1] + " và " + ten[2] + ten[3] + " không cắt nhau (chéo nhau)"); continue; }
      q = mul(add(q1, q2), .5);
      // nối thêm phần kéo dài khi giao điểm nằm ngoài đoạn
      if (s1 < -1e-6 || s1 > 1 + 1e-6) L.phu.push([s1 < 0 ? P[0] : P[1], q]); if (s2 < -1e-6 || s2 > 1 + 1e-6) L.phu.push([s2 < 0 ? P[2] : P[3], q]); }
    if (!q) continue;
    if (d.ten) { L.nhan.push([d.ten, q]); }
    if (d.noi) d.noi.forEach(t => { const p = tim(t); if (p) L.phu.push([q, p]); });
  }
}
function gocVuong(H, P1, P2, s) { // ký hiệu góc vuông tại H giữa HP1 và HP2
  const u = norm(sub(P1, H)); let v = sub(P2, H); v = norm(sub(v, mul(u, dot(v, u)))); if (!isFinite(v[0]) || len(v) < .5) return null;
  return [add(H, mul(u, s)), add(add(H, mul(u, s)), mul(v, s)), add(H, mul(v, s))];
}
/* ================= Dựng cảnh (thuần): cfg = { id, P, neo, off, moT, phu } ================= */
const macDinh = id => { const m = MUC_ID[id], bd = m && B[m.dung]; if (!bd) return {}; return Object.assign(Object.fromEntries(bd.tham.filter(t => "mac" in t).map(t => [t.k, t.mac])), bd.quet ? { quet: 360 } : {}, m.mau || {}); };
function dungCanh(cfg) {
  const m = MUC_ID[cfg.id]; if (!m || !m.dung) throw new Error("Hình “" + cfg.id + "” chưa có trong KMath.");
  const bd = B[m.dung], P = Object.assign(macDinh(cfg.id), cfg.P || {}), L = bd.dung(P);
  if (!L.V && L.V !== 0) L.V = theTichLuoi(L);
  const loiPhu = []; if (cfg.phu && cfg.phu.length) dungPhu(L, cfg.phu, loiPhu);
  if (L.vuong && L.vuong.length) { let mn = 1e9, mx = -1e9; L.v.forEach(p => p.forEach(x => { if (x < mn) mn = x; if (x > mx) mx = x; }));
    const s = Math.min(.35, Math.max(.12, (mx - mn) * .04)); L.vuong.forEach(([H, A, Bq]) => { const pl = gocVuong(H, A, Bq, Math.min(s, len(sub(A, H)) * .4, len(sub(Bq, H)) * .4)); if (pl) L.phu.push(pl); }); }
  const G = trongTam(L), goc0 = L.neo[0] || { k: "goc", ten: "Gốc toạ độ", p: [0, 0, 0] };
  const neoDs = [...(L.neo.length ? L.neo : [goc0]), { k: "trongTam", ten: "Trọng tâm khối G", p: G },
    { k: "tuChon", ten: "Tùy chỉnh: đặt “" + goc0.ten + "” tại (x₀; y₀; z₀)", p: goc0.p, rot: goc0.rot || 0, tuChon: true }];
  let n = neoDs.find(x => x.k === cfg.neo);
  if (!n && typeof cfg.neo === "string" && cfg.neo.startsWith("diem:")) { // "diem:A>B": gốc O tại A, trục Ox theo hướng AB (Oz vẫn hướng lên)
    const [a, b] = cfg.neo.slice(5).split(">"), tim = t => { const x = L.nhan.find(([m]) => m === t); return x && x[1]; }, pa = tim(a), pb = b && tim(b);
    if (pa) { const dx = pb ? pb[0] - pa[0] : 0, dy = pb ? pb[1] - pa[1] : 0; n = { k: cfg.neo, ten: "Điểm " + a, p: pa, rot: pb && Math.hypot(dx, dy) > 1e-9 ? -Math.atan2(dy, dx) / DEG : 0 }; }
  }
  if (!n) n = neoDs[0];
  const ca = Math.cos((n.rot || 0) * DEG), sa = Math.sin((n.rot || 0) * DEG), off = n.tuChon ? (cfg.off || [0, 0, 0]) : [0, 0, 0];
  const T = p => { const q = sub(p, n.p); return [q[0] * ca - q[1] * sa + off[0], q[0] * sa + q[1] * ca + off[1], q[2] + off[2]]; };
  const S = {
    id: cfg.id, ten: bd.ten(P), v: L.v.map(T), t: L.t, neo: n.k, neoDs, keo: L.keo || [], gocSgk: L.gocSgk || (bd.gocSgk ? bd.gocSgk(P) : null),
    g: L.g.map(g => Object.assign({}, g, { poly: g.poly ? g.poly.map(T) : null })), coQuet: !!bd.quet, quet: P.quet,
    canh: L.canh.map(c => c.map(T)), phu: L.phu.map(c => c.map(T)), wire: L.wire.map(c => c.map(T)), noiBat: L.noiBat.map(c => c.map(T)),
    nhan: L.nhan.map(([t, p]) => [t, T(p)]), V: L.V, ct: L.ct, tt: L.tt, ghiChu: L.ghiChu, loiPhu
  };
  S.n = S.t.map(([a, b, c]) => norm(cross(sub(S.v[b], S.v[a]), sub(S.v[c], S.v[a]))));
  // viền mặt cong: cạnh chung hai tam giác cùng mặt cong (ghép theo toạ độ để nối cả đường nối vòng)
  const kv = S.v.map(p => p.map(x => x.toFixed(5)).join(",")), ma = new Map(), idx = kv.map(k => { if (!ma.has(k)) ma.set(k, ma.size); return ma.get(k); });
  const ke = new Map();
  S.t.forEach((t, ti) => { if (!S.g[t[3]].tron) return; for (let e = 0; e < 3; e++) { const a = t[e], b = t[(e + 1) % 3], A = idx[a], Bk = idx[b]; if (A === Bk) continue; const k = A < Bk ? A * 1e7 + Bk : Bk * 1e7 + A; let x = ke.get(k); if (!x) { x = { a, b, ds: [] }; ke.set(k, x); } x.ds.push(ti); } });
  S.sil = []; for (const x of ke.values()) if (x.ds.length === 2 && S.t[x.ds[0]][3] === S.t[x.ds[1]][3]) S.sil.push([x.a, x.b, x.ds[0], x.ds[1]]);
  S.theoMat = S.g.map(() => []); S.t.forEach((t, i) => S.theoMat[t[3]].push(i));
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const p of S.v) for (let i = 0; i < 3; i++) { if (p[i] < mn[i]) mn[i] = p[i]; if (p[i] > mx[i]) mx[i] = p[i]; }
  S.mn = mn; S.mx = mx; S.co = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) || 1;
  S.tam = mul(add(mn, mx), .5);
  S.v0 = S.v; S.n0 = S.n; S.canh0 = S.canh; S.nhan0 = S.nhan; S.phu0 = S.phu; S.noiBat0 = S.noiBat; S.tam0 = S.tam; S.polyNay = S.g.map(g => g.poly); S.moT = 0;
  if (L.moHam) { S.moHam = t => { const r = L.moHam(t); return { v: r.v.map(T), canh: r.canh.map(c => c.map(T)), nhan: r.nhan.map(([a, p]) => [a, T(p)]) }; }; S.coMo = true; }
  else if (L.mo) { S.moCfg = L.mo; S.coMo = true; }
  else if (L.moTuDong) { S.moCfg = "tudong"; S.coMo = true; }
  else S.coMo = false;
  if (cfg.moT > 0 && damBaoMo(S)) apDungMo(S, cfg.moT);
  return S;
}
/* khung hình vừa khối (và trục, điểm đang hỏi) theo một hướng nhìn */
function vuaKhung(S, q, W, H, o) {
  o = o || {}; const MT = maTranChieu(q, o.xien), pts = (S.v0 || S.v).slice();
  if (S.vMo1 && o.moT > 0) pts.push(...S.vMo1);
  (o.diem || []).forEach(d => pts.push(d.p));
  if (o.oxyz) { pts.push([0, 0, 0]); dinhTruc(S).forEach(([, p]) => pts.push(p)); }
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of pts) { const x = dot(MT.r0, p), y = dot(MT.r1, p); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const zoom = Math.max(4, Math.min((W - (o.leX ?? 110)) / ((x1 - x0) || 1), (H - (o.leY ?? 210)) / ((y1 - y0) || 1)) * .92);
  return { zoom, px: -(x0 + x1) / 2 * zoom, py: (y0 + y1) / 2 * zoom + (o.dy ?? -6) };
}
/* điểm đang hỏi toạ độ: { ten } tra theo nhãn hiện tại, { ten, p, rieng } giữ toạ độ */
function giaiDiem(S, ds) {
  const out = [];
  for (const d of ds || []) { if (d.rieng) out.push({ ten: d.ten, p: d.p, rieng: true }); else { const x = S.nhan.find(([n]) => n === d.ten); if (x) out.push({ ten: d.ten, p: x[1] }); } }
  return out;
}

/* ================= Video: khoi3d(tuỳ chọn): tên hình; tham số; tô mặt màu ================= */
const BI_DANH = {
  chop4: ["chop tu giac", "hinh chop", "chop", "s.abcd", "chop s.abcd"], chop4deu: ["chop tu giac deu", "chop deu"],
  batdien: ["bat dien deu", "bat dien", "tam mat deu"], trucut: ["tru cut", "hinh tru cut"], mongtru: ["mong tru"],
  chomcau: ["chom cau"], quatcau: ["quat cau"], paraboloid: ["paraboloid", "parabol tron xoay", "chao parabol"],
  xuyen: ["xuyen", "hinh xuyen", "torus", "phao boi", "banh donut"], quayHam: ["quay ox", "quay quanh ox", "tron xoay quanh ox", "khoi tron xoay", "f(x)", "tich phan", "quay oy"],
  tru: ["hinh tru", "tru", "tru tron"], non: ["hinh non", "non", "non tron"], nonCut: ["non cut"], cau: ["mat cau", "khoi cau", "hinh cau", "cau"],
  lapPhuong: ["lap phuong", "hinh lap phuong"], hopCN: ["hop chu nhat", "hinh hop chu nhat"], tdDeu: ["tu dien deu"], tdVuong: ["tu dien vuong"]
};
const chuan = s => boDau(String(s || "")).replace(/\s+/g, " ").trim();
function timHinh(txt) {
  const q = chuan(txt).replace(/^(hinh|khoi)\s+/, "");
  if (!q) return null;
  const theoId = MUC.find(m => m.dung && m.id.toLowerCase() === q.replace(/\s+/g, "").toLowerCase()); if (theoId) return theoId.id;
  const dung = MUC.filter(m => m.dung), bo = x => chuan(x).replace(/^(hinh|khoi)\s+/, "");
  const y = dung.find(m => bo(m.ten) === q); if (y) return y.id;
  for (const [id, ds] of Object.entries(BI_DANH)) if (MUC_ID[id] && ds.includes(q)) return id;
  let tot = null, dai = 0;
  for (const m of dung) { const t = bo(m.ten); if ((t.includes(q) || q.includes(t)) && t.length > dai && Math.min(t.length, q.length) > 3) { tot = m.id; dai = t.length; } }
  for (const [id, ds] of Object.entries(BI_DANH)) for (const a of ds) if (MUC_ID[id] && (q.includes(a) || a.includes(q)) && a.length > dai) { tot = id; dai = a.length; }
  if (tot) return tot;
  const m = dung.find(x => chuan(x.tu).split(" ").length && chuan(x.tu).includes(q)); return m ? m.id : null;
}
const MAU_VD = { vang: "#FFC94D", do: "#FF5A5F", xanh: "#4FB3FF", luc: "#4ADE80", hong: "#FF7EB6", cam: "#FF9F43", tim: "#B794F6", trang: "#FFFFFF", cyan: "#5EEBFF" };
const soVN = z => { const v = parseFloat(String(z).replace(",", ".")); return isFinite(v) ? v : NaN; };
/* đọc phần nội dung: "chóp tứ giác đều; a = 4; h = 5; tô SAB đỏ; tô đáy vàng 0.6" */
function docNoiDung(s, bao) {
  const ph = String(s || "").split(/;|\n/).map(x => x.trim()).filter(Boolean);
  const id = timHinh(ph[0]);
  if (!id) throw new Error("chưa có hình “" + (ph[0] || "") + "” — xem danh sách trong tab Hình 3D (vd: chóp tứ giác đều, lăng trụ đứng, hình trụ, hình nón, mặt cầu, xuyến…)");
  const m = MUC_ID[id], bd = B[m.dung], P = macDinh(id), toMau = [];
  for (const p of ph.slice(1)) {
    const b = chuan(p);
    const qt = b.match(/^to\s+(.+?)\s+(vang|do|xanh|luc|hong|cam|tim|trang|cyan)(?:\s+(\d+(?:[.,]\d+)?)\s*%?)?$/);
    if (qt) { let a = qt[3] != null ? soVN(qt[3]) : .55; if (a > 1) a /= 100; toMau.push({ mat: qt[1], c: MAU_VD[qt[2]], a: Math.min(1, Math.max(.1, a)) }); continue; }
    const qk = p.match(/^\s*([A-Za-z][A-Za-z0-9]*)\s*=\s*(.+)$/);
    if (!qk) { bao("chưa hiểu “" + p + "” — dùng dạng a = 4 hoặc tô SAB đỏ"); continue; }
    const t = bd.tham.find(x => x.k === qk[1]) || bd.tham.find(x => x.k.toLowerCase() === qk[1].toLowerCase());
    if (!t || t.loai === "mau") { bao("hình này không có tham số “" + qk[1] + "” — có: " + bd.tham.filter(x => x.loai !== "mau").map(x => x.k).join(", ")); continue; }
    const v = qk[2].trim();
    if (t.loai === "so" || t.loai === "nhap") { const x = soVN(v); if (!isFinite(x)) { bao(qk[1] + " cần là số"); continue; } P[t.k] = t.loai === "so" ? Math.min(t.max, Math.max(t.min, x)) : x; }
    else if (t.loai === "chon") { const bv = chuan(v), o = t.ds.find(([k, n]) => String(k) === v || chuan(k) === bv || chuan(n).startsWith(bv) || chuan(n).includes(bv)); if (o) P[t.k] = o[0]; else bao(qk[1] + " chỉ nhận: " + t.ds.map(x => x[1]).join(", ")); }
    else if (t.loai === "bat") P[t.k] = !/^(khong|tat|an|0|false)$/.test(chuan(v));
    else P[t.k] = v;
  }
  return { id, P, toMau };
}
/* đọc phần tuỳ chọn trong ngoặc (đã bỏ @giây, sau n, nhanh/chậm ở app.js) */
function docTuyChon(ts, bao) {
  const c = { co: 1, xoay: null, trai: 0, gap: 0, quet: 0, giu: 0, goc: "sgk", che: "dac", nhan: true, oxyz: false, khuat: true, luoiMat: false, lienTuc: false, tinh: false, xien: false };
  String(ts || "").split("|").map(z => z.trim()).filter(Boolean).forEach(z => {
    const b = chuan(z); let m;
    if (/^\d+(?:[.,]\d+)?$/.test(b)) { c.co = Math.min(3, Math.max(.4, soVN(b))); return; }
    if ((m = b.match(/^xoay(?:\s+(-?\d+(?:[.,]\d+)?)\s*(vong|do|°)?)?(?:\s*(?:trong)?\s*(\d+(?:[.,]\d+)?)\s*(?:s|giay)?)?(\s+(?:mai|lien tuc|lap))?$/))) {
      let deg = m[1] != null ? soVN(m[1]) : 360; if (m[2] === "vong") deg *= 360;
      c.xoay = { deg, giay: m[3] != null ? Math.max(.5, soVN(m[3])) : Math.max(2.5, Math.abs(deg) / 72) }; if (m[4]) c.lienTuc = true; return; }
    if ((m = b.match(/^(?:trai|trai phang|mo|mo ra)(?:\s*(?:trong)?\s*(\d+(?:[.,]\d+)?)\s*(?:s|giay)?)?$/))) { c.trai = m[1] != null ? Math.max(.5, soVN(m[1])) : 3; return; }
    if ((m = b.match(/^(?:gap|gap lai|dong lai)(?:\s*(?:trong)?\s*(\d+(?:[.,]\d+)?)\s*(?:s|giay)?)?$/))) { c.gap = m[1] != null ? Math.max(.5, soVN(m[1])) : 2; return; }
    if ((m = b.match(/^(?:quet|quet tao khoi|tao khoi)(?:\s*(?:trong)?\s*(\d+(?:[.,]\d+)?)\s*(?:s|giay)?)?$/))) { c.quet = m[1] != null ? Math.max(.5, soVN(m[1])) : 4; return; }
    if ((m = b.match(/^(?:giu|giu trong|mat sau|het sau)\s*(\d+(?:[.,]\d+)?)\s*(?:s|giay)?$/))) { c.giu = soVN(m[1]); return; }
    if ((m = b.match(/^goc\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)$/))) { c.goc = "so"; c.gocSo = [soVN(m[1]), Math.max(-89, Math.min(89.9, soVN(m[2])))]; return; }
    if (/^(xien|goc xien|sgk xien|chieu xien|song song)$/.test(b)) { c.xien = true; return; }
    if ((m = b.match(/^(?:goc\s+)?(sgk|chuan|truoc|mat truoc|tren|tu tren|tu tren xuong|nghieng|goc nghieng|3d)$/))) { c.goc = /truoc/.test(m[1]) ? "truoc" : /tren/.test(m[1]) ? "tren" : /nghieng|3d/.test(m[1]) ? "nghieng" : "sgk"; return; }
    if (/^(trong suot|kinh)$/.test(b)) { c.che = "trong"; return; }
    if (/^(khung day|khung|day)$/.test(b)) { c.che = "khung"; return; }
    if (/^dac$/.test(b)) { c.che = "dac"; return; }
    if (/^(khong nhan|an nhan|bo nhan)$/.test(b)) { c.nhan = false; return; }
    if (/^(oxyz|truc|he truc|co truc)$/.test(b)) { c.oxyz = true; return; }
    if (/^(khong net khuat|an net khuat)$/.test(b)) { c.khuat = false; return; }
    if (/^(luoi|luoi mat)$/.test(b)) { c.luoiMat = true; return; }
    if (/^(tinh|dung yen|khong xoay)$/.test(b)) { c.tinh = true; return; }
    bao("khoi3d chưa hiểu “" + z + "” — dùng: cỡ (vd 1.2), quét 4, xoay 360 5, trải 3, gập 2, giữ 4, góc sgk/trước/trên/nghiêng (hoặc góc 30 20), xiên, trong suốt, khung dây, oxyz, không nhãn");
  });
  if (!c.xoay && !c.trai && !c.quet && !c.tinh) c.xoay = { deg: 360, giay: 6 };   // mặc định: xoay một vòng
  if (c.tinh) c.xoay = null;
  return c;
}
const emIO = x => { x = Math.min(1, Math.max(0, x)); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
/* tạo phần tử video: trả { loai, h, d, coDinh, giu, k3 } */
function taoPhanTuVideo(ts, s, o) {
  const bao = o.bao || (() => {}), tc = docTuyChon(ts, bao), nd = docNoiDung(s, bao), toc = o.toc || 1;
  if (tc.xoay) tc.xoay.giay *= toc; tc.trai *= toc; tc.gap *= toc; tc.quet *= toc;
  const S = dungCanh({ id: nd.id, P: nd.P });
  if (tc.quet && !S.coQuet) { bao(S.ten + " không phải khối tròn xoay — bỏ qua “quét”"); tc.quet = 0; }
  if ((tc.trai || tc.gap) && !damBaoMo(S)) bao(S.ten + " chưa trải phẳng được — bỏ qua trải/gập");
  if (!S.mo) { tc.trai = 0; tc.gap = 0; }
  if (tc.gap && !tc.trai) tc.trai = 3 * toc;
  const mau = {};
  nd.toMau.forEach(t => { const q = chuan(t.mat), gi = S.g.findIndex(g => { const tg = chuan(g.ten); return tg === q || (" " + tg + " ").includes(" " + q + " ") || tg.includes(q); }); if (gi < 0) bao("không có mặt “" + t.mat + "” — các mặt: " + S.g.map(g => g.ten).join(", ")); else mau[gi] = { c: t.c, a: t.a }; });
  const vao = .6, tXoay = tc.xoay ? tc.xoay.giay : 0, d = vao + tc.quet + tXoay + tc.trai + tc.gap + .2;
  const g0 = tc.gocSo || (GOC[tc.goc] || GOC.sgk);
  const k3 = { S, S0: S, id: nd.id, P: nd.P, tc, mau, vao, tXoay, g0, d, quetHien: 360 };
  const pts = (S.v0 || S.v).slice(); if (tc.oxyz) { pts.push([0, 0, 0]); dinhTruc(S).forEach(([, p]) => pts.push(p)); }
  k3.tam = S.tam0; const banKinh = ds => Math.max(...ds.map(p => len(sub(p, k3.tam)))) || 1;
  k3.R0 = banKinh(pts); k3.tam1 = k3.tam; k3.R = k3.R0;
  if (S.vMo1 && tc.trai) { // khi trải hết: khung bám theo hình trải (tâm hộp bao của hình trải)
    const q = S.vMo1.concat(tc.oxyz ? pts.slice((S.v0 || S.v).length) : []), mn = [0, 1, 2].map(i => Math.min(...q.map(p => p[i]))), mx = [0, 1, 2].map(i => Math.max(...q.map(p => p[i])));
    k3.tam1 = mn.map((v, i) => (v + mx[i]) / 2); k3.R = Math.max(...q.map(p => len(sub(p, k3.tam1)))) || 1; }
  const hk = (o.doc ? 820 : 560) * o.u * tc.co;
  return { loai: "khoi3d", k3, h: hk, d, coDinh: true, giu: tc.giu };
}
/* vẽ phần tử khối 3D trong khung (x, y, w, h) tại τ giây kể từ lúc hiện */
function veVideo(ctx, k3, x, y, w, h, tau, u) {
  const { tc, mau, vao, tXoay, g0 } = k3;
  // quét tạo khối tròn xoay: dựng lại khối theo góc quét (làm tròn từng độ)
  if (tc.quet) { const deg = Math.max(1, Math.min(360, Math.round(360 * emIO((tau - vao) / tc.quet))));
    if (deg !== k3.quetHien) { k3.quetHien = deg; k3.S = deg >= 360 ? k3.S0 : dungCanh({ id: k3.id, P: Object.assign({}, k3.P, { quet: deg }) }); } }
  const S = k3.S, t0 = vao + tc.quet;
  let goc = 0, moT = 0;
  if (tc.xoay) { const f = tc.lienTuc && tau > t0 + tXoay ? (tau - t0) / tXoay : emIO((tau - t0) / tXoay); goc = tc.xoay.deg * f; }
  const t1 = t0 + tXoay;
  if (tc.trai) moT = emIO((tau - t1) / tc.trai);
  if (tc.gap) moT = Math.min(moT, 1 - emIO((tau - t1 - tc.trai) / tc.gap));
  if (S.mo) apDungMo(S, moT);
  let q, xien = null;
  if (tc.xien) { const gs = S.gocSgk; if (gs && gs.q) q = qMul(gs.q, qAxis([0, 0, 1], goc * DEG)); else { q = qMul(matToQ(gs || MAT_SGK), qAxis([0, 0, 1], goc * DEG)); xien = XIEN_SGK;
      if (moT > 0 && S.mo && !S.mo.ham) { q = slerp(q, qTuGoc(goc, 55), moT); xien = { k: XIEN_SGK.k * (1 - moT), a: XIEN_SGK.a }; } } }
  else { const phi = tc.goc === "tren" ? g0[1] : g0[1] + (Math.max(g0[1], 52) - g0[1]) * moT; q = qTuGoc(g0[0] + goc, phi); }  // ngẩng lên khi trải để thấy rõ hình trải
  const MT = maTranChieu(q, xien);
  const R0 = k3.R0 || k3.R, t1c = k3.tam1 || k3.tam, kk = 2.3 * u, zoom = Math.min(w, h) * .47 / (R0 + (k3.R - R0) * moT) / kk, c = k3.tam.map((v, i) => v + (t1c[i] - v) * moT); // khung trượt dần theo hình trải
  const cam = { q, xien, zoom, px: -dot(MT.r0, c) * zoom, py: dot(MT.r1, c) * zoom };
  const a = Math.min(1, Math.max(0, tau / vao)), sc = .9 + .1 * (1 - Math.pow(1 - a, 3));
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-w / 2, -h / 2);
  ve(ctx, S, cam, w, h, kk, { che: tc.che, khuat: tc.khuat, nhan: tc.nhan, phu: !moT, luoiMat: tc.luoiMat, oxyz: tc.oxyz, luoiOxy: false, mau, hover: -1 });
  ctx.restore();
}

window.KHinh3D = {
  phienBan: "2.0", DEG, TAU, MUC, MUC_ID, TEN_NHOM, B, ICO, MAU_F, GOC, PAL, MAU, MAU_VD, MAT_SGK, MAT_NGANG, XIEN_SGK,
  so, boDau, bienDich, hexRgb, toaDoChu, TEN_LOAI_PHU, SO_DIEM_PHU, macDinh, dungCanh, apDungMo, damBaoMo, dinhTruc, chieu, tachNet, ve, vuaKhung, giaiDiem, duongGiong, taoTikz,
  qTuGoc, qMul, qAxis, qNorm, qToMat, matToQ, slerp, dot, len, camGoc, maTranChieu, timHinh, docNoiDung, docTuyChon, taoPhanTuVideo, veVideo, dangKy,
  // công cụ cho shape3d-catalog.js
  cc: { add, sub, mul, dot, cross, len, norm, lerp3, Luoi, daDien, khoiXoay, moTronXoay, baoLoi, datMatDay, phapNewell, dienTichDaGiac, giao2D, theTichLuoi, bienDich, so, DEG, TAU, MAT_NGANG, MAP_TRUC, dtCo }
};
})();
