/* ===== hinh3d-loi.js — KMath · Hình 3D: engine dựng & vẽ khối không gian (không phụ thuộc giao diện).
   Dùng chung cho tab "Hình 3D" (hinh3d.js) và lệnh khoi3d(...) trong tab Tạo video (app.js).
   Vẽ lên MỌI canvas 2D: phép chiếu vuông góc, nét khuất nét đứt chuẩn SGK, mặt logic để tô màu,
   trải phẳng theo cây bản lề, xuất TikZ thuần. Lộ ra window.KHinh3D. ===== */
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
/* Camera nhìn từ hướng (θ, φ): hàng ma trận = phải, lên, hướng về người xem. Oz luôn hướng lên khi φ ∈ (−90°; 90°). */
const qTuGoc = (th, ph) => {
  th *= DEG; ph *= DEG;
  const d = [Math.cos(ph) * Math.cos(th), Math.cos(ph) * Math.sin(th), Math.sin(ph)];
  const r = [-Math.sin(th), Math.cos(th), 0];
  return matToQ([r, cross(d, r), d]);
};
const GOC = { sgk: [28, 17], truoc: [0, 0], tren: [0, 89.9], nghieng: [45, 35.26] };

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

/* ================= Lưới tam giác có "mặt logic" ================= */
class Luoi {
  constructor() { this.v = []; this.t = []; this.g = []; this.canh = []; this.phu = []; this.nhan = []; this.wire = []; this.neo = []; this.ghiChu = ""; this.tt = ""; }
  diem(p) { this.v.push(p); return this.v.length - 1; }
  mat(ten, o) { this.g.push(Object.assign({ ten, phang: false, tron: false, poly: null }, o || {})); return this.g.length - 1; }
  /* tam giác, tự đảo chiều để pháp tuyến hướng ra ngoài khối */
  tg(a, b, c, g, ra) {
    const A = this.v[a], B = this.v[b], C = this.v[c], n = cross(sub(B, A), sub(C, A));
    if (len(n) < 1e-10) return;
    const tam = mul(add(add(A, B), C), 1 / 3), o = typeof ra === "function" ? ra(tam) : ra;
    this.t.push(dot(n, o) < 0 ? [a, c, b, g] : [a, b, c, g]);
  }
  daGiac(pts, g, ra) { const id = pts.map(p => this.diem(p)); for (let k = 1; k < id.length - 1; k++) this.tg(id[0], id[k], id[k + 1], g, ra); }
  quat(tam, vien, g, ra, kin) { const c = this.diem(tam), id = vien.map(p => this.diem(p)), m = kin ? id.length : id.length - 1; for (let k = 0; k < m; k++) this.tg(c, id[k], id[(k + 1) % id.length], g, ra); }
  luoiUV(nu, nv, fn, g, ra, vong) {
    const cot = vong ? nu : nu + 1, id = [];
    for (let i = 0; i < cot; i++) { const r = []; for (let j = 0; j <= nv; j++) r.push(this.diem(fn(i, j))); id.push(r); }
    for (let i = 0; i < nu; i++) { const i1 = vong ? (i + 1) % nu : i + 1;
      for (let j = 0; j < nv; j++) { this.tg(id[i][j], id[i1][j], id[i1][j + 1], g, ra); this.tg(id[i][j], id[i1][j + 1], id[i][j + 1], g, ra); } }
    return id;
  }
  /* mặt tròn xoay: prof = [[bán kính, toạ độ dọc trục], …], trục "z" hoặc "x" */
  xoay(prof, nu, truc, g, ra, kin) {
    const P = (r, s, u) => truc === "z" ? [r * Math.cos(u), r * Math.sin(u), s] : [s, r * Math.cos(u), r * Math.sin(u)];
    const rows = prof.map(([r, s]) => {
      if (r < 1e-9) return { cuc: true, i: this.diem(P(0, s, 0)) };
      const idx = []; for (let k = 0; k < nu; k++) idx.push(this.diem(P(r, s, TAU * k / nu))); return { cuc: false, idx };
    });
    const n = rows.length, m = kin ? n : n - 1;
    for (let i = 0; i < m; i++) { const a = rows[i], b = rows[(i + 1) % n]; if (a.cuc && b.cuc) continue;
      for (let k = 0; k < nu; k++) { const k1 = (k + 1) % nu;
        if (a.cuc) this.tg(a.i, b.idx[k], b.idx[k1], g, ra);
        else if (b.cuc) this.tg(a.idx[k], a.idx[k1], b.i, g, ra);
        else { this.tg(a.idx[k], a.idx[k1], b.idx[k1], g, ra); this.tg(a.idx[k], b.idx[k1], b.idx[k], g, ra); } } }
    return rows;
  }
  vongDiem(row) { return row.cuc ? null : row.idx.map(i => this.v[i]); }
  wireXoay(rows, buocHang, buocCot, nu, kin) {
    rows.forEach((r, i) => { if (!r.cuc && i % buocHang === 0 && i > 0 && i < rows.length - 1) { const p = this.vongDiem(r); this.wire.push([...p, p[0]]); } });
    for (let k = 0; k < nu; k += buocCot) { const pl = rows.map(r => this.v[r.cuc ? r.i : r.idx[k]]); if (kin) pl.push(pl[0]); this.wire.push(pl); }
  }
}
const dienTichDaGiac = pts => { let s = [0, 0, 0]; for (let i = 0; i < pts.length; i++) s = add(s, cross(pts[i], pts[(i + 1) % pts.length])); return len(s) / 2; };
const giao2D = (p1, p2, p3, p4) => { const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]); if (Math.abs(d) < 1e-12) return [(p1[0] + p3[0]) / 2, (p1[1] + p3[1]) / 2];
  const a = p1[0] * p2[1] - p1[1] * p2[0], b = p3[0] * p4[1] - p3[1] * p4[0];
  return [(a * (p3[0] - p4[0]) - (p1[0] - p2[0]) * b) / d, (a * (p3[1] - p4[1]) - (p1[1] - p2[1]) * b) / d]; };

/* ================= Bộ dựng hình (dữ liệu hoá: thêm hình = thêm 1 bộ dựng) ================= */
const B = {};

B.chop4 = {
  ten: P => P.day === "vuong" && P.chan === "tam" ? "Hình chóp tứ giác đều S.ABCD" : "Hình chóp tứ giác S.ABCD",
  tham: [
    { k: "day", ten: "Đáy ABCD", loai: "chon", mac: "vuong", ds: [["vuong", "Hình vuông"], ["chunhat", "Hình chữ nhật"], ["thoi", "Hình thoi"], ["binhhanh", "Hình bình hành"], ["thang", "Hình thang cân (AD ∥ BC)"]] },
    { k: "a", ten: P => P.day === "vuong" || P.day === "thoi" ? "Cạnh đáy a" : P.day === "thang" ? "AD = a (đáy lớn)" : "AB = a", loai: "so", min: 1, max: 8, buoc: .1, mac: 4 },
    { k: "b", ten: P => P.day === "thang" ? "Khoảng cách giữa AD và BC" : "AD = b", loai: "so", min: 1, max: 8, buoc: .1, mac: 3, hien: P => ["chunhat", "binhhanh", "thang"].includes(P.day) },
    { k: "c", ten: "BC = c (đáy nhỏ)", loai: "so", min: .5, max: 8, buoc: .1, mac: 2, hien: P => P.day === "thang" },
    { k: "goc", ten: "Góc BAD", don: "°", loai: "so", min: 30, max: 150, buoc: 1, mac: 60, hien: P => P.day === "thoi" || P.day === "binhhanh" },
    { k: "h", ten: "Chiều cao SH = h", loai: "so", min: 1, max: 10, buoc: .1, mac: 5 },
    { k: "chan", ten: "Chân đường cao", loai: "chon", mac: "tam", ds: [["tam", "H là giao hai đường chéo đáy"], ["A", "H trùng A (SA ⊥ (ABCD))"]] }
  ],
  dung(P) {
    // A ở góc trên-trái; đáy đánh tên theo chiều dương (ngược kim đồng hồ nhìn từ trên xuống):
    // A (trên-trái) → B (dưới-trái) → C (dưới-phải) → D (trên-phải). AB hướng ra trước (Ox), AD sang phải (Oy).
    const a = P.a, b = P.b, al = P.goc * DEG, A = [0, 0]; let Bp, D, C;
    if (P.day === "vuong") { Bp = [a, 0]; D = [0, a]; }
    else if (P.day === "chunhat") { Bp = [a, 0]; D = [0, b]; }
    else if (P.day === "thoi") { D = [0, a]; Bp = [a * Math.sin(al), a * Math.cos(al)]; }
    else if (P.day === "binhhanh") { D = [0, b]; Bp = [a * Math.sin(al), a * Math.cos(al)]; }
    else { const c = Math.min(P.c, a * 1.6); D = [0, a]; Bp = [b, (a - c) / 2]; C = [b, (a + c) / 2]; }
    if (!C) C = [Bp[0] + D[0] - A[0], Bp[1] + D[1] - A[1]];
    const O = giao2D(A, C, Bp, D), h3 = p => [p[0] - O[0], p[1] - O[1], 0];
    const a3 = h3(A), b3 = h3(Bp), c3 = h3(C), d3 = h3(D), o3 = [0, 0, 0];
    const H = P.chan === "A" ? a3 : o3, S = [H[0], H[1], P.h];
    const L = new Luoi(), tam = mul(add(add(add(add(a3, b3), c3), d3), S), 1 / 5), ra = p => sub(p, tam);
    L.daGiac([a3, b3, c3, d3], L.mat("Mặt đáy ABCD", { phang: true, poly: [a3, b3, c3, d3] }), ra);
    [["SAB", a3, b3], ["SBC", b3, c3], ["SCD", c3, d3], ["SDA", d3, a3]].forEach(([t, p, q]) => L.daGiac([S, p, q], L.mat("Mặt bên " + t, { phang: true, poly: [S, p, q] }), ra));
    L.canh.push([a3, b3], [b3, c3], [c3, d3], [d3, a3], [S, a3], [S, b3], [S, c3], [S, d3]);
    L.nhan.push(["S", S], ["A", a3], ["B", b3], ["C", c3], ["D", d3]);
    if (P.chan === "tam") { L.phu.push([S, o3], [a3, c3], [b3, d3]); L.nhan.push(["H", o3]); }
    const Sd = dienTichDaGiac([a3, b3, c3, d3]);
    L.V = Sd * P.h / 3; L.ct = "V = ⅓ · S(đáy) · h"; L.tt = "S(đáy) = " + so(Sd);
    L.neo = [{ k: "tamDay", ten: "Giao điểm hai đường chéo đáy", p: o3 }, { k: "dinhA", ten: P.day === "vuong" || P.day === "chunhat" ? "Đỉnh A — AB ≡ Ox, AD ≡ Oy, AS ≡ Oz" : "Đỉnh A — AD ≡ Oy", p: a3 }];
    L.keo = [{ nhan: "S", k: "h", min: 1, max: 10, ten: "chiều cao SH" }];
    L.mo = { goc: 0, cay: [[1, 0], [2, 0], [3, 0], [4, 0]] }; // đáy giữ nguyên, 4 mặt bên lật quanh AB, BC, CD, DA
    return L;
  }
};

B.batdien = {
  ten: () => "Khối bát diện đều",
  tham: [{ k: "a", ten: "Cạnh a", loai: "so", min: 1, max: 8, buoc: .1, mac: 4 }],
  dung(P) {
    const a = P.a, h = a / Math.SQRT2, L = new Luoi();
    const A = [a / 2, -a / 2, 0], Bv = [a / 2, a / 2, 0], C = [-a / 2, a / 2, 0], D = [-a / 2, -a / 2, 0], E = [0, 0, h], F = [0, 0, -h], I = [0, 0, 0];
    const day = [["A", A], ["B", Bv], ["C", C], ["D", D]];
    for (const [dinh, Pd] of [["E", E], ["F", F]]) for (let i = 0; i < 4; i++) {
      const [t1, p1] = day[i], [t2, p2] = day[(i + 1) % 4];
      L.daGiac([Pd, p1, p2], L.mat("Mặt " + dinh + t1 + t2, { phang: true, poly: [Pd, p1, p2] }), p => p);
    }
    L.canh.push([A, Bv], [Bv, C], [C, D], [D, A], [E, A], [E, Bv], [E, C], [E, D], [F, A], [F, Bv], [F, C], [F, D]);
    L.phu.push([E, F], [A, C], [Bv, D]);
    L.nhan.push(["A", A], ["B", Bv], ["C", C], ["D", D], ["E", E], ["F", F], ["I", I]);
    L.V = Math.SQRT2 / 3 * a ** 3; L.ct = "V = (√2 / 3) · a³"; L.tt = "8 mặt là tam giác đều cạnh a";
    L.neo = [{ k: "tam", ten: "Tâm I của khối", p: I }, { k: "dinhA", ten: "Đỉnh A", p: A }];
    // lưới trải: quạt 4 mặt quanh E, mỗi mặt dưới gắn vào mặt trên tương ứng; mặt EAB lật quanh AB cho nằm trên mặt phẳng đáy
    L.mo = { goc: 0, cay: [[1, 0], [2, 1], [3, 2], [4, 0], [5, 1], [6, 2], [7, 3]], datPhang: [1, 2] };
    return L;
  }
};

B.trucut = {
  ten: P => P.kieu === "mong" ? "Móng trụ" : "Hình trụ cụt",
  tham: [
    { k: "kieu", ten: "Kiểu", loai: "chon", mac: "cut", ds: [["cut", "Trụ cụt (mặt cắt xiên)"], ["mong", "Móng trụ (cắt qua đường kính đáy)"]], datLai: true },
    { k: "r", ten: "Bán kính đáy r", loai: "so", min: .5, max: 5, buoc: .1, mac: 2 },
    { k: "h", ten: "Chiều cao tại trục h", loai: "so", min: 1, max: 10, buoc: .1, mac: 4, hien: P => P.kieu !== "mong" },
    { k: "goc", ten: "Góc giữa mặt cắt và đáy", don: "°", loai: "so", min: 5, max: 75, buoc: 1, mac: 25 }
  ],
  dung(P) {
    const L = new Luoi(), r = P.r;
    if (P.kieu === "mong") {
      const t = Math.tan(P.goc * DEG), nu = 48, nv = 6, uu = i => -Math.PI / 2 + Math.PI * i / nu;
      const day = L.mat("Đáy (nửa hình tròn)", { phang: true }), xq = L.mat("Mặt cong xung quanh", { tron: true }), cat = L.mat("Mặt cắt (nửa elip)", { phang: true });
      const cung = [], cungT = [];
      for (let i = 0; i <= nu; i++) { const u = uu(i), x = r * Math.cos(u), y = r * Math.sin(u); cung.push([x, y, 0]); cungT.push([x, y, t * x]); }
      L.g[day].poly = cung; L.g[cat].poly = cungT;
      L.quat([0, 0, 0], cung, day, [0, 0, -1], false);
      const id = L.luoiUV(nu, nv, (i, j) => { const u = uu(i), x = r * Math.cos(u), y = r * Math.sin(u); return [x, y, t * x * j / nv]; }, xq, p => [p[0], p[1], 0], false);
      L.quat([0, 0, 0], cungT, cat, [-t, 0, 1], false);
      const A = [0, -r, 0], Bv = [0, r, 0], I = [0, 0, 0], H = [r, 0, 0], C = [r, 0, t * r];
      L.canh.push(cung, cungT, [A, Bv]); L.phu.push([I, H], [H, C], [I, C]);
      L.nhan.push(["A", A], ["B", Bv], ["I", I], ["H", H], ["C", C]);
      for (let i = 6; i < nu; i += 6) L.wire.push(id[i].map(k => L.v[k]));
      L.wire.push(id.map(c => L.v[c[3]]));
      L.V = 2 / 3 * r ** 3 * t; L.ct = "V = ⅔ · r³ · tan α"; L.tt = "Tam giác IHC vuông tại H, góc HIC = α";
      L.neo = [{ k: "tamDay", ten: "Tâm đáy I (trung điểm AB)", p: I }, { k: "dinhA", ten: "Đầu mút A của đường kính", p: A }];
    } else {
      const nu = 64, nv = 6; let t = Math.tan(P.goc * DEG); const tMax = (P.h - .15) / r;
      if (t > tMax) { t = Math.max(0, tMax); L.ghiChu = "Mặt cắt chạm đáy — đã tự giảm góc còn " + so(Math.atan(t) / DEG, 1) + "°."; }
      const d = L.mat("Đáy dưới (hình tròn)", { phang: true }), xq = L.mat("Mặt xung quanh", { tron: true }), cat = L.mat("Mặt cắt (elip)", { phang: true });
      const vd = [], vt = [];
      for (let i = 0; i < nu; i++) { const u = TAU * i / nu, x = r * Math.cos(u), y = r * Math.sin(u); vd.push([x, y, 0]); vt.push([x, y, P.h + t * x]); }
      L.g[d].poly = vd; L.g[cat].poly = vt;
      L.quat([0, 0, 0], vd, d, [0, 0, -1], true);
      const id = L.luoiUV(nu, nv, (i, j) => { const u = TAU * i / nu, x = r * Math.cos(u), y = r * Math.sin(u); return [x, y, (P.h + t * x) * j / nv]; }, xq, p => [p[0], p[1], 0], true);
      L.quat([0, 0, P.h], vt, cat, [-t, 0, 1], true);
      L.canh.push([...vd, vd[0]], [...vt, vt[0]]);
      const I = [0, 0, 0], J = [0, 0, P.h];
      L.phu.push([I, J]); L.nhan.push(["I", I], ["J", J]);
      for (let i = 0; i < nu; i += 8) L.wire.push(id[i].map(k => L.v[k]));
      [2, 4].forEach(j => { const pl = id.map(c => L.v[c[j]]); pl.push(pl[0]); L.wire.push(pl); });
      L.V = Math.PI * r * r * P.h; L.ct = "V = π · r² · h"; L.tt = "h đo dọc trục IJ (tâm đáy → tâm mặt cắt)";
      L.neo = [{ k: "tamDay", ten: "Tâm đáy I", p: I }, { k: "tamCat", ten: "Tâm mặt cắt J", p: J }];
    }
    return L;
  }
};

B.chomcau = {
  ten: P => P.kieu === "quat" ? "Quạt cầu" : "Chỏm cầu",
  tham: [
    { k: "kieu", ten: "Kiểu", loai: "chon", mac: "chom", ds: [["chom", "Chỏm cầu"], ["quat", "Quạt cầu (chỏm + nón đỉnh I)"]], datLai: true },
    { k: "R", ten: "Bán kính mặt cầu R", loai: "so", min: 1, max: 6, buoc: .1, mac: 3 },
    { k: "h", ten: "Chiều cao chỏm h", loai: "so", min: .2, max: 11.9, buoc: .1, mac: 1.3 }
  ],
  dung(P) {
    const L = new Luoi(), R = P.R, hMax = P.kieu === "quat" ? R : 2 * R - .05, h = Math.min(P.h, hMax);
    if (h < P.h) L.ghiChu = "Đã giới hạn h ≤ " + so(hMax) + (P.kieu === "quat" ? " (quạt cầu cần h ≤ R)." : ".");
    const z0 = R - h, t0 = Math.acos(Math.max(-1, Math.min(1, z0 / R))), rho = R * Math.sin(t0), nu = 64, nt = Math.max(8, Math.round(30 * t0 / Math.PI));
    const I = [0, 0, 0], Hc = [0, 0, z0];
    const cap = L.mat(P.kieu === "quat" ? "Mặt cầu (phần chỏm)" : "Mặt chỏm cầu", { tron: true });
    const prof = []; for (let i = 0; i <= nt; i++) { const t = t0 * i / nt; prof.push([R * Math.sin(t), R * Math.cos(t)]); }
    const rows = L.xoay(prof, nu, "z", cap, p => p, false);
    const rim = L.vongDiem(rows[nt]);
    if (P.kieu === "quat") {
      const non = L.mat("Mặt nón (đỉnh I)", { tron: true }), pr = [];
      for (let i = 0; i <= 6; i++) { const s = i / 6; pr.push([rho * (1 - s), z0 * (1 - s)]); }
      L.xoay(pr, nu, "z", non, p => [p[0], p[1], -.2 * Math.sign(z0 || 1)], false);
      L.phu.push([I, Hc], [Hc, rim[0]]); L.canh.push([I, rim[0]]);
      L.nhan.push(["I", I], ["H", Hc], ["A", rim[0]]);
      L.V = 2 / 3 * Math.PI * R * R * h; L.ct = "V = ⅔ · π · R² · h";
    } else {
      L.quat(Hc, rim, L.mat("Đáy chỏm (hình tròn)", { phang: true, poly: rim }), [0, 0, -1], true);
      const T = [0, 0, R];
      L.phu.push([Hc, T], [Hc, rim[0]]); L.nhan.push(["H", Hc], ["A", rim[0]], ["T", T]);
      L.V = Math.PI * h * h * (R - h / 3); L.ct = "V = π · h² · (R − h/3)";
    }
    L.canh.push([...rim, rim[0]]);
    L.wireXoay(rows, 6, 8, nu, false);
    L.tt = "Bán kính đáy r = √(h(2R − h)) ≈ " + so(rho);
    L.neo = [{ k: "tamDay", ten: "Tâm đáy H", p: Hc }, { k: "tamCau", ten: "Tâm mặt cầu I", p: I }];
    return L;
  }
};

B.xuyen = {
  ten: P => P.kieu === "para" ? "Paraboloid tròn xoay" : "Hình xuyến (torus)",
  tham: [
    { k: "kieu", ten: "Kiểu", loai: "chon", mac: "xuyen", ds: [["xuyen", "Hình xuyến (torus)"], ["para", "Paraboloid tròn xoay (cái chảo, chao đèn)"]], datLai: true },
    { k: "R", ten: "Bán kính đường tròn tâm R", loai: "so", min: 1, max: 6, buoc: .1, mac: 3, hien: P => P.kieu !== "para" },
    { k: "r", ten: "Bán kính ống r", loai: "so", min: .2, max: 5.5, buoc: .1, mac: 1, hien: P => P.kieu !== "para" },
    { k: "H", ten: "Chiều cao H", loai: "so", min: 1, max: 8, buoc: .1, mac: 4, hien: P => P.kieu === "para" },
    { k: "Rm", ten: "Bán kính miệng R", loai: "so", min: .5, max: 5, buoc: .1, mac: 2.4, hien: P => P.kieu === "para" }
  ],
  dung(P) {
    const L = new Luoi();
    if (P.kieu === "para") {
      const H = P.H, Rm = P.Rm, c = H / (Rm * Rm), nu = 64, nr = 18;
      const mp = L.mat("Mặt paraboloid", { tron: true }), prof = [];
      for (let i = 0; i <= nr; i++) { const rr = Rm * i / nr; prof.push([rr, c * rr * rr]); }
      const rows = L.xoay(prof, nu, "z", mp, p => [2 * c * p[0], 2 * c * p[1], -1], false);
      const rim = L.vongDiem(rows[nr]), K = [0, 0, H], I = [0, 0, 0];
      L.quat(K, rim, L.mat("Miệng (hình tròn)", { phang: true, poly: rim }), [0, 0, 1], true);
      L.canh.push([...rim, rim[0]]); L.phu.push([I, K], [K, rim[0]]);
      L.nhan.push(["I", I], ["K", K], ["A", rim[0]]);
      L.wireXoay(rows, 4, 8, nu, false);
      L.V = Math.PI * Rm * Rm * H / 2; L.ct = "V = ½ · π · R² · H"; L.tt = "Đỉnh I tại gốc: z = " + so(c, 3) + "·(x² + y²)";
      L.neo = [{ k: "dinh", ten: "Đỉnh I của paraboloid", p: I }, { k: "tamMieng", ten: "Tâm miệng K", p: K }];
    } else {
      const R = P.R, r = Math.min(P.r, R - .05), nu = 64, nv = 28;
      if (r < P.r) L.ghiChu = "Bán kính ống phải nhỏ hơn R — đã lấy r = " + so(r) + ".";
      const m = L.mat("Mặt xuyến", { tron: true }), prof = [];
      for (let i = 0; i < nv; i++) { const v = TAU * i / nv; prof.push([R + r * Math.cos(v), r * Math.sin(v)]); }
      const rows = L.xoay(prof, nu, "z", m, p => { const q = Math.hypot(p[0], p[1]) || 1; return [p[0] - R * p[0] / q, p[1] - R * p[1] / q, p[2]]; }, true);
      const loi = []; for (let i = 0; i <= nu; i++) { const u = TAU * i / nu; loi.push([R * Math.cos(u), R * Math.sin(u), 0]); }
      L.phu.push(loi); L.nhan.push(["I", [0, 0, 0]]);
      L.wireXoay(rows, 7, 8, nu, true);
      L.V = 2 * Math.PI * Math.PI * R * r * r; L.ct = "V = 2 · π² · R · r²"; L.tt = "Đường tròn tâm (nét đứt) bán kính R";
      L.neo = [{ k: "tam", ten: "Tâm I của hình xuyến", p: [0, 0, 0] }, { k: "dayOxy", ten: "Đặt nằm trên mặt phẳng Oxy", p: [0, 0, -r] }];
    }
    return L;
  }
};

const MAU_F = [
  ["sqrt(x)", 0, 4, "y = √x trên [0; 4] (SGK)"],
  ["x^2/4+0.4", 0, 3, "Cái chén: y = x²/4 + 0,4"],
  ["1.2+0.35*sin(pi*x/4)", 0, 4, "Thùng rượu"],
  ["0.7+0.45*sin(1.3*x)+0.12*x", 0, 5, "Bình hoa"],
  ["sqrt(4-x^2)", -2, 2, "Nửa đường tròn → khối cầu"]
];
B.quayOx = {
  ten: () => "Khối tròn xoay quanh Ox",
  goc: [-62, 20], // Ox nằm ngang như hình vẽ SGK 12 (vẫn giữ Oz hướng lên)
  tham: [
    { k: "mau", ten: "Mẫu có sẵn", loai: "mau" },
    { k: "f", ten: "Hàm số y = f(x)", loai: "ham", mac: "sqrt(x)" },
    { k: "a", ten: "Cận a", loai: "nhap", mac: 0 },
    { k: "b", ten: "Cận b", loai: "nhap", mac: 4 },
    { k: "kt", ten: "Hiện đường cong y = f(x) trong mặt phẳng Oxy", loai: "bat", mac: true }
  ],
  dung(P) {
    const f = bienDich(P.f), a = +P.a, b = +P.b;
    if (!isFinite(a) || !isFinite(b) || !(b > a)) throw new Error("Cần hai cận thỏa a < b.");
    if (b - a > 20) throw new Error("Đoạn [a; b] quá dài (tối đa 20 đơn vị).");
    const N = 72, nu = 48, xs = [], ys = [];
    for (let i = 0; i <= N; i++) { const x = a + (b - a) * i / N, y = f(x);
      if (!isFinite(y)) throw new Error("f(x) không xác định tại x = " + so(x) + ".");
      if (Math.abs(y) > 25) throw new Error("|f(x)| quá lớn tại x = " + so(x) + ".");
      xs.push(x); ys.push(y); }
    const L = new Luoi(), xq = L.mat("Mặt xung quanh", { tron: true });
    const rows = L.xoay(xs.map((x, i) => [Math.abs(ys[i]), x]), nu, "x", xq, p => [0, p[1], p[2]], false);
    if (Math.abs(ys[0]) > 1e-6) { const rim = L.vongDiem(rows[0]); L.quat([a, 0, 0], rim, L.mat("Đáy trái (x = a)", { phang: true, poly: rim }), [-1, 0, 0], true); L.canh.push([...rim, rim[0]]); }
    if (Math.abs(ys[N]) > 1e-6) { const rim = L.vongDiem(rows[N]); L.quat([b, 0, 0], rim, L.mat("Đáy phải (x = b)", { phang: true, poly: rim }), [1, 0, 0], true); L.canh.push([...rim, rim[0]]); }
    if (P.kt) L.canh.push(xs.map((x, i) => [x, ys[i], 0]));
    L.phu.push([[a, 0, 0], [b, 0, 0]]);
    L.wireXoay(rows, 9, 6, nu, false);
    const M = 600, hh = (b - a) / M; let s = 0;
    for (let i = 0; i <= M; i++) { const y = f(a + i * hh); s += (i === 0 || i === M ? 1 : i % 2 ? 4 : 2) * y * y; }
    L.V = Math.PI * s * hh / 3; L.ct = "V = π ∫ₐᵇ f²(x) dx"; L.tt = "V ≈ " + so(L.V / Math.PI, 3) + " · π";
    L.neo = [{ k: "goc", ten: "Gốc O của đồ thị y = f(x)", p: [0, 0, 0] }, { k: "tamDay", ten: "Tâm đáy trái (x = a)", p: [a, 0, 0] }];
    return L;
  }
};

/* ================= Danh mục đầy đủ (mục chưa có bộ dựng hiện mờ "Sắp có") ================= */
const ICO = {
  chop: '<path d="M12 3 4 18h16z"/><path d="M12 3l2 15" stroke-dasharray="2 2" opacity=".6"/>',
  chopcut: '<path d="M8 6h8l4 12H4z"/>',
  langtru: '<path d="M5 8h10l4-3H9zM5 8v11h10V8M19 5v11l-4 3"/>',
  hop: '<path d="M4 8h11v12H4zM4 8l4-4h11l-4 4M19 4v12l-4 4"/>',
  deu: '<path d="M12 2 20 12 12 22 4 12z"/><path d="M4 12h16M12 2l3 10-3 10"/>',
  morong: '<path d="M4 18 9 6h6l5 12z"/><path d="M9 6l3 12 3-12"/>',
  tru: '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6"/>',
  trucut: '<path d="M5 8l14-4v13c0 1.4-3.1 2.5-7 2.5S5 18.4 5 17z"/><ellipse cx="12" cy="17" rx="7" ry="2.5" opacity=".6"/>',
  cau: '<circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="8" ry="3"/>',
  xuyen: '<ellipse cx="12" cy="12" rx="9" ry="5.5"/><path d="M8.5 11.5c2-1.6 5-1.6 7 0M9.5 11c1.5 1 3.5 1 5 0"/>',
  ham: '<path d="M3 19h18M4 17c4 0 5-10 9-10s4 6 8 6"/>'
};
const MUC = [
  // —— Nhóm 1: Khối đa diện
  ["tdDeu", "dadien", "Hình chóp", "Tứ diện đều", "chop", null, null, "tu dien deu"],
  ["tdVuong", "dadien", "Hình chóp", "Tứ diện vuông", "chop", null, null, "tu dien vuong goc"],
  ["tdGanDeu", "dadien", "Hình chóp", "Tứ diện gần đều", "chop", null, null, "tu dien gan deu"],
  ["chop4", "dadien", "Hình chóp", "Hình chóp tứ giác S.ABCD", "chop", "chop4", { day: "chunhat" }, "chop tu giac vuong chu nhat thoi binh hanh thang"],
  ["chop4deu", "dadien", "Hình chóp", "Hình chóp tứ giác đều", "chop", "chop4", { day: "vuong", chan: "tam" }, "chop deu"],
  ["chop3deu", "dadien", "Hình chóp", "Hình chóp tam giác đều", "chop", null, null, "chop deu tam giac"],
  ["chopN", "dadien", "Hình chóp", "Chóp ngũ giác, lục giác, n-giác", "chop", null, null, "chop ngu giac luc giac n giac"],
  ["chopCut", "dadien", "Hình chóp cụt", "Chóp cụt tam giác, tứ giác, đều", "chopcut", null, null, "chop cut"],
  ["ltXien", "dadien", "Hình lăng trụ", "Lăng trụ xiên (tam giác, tứ giác)", "langtru", null, null, "lang tru xien"],
  ["ltDung", "dadien", "Hình lăng trụ", "Lăng trụ đứng", "langtru", null, null, "lang tru dung"],
  ["ltDeu", "dadien", "Hình lăng trụ", "Lăng trụ đều (tam giác, tứ giác, lục giác)", "langtru", null, null, "lang tru deu"],
  ["hopXien", "dadien", "Hình hộp", "Hình hộp xiên, hình hộp đứng", "hop", null, null, "hop xien dung"],
  ["hopCN", "dadien", "Hình hộp", "Hình hộp chữ nhật, lập phương", "hop", null, null, "hop chu nhat lap phuong"],
  ["dd4", "dadien", "5 khối đa diện đều", "Tứ diện đều (4 mặt)", "deu", null, null, "platon"],
  ["dd6", "dadien", "5 khối đa diện đều", "Lập phương (6 mặt)", "deu", null, null, "platon"],
  ["batdien", "dadien", "5 khối đa diện đều", "Khối bát diện đều (8 mặt)", "deu", "batdien", {}, "bat dien deu 8 mat platon"],
  ["dd12", "dadien", "5 khối đa diện đều", "Mười hai mặt đều (12 mặt)", "deu", null, null, "platon"],
  ["dd20", "dadien", "5 khối đa diện đều", "Hai mươi mặt đều (20 mặt)", "deu", null, null, "platon"],
  ["ltCut", "dadien", "Đa diện mở rộng & cắt vát", "Lăng trụ cụt (mặt cắt không song song)", "morong", null, null, "lang tru cut"],
  ["nem", "dadien", "Đa diện mở rộng & cắt vát", "Khối nêm, mái nhà", "morong", null, null, "nem mai nha prismatoid"],
  ["songChop", "dadien", "Đa diện mở rộng & cắt vát", "Song chóp (hai chóp chung đáy)", "morong", null, null, "song chop bipyramid"],
  ["daLom", "dadien", "Đa diện mở rộng & cắt vát", "Đa diện lõm: khối chữ L, khía rãnh, đa diện sao", "morong", null, null, "da dien lom chu l sao"],
  ["banDeu", "dadien", "Đa diện mở rộng & cắt vát", "Bán đều: quả bóng 32 mặt, lập phương cụt, bát diện cụt", "morong", null, null, "archimedes ban deu qua bong"],
  // —— Nhóm 2: Khối tròn xoay
  ["tru", "tronxoay", "Trụ & nón", "Hình trụ tròn", "tru", null, null, "tru tron"],
  ["non", "tronxoay", "Trụ & nón", "Hình nón tròn", "tru", null, null, "non tron"],
  ["nonCut", "tronxoay", "Trụ & nón", "Hình nón cụt", "tru", null, null, "non cut"],
  ["xien", "tronxoay", "Trụ & nón", "Trụ xiên, nón xiên", "tru", null, null, "tru xien non xien"],
  ["trucut", "tronxoay", "Trụ cắt xiên", "Hình trụ cụt", "trucut", "trucut", { kieu: "cut", goc: 25 }, "tru cut mat cat xien"],
  ["mongtru", "tronxoay", "Trụ cắt xiên", "Móng trụ", "trucut", "trucut", { kieu: "mong", goc: 45 }, "mong tru"],
  ["cau", "tronxoay", "Mặt cầu & các phần", "Mặt cầu, khối cầu", "cau", null, null, "mat cau khoi cau"],
  ["chomcau", "tronxoay", "Mặt cầu & các phần", "Chỏm cầu", "cau", "chomcau", { kieu: "chom" }, "chom cau"],
  ["doiCau", "tronxoay", "Mặt cầu & các phần", "Đới cầu", "cau", null, null, "doi cau"],
  ["quatcau", "tronxoay", "Mặt cầu & các phần", "Quạt cầu", "cau", "chomcau", { kieu: "quat", h: 1.6 }, "quat cau"],
  ["muiCau", "tronxoay", "Mặt cầu & các phần", "Múi cầu", "cau", null, null, "mui cau"],
  // —— Nhóm 3: Ứng dụng tích phân & thực tế 12
  ["paraboloid", "ungdung", "Mặt bậc hai & xuyến", "Paraboloid tròn xoay", "cau", "xuyen", { kieu: "para" }, "paraboloid chao den chao parabol"],
  ["elipsoid", "ungdung", "Mặt bậc hai & xuyến", "Elipsoid tròn xoay", "cau", null, null, "elipsoid qua bong bau duc"],
  ["hyperboloid", "ungdung", "Mặt bậc hai & xuyến", "Hyperboloid một tầng", "cau", null, null, "hyperboloid thap giai nhiet"],
  ["xuyen", "ungdung", "Mặt bậc hai & xuyến", "Hình xuyến (torus)", "xuyen", "xuyen", { kieu: "xuyen" }, "xuyen torus phao banh donut"],
  ["steinmetz", "ungdung", "Mặt bậc hai & xuyến", "Khối Steinmetz (hai trụ vuông góc)", "tru", null, null, "steinmetz"],
  ["quayOx", "ungdung", "Khối tạo bởi hàm số", "Quay y = f(x) quanh Ox", "ham", "quayOx", {}, "tich phan the tich quay quanh ox ham so"],
  ["thietDien", "ungdung", "Khối tạo bởi hàm số", "Thiết diện S(x): vòm, trống đồng, thùng rượu, chai", "ham", null, null, "thiet dien s(x) vom trong dong"]
].map(([id, nhom, con, ten, ico, dung, mau, tu]) => ({ id, nhom, con, ten, ico, dung, mau, tu }));
const MUC_ID = Object.fromEntries(MUC.map(m => [m.id, m]));
const TEN_NHOM = { dadien: "Khối đa diện", tronxoay: "Khối tròn xoay", ungdung: "Ứng dụng tích phân & thực tế 12" };
function trongTam(L) {
  let V = 0, c = [0, 0, 0];
  for (const [a, b, d] of L.t) { const A = L.v[a], Bv = L.v[b], C = L.v[d], v = dot(A, cross(Bv, C)) / 6; V += v; c = add(c, mul(add(add(A, Bv), C), v / 4)); }
  return Math.abs(V) < 1e-12 ? [0, 0, 0] : mul(c, 1 / V);
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
function taoMo(S, cfg) {
  const nMat = S.g.length, phap = S.g.map((g, i) => S.n[S.theoMat[i][0]]);
  const vMat = new Int32Array(S.v.length).fill(-1); S.t.forEach(t => { vMat[t[0]] = vMat[t[1]] = vMat[t[2]] = t[3]; });
  const khoa = p => p.map(v => v.toFixed(5)).join(",");
  const banLe = cfg.cay.map(([c, p]) => {
    const kp = new Set(S.g[p].poly.map(khoa)), chung = S.g[c].poly.filter(q => kp.has(khoa(q)));
    const u = chung[0], e = norm(sub(chung[1], chung[0]));
    return { c, p, u, e, phi: gocKy(phap[c], phap[p], e) };
  });
  let goc = null;
  if (cfg.datPhang) { const poly = S.g[cfg.goc].poly, u = poly[cfg.datPhang[0]], e = norm(sub(poly[cfg.datPhang[1]], u)); goc = { u, e, phi: gocKy(phap[cfg.goc], [0, 0, -1], e) }; }
  return { goc: cfg.goc, banLe, gocPhang: goc, vMat, nMat, khoa };
}
/* t = 0: khối kín · t = 1: hình trải phẳng. chiTinh = true: chỉ trả về toạ độ đỉnh (để căn khung). */
function apDungMo(S, t, chiTinh) {
  if (!S.mo || t <= 0) {
    if (chiTinh) return S.v0;
    S.v = S.v0; S.n = S.n0; S.canh = S.canh0; S.nhan = S.nhan0; S.phu = S.phu0; S.tam = S.tam0; S.haiMat = false; S.polyNay = S.g.map(g => g.poly); return;
  }
  const mo = S.mo, M = new Array(mo.nMat).fill(BIEN_DOI_DON);
  M[mo.goc] = mo.gocPhang ? quayQuanh(mo.gocPhang.u, mo.gocPhang.e, mo.gocPhang.phi * t) : BIEN_DOI_DON;
  for (const b of mo.banLe) M[b.c] = ghep(M[b.p], quayQuanh(b.u, b.e, b.phi * t));
  const v = S.v0.map((p, i) => mo.vMat[i] < 0 ? p : apBD(M[mo.vMat[i]], p));
  if (chiTinh) return v;
  S.v = v; S.haiMat = true; S.phu = [];
  S.n = S.t.map(([a, b, c]) => norm(cross(sub(v[b], v[a]), sub(v[c], v[a]))));
  S.polyNay = S.g.map((g, i) => g.poly ? g.poly.map(p => apBD(M[i], p)) : null);
  // cạnh: biên từng mặt (bỏ trùng); nhãn: mỗi mặt mang tên đỉnh của nó, gộp các bản sao trùng chỗ
  const tenTheoKhoa = new Map(S.nhan0.map(([n, p]) => [mo.khoa(p), n]));
  const canhDa = new Set(), canhMoi = [], nhanMoi = [], nhanDa = new Set();
  S.polyNay.forEach((poly, i) => { if (!poly) return; const goc0 = S.g[i].poly;
    poly.forEach((p, k) => {
      const q = poly[(k + 1) % poly.length], k1 = mo.khoa(p), k2 = mo.khoa(q), kc = k1 < k2 ? k1 + "|" + k2 : k2 + "|" + k1;
      if (!canhDa.has(kc)) { canhDa.add(kc); canhMoi.push([p, q]); }
      const n = tenTheoKhoa.get(mo.khoa(goc0[k])); if (n && !nhanDa.has(k1)) { nhanDa.add(k1); nhanMoi.push([n, p]); }
    }); });
  S.canh = canhMoi; S.nhan = nhanMoi;
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const p of v) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); }
  S.tam = mul(add(mn, mx), .5);
}
function dinhTruc(S) {
  const tip = [];
  for (let i = 0; i < 3; i++) { const e = Math.max(S.mx[i], 0) + .35 * S.co; tip.push(Math.max(e, .6 * S.co)); }
  return [["x", [tip[0], 0, 0]], ["y", [0, tip[1], 0]], ["z", [0, 0, tip[2]]]];
}
/* ================= Bảng màu vẽ ================= */
const PAL = {
  toi: { nen: [176, 196, 224], canh: "#EEF5FF", khuat: "rgba(176,196,228,.9)", nhan: "#F8FAFC", vienChu: "rgba(5,12,36,.9)", truc: "#5EEBFF", luoi: "rgba(148,163,184,.28)", wire: "rgba(226,232,240,.30)", w: 1.6 },
  giay: { nen: [236, 240, 246], canh: "#111827", khuat: "#374151", nhan: "#0B0F19", vienChu: "rgba(255,255,255,.92)", truc: "#111827", luoi: "rgba(0,0,0,.15)", wire: "rgba(0,0,0,.26)", w: 1.35 }
};
const hexRgb = h => { const s = h.replace("#", ""); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); };
const MAU = ["#E8001C", "#F59E0B", "#FACC15", "#22C55E", "#5EEBFF", "#3B82F6", "#A855F7", "#EC4899"];
/* ================= Phép chiếu + kiểm tra che khuất (dùng chung cho màn hình, PNG và TikZ) ================= */
function chieu(S, cam, W, H, k) {
  const R = qToMat(cam.q), r0 = R[0], r1 = R[1], r2 = R[2];
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
  return { R, z, ox, oy, prj, X, Y, D, truoc, che, chon, W, H, k };
}
/* chia một đường gấp khúc thành các đoạn thấy / khuất (≈ 6 px một mẫu) */
function tachNet(pl, F) {
  const runs = []; let cur = null;
  for (let i = 0; i < pl.length - 1; i++) {
    const A = pl[i], Bp = pl[i + 1], pa = F.prj(A), pb = F.prj(Bp);
    const m = Math.max(1, Math.min(90, Math.ceil(Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) / (6 * F.k))));
    for (let j = 0; j < m; j++) {
      const pm = F.prj(lerp3(A, Bp, (j + .5) / m)), thay = !F.che(pm[0], pm[1], pm[2]);
      if (!cur || cur.thay !== thay) { cur = { thay, pts: [lerp3(A, Bp, j / m)] }; runs.push(cur); }
      cur.pts.push(lerp3(A, Bp, (j + 1) / m));
    }
  }
  return runs;
}
/* ================= Vẽ ================= */
let offCv = null;
const FT = '"Source Serif 4","Noto Serif","Times New Roman",serif';
function ve(ctx, S, cam, W, H, k, o) {
  const pal = o.giay ? PAL.giay : PAL.toi, F = chieu(S, cam, W, H, k), { X, Y, D, truoc, R } = F;
  const khung = o.che === "khung", trongSuot = o.che === "trong", mau = o.mau || {};
  const den = norm(add(add(mul(R[0], -.45), mul(R[1], .62)), mul(R[2], .64)));
  const nt = S.t.length;
  // —— mặt (thuật toán hoạ sĩ trên các tam giác mặt trước)
  if (!khung) {
    let tc = ctx;
    if (trongSuot) { if (!offCv) offCv = document.createElement("canvas"); offCv.width = W; offCv.height = H; tc = offCv.getContext("2d"); }
    const thuTu = [], sau = new Float64Array(nt);
    for (let i = 0; i < nt; i++) if (truoc[i] || S.haiMat) { const [a, b, c] = S.t[i]; sau[i] = D[a] + D[b] + D[c]; thuTu.push(i); }
    thuTu.sort((p, q) => sau[p] - sau[q]);
    const coSan = S.g.map((g, gi) => { const m = mau[gi]; if (!m) return pal.nen; const c = hexRgb(m.c); return pal.nen.map((v, i) => v * (1 - m.a) + c[i] * m.a); });
    tc.lineWidth = .9 * k; tc.lineJoin = "round";
    for (const i of thuTu) {
      const [a, b, c, g] = S.t[i], nn = truoc[i] ? S.n[i] : mul(S.n[i], -1);
      let sh = .6 + .4 * Math.max(0, dot(nn, den)) + .06 * dot(nn, R[2]);
      if (g === o.hover) sh += .1;
      const base = coSan[g], col = "rgb(" + Math.min(255, base[0] * sh | 0) + "," + Math.min(255, base[1] * sh | 0) + "," + Math.min(255, base[2] * sh | 0) + ")";
      tc.fillStyle = col; tc.strokeStyle = col;
      tc.beginPath(); tc.moveTo(X[a], Y[a]); tc.lineTo(X[b], Y[b]); tc.lineTo(X[c], Y[c]); tc.closePath(); tc.fill(); tc.stroke();
    }
    if (trongSuot) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * .36; ctx.drawImage(offCv, 0, 0, W, H); ctx.globalAlpha = ga; }
  }
  const veRun = (pts, dash, mauNet, w) => { if (pts.length < 2) return; ctx.beginPath(); pts.forEach((p, i) => { const q = F.prj(p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.setLineDash(dash); ctx.strokeStyle = mauNet; ctx.lineWidth = w; ctx.stroke(); };
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  // —— lưới Oxy
  F.luoiOxy = [];
  if (o.oxyz && o.luoiOxy) {
    const G = Math.ceil(Math.max(Math.abs(S.mn[0]), Math.abs(S.mx[0]), Math.abs(S.mn[1]), Math.abs(S.mx[1]))) + 1;
    for (let i = -G; i <= G; i++) for (const pl of [[[i, -G, 0], [i, G, 0]], [[-G, i, 0], [G, i, 0]]]) {
      const runs = tachNet(pl, F); F.luoiOxy.push(runs);
      runs.forEach(r => { if (r.thay || khung || trongSuot) veRun(r.pts, [], pal.luoi, k); });
    }
  }
  // —— đường lưới trên mặt cong
  F.wire = [];
  if (o.luoiMat || khung) S.wire.forEach(pl => { const runs = tachNet(pl, F); F.wire.push(runs); runs.forEach(r => { if (r.thay) veRun(r.pts, [], pal.wire, .9 * k); else if (khung && o.khuat) veRun(r.pts, [3 * k, 4 * k], pal.wire, .8 * k); }); });
  // —— cạnh, đường phụ
  F.net = [];
  S.canh.forEach(pl => F.net.push({ loai: "canh", runs: tachNet(pl, F) }));
  if (o.phu) S.phu.forEach(pl => F.net.push({ loai: "phu", runs: tachNet(pl, F) }));
  const w = pal.w * k;
  if (o.khuat) F.net.forEach(n => n.runs.forEach(r => { if (!r.thay) veRun(r.pts, [6 * k, 4.5 * k], pal.khuat, w * .8); }));
  F.net.forEach(n => n.runs.forEach(r => { if (r.thay) veRun(r.pts, [], pal.canh, w); }));
  // —— đường viền mặt cong (silhouette)
  F.sil = [];
  for (const [a, b, t1, t2] of S.sil) if (truoc[t1] !== truoc[t2]) { if (!F.che((X[a] + X[b]) / 2, (Y[a] + Y[b]) / 2, (D[a] + D[b]) / 2)) F.sil.push([a, b]); }
  ctx.setLineDash([]); ctx.strokeStyle = pal.canh; ctx.lineWidth = w; ctx.beginPath();
  for (const [a, b] of F.sil) { ctx.moveTo(X[a], Y[a]); ctx.lineTo(X[b], Y[b]); }
  ctx.stroke();
  // —— hệ trục Oxyz
  F.truc = [];
  const chu = (t, x, y, cfg) => { ctx.font = cfg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 3.2 * k; ctx.strokeStyle = pal.vienChu; ctx.setLineDash([]); ctx.strokeText(t, x, y); ctx.fillStyle = pal.nhan; ctx.fillText(t, x, y); };
  if (o.oxyz) {
    const O = F.prj([0, 0, 0]); const huong = [];
    for (const [ten, tip] of dinhTruc(S)) {
      const runs = tachNet([[0, 0, 0], tip], F); F.truc.push({ ten, tip, runs });
      runs.forEach(r => { if (r.thay) veRun(r.pts, [], pal.truc, 1.3 * k); else if (o.khuat) veRun(r.pts, [5 * k, 4 * k], pal.truc, 1.1 * k); });
      const T = F.prj(tip), dx = T[0] - O[0], dy = T[1] - O[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l; huong.push([ux, uy]);
      if (runs[runs.length - 1].thay && l > 6 * k) { const s = 9 * k; ctx.setLineDash([]); ctx.fillStyle = pal.truc; ctx.beginPath(); ctx.moveTo(T[0], T[1]); ctx.lineTo(T[0] - ux * s - uy * s * .42, T[1] - uy * s + ux * s * .42); ctx.lineTo(T[0] - ux * s * .7, T[1] - uy * s * .7); ctx.lineTo(T[0] - ux * s + uy * s * .42, T[1] - uy * s - ux * s * .42); ctx.closePath(); ctx.fill(); }
      chu(ten, T[0] + ux * 13 * k, T[1] + uy * 13 * k, "italic 600 " + 17 * k + "px " + FT);
    }
    let hx = 0, hy = 0; huong.forEach(([a, b]) => { hx -= a; hy -= b; });
    const trung = o.nhan && S.nhan.find(([, p]) => len(p) < 1e-6);
    if (trung) { const C = F.prj(S.tam), dx = O[0] - C[0], dy = O[1] - C[1], l = Math.hypot(dx, dy); if (l < 4 * k) { hx = 0; hy = 1; } else { hx = -dx; hy = -dy; } }
    const hl = Math.hypot(hx, hy) || 1;
    chu("O", O[0] + hx / hl * 14 * k, O[1] + hy / hl * 14 * k, "italic 600 " + 16 * k + "px " + FT);
  }
  // —— nhãn đỉnh
  if (o.nhan) {
    const C = F.prj(S.tam), fnt = "italic 600 " + 16 * k + "px " + FT;
    for (const [t, p] of S.nhan) {
      const q = F.prj(p); let dx = q[0] - C[0], dy = q[1] - C[1]; const l = Math.hypot(dx, dy); if (l < 4 * k) { dx = 0; dy = -1; } else { dx /= l; dy /= l; }
      ctx.setLineDash([]); ctx.fillStyle = pal.canh; ctx.beginPath(); ctx.arc(q[0], q[1], 2.4 * k, 0, TAU); ctx.fill();
      chu(t, q[0] + dx * 14 * k, q[1] + dy * 14 * k, fnt);
    }
  }
  // —— điểm đang xem toạ độ: vòng sáng, đường gióng xuống mặt Oxy và các trục, nhãn toạ độ
  for (const d of o.diem || []) {
    const P = d.p, q = F.prj(P), mg = o.giay ? "#B45309" : "#FBBF24";
    if (o.oxyz) for (const [u, v] of duongGiong(P)) { veRun([u, v], [4 * k, 3.5 * k], mg, 1.15 * k); const c = F.prj(v); ctx.setLineDash([]); ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(c[0], c[1], 2 * k, 0, TAU); ctx.fill(); }
    ctx.setLineDash([]); ctx.strokeStyle = mg; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.arc(q[0], q[1], 7.5 * k, 0, TAU); ctx.stroke();
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(q[0], q[1], 2.8 * k, 0, TAU); ctx.fill();
    if (d.rieng) chu(d.ten, q[0] - 14 * k, q[1] - 13 * k, "italic 600 " + 16 * k + "px " + FT);
    const tx = d.ten + "(" + so(P[0]) + "; " + so(P[1]) + "; " + so(P[2]) + ")";
    ctx.font = "700 " + 12.5 * k + "px " + FU; const w = ctx.measureText(tx).width + 16 * k, h = 22 * k, x = q[0] + 12 * k, y = q[1] + 9 * k;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 11 * k) : ctx.rect(x, y, w, h);
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
function taoTikz(S, F, o) {
  if (!S || !F) return "";
  const [r0, r1] = F.R, P2 = p => [dot(r0, p), dot(r1, p)];
  const pts = S.v.map(P2); (o.diem || []).forEach(d => pts.push(P2(d.p))); if (o.oxyz) { pts.push([0, 0]); F.truc.forEach(a => pts.push(P2(a.tip))); }
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const s = Math.min(9 / ((x1 - x0) || 1), 8 / ((y1 - y0) || 1)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const T2 = p => { const q = P2(p); return [(q[0] - cx) * s, (q[1] - cy) * s]; };
  const f = v => { let x = Math.round(v * 100) / 100; if (Math.abs(x) < .005) x = 0; return String(x); };
  // khi trải phẳng một đỉnh có nhiều bản sao (S, S2, S3…): tên toạ độ riêng, nhãn vẫn là S
  const dem = {}, nhanX = [...S.nhan.map(([t, p]) => [t, p]), ...(o.diem || []).filter(d => d.rieng).map(d => [d.ten, d.p])]
    .map(([t, p]) => { dem[t] = (dem[t] || 0) + 1; return { id: dem[t] === 1 ? t : t + dem[t], t, p }; });
  const ten = new Map(); nhanX.forEach(x => { if (!ten.has(khoaDiem(x.p))) ten.set(khoaDiem(x.p), x.id); });
  let tenO = ten.get(khoaDiem([0, 0, 0])); const themO = o.oxyz && !tenO; if (themO) { tenO = "O"; ten.set(khoaDiem([0, 0, 0]), "O"); }
  const toaDo = p => { const t = ten.get(khoaDiem(p)); if (t) return "(" + t + ")"; const q = T2(p); return "(" + f(q[0]) + "," + f(q[1]) + ")"; };
  const chuoi = (ds3, kin) => { // đường gấp khúc → "(A)--(B)--…", rút gọn điểm thẳng hàng
    const mang = ds3.map(p => { const q = T2(p); q.p = p; return q; });
    const gon = dp(mang, .012); const out = gon.map(q => toaDo(q.p));
    let t = ""; out.forEach((x, i) => { t += (i ? "--" : "") + x; if (i && i % 7 === 0 && i < out.length - 1) t += "\n\t\t"; });
    return t + (kin ? "--cycle" : "");
  };
  const L = [];
  L.push("% KMath · Hình 3D — " + S.ten + " (phép chiếu vuông góc theo góc nhìn hiện tại)");
  L.push("% pdflatex + TikZ thuần: nét thấy liền, nét khuất dashed");
  L.push("\\begin{tikzpicture}[scale=1,font=\\footnotesize,line join=round,line cap=round,>=stealth]");
  const daCo = new Set();
  [...nhanX.map(x => [x.id, x.p]), ...(themO ? [["O", [0, 0, 0]]] : [])].forEach(([t, p]) => { if (daCo.has(t)) return; daCo.add(t); const q = T2(p); L.push("\t\\coordinate (" + t + ") at (" + f(q[0]) + "," + f(q[1]) + ");"); });
  // —— tô mặt
  const mau = (o.mau || {}), ds = Object.keys(mau).map(Number).filter(g => g < S.g.length);
  if (ds.length) {
    const tenMau = {}; let n = 0;
    ds.forEach(g => { const c = mau[g].c; if (!tenMau[c]) { tenMau[c] = "mau" + (++n); L.push("\t\\definecolor{" + tenMau[c] + "}{RGB}{" + hexRgb(c).join(",") + "}"); } });
    const doSau = g => { const ts = S.theoMat[g]; let t = 0; ts.forEach(i => { const [a, b, c] = S.t[i]; t += F.D[a] + F.D[b] + F.D[c]; }); return t / (ts.length || 1); };
    ds.sort((a, b) => doSau(a) - doSau(b));
    L.push("\t% Tô màu mặt");
    for (const g of ds) {
      const G = S.g[g]; let duong;
      if (G.phang && G.poly) duong = chuoi(S.polyNay[g] || G.poly, true);
      else duong = bienMat(S, g, F).map(v => chuoi(v, true)).join(" ");
      if (duong) L.push("\t\\fill[" + tenMau[mau[g].c] + ",fill opacity=" + f(mau[g].a) + "] " + duong + ";");
    }
  }
  // —— nét
  const khuat = [], thay = [], phuThay = [];
  F.net.forEach(nt => nt.runs.forEach(r => { if (!r.thay) { if (o.khuat) khuat.push(chuoi(r.pts)); } else thay.push(chuoi(r.pts)); }));
  noiVien(S, F).forEach(pl => thay.push(chuoi(pl)));
  if (o.che === "khung" || o.luoiMat) F.wire.forEach(rs => rs.forEach(r => { if (r.thay) phuThay.push(chuoi(r.pts)); }));
  if (khuat.length) { L.push("\t% Nét khuất"); khuat.forEach(c => L.push("\t\\draw[dashed] " + c + ";")); }
  if (thay.length) { L.push("\t% Nét thấy"); thay.forEach(c => L.push("\t\\draw " + c + ";")); }
  if (phuThay.length) { L.push("\t% Đường lưới trên mặt"); phuThay.forEach(c => L.push("\t\\draw[gray!60,very thin] " + c + ";")); }
  if (o.oxyz) {
    L.push("\t% Hệ trục Oxyz (Oz hướng lên)");
    if (o.luoiOxy) F.luoiOxy.forEach(rs => rs.forEach(r => { if (r.thay) L.push("\t\\draw[gray!35,very thin] " + chuoi(r.pts) + ";"); }));
    const O2 = T2([0, 0, 0]); let hx = 0, hy = 0;
    F.truc.forEach(({ ten: tt, tip, runs }) => {
      runs.forEach((r, i) => { const cuoi = i === runs.length - 1; if (r.thay) L.push("\t\\draw" + (cuoi ? "[->]" : "") + " " + chuoi(r.pts) + ";"); else if (o.khuat) L.push("\t\\draw[dashed] " + chuoi(r.pts) + ";"); });
      const q = T2(tip), g = Math.atan2(q[1] - O2[1], q[0] - O2[0]); hx -= Math.cos(g); hy -= Math.sin(g);
      L.push("\t\\path (" + f(q[0]) + "," + f(q[1]) + ") node[shift={(" + Math.round(g / DEG) + ":2.5mm)}]{$" + tt + "$};");
    });
    let gO = Math.round(Math.atan2(hy, hx) / DEG);
    if (o.nhan && !themO) { const C = T2(S.tam), dx = O2[0] - C[0], dy = O2[1] - C[1]; gO = Math.hypot(dx, dy) < .05 ? -90 : Math.round(Math.atan2(-dy, -dx) / DEG / 5) * 5; }
    L.push("\t\\path (" + tenO + ") node[shift={(" + gO + ":3mm)}]{$O$};");
    const dsD = (o.diem || []);
    if (dsD.length) { L.push("\t% Đường gióng toạ độ: " + dsD.map(d => d.ten + "(" + d.p.map(f).join("; ") + ")").join(", "));
      dsD.forEach(d => duongGiong(d.p).forEach(([u, v]) => L.push("\t\\draw[dashed,thin] " + toaDo(u) + "--" + toaDo(v) + ";"))); }
  }
  if (o.nhan && nhanX.length) {
    const C = T2(S.tam), gocCua = p => { const q = T2(p), dx = q[0] - C[0], dy = q[1] - C[1]; return Math.hypot(dx, dy) < .05 ? 90 : Math.round(Math.atan2(dy, dx) / DEG / 5) * 5; };
    L.push("\t% Đỉnh và nhãn");
    if (nhanX.every(x => x.id === x.t)) {
      L.push("\t\\foreach \\p/\\g in {" + nhanX.map(x => x.id + "/" + gocCua(x.p)).join(",") + "}");
      L.push("\t\t\\fill (\\p) circle (1pt) node[shift={(\\g:3mm)}]{$\\p$};");
    } else {
      L.push("\t\\foreach \\p/\\g/\\n in {" + nhanX.map(x => x.id + "/" + gocCua(x.p) + "/" + x.t).join(",") + "}");
      L.push("\t\t\\fill (\\p) circle (1pt) node[shift={(\\g:3mm)}]{$\\n$};");
    }
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
/* ================= Dựng cảnh (thuần): cfg = { id, P, neo, off, moT } ================= */
const macDinh = id => { const m = MUC_ID[id], bd = m && B[m.dung]; if (!bd) return {}; return Object.assign(Object.fromEntries(bd.tham.filter(t => "mac" in t).map(t => [t.k, t.mac])), m.mau || {}); };
function dungCanh(cfg) {
  const m = MUC_ID[cfg.id]; if (!m || !m.dung) throw new Error("Hình “" + cfg.id + "” chưa có trong KMath.");
  const bd = B[m.dung], P = cfg.P || macDinh(cfg.id), L = bd.dung(P);
  const G = trongTam(L), goc0 = L.neo[0];
  const neoDs = [...L.neo, { k: "trongTam", ten: "Trọng tâm khối G", p: G },
    { k: "tuChon", ten: "Tùy chỉnh: đặt “" + goc0.ten + "” tại (x₀; y₀; z₀)", p: goc0.p, rot: goc0.rot || 0, tuChon: true }];
  const n = neoDs.find(x => x.k === cfg.neo) || neoDs[0];
  const ca = Math.cos((n.rot || 0) * DEG), sa = Math.sin((n.rot || 0) * DEG), off = n.tuChon ? (cfg.off || [0, 0, 0]) : [0, 0, 0];
  const T = p => { const q = sub(p, n.p); return [q[0] * ca - q[1] * sa + off[0], q[0] * sa + q[1] * ca + off[1], q[2] + off[2]]; };
  const S = {
    id: cfg.id, ten: bd.ten(P), v: L.v.map(T), t: L.t, neo: n.k, neoDs, keo: L.keo || [], goc: bd.goc || null,
    g: L.g.map(g => Object.assign({}, g, { poly: g.poly ? g.poly.map(T) : null })),
    canh: L.canh.map(c => c.map(T)), phu: L.phu.map(c => c.map(T)), wire: L.wire.map(c => c.map(T)),
    nhan: L.nhan.map(([t, p]) => [t, T(p)]), V: L.V, ct: L.ct, tt: L.tt, ghiChu: L.ghiChu
  };
  S.n = S.t.map(([a, b, c]) => norm(cross(sub(S.v[b], S.v[a]), sub(S.v[c], S.v[a]))));
  const ke = new Map();
  S.t.forEach((t, ti) => { if (!S.g[t[3]].tron) return; for (let e = 0; e < 3; e++) { const a = t[e], b = t[(e + 1) % 3], k = a < b ? a * 1e6 + b : b * 1e6 + a; let x = ke.get(k); if (!x) { x = { a: Math.min(a, b), b: Math.max(a, b), ds: [] }; ke.set(k, x); } x.ds.push(ti); } });
  S.sil = []; for (const x of ke.values()) if (x.ds.length === 2 && S.t[x.ds[0]][3] === S.t[x.ds[1]][3]) S.sil.push([x.a, x.b, x.ds[0], x.ds[1]]);
  S.theoMat = S.g.map(() => []); S.t.forEach((t, i) => S.theoMat[t[3]].push(i));
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const p of S.v) for (let i = 0; i < 3; i++) { if (p[i] < mn[i]) mn[i] = p[i]; if (p[i] > mx[i]) mx[i] = p[i]; }
  S.mn = mn; S.mx = mx; S.co = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) || 1;
  S.tam = mul(add(mn, mx), .5);
  S.v0 = S.v; S.n0 = S.n; S.canh0 = S.canh; S.nhan0 = S.nhan; S.phu0 = S.phu; S.tam0 = S.tam;
  S.mo = L.mo ? taoMo(S, L.mo) : null;
  if (S.mo) S.vMo1 = [.25, .5, .75, 1].flatMap(t => apDungMo(S, t, true));
  apDungMo(S, S.mo ? (cfg.moT || 0) : 0);
  return S;
}
/* khung hình vừa khối (và trục, điểm đang hỏi) theo một hướng nhìn q */
function vuaKhung(S, q, W, H, o) {
  o = o || {}; const R = qToMat(q), pts = (S.v0 || S.v).slice();
  if (S.vMo1 && o.moT > 0) pts.push(...S.vMo1);
  (o.diem || []).forEach(d => pts.push(d.p));
  if (o.oxyz) { pts.push([0, 0, 0]); dinhTruc(S).forEach(([, p]) => pts.push(p)); }
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of pts) { const x = dot(R[0], p), y = dot(R[1], p); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const zoom = Math.max(4, Math.min((W - (o.leX ?? 90)) / ((x1 - x0) || 1), (H - (o.leY ?? 200)) / ((y1 - y0) || 1)) * .92);
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
  xuyen: ["xuyen", "hinh xuyen", "torus", "phao boi", "banh donut"], quayOx: ["quay ox", "quay quanh ox", "tron xoay quanh ox", "khoi tron xoay", "f(x)", "tich phan"]
};
const chuan = s => boDau(String(s || "")).replace(/\s+/g, " ").trim();
function timHinh(txt) {
  const q = chuan(txt).replace(/^(hinh|khoi)\s+/, "");
  if (!q) return null;
  const theoId = MUC.find(m => m.dung && m.id.toLowerCase() === q.replace(/\s+/g, "").toLowerCase()); if (theoId) return theoId.id;
  let tot = null, dai = 0;
  for (const [id, ds] of Object.entries(BI_DANH)) for (const a of ds) {
    if (q === a) return id;
    if ((q.includes(a) || a.includes(q)) && a.length > dai) { tot = id; dai = a.length; }
  }
  if (tot) return tot;
  const m = MUC.find(x => x.dung && chuan(x.ten).includes(q)); return m ? m.id : null;
}
const MAU_VD = { vang: "#FFC94D", do: "#FF5A5F", xanh: "#4FB3FF", luc: "#4ADE80", hong: "#FF7EB6", cam: "#FF9F43", tim: "#B794F6", trang: "#FFFFFF", cyan: "#5EEBFF" };
const soVN = z => { const v = parseFloat(String(z).replace(",", ".")); return isFinite(v) ? v : NaN; };
/* đọc phần nội dung: "chóp tứ giác đều; a = 4; h = 5; tô SAB đỏ; tô đáy vàng 0.6" */
function docNoiDung(s, bao) {
  const ph = String(s || "").split(/;|\n/).map(x => x.trim()).filter(Boolean);
  const id = timHinh(ph[0]);
  if (!id) throw new Error("chưa có hình “" + (ph[0] || "") + "” — dùng: chóp tứ giác, chóp tứ giác đều, bát diện đều, trụ cụt, móng trụ, chỏm cầu, quạt cầu, paraboloid, xuyến, quay Ox");
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
    else if (t.loai === "chon") { const bv = chuan(v), o = t.ds.find(([k, n]) => k === v || chuan(k) === bv || chuan(n).startsWith(bv) || chuan(n).includes(bv)); if (o) P[t.k] = o[0]; else bao(qk[1] + " chỉ nhận: " + t.ds.map(x => x[1]).join(", ")); }
    else if (t.loai === "bat") P[t.k] = !/^(khong|tat|an|0|false)$/.test(chuan(v));
    else P[t.k] = v;
  }
  return { id, P, toMau };
}
/* đọc phần tuỳ chọn trong ngoặc (đã bỏ @giây, sau n, nhanh/chậm ở app.js) */
function docTuyChon(ts, bao) {
  const c = { co: 1, xoay: null, trai: 0, gap: 0, giu: 0, goc: "sgk", che: "dac", nhan: true, oxyz: false, khuat: true, luoiMat: false, lienTuc: false, tinh: false };
  String(ts || "").split("|").map(z => z.trim()).filter(Boolean).forEach(z => {
    const b = chuan(z); let m;
    if (/^\d+(?:[.,]\d+)?$/.test(b)) { c.co = Math.min(3, Math.max(.4, soVN(b))); return; }
    if ((m = b.match(/^xoay(?:\s+(-?\d+(?:[.,]\d+)?)\s*(vong|do|°)?)?(?:\s*(?:trong)?\s*(\d+(?:[.,]\d+)?)\s*(?:s|giay)?)?(\s+(?:mai|lien tuc|lap))?$/))) {
      let deg = m[1] != null ? soVN(m[1]) : 360; if (m[2] === "vong") deg *= 360;
      c.xoay = { deg, giay: m[3] != null ? Math.max(.5, soVN(m[3])) : Math.max(2.5, Math.abs(deg) / 72) }; if (m[4]) c.lienTuc = true; return; }
    if ((m = b.match(/^(?:trai|trai phang|mo|mo ra)(?:\s*(?:trong)?\s*(\d+(?:[.,]\d+)?)\s*(?:s|giay)?)?$/))) { c.trai = m[1] != null ? Math.max(.5, soVN(m[1])) : 3; return; }
    if ((m = b.match(/^(?:gap|gap lai|dong lai)(?:\s*(?:trong)?\s*(\d+(?:[.,]\d+)?)\s*(?:s|giay)?)?$/))) { c.gap = m[1] != null ? Math.max(.5, soVN(m[1])) : 2; return; }
    if ((m = b.match(/^(?:giu|giu trong|mat sau|het sau)\s*(\d+(?:[.,]\d+)?)\s*(?:s|giay)?$/))) { c.giu = soVN(m[1]); return; }
    if ((m = b.match(/^goc\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)$/))) { c.goc = "so"; c.gocSo = [soVN(m[1]), Math.max(-89, Math.min(89.9, soVN(m[2])))]; return; }
    if ((m = b.match(/^(?:goc\s+)?(sgk|chuan|truoc|mat truoc|tren|tu tren|tu tren xuong|nghieng|goc nghieng|3d)$/))) { c.goc = /truoc/.test(m[1]) ? "truoc" : /tren/.test(m[1]) ? "tren" : /nghieng|3d/.test(m[1]) ? "nghieng" : "sgk"; return; }
    if (/^(trong suot|kinh)$/.test(b)) { c.che = "trong"; return; }
    if (/^(khung day|khung|day)$/.test(b)) { c.che = "khung"; return; }
    if (/^dac$/.test(b)) { c.che = "dac"; return; }
    if (/^(khong nhan|an nhan|bo nhan)$/.test(b)) { c.nhan = false; return; }
    if (/^(oxyz|truc|he truc|co truc)$/.test(b)) { c.oxyz = true; return; }
    if (/^(khong net khuat|an net khuat)$/.test(b)) { c.khuat = false; return; }
    if (/^(luoi|luoi mat)$/.test(b)) { c.luoiMat = true; return; }
    if (/^(tinh|dung yen|khong xoay)$/.test(b)) { c.tinh = true; return; }
    bao("khoi3d chưa hiểu “" + z + "” — dùng: cỡ (vd 1.2), xoay 360 5, trải 3, gập 2, giữ 4, góc sgk/trước/trên/nghiêng (hoặc góc 30 20), trong suốt, khung dây, oxyz, không nhãn");
  });
  if (!c.xoay && !c.trai && !c.tinh) c.xoay = { deg: 360, giay: 6 };   // mặc định: xoay một vòng
  if (c.tinh) c.xoay = null;
  return c;
}
const emIO = x => { x = Math.min(1, Math.max(0, x)); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
/* tạo phần tử video: trả { loai, h, d, coDinh, giu, k3 } */
function taoPhanTuVideo(ts, s, o) {
  const bao = o.bao || (() => {}), tc = docTuyChon(ts, bao), nd = docNoiDung(s, bao), toc = o.toc || 1;
  if (tc.xoay) tc.xoay.giay *= toc; tc.trai *= toc; tc.gap *= toc;
  const S = dungCanh({ id: nd.id, P: nd.P });
  if ((tc.trai || tc.gap) && !S.mo) bao(S.ten + " chưa trải phẳng được (mới có cho hình chóp và bát diện) — bỏ qua trải/gập");
  if (!S.mo) { tc.trai = 0; tc.gap = 0; }
  if (tc.gap && !tc.trai) tc.trai = 3 * toc;
  const mau = {};
  nd.toMau.forEach(t => { const q = chuan(t.mat), gi = S.g.findIndex(g => { const tg = chuan(g.ten); return tg === q || (" " + tg + " ").includes(" " + q + " ") || tg.includes(q); }); if (gi < 0) bao("không có mặt “" + t.mat + "” — các mặt: " + S.g.map(g => g.ten).join(", ")); else mau[gi] = { c: t.c, a: t.a }; });
  const vao = .6, tXoay = tc.xoay ? tc.xoay.giay : 0, d = vao + tXoay + tc.trai + tc.gap + .2;
  const g0 = tc.gocSo || (tc.goc === "sgk" && S.goc ? S.goc : GOC[tc.goc] || GOC.sgk);
  const k3 = { S, tc, mau, vao, tXoay, g0, d };
  // khung vừa: hình cầu bao (khối kín ∪ mọi bước trải ∪ trục) quanh tâm hộp bao — không nhấp nhô khi xoay
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
  const { S, tc, mau, vao, tXoay, g0 } = k3;
  let goc = 0, moT = 0;
  if (tc.xoay) { const f = tc.lienTuc && tau > vao + tXoay ? (tau - vao) / tXoay : emIO((tau - vao) / tXoay); goc = tc.xoay.deg * f; }
  const t1 = vao + tXoay;
  if (tc.trai) moT = emIO((tau - t1) / tc.trai);
  if (tc.gap) moT = Math.min(moT, 1 - emIO((tau - t1 - tc.trai) / tc.gap));
  if (S.mo) apDungMo(S, moT);
  const phi = tc.goc === "tren" ? g0[1] : g0[1] + (Math.max(g0[1], 52) - g0[1]) * moT;  // ngẩng lên khi trải để thấy rõ hình trải
  const q = qTuGoc(g0[0] + goc, phi), Rm = qToMat(q);
  const R0 = k3.R0 || k3.R, t1c = k3.tam1 || k3.tam, kk = 2.3 * u, zoom = Math.min(w, h) * .47 / (R0 + (k3.R - R0) * moT) / kk, c = k3.tam.map((v, i) => v + (t1c[i] - v) * moT); // khung trượt dần theo hình trải
  const cam = { q, zoom, px: -dot(Rm[0], c) * zoom, py: dot(Rm[1], c) * zoom };
  const a = Math.min(1, Math.max(0, tau / vao)), sc = .9 + .1 * (1 - Math.pow(1 - a, 3));
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-w / 2, -h / 2);
  ve(ctx, S, cam, w, h, kk, { che: tc.che, khuat: tc.khuat, nhan: tc.nhan, phu: !moT, luoiMat: tc.luoiMat, oxyz: tc.oxyz, luoiOxy: false, mau, hover: -1 });
  ctx.restore();
}

window.KHinh3D = {
  phienBan: "1.0", DEG, TAU, MUC, MUC_ID, TEN_NHOM, B, ICO, MAU_F, GOC, PAL, MAU, MAU_VD,
  so, boDau, bienDich, hexRgb, toaDoChu, macDinh, dungCanh, apDungMo, dinhTruc, chieu, tachNet, ve, vuaKhung, giaiDiem, duongGiong, taoTikz,
  qTuGoc, qMul, qAxis, qNorm, qToMat, slerp, dot, len, timHinh, docNoiDung, docTuyChon, taoPhanTuVideo, veVideo
};
})();
