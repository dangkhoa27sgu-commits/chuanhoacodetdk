/* ===== shape3d-catalog.js — KMath · Hình 3D: danh mục đầy đủ 3 nhóm (đa diện, tròn xoay, ứng dụng 12).
   Mỗi hình = 1 bộ dựng { ten, tham, dung(P) } trả Luoi. Cần shape3d-engine.js nạp trước.
   Quy ước đỉnh đáy (theo mẫu TikZ của thầy): A sau-trái, B trước-trái (AB ≡ +Ox), C trước-phải, D sau-phải (AD ≡ +Oy),
   đánh tên ngược chiều kim đồng hồ nhìn từ trên; đáy trên A', B', C', D' thẳng hàng theo cạnh bên. ===== */
(() => {
"use strict";
const K = window.KHinh3D; if (!K || !K.cc) return;
const { add, sub, mul, dot, cross, len, norm, Luoi, daDien, khoiXoay, moTronXoay, baoLoi, datMatDay, dienTichDaGiac, giao2D, bienDich, so, DEG, TAU, MAT_NGANG, dtCo } = K.cc;
const B = {};
const CHU = "ABCDEFGHKLMNPQ".split("");           // tên đỉnh đáy (bỏ I, J, O, S)
const phay = (ds, i) => ds.map(t => t + i);        // A → A'
const so1 = v => so(v, 2);

/* ---------- đáy phẳng dùng chung ---------- */
function daGiacDeu(n, a) { const R = a / (2 * Math.sin(Math.PI / n)), t0 = -Math.PI / 2 - Math.PI / n; return Array.from({ length: n }, (_, k) => [R * Math.cos(t0 + TAU * k / n), R * Math.sin(t0 + TAU * k / n)]); }
const DAY_TG = [["tgdeu", "Tam giác đều"], ["tgvuongB", "Tam giác vuông tại B"], ["tgvuongA", "Tam giác vuông tại A"]];
const DAY_TU = [["tuGiac", "Tứ giác bất kỳ (không có cạnh song song)"], ["vuong", "Hình vuông"], ["chunhat", "Hình chữ nhật"], ["thoi", "Hình thoi"], ["binhhanh", "Hình bình hành"], ["thang", "Hình thang cân (AD ∥ BC)"]];
const DAY_DEU = [["ngudeu", "Ngũ giác đều"], ["lucdeu", "Lục giác đều"], ["deuN", "Đa giác đều n cạnh"]];
const tamNgoai = (A, B2, C) => { const d = 2 * (A[0] * (B2[1] - C[1]) + B2[0] * (C[1] - A[1]) + C[0] * (A[1] - B2[1])); if (Math.abs(d) < 1e-12) return [(A[0] + B2[0] + C[0]) / 3, (A[1] + B2[1] + C[1]) / 3];
  const a2 = A[0] ** 2 + A[1] ** 2, b2 = B2[0] ** 2 + B2[1] ** 2, c2 = C[0] ** 2 + C[1] ** 2;
  return [(a2 * (B2[1] - C[1]) + b2 * (C[1] - A[1]) + c2 * (A[1] - B2[1])) / d, (a2 * (C[0] - B2[0]) + b2 * (A[0] - C[0]) + c2 * (B2[0] - A[0])) / d]; };
function day2D(P) {
  const a = +P.a, b = +(P.b ?? a), al = (P.goc ?? 60) * DEG; let p, tam, tenTam = "tâm đáy";
  switch (P.day) {
    case "tgdeu": p = daGiacDeu(3, a); break;
    case "tgvuongB": p = [[0, 0], [a, 0], [a, b]]; break;
    case "tgvuongA": p = [[0, 0], [a, 0], [0, b]]; break;
    case "vuong": p = [[0, 0], [a, 0], [a, a], [0, a]]; break;
    case "chunhat": p = [[0, 0], [a, 0], [a, b], [0, b]]; break;
    case "thoi": { const q = [a * Math.sin(al), a * Math.cos(al)]; p = [[0, 0], q, [q[0], q[1] + a], [0, a]]; break; }
    case "binhhanh": { const q = [a * Math.sin(al), a * Math.cos(al)]; p = [[0, 0], q, [q[0], q[1] + b], [0, b]]; break; }
    case "thang": { const c = Math.min(+(P.c ?? a / 2), a * 1.6); p = [[0, 0], [b, (a - c) / 2], [b, (a + c) / 2], [0, a]]; break; }
    case "tuGiac": { const k = a / 4; p = [[0, 0], [3.6, -.4], [3.2, 4.4], [.4, 3]].map(q => [q[0] * k, q[1] * k]); break; } // không có cặp cạnh đối nào song song
    case "ngudeu": p = daGiacDeu(5, a); break;
    case "lucdeu": p = daGiacDeu(6, a); break;
    default: p = daGiacDeu(Math.max(3, Math.min(12, Math.round(P.n || 6))), a);
  }
  if (p.length === 3) { tam = tamNgoai(...p); tenTam = P.day === "tgdeu" ? "tâm O (trọng tâm) tam giác đều" : "tâm O đường tròn ngoại tiếp đáy"; }
  else if (p.length === 4) { tam = giao2D(p[0], p[2], p[1], p[3]); tenTam = "giao điểm O hai đường chéo đáy"; }
  else { tam = p.reduce((s, q) => [s[0] + q[0] / p.length, s[1] + q[1] / p.length], [0, 0]); tenTam = "tâm O của đa giác đều"; }
  p = p.map(q => [q[0] - tam[0], q[1] - tam[1]]);
  const S = Math.abs(dtCo(p)), deu = ["tgdeu", "vuong", "ngudeu", "lucdeu", "deuN"].includes(P.day);
  return { p, n: p.length, S, deu, tenTam, ten: CHU.slice(0, p.length) };
}
const tenDay = d => ({ 3: "tam giác", 4: "tứ giác", 5: "ngũ giác", 6: "lục giác" })[d.n] || d.n + "-giác";
/* điểm neo "Đỉnh A": quay để AB ≡ Ox */
const neoA = (A, Bp, phu) => ({ k: "dinhA", ten: "Đỉnh A — AB ≡ Ox" + (phu || ""), p: A, rot: -Math.atan2(Bp[1] - A[1], Bp[0] - A[0]) / DEG });
const vuongTaiA = P => ["vuong", "chunhat", "tgvuongA"].includes(P.day);
/* tham số đáy dùng chung */
const thamDay = (ds, mac) => [
  { k: "day", ten: "Đáy", loai: "chon", mac, ds },
  { k: "n", ten: "Số cạnh đáy n", loai: "so", min: 3, max: 12, buoc: 1, mac: 7, hien: P => P.day === "deuN" },
  { k: "a", ten: P => ["tgdeu", "vuong", "thoi", "ngudeu", "lucdeu", "deuN"].includes(P.day) ? "Cạnh đáy a" : P.day === "thang" ? "AD = a (đáy lớn)" : P.day === "tuGiac" ? "Kích thước đáy" : "AB = a", loai: "so", min: .5, max: 8, buoc: .1, mac: 4 },
  { k: "b", ten: P => P.day === "thang" ? "Khoảng cách giữa AD và BC" : P.day === "tgvuongA" ? "AC = b" : P.day === "tgvuongB" ? "BC = b" : "AD = b", loai: "so", min: .5, max: 8, buoc: .1, mac: 3, hien: P => ["chunhat", "binhhanh", "thang", "tgvuongA", "tgvuongB"].includes(P.day) },
  { k: "c", ten: "BC = c (đáy nhỏ)", loai: "so", min: .5, max: 8, buoc: .1, mac: 2, hien: P => P.day === "thang" },
  { k: "goc", ten: "Góc BAD", don: "°", loai: "so", min: 30, max: 150, buoc: 1, mac: 60, hien: P => P.day === "thoi" || P.day === "binhhanh" }
];

/* ======================= NHÓM 1 — KHỐI ĐA DIỆN ======================= */
/* ---- Hình chóp đáy bất kỳ ---- */
B.chop = {
  ten: P => { const d = day2D(P), deu = d.deu && P.chan === "tam", t = d.ten.join(""); return "Hình chóp " + tenDay(d) + (deu ? " đều" : "") + " S." + t + (P.chan === "A" ? " có SA ⊥ (" + t + ")" : P.chan === "trungAB" ? " có (SAB) ⊥ (" + t + ")" : ""); },
  tham: [...thamDay([...DAY_TG, ...DAY_TU, ...DAY_DEU], "chunhat"),
    { k: "h", ten: "Chiều cao h (kéo đỉnh S trên hình để nâng hạ)", loai: "so", min: 1, max: 10, buoc: .1, mac: 5 },
    { k: "chan", ten: "Vị trí đỉnh S", loai: "chon", mac: "tam", ds: [["tam", "Trên tâm O của đáy (chân đường cao là O)"], ["A", "SA vuông góc với đáy"], ["trungAB", "Mặt bên (SAB) vuông góc với đáy (chân H là trung điểm AB)"], ["lech", "Vị trí bất kỳ (không đặc biệt)"]] }],
  dung(P) {
    const d = day2D(P), n = d.n, base = d.p.map(q => [q[0], q[1], 0]), Hab = mul(add(base[0], base[1]), .5);
    const H = P.chan === "A" ? base[0] : P.chan === "trungAB" ? Hab : P.chan === "lech" ? base.reduce((s2, p, i) => add(s2, mul(p, [.38, .12, .2, .3, .1, .1][i] || 0)), [0, 0, 0]).map((x, i, arr) => i < 2 ? x / ([.38, .12, .2, .3, .1, .1].slice(0, n).reduce((u, v) => u + v, 0)) : 0) : [0, 0, 0], S = [H[0], H[1], +P.h];
    const mats = [{ ds: [...Array(n).keys()], ten: "Mặt đáy " + d.ten.join("") }, ...d.ten.map((t, i) => ({ ds: [n, i, (i + 1) % n], ten: "Mặt bên S" + t + d.ten[(i + 1) % n] }))];
    const L = daDien(new Luoi(), [...d.ten, "S"], [...base, S], mats);
    if (P.chan === "tam") { L.phu.push([S, [0, 0, 0]]); if (n === 4) L.phu.push([base[0], base[2]], [base[1], base[3]]); L.nhan.push(["O", [0, 0, 0]]); L.vuong = [[[0, 0, 0], S, base[0]]]; }
    else if (P.chan === "A") L.vuong = [[base[0], S, base[1]], [base[0], S, base[n - 1]]];
    else if (P.chan === "trungAB") { L.phu.push([S, Hab]); L.nhan.push(["H", Hab]); L.vuong = [[Hab, S, base[1]]]; }
    L.tenDay = d.ten.slice(); L.tenTren = ["S"];
    L.V = d.S * P.h / 3; L.ct = "V = ⅓ · S(đáy) · h"; L.tt = "S(đáy) = " + so1(d.S) + (P.chan === "tam" ? " · đường cao SO, O là " + d.tenTam : P.chan === "A" ? " · đường cao SA" : P.chan === "trungAB" ? " · (SAB) ⊥ đáy theo giao tuyến AB, đường cao SH với H là trung điểm AB" + (Math.abs(P.h - Math.sqrt(3) / 2 * Math.hypot(base[1][0] - base[0][0], base[1][1] - base[0][1])) < .06 ? " — tam giác SAB đều" : "") : " · đỉnh S ở vị trí bất kỳ");
    L.neo = [{ k: "tamDay", ten: "Tâm đáy O", p: [0, 0, 0] }, neoA(base[0], base[1], vuongTaiA(P) ? ", AD ≡ Oy, AS ≡ Oz" : "")];
    L.keo = [{ nhan: "S", k: "h", min: 1, max: 10, ten: "chiều cao h" }];
    L.mo = { goc: 0, cay: d.ten.map((_, i) => [i + 1, 0]) };
    return L;
  }
};
/* ---- Tứ diện: đều, vuông, gần đều ---- */
function datTamGiacDay(pts, iA, iB, iC) { // mặt ABC nằm trên Oxy, A sau-trái, AB ≡ +Ox, đỉnh còn lại phía trên
  let P = pts; const A0 = P[iA]; let n = norm(cross(sub(P[iB], A0), sub(P[iC], A0)));
  const khac = P.findIndex((_, i) => i !== iA && i !== iB && i !== iC);
  if (dot(n, sub(P[khac], A0)) < 0) { P = P.map(p => [-p[0], p[1], p[2]]); n = norm(cross(sub(P[iB], P[iA]), sub(P[iC], P[iA]))); }
  const A = P[iA], e1 = norm(sub(P[iB], A)), e2 = cross(n, e1);
  let Q = P.map(p => { const q = sub(p, A); return [dot(q, e1), dot(q, e2), dot(q, n)]; });
  const tam = tamNgoai(Q[iA], Q[iB], Q[iC]);
  return Q.map(p => [p[0] - tam[0], p[1] - tam[1], p[2]]);
}
B.tuDien = {
  ten: P => ({ deu: "Tứ diện đều ABCD", vuong: "Tứ diện vuông OABC", gan: "Tứ diện gần đều ABCD" })[P.kieu],
  tham: [
    { k: "kieu", ten: "Loại tứ diện", loai: "chon", mac: "deu", ds: [["deu", "Tứ diện đều"], ["vuong", "Tứ diện vuông (OA, OB, OC đôi một vuông góc)"], ["gan", "Tứ diện gần đều (các cặp cạnh đối bằng nhau)"]], datLai: true },
    { k: "a", ten: P => P.kieu === "deu" ? "Cạnh a" : "OA = a", loai: "so", min: 1, max: 8, buoc: .1, mac: 4, hien: P => P.kieu !== "gan" },
    { k: "b", ten: "OB = b", loai: "so", min: 1, max: 8, buoc: .1, mac: 4, hien: P => P.kieu === "vuong" },
    { k: "c", ten: "OC = c", loai: "so", min: 1, max: 8, buoc: .1, mac: 4, hien: P => P.kieu === "vuong" },
    { k: "p", ten: "AB = CD = p", loai: "so", min: 1, max: 8, buoc: .1, mac: 4, hien: P => P.kieu === "gan" },
    { k: "q", ten: "AC = BD = q", loai: "so", min: 1, max: 8, buoc: .1, mac: 4.6, hien: P => P.kieu === "gan" },
    { k: "r", ten: "AD = BC = r", loai: "so", min: 1, max: 8, buoc: .1, mac: 5, hien: P => P.kieu === "gan" }
  ],
  dung(P) {
    const L = new Luoi(); let pts, ten;
    if (P.kieu === "vuong") {
      const a = +P.a, b = +P.b, c = +P.c; pts = [[0, 0, 0], [a, 0, 0], [0, b, 0], [0, 0, c]]; ten = ["O", "A", "B", "C"];
      L.tenDay = ["O", "A", "B"]; L.tenTren = ["C"];
      daDien(L, ten, pts, [{ ds: [0, 1, 2], ten: "Mặt OAB" }, { ds: [0, 1, 3], ten: "Mặt OAC" }, { ds: [0, 2, 3], ten: "Mặt OBC" }, { ds: [1, 2, 3], ten: "Mặt ABC" }]);
      L.vuong = [[pts[0], pts[1], pts[2]], [pts[0], pts[1], pts[3]], [pts[0], pts[2], pts[3]]];
      L.V = a * b * c / 6; L.ct = "V = ⅙ · OA · OB · OC"; L.tt = "OA, OB, OC đôi một vuông góc tại O";
      L.neo = [{ k: "dinhO", ten: "Đỉnh O — OA ≡ Ox, OB ≡ Oy, OC ≡ Oz", p: [0, 0, 0] }];
    } else {
      if (P.kieu === "deu") { const a = +P.a, d = daGiacDeu(3, a); pts = [...d.map(q => [q[0], q[1], 0]), [0, 0, a * Math.sqrt(2 / 3)]]; L.V = a ** 3 / (6 * Math.SQRT2); L.ct = "V = a³√2 / 12"; L.tt = "6 cạnh bằng nhau, 4 mặt là tam giác đều"; }
      else {
        let p = +P.p, q = +P.q, r = +P.r; const x2 = (q * q + r * r - p * p) / 8, y2 = (p * p + r * r - q * q) / 8, z2 = (p * p + q * q - r * r) / 8;
        if (x2 <= 0 || y2 <= 0 || z2 <= 0) throw new Error("Ba độ dài p, q, r phải là ba cạnh của một tam giác nhọn (mọi mặt tứ diện gần đều đều nhọn).");
        const x = Math.sqrt(x2), y = Math.sqrt(y2), z = Math.sqrt(z2);
        pts = datTamGiacDay([[x, y, z], [x, -y, -z], [-x, y, -z], [-x, -y, z]], 0, 1, 2);
        L.V = 8 * x * y * z / 3; L.ct = "V = √((p²+q²−r²)(p²+r²−q²)(q²+r²−p²)) / (6√2)"; L.tt = "4 mặt là 4 tam giác bằng nhau";
      }
      ten = ["A", "B", "C", "D"]; L.tenDay = ["A", "B", "C"]; L.tenTren = ["D"];
      daDien(L, ten, pts, [{ ds: [0, 1, 2], ten: "Mặt đáy ABC" }, { ds: [0, 1, 3], ten: "Mặt ABD" }, { ds: [1, 2, 3], ten: "Mặt BCD" }, { ds: [2, 0, 3], ten: "Mặt CAD" }]);
      const G = [0, 0, 0]; if (P.kieu === "deu") { L.phu.push([pts[3], G]); L.nhan.push(["G", G]); }
      L.neo = [{ k: "tamDay", ten: "Tâm đường tròn ngoại tiếp đáy ABC", p: [0, 0, 0] }, neoA(pts[0], pts[1])];
      L.keo = P.kieu === "deu" ? [] : [];
    }
    L.moTuDong = true;
    return L;
  }
};
/* ---- Lăng trụ & hình hộp ---- */
function dungLangTru(P, d, ten) {
  const n = d.n, h = +P.h, A0 = d.p[0], kx = P.xien || "dung";
  let Hx = A0;
  if (kx === "tam") Hx = [0, 0];
  else if (kx === "trung") Hx = [(d.p[1][0] + d.p[2][0]) / 2, (d.p[1][1] + d.p[2][1]) / 2];
  else if (kx === "goc") { const be = (+P.nghieng || 0) * DEG, hu = (+P.huong || 0) * DEG; Hx = [A0[0] + h * Math.tan(be) * Math.cos(hu), A0[1] + h * Math.tan(be) * Math.sin(hu)]; }
  const v = [Hx[0] - A0[0], Hx[1] - A0[1], h], xien = Math.hypot(v[0], v[1]) > 1e-6;
  const duoi = d.p.map(q => [q[0], q[1], 0]), tren = duoi.map(p => add(p, v)), tenT = phay(d.ten, "'");
  const mats = [{ ds: [...Array(n).keys()], ten: "Mặt đáy " + d.ten.join("") }, { ds: [...Array(n).keys()].map(i => n + i), ten: "Mặt đáy " + tenT.join("") },
    ...d.ten.map((t, i) => { const j = (i + 1) % n; return { ds: [i, j, n + j, n + i], ten: "Mặt bên " + t + d.ten[j] + tenT[j] + tenT[i] }; })];
  const L = daDien(new Luoi(), [...d.ten, ...tenT], [...duoi, ...tren], mats);
  L.tenDay = d.ten.slice(); L.tenTren = tenT.slice();
  if (xien) { const Hc = [Hx[0], Hx[1], 0]; L.phu.push([tren[0], Hc], [duoi[0], Hc]); L.nhan.push(["H", Hc]); L.vuong = [[Hc, tren[0], duoi[0]]];
    L.tt = "A'H ⊥ (" + d.ten.join("") + "), H thuộc mặt đáy" + (kx === "tam" ? " và là tâm O của đáy" : kx === "trung" ? " và là trung điểm " + d.ten[1] + d.ten[2] : "") + " · góc giữa AA' và đáy = " + so1(Math.atan2(h, Math.hypot(v[0], v[1])) / DEG) + "°"; }
  L.V = d.S * h; L.ct = "V = S(đáy) · h"; if (!L.tt) L.tt = "S(đáy) = " + so1(d.S) + ", cạnh bên vuông góc với đáy";
  L.neo = [{ k: "tamDay", ten: "Tâm đáy dưới O", p: [0, 0, 0] }, neoA(duoi[0], duoi[1], vuongTaiA(P) && !xien ? ", AD ≡ Oy, AA' ≡ Oz" : "")];
  L.keo = [{ nhan: tenT[0], k: "h", min: .5, max: 10, ten: "chiều cao h" }];
  L.moTuDong = true;
  return L;
}
const thamLangTru = (ds, mac, coXien) => [...thamDay(ds, mac),
  { k: "h", ten: "Chiều cao h (kéo đỉnh A' để nâng hạ)", loai: "so", min: .5, max: 10, buoc: .1, mac: 4 },
  ...(coXien ? [{ k: "xien", ten: "Kiểu lăng trụ", loai: "chon", mac: "dung", ds: [["dung", "Đứng (cạnh bên vuông góc đáy)"], ["tam", "Xiên: hình chiếu của A' lên đáy là tâm O"], ["trung", "Xiên: hình chiếu của A' lên đáy là trung điểm BC"], ["goc", "Xiên: tự chọn góc và hướng nghiêng"]] },
    { k: "nghieng", ten: "Góc nghiêng cạnh bên so với phương đứng", don: "°", loai: "so", min: 0, max: 55, buoc: 1, mac: 30, hien: P => P.xien === "goc" },
    { k: "huong", ten: "Hướng nghiêng", don: "°", loai: "so", min: 0, max: 359, buoc: 1, mac: 30, hien: P => P.xien === "goc" }] : [])];
B.langTru = {
  ten: P => { const d = day2D(P), x = P.xien && P.xien !== "dung"; return "Hình lăng trụ " + (x ? "xiên " : d.deu ? "đều " : "đứng ") + tenDay(d) + " " + d.ten.join("") + "." + phay(d.ten, "'").join(""); },
  tham: thamLangTru([...DAY_TG, ...DAY_TU, ...DAY_DEU], "tgdeu", true),
  dung: P => dungLangTru(P, day2D(P))
};
B.hop = {
  ten: P => { const x = P.xien && P.xien !== "dung"; return P.day === "vuong" && Math.abs(P.h - P.a) < 1e-9 && !x ? "Hình lập phương ABCD.A'B'C'D'" : P.day === "chunhat" && !x ? "Hình hộp chữ nhật ABCD.A'B'C'D'" : x ? "Hình hộp xiên ABCD.A'B'C'D'" : "Hình hộp đứng ABCD.A'B'C'D'"; },
  tham: thamLangTru([["chunhat", "Hình chữ nhật"], ["vuong", "Hình vuông"], ["binhhanh", "Hình bình hành"], ["thoi", "Hình thoi"]], "chunhat", true),
  dung(P) { const L = dungLangTru(P, day2D(P)); L.ct = "V = S(đáy) · h" + (P.day === "chunhat" && (!P.xien || P.xien === "dung") ? " = a · b · h" : ""); return L; }
};
B.lapPhuong = {
  ten: () => "Hình lập phương ABCD.A'B'C'D'",
  tham: [{ k: "a", ten: "Cạnh a", loai: "so", min: .5, max: 8, buoc: .1, mac: 4 }],
  dung(P) { const L = dungLangTru({ day: "vuong", a: P.a, h: P.a }, day2D({ day: "vuong", a: P.a })); L.V = P.a ** 3; L.ct = "V = a³"; L.tt = "6 mặt là hình vuông cạnh a, đường chéo = a√3 ≈ " + so1(P.a * Math.sqrt(3)); L.keo = []; return L; }
};
/* ---- Chóp cụt ---- */
B.chopCut = {
  ten: P => { const d = day2D(P); return "Hình chóp cụt " + tenDay(d) + (d.deu && P.chan === "tam" ? " đều " : " ") + d.ten.join("") + "." + phay(d.ten, "'").join(""); },
  tham: [...thamDay([...DAY_TG, ["vuong", "Hình vuông"], ["chunhat", "Hình chữ nhật"], ...DAY_DEU], "vuong"),
    { k: "k", ten: "Tỉ số k = A'B' / AB", loai: "so", min: .1, max: .9, buoc: .05, mac: .5 },
    { k: "h", ten: "Chiều cao h", loai: "so", min: .5, max: 10, buoc: .1, mac: 3 },
    { k: "chan", ten: "Đỉnh của hình chóp ban đầu nằm trên", loai: "chon", mac: "tam", ds: [["tam", "Đường thẳng qua tâm đáy (chóp cụt đều)"], ["A", "Đường thẳng qua A vuông góc đáy"]] }],
  dung(P) {
    const d = day2D(P), n = d.n, k = +P.k, h = +P.h, f = P.chan === "A" ? d.p[0] : [0, 0];
    const duoi = d.p.map(q => [q[0], q[1], 0]), tren = d.p.map(q => [f[0] + (q[0] - f[0]) * k, f[1] + (q[1] - f[1]) * k, h]), tenT = phay(d.ten, "'");
    const mats = [{ ds: [...Array(n).keys()], ten: "Mặt đáy lớn " + d.ten.join("") }, { ds: [...Array(n).keys()].map(i => n + i), ten: "Mặt đáy nhỏ " + tenT.join("") },
      ...d.ten.map((t, i) => { const j = (i + 1) % n; return { ds: [i, j, n + j, n + i], ten: "Mặt bên " + t + d.ten[j] + tenT[j] + tenT[i] }; })];
    const L = daDien(new Luoi(), [...d.ten, ...tenT], [...duoi, ...tren], mats);
    L.tenDay = d.ten.slice(); L.tenTren = tenT.slice();
    if (P.chan === "tam") { L.phu.push([[0, 0, 0], [0, 0, h]]); L.nhan.push(["O", [0, 0, 0]], ["O'", [0, 0, h]]); L.vuong = [[[0, 0, 0], [0, 0, h], duoi[0]]]; }
    const S1 = d.S, S2 = d.S * k * k; L.V = h / 3 * (S1 + S2 + Math.sqrt(S1 * S2)); L.ct = "V = h/3 · (S + S' + √(S·S'))"; L.tt = "S = " + so1(S1) + ", S' = " + so1(S2);
    L.neo = [{ k: "tamDay", ten: "Tâm đáy lớn O", p: [0, 0, 0] }, neoA(duoi[0], duoi[1])];
    L.moTuDong = true;
    return L;
  }
};
/* ---- 5 khối đa diện đều ---- */
const PHI = (1 + Math.sqrt(5)) / 2;
function chuanCanh(P, a) { let m = 1e9; for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) m = Math.min(m, len(sub(P[i], P[j]))); return P.map(p => mul(p, a / m)); }
function khoiTuDiem(Pts, a, chonDay) {
  let P = chuanCanh(Pts, a), F = baoLoi(P);
  const fDay = chonDay ? F.reduce((b, f) => f.length > b.length ? f : b, F[0]) : F[0];
  P = datMatDay(P, fDay); F = baoLoi(P);
  return { P, F };
}
const cyc = v => [v, [v[1], v[2], v[0]], [v[2], v[0], v[1]]];
const dauSao = (v, cacTruc) => { let out = [v]; for (const i of cacTruc) out = out.flatMap(p => p[i] === 0 ? [p] : [p, p.map((x, j) => j === i ? -x : x)]); return out; };
function diemIcosa() { return [[0, 1, PHI]].flatMap(v => dauSao(v, [1, 2])).flatMap(cyc); }
B.platon = {
  ten: P => ({ 4: "Tứ diện đều ABCD", 6: "Hình lập phương ABCD.A'B'C'D'", 8: "Khối bát diện đều", 12: "Khối mười hai mặt đều", 20: "Khối hai mươi mặt đều" })[P.loaiN],
  tham: [{ k: "loaiN", ten: "Loại khối đa diện đều", loai: "chon", mac: "8", ds: [["4", "Tứ diện đều {3; 3}"], ["6", "Lập phương {4; 3}"], ["8", "Bát diện đều {3; 4}"], ["12", "Mười hai mặt đều {5; 3}"], ["20", "Hai mươi mặt đều {3; 5}"]], datLai: true },
    { k: "a", ten: "Cạnh a", loai: "so", min: .5, max: 6, buoc: .1, mac: 3 }],
  dung(P) {
    const a = +P.a, N = String(P.loaiN);
    if (N === "4") { const L = B.tuDien.dung({ kieu: "deu", a }); L.tt = "4 đỉnh, 6 cạnh, 4 mặt · loại {3; 3}"; return L; }
    if (N === "6") { const L = B.lapPhuong.dung({ a }); L.tt = "8 đỉnh, 12 cạnh, 6 mặt · loại {4; 3}"; return L; }
    const L = new Luoi();
    if (N === "8") { // đặt đứng: hình vuông giữa ABCD (A sau-trái), E trên, F dưới
      const h = a / Math.SQRT2, A = [-a / 2, -a / 2, 0], Bv = [a / 2, -a / 2, 0], C = [a / 2, a / 2, 0], D = [-a / 2, a / 2, 0], E = [0, 0, h], F = [0, 0, -h];
      const day = ["A", "B", "C", "D"], mats = [];
      for (const [dn, di] of [["E", 4], ["F", 5]]) for (let i = 0; i < 4; i++) mats.push({ ds: [di, i, (i + 1) % 4], ten: "Mặt " + dn + day[i] + day[(i + 1) % 4] });
      daDien(L, ["A", "B", "C", "D", "E", "F"], [A, Bv, C, D, E, F], mats); L.tenDay = ["A", "B", "C", "D"]; L.tenTren = ["E", "F"];
      L.phu.push([E, F], [A, C], [Bv, D]); L.nhan.push(["I", [0, 0, 0]]);
      L.V = Math.SQRT2 / 3 * a ** 3; L.ct = "V = a³√2 / 3"; L.tt = "6 đỉnh, 12 cạnh, 8 mặt · loại {3; 4}";
      L.neo = [{ k: "tam", ten: "Tâm I của khối", p: [0, 0, 0] }, { k: "dinhA", ten: "Đỉnh A", p: A }];
    } else {
      const pts = N === "20" ? diemIcosa() : [...dauSao([1, 1, 1], [0, 1, 2]), ...[[0, 1 / PHI, PHI]].flatMap(v => dauSao(v, [1, 2])).flatMap(cyc)];
      const { P: Q, F } = khoiTuDiem(pts, a);
      daDien(L, Q.map(() => null), Q, F.map((f, i) => ({ ds: f, ten: "Mặt " + (i + 1) })));
      if (N === "12") { L.V = (15 + 7 * Math.sqrt(5)) / 4 * a ** 3; L.ct = "V = (15 + 7√5)/4 · a³"; L.tt = "20 đỉnh, 30 cạnh, 12 mặt ngũ giác đều · loại {5; 3}"; }
      else { L.V = 5 * (3 + Math.sqrt(5)) / 12 * a ** 3; L.ct = "V = 5(3 + √5)/12 · a³"; L.tt = "12 đỉnh, 30 cạnh, 20 mặt tam giác đều · loại {3; 5}"; }
      const ct = Q.reduce((s, p) => add(s, p), [0, 0, 0]).map(x => x / Q.length); L.nhan.push(["O", ct]);
      L.neo = [{ k: "tam", ten: "Tâm O của khối", p: ct }, { k: "day", ten: "Tâm mặt đáy (đặt trên Oxy)", p: [0, 0, 0] }];
    }
    L.moTuDong = true;
    return L;
  }
};
/* ---- Khối bán đều (Archimedes): cụt hoá các cạnh ---- */
function catDinh(Pts, ti) {
  const F = baoLoi(Pts), daCo = new Set(), out = [];
  F.forEach(f => f.forEach((i, k) => { const j = f[(k + 1) % f.length], key = i < j ? i + "_" + j : j + "_" + i; if (daCo.has(key)) return; daCo.add(key);
    out.push(add(Pts[i], mul(sub(Pts[j], Pts[i]), ti)), add(Pts[j], mul(sub(Pts[i], Pts[j]), ti))); }));
  return out;
}
B.banDeu = {
  ten: P => ({ bong: "Quả bóng đá (khối 32 mặt: 12 ngũ giác, 20 lục giác)", lpCut: "Khối lập phương cụt", bdCut: "Khối bát diện cụt" })[P.kieu],
  tham: [{ k: "kieu", ten: "Khối", loai: "chon", mac: "bong", ds: [["bong", "Quả bóng đá — hai mươi mặt cụt"], ["lpCut", "Lập phương cụt (8 tam giác, 6 bát giác)"], ["bdCut", "Bát diện cụt (6 vuông, 8 lục giác)"]], datLai: true },
    { k: "a", ten: "Cạnh a", loai: "so", min: .3, max: 3, buoc: .05, mac: 1.2 }],
  dung(P) {
    let goc, ti;
    if (P.kieu === "bong") { goc = diemIcosa(); ti = 1 / 3; }
    else if (P.kieu === "lpCut") { goc = dauSao([1, 1, 1], [0, 1, 2]); ti = 1 / (2 + Math.SQRT2); }
    else { goc = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]; ti = 1 / 3; }
    const { P: Q, F } = khoiTuDiem(catDinh(goc, ti), +P.a, true), L = new Luoi();
    const tenLoai = f => ({ 3: "tam giác", 4: "hình vuông", 5: "ngũ giác", 6: "lục giác", 8: "bát giác" })[f.length];
    const dem = {}; daDien(L, Q.map(() => null), Q, F.map(f => { dem[f.length] = (dem[f.length] || 0) + 1; return { ds: f, ten: "Mặt " + tenLoai(f) + " " + dem[f.length] }; }));
    L.tt = Q.length + " đỉnh, " + F.reduce((s, f) => s + f.length, 0) / 2 + " cạnh, " + F.length + " mặt: " + Object.entries(dem).map(([k, v]) => v + " " + tenLoai({ length: +k })).join(", ");
    L.ct = "V tính trực tiếp từ lưới mặt"; L.neo = [{ k: "day", ten: "Tâm mặt đáy (đặt trên Oxy)", p: [0, 0, 0] }];
    L.moTuDong = true;
    return L;
  }
};
/* ---- Lăng trụ cụt (mặt trên cắt chéo) ---- */
B.ltCut = {
  ten: P => { const d = day2D(P); return "Hình lăng trụ cụt " + d.ten.join("") + "." + phay(d.ten, "'").join(""); },
  tham: [...thamDay([...DAY_TG, ["vuong", "Hình vuông"], ["chunhat", "Hình chữ nhật"]], "tgdeu"),
    { k: "h", ten: "Chiều cao tại tâm đáy", loai: "so", min: 1, max: 10, buoc: .1, mac: 4 },
    { k: "nghieng", ten: "Góc giữa mặt cắt và mặt đáy", don: "°", loai: "so", min: 0, max: 50, buoc: 1, mac: 25 }],
  dung(P) {
    const d = day2D(P), n = d.n, h = +P.h; let t = Math.tan((+P.nghieng) * DEG);
    const xMin = Math.min(...d.p.map(q => q[0])), xMax = Math.max(...d.p.map(q => q[0])), L0 = [];
    const zMin = Math.min(h + t * xMin, h + t * xMax); if (zMin < .25) { t = Math.max(0, (h - .25) / Math.max(Math.abs(xMin), Math.abs(xMax))); L0.push("Mặt cắt chạm đáy — đã tự giảm góc."); }
    const duoi = d.p.map(q => [q[0], q[1], 0]), tren = d.p.map(q => [q[0], q[1], h + t * q[0]]), tenT = phay(d.ten, "'");
    const mats = [{ ds: [...Array(n).keys()], ten: "Mặt đáy " + d.ten.join("") }, { ds: [...Array(n).keys()].map(i => n + i), ten: "Mặt cắt " + tenT.join("") },
      ...d.ten.map((tt, i) => { const j = (i + 1) % n; return { ds: [i, j, n + j, n + i], ten: "Mặt bên " + tt + d.ten[j] + tenT[j] + tenT[i] }; })];
    const L = daDien(new Luoi(), [...d.ten, ...tenT], [...duoi, ...tren], mats);
    L.tenDay = d.ten.slice(); L.tenTren = tenT.slice(); L.ghiChu = L0.join(" "); L.ct = "V = S(đáy) · h_tb (h_tb: chiều cao tại trọng tâm đáy)";
    L.tt = "Các cạnh bên AA', BB', … vuông góc đáy nhưng dài khác nhau";
    L.neo = [{ k: "tamDay", ten: "Tâm đáy O", p: [0, 0, 0] }, neoA(duoi[0], duoi[1])];
    L.moTuDong = true;
    return L;
  }
};
/* ---- Khối nêm, mái nhà ---- */
B.nem = {
  ten: P => P.kieu === "nem" ? "Khối nêm ABCD.EF" : "Khối mái nhà ABCD.EF",
  tham: [{ k: "kieu", ten: "Kiểu", loai: "chon", mac: "mai", ds: [["mai", "Mái nhà (đường nóc EF ở giữa)"], ["nem", "Khối nêm (mặt ADFE thẳng đứng)"]], datLai: true },
    { k: "a", ten: "AB = a", loai: "so", min: 1, max: 8, buoc: .1, mac: 4 }, { k: "b", ten: "AD = b", loai: "so", min: 1, max: 9, buoc: .1, mac: 6 },
    { k: "c", ten: "Đường nóc EF = c", loai: "so", min: .2, max: 9, buoc: .1, mac: 3.5, hien: P => P.kieu === "mai" },
    { k: "h", ten: "Chiều cao h", loai: "so", min: .5, max: 8, buoc: .1, mac: 3 }],
  dung(P) {
    const a = +P.a, b = +P.b, h = +P.h, c = Math.min(+P.c, b);
    const E = P.kieu === "nem" ? [0, 0, h] : [a / 2, (b - c) / 2, h], F = P.kieu === "nem" ? [0, b, h] : [a / 2, (b + c) / 2, h];
    const pts = [[0, 0, 0], [a, 0, 0], [a, b, 0], [0, b, 0], E, F].map(p => [p[0] - a / 2, p[1] - b / 2, p[2]]);
    const L = daDien(new Luoi(), ["A", "B", "C", "D", "E", "F"], pts, [{ ds: [0, 1, 2, 3], ten: "Mặt đáy ABCD" }, { ds: [0, 1, 4], ten: "Mặt ABE" }, { ds: [1, 2, 5, 4], ten: "Mặt BCFE" }, { ds: [2, 3, 5], ten: "Mặt CDF" }, { ds: [3, 0, 4, 5], ten: "Mặt DAEF" }]);
    L.tenDay = ["A", "B", "C", "D"]; L.tenTren = ["E", "F"];
    L.ct = "V = h/6 · (S₁ + 4·S_giữa + S₂) (công thức khối lăng trụ cụt tổng quát)"; L.tt = P.kieu === "nem" ? "V = ½ · a · b · h" : "V = a·h·(2b + c)/6";
    L.V = P.kieu === "nem" ? a * b * h / 2 : a * h * (2 * b + c) / 6;
    L.neo = [{ k: "tamDay", ten: "Tâm đáy", p: [0, 0, 0] }, { k: "dinhA", ten: "Đỉnh A — AB ≡ Ox, AD ≡ Oy", p: pts[0] }];
    L.moTuDong = true;
    return L;
  }
};
/* ---- Song chóp (hai chóp chung đáy) ---- */
B.songChop = {
  ten: P => "Khối song chóp " + tenDay({ n: +P.n }) + " đều S." + CHU.slice(0, +P.n).join("") + ".S'",
  tham: [{ k: "n", ten: "Số cạnh đáy chung n", loai: "so", min: 3, max: 8, buoc: 1, mac: 5 }, { k: "a", ten: "Cạnh đáy a", loai: "so", min: .5, max: 6, buoc: .1, mac: 3 },
    { k: "h1", ten: "Chiều cao chóp trên SO", loai: "so", min: .5, max: 8, buoc: .1, mac: 3 }, { k: "h2", ten: "Chiều cao chóp dưới S'O", loai: "so", min: .5, max: 8, buoc: .1, mac: 3 }],
  dung(P) {
    const n = Math.round(+P.n), d = daGiacDeu(n, +P.a), ten = CHU.slice(0, n), S = [0, 0, +P.h1], S2 = [0, 0, -P.h2];
    const pts = [...d.map(q => [q[0], q[1], 0]), S, S2], mats = [];
    ten.forEach((t, i) => { const j = (i + 1) % n; mats.push({ ds: [n, i, j], ten: "Mặt S" + t + ten[j] }, { ds: [n + 1, i, j], ten: "Mặt S'" + t + ten[j] }); });
    const L = daDien(new Luoi(), [...ten, "S", "S'"], pts, mats); L.tenDay = ten.slice(); L.tenTren = ["S", "S'"];
    L.phu.push([S, S2]); L.nhan.push(["O", [0, 0, 0]]);
    const Sd = Math.abs(dtCo(d)); L.V = Sd * (+P.h1 + +P.h2) / 3; L.ct = "V = ⅓ · S(đáy) · SS'"; L.tt = "Hai chóp đều chung đáy " + ten.join("");
    L.neo = [{ k: "tam", ten: "Tâm O của đáy chung", p: [0, 0, 0] }, neoA(pts[0], pts[1])];
    L.moTuDong = true;
    return L;
  }
};
/* ---- Đa diện lõm: khối chữ L, khối có khe, khối sao ---- */
function langTruTuDaGiac(L, poly, h, ten, tenMat) { // poly: [[x,y]...] ngược chiều kim đồng hồ, đẩy theo Oz
  const n = poly.length, duoi = poly.map(q => [q[0], q[1], 0]), tren = poly.map(q => [q[0], q[1], h]), tenT = ten ? phay(ten, "'") : null;
  const mats = [{ ds: [...Array(n).keys()], ten: "Mặt đáy" + (ten ? " " + ten.join("") : " dưới") }, { ds: [...Array(n).keys()].map(i => n + i), ten: "Mặt đáy" + (ten ? " " + tenT.join("") : " trên") }];
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; mats.push({ ds: [i, j, n + j, n + i], ten: ten ? "Mặt " + ten[i] + ten[j] + tenT[j] + tenT[i] : (tenMat || "Mặt bên ") + (i + 1) }); }
  return daDien(L, ten ? [...ten, ...tenT] : [...duoi, ...tren].map(() => null), [...duoi, ...tren], mats);
}
B.daLom = {
  ten: P => ({ chuL: "Khối chữ L ABCDEF.A'B'C'D'E'F'", khe: "Khối hộp có khe rãnh (chữ U)", sao: "Khối sao tám cánh (đa diện sao)" })[P.kieu],
  tham: [{ k: "kieu", ten: "Khối", loai: "chon", mac: "chuL", ds: [["chuL", "Khối chữ L"], ["khe", "Khối hộp có khe rãnh"], ["sao", "Khối sao tám cánh (stella octangula)"]], datLai: true },
    { k: "a", ten: P => P.kieu === "sao" ? "Cạnh bát diện lõi a" : "Chiều dài AB = a", loai: "so", min: 1, max: 8, buoc: .1, mac: 4 },
    { k: "b", ten: "Chiều rộng AF = b", loai: "so", min: 1, max: 8, buoc: .1, mac: 5, hien: P => P.kieu !== "sao" },
    { k: "c", ten: P => P.kieu === "khe" ? "Bề rộng khe" : "BC = c", loai: "so", min: .3, max: 7, buoc: .1, mac: 2, hien: P => P.kieu !== "sao" },
    { k: "e", ten: P => P.kieu === "khe" ? "Độ sâu khe" : "Phần khuyết DE: AE = e", loai: "so", min: .3, max: 7, buoc: .1, mac: 1.6, hien: P => P.kieu !== "sao" },
    { k: "h", ten: "Chiều cao h", loai: "so", min: .5, max: 8, buoc: .1, mac: 3, hien: P => P.kieu !== "sao" }],
  dung(P) {
    const L = new Luoi(), a = +P.a, b = +P.b, h = +P.h;
    if (P.kieu === "chuL") {
      const c = Math.min(+P.c, b - .2), e = Math.min(+P.e, a - .2), poly = [[0, 0], [a, 0], [a, c], [e, c], [e, b], [0, b]].map(q => [q[0] - a / 2, q[1] - b / 2]);
      langTruTuDaGiac(L, poly, h, ["A", "B", "C", "D", "E", "F"]); L.tenDay = ["A", "B", "C", "D", "E", "F"]; L.tenTren = ["A'", "B'", "C'", "D'", "E'", "F'"];
      L.V = h * (a * b - (a - e) * (b - c)); L.ct = "V = S(đáy chữ L) · h"; L.tt = "S(đáy) = ab − (a − e)(b − c) = " + so1(a * b - (a - e) * (b - c));
      L.neo = [{ k: "tam", ten: "Tâm hình hộp bao", p: [0, 0, 0] }, { k: "dinhA", ten: "Đỉnh A — AB ≡ Ox, AF ≡ Oy", p: [poly[0][0], poly[0][1], 0] }];
    } else if (P.kieu === "khe") {
      const w = Math.min(+P.c, b - .4), dd = Math.min(+P.e, h - .2), y0 = (b - w) / 2, y1 = (b + w) / 2;
      // mặt cắt chữ U trong mặt phẳng (y, z), đẩy dọc Ox
      const U = [[0, 0], [b, 0], [b, h], [y1, h], [y1, h - dd], [y0, h - dd], [y0, h], [0, h]].map(q => [q[0] - b / 2, q[1]]);
      const n = U.length, sau = U.map(q => [-a / 2, q[0], q[1]]), truoc = U.map(q => [a / 2, q[0], q[1]]);
      const mats = [{ ds: [...Array(n).keys()], ten: "Mặt sau" }, { ds: [...Array(n).keys()].map(i => n + i), ten: "Mặt trước" }];
      const tenB = ["Mặt đáy", "Mặt bên phải", "Mặt trên phải", "Thành khe phải", "Đáy khe", "Thành khe trái", "Mặt trên trái", "Mặt bên trái"];
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; mats.push({ ds: [i, j, n + j, n + i], ten: tenB[i] }); }
      daDien(L, [...sau, ...truoc].map(() => null), [...sau, ...truoc], mats);
      L.V = a * (b * h - w * dd); L.ct = "V = (b·h − khe) · a"; L.tt = "Thiết diện vuông góc Ox là hình chữ U";
      L.neo = [{ k: "tam", ten: "Tâm đáy", p: [0, 0, 0] }];
    } else {
      const s = a / Math.SQRT2, O = [[s, 0, 0], [-s, 0, 0], [0, s, 0], [0, -s, 0], [0, 0, s], [0, 0, -s]], pts = O.slice(), mats = [], ht = a * Math.sqrt(2 / 3);
      for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
        const ia = sx > 0 ? 0 : 1, ib = sy > 0 ? 2 : 3, ic = sz > 0 ? 4 : 5, c = mul(add(add(O[ia], O[ib]), O[ic]), 1 / 3), tip = add(c, mul(norm([sx, sy, sz]), ht));
        const it = pts.length; pts.push(tip); mats.push({ ds: [ia, ib, it] }, { ds: [ib, ic, it] }, { ds: [ic, ia, it] });
      }
      daDien(L, pts.map(() => null), pts, mats.map((m, i) => Object.assign(m, { ten: "Mặt cánh " + (Math.floor(i / 3) + 1) + "." + (i % 3 + 1) })));
      L.V = Math.SQRT2 * a ** 3; L.ct = "V = V(bát diện) + 8·V(tứ diện đều cạnh a) = a³√2"; L.tt = "Hợp của hai tứ diện đều lồng nhau";
      L.neo = [{ k: "tam", ten: "Tâm khối", p: [0, 0, 0] }];
    }
    L.moTuDong = P.kieu !== "sao";
    return L;
  }
};

/* ======================= NHÓM 2 — KHỐI TRÒN XOAY ======================= */
const TRUC = { k: "truc", ten: "Trục quay (trục đối xứng)", loai: "chon", mac: "z", ds: [["z", "Oz — đứng"], ["x", "Ox — nằm ngang"], ["y", "Oy"]] };
const GOC_NGANG = K.qNorm(K.qMul(K.qAxis([1, 0, 0], 14 * DEG), K.qAxis([0, 1, 0], -26 * DEG))), GOC_DUNG = K.qTuGoc(0, 17);
/* khối tròn: góc chuẩn dùng phép chiếu vuông góc để đường tròn đáy thành elip nằm ngang (trục đứng) hoặc đứng (trục ngang) như SGK */
const gocTruc = P => ({ q: P.truc === "x" || P.truc === "y" ? GOC_NGANG : GOC_DUNG });
const phanQuet = P => Math.min(360, +(P.quet == null ? 360 : P.quet)) / 360;
function nhanXoay(L, X, ds) { ds.forEach(([t, r, s, du]) => { if (du == null || du <= X.phi + 1e-6) L.nhan.push([t, X.P(r, s, X.du + (du || 0))]); }); }
function cung(X, r, s, n) { n = n || X.nk; const out = []; for (let k = 0; k <= n; k++) out.push(X.P(r, s, X.du + X.phi * k / n)); return out; }
B.tru = {
  ten: () => "Hình trụ", quet: true, gocSgk: gocTruc,
  tham: [{ k: "r", ten: "Bán kính đáy r", loai: "so", min: .3, max: 5, buoc: .1, mac: 2 }, { k: "h", ten: "Chiều cao h", loai: "so", min: .3, max: 10, buoc: .1, mac: 4 }, TRUC],
  dung(P) {
    const r = +P.r, h = +P.h, L = new Luoi();
    const X = khoiXoay(L, { doan: [{ ten: "Đáy dưới (hình tròn)", phang: true, pts: [[0, 0], [r, 0]] }, { ten: "Mặt xung quanh", pts: [[r, 0], [r, h]] }, { ten: "Đáy trên (hình tròn)", phang: true, pts: [[r, h], [0, h]] }], quet: P.quet, truc: P.truc });
    nhanXoay(L, X, [["O", 0, 0], ["O'", 0, h], ["A", r, 0, 0], ["B", r, 0, Math.PI], ["A'", r, h, 0]]);
    L.phu.push([X.P(0, 0, 0), X.P(0, h, 0)], [X.P(0, 0, 0), X.P(r, 0, X.du)]); L.vuong = [[X.P(0, 0, 0), X.P(0, h, 0), X.P(r, 0, X.du)]];
    const f = phanQuet(P); L.V = Math.PI * r * r * h * f; L.ct = "V = π · r² · h"; L.tt = "S(xq) = 2πrh ≈ " + so1(2 * Math.PI * r * h) + (f < 1 ? " · đang quét " + so1(f * 360) + "°" : "");
    L.neo = [{ k: "tamDay", ten: "Tâm đáy O", p: [0, 0, 0] }, { k: "tamTren", ten: "Tâm đáy trên O'", p: X.P(0, h, 0) }];
    if (X.day) L.moHam = moTronXoay(L, X, "tru", { r, h });
    return L;
  }
};
B.non = {
  ten: () => "Hình nón", quet: true, gocSgk: gocTruc,
  tham: [{ k: "r", ten: "Bán kính đáy r", loai: "so", min: .3, max: 5, buoc: .1, mac: 2.4 }, { k: "h", ten: "Chiều cao h", loai: "so", min: .3, max: 10, buoc: .1, mac: 4.5 }, TRUC],
  dung(P) {
    const r = +P.r, h = +P.h, L = new Luoi(), l = Math.hypot(r, h);
    const X = khoiXoay(L, { doan: [{ ten: "Đáy (hình tròn)", phang: true, pts: [[0, 0], [r, 0]] }, { ten: "Mặt xung quanh", pts: [[r, 0], [0, h]] }], quet: P.quet, truc: P.truc });
    nhanXoay(L, X, [["S", 0, h], ["O", 0, 0], ["A", r, 0, 0], ["B", r, 0, Math.PI]]);
    L.phu.push([X.P(0, 0, 0), X.P(0, h, 0)], [X.P(0, 0, 0), X.P(r, 0, X.du)]); L.vuong = [[X.P(0, 0, 0), X.P(0, h, 0), X.P(r, 0, X.du)]];
    const f = phanQuet(P); L.V = Math.PI * r * r * h / 3 * f; L.ct = "V = ⅓ · π · r² · h"; L.tt = "Đường sinh l = " + so1(l) + ", S(xq) = πrl ≈ " + so1(Math.PI * r * l) + ", góc ở tâm hình quạt trải = " + so1(360 * r / l) + "°";
    L.neo = [{ k: "tamDay", ten: "Tâm đáy O", p: [0, 0, 0] }, { k: "dinh", ten: "Đỉnh S", p: X.P(0, h, 0) }];
    L.keo = P.truc === "z" || !P.truc ? [{ nhan: "S", k: "h", min: .3, max: 10, ten: "chiều cao h" }] : [];
    if (X.day) L.moHam = moTronXoay(L, X, "non", { r, h });
    return L;
  }
};
B.nonCut = {
  ten: () => "Hình nón cụt", quet: true, gocSgk: gocTruc,
  tham: [{ k: "R", ten: "Bán kính đáy lớn R", loai: "so", min: .5, max: 5, buoc: .1, mac: 2.6 }, { k: "r", ten: "Bán kính đáy nhỏ r", loai: "so", min: .2, max: 4.9, buoc: .1, mac: 1.3 }, { k: "h", ten: "Chiều cao h", loai: "so", min: .3, max: 10, buoc: .1, mac: 3 }, TRUC],
  dung(P) {
    const R = +P.R, h = +P.h, L = new Luoi(); let r = +P.r; if (r >= R - .05) { r = R - .05; L.ghiChu = "Đáy nhỏ phải nhỏ hơn đáy lớn — đã lấy r = " + so1(r) + "."; }
    const X = khoiXoay(L, { doan: [{ ten: "Đáy lớn (hình tròn)", phang: true, pts: [[0, 0], [R, 0]] }, { ten: "Mặt xung quanh", pts: [[R, 0], [r, h]] }, { ten: "Đáy nhỏ (hình tròn)", phang: true, pts: [[r, h], [0, h]] }], quet: P.quet, truc: P.truc });
    nhanXoay(L, X, [["O", 0, 0], ["O'", 0, h], ["A", R, 0, 0], ["B", R, 0, Math.PI], ["A'", r, h, 0]]);
    L.phu.push([X.P(0, 0, 0), X.P(0, h, 0)], [X.P(0, 0, 0), X.P(R, 0, X.du)]); L.vuong = [[X.P(0, 0, 0), X.P(0, h, 0), X.P(R, 0, X.du)]];
    const f = phanQuet(P), l = Math.hypot(R - r, h); L.V = Math.PI * h / 3 * (R * R + R * r + r * r) * f; L.ct = "V = πh/3 · (R² + Rr + r²)"; L.tt = "Đường sinh l = " + so1(l) + ", S(xq) = π(R + r)l ≈ " + so1(Math.PI * (R + r) * l);
    L.neo = [{ k: "tamDay", ten: "Tâm đáy lớn O", p: [0, 0, 0] }];
    if (X.day) L.moHam = moTronXoay(L, X, "nonCut", { r: R, r2: r, h });
    return L;
  }
};
const cungTron = (R, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const t = a0 + (a1 - a0) * i / n; return [R * Math.cos(t), R * Math.sin(t)]; });
B.cau = {
  ten: () => "Mặt cầu, khối cầu", quet: true, gocSgk: gocTruc,
  tham: [{ k: "R", ten: "Bán kính R", loai: "so", min: .5, max: 6, buoc: .1, mac: 3 }, TRUC],
  dung(P) {
    const R = +P.R, L = new Luoi();
    const X = khoiXoay(L, { doan: [{ ten: "Mặt cầu", pts: cungTron(R, -Math.PI / 2, Math.PI / 2, 48).map(([s, r]) => [Math.max(0, s), r]), soVT: 6 }], quet: P.quet, truc: P.truc, nu: 96 });
    L.canh.push(cung(X, R, 0, 360));
    if (X.day) { L.g[0].boVien = true; L.cauVien = { tam: [0, 0, 0], R }; } // viền ngoài = đường tròn lớn chính xác, xích đạo tiếp xúc khít
    nhanXoay(L, X, [["O", 0, 0], ["A", R, 0, Math.PI / 2]]);
    if (X.phi >= Math.PI / 2) L.phu.push([X.P(0, 0, 0), X.P(R, 0, X.du + Math.PI / 2)]);
    const f = phanQuet(P); L.V = 4 / 3 * Math.PI * R ** 3 * f; L.ct = "V = 4/3 · π · R³"; L.tt = "S(mặt cầu) = 4πR² ≈ " + so1(4 * Math.PI * R * R) + " · đường tròn lớn vẽ đậm";
    L.neo = [{ k: "tam", ten: "Tâm O", p: [0, 0, 0] }, { k: "day", ten: "Đặt cầu trên mặt Oxy", p: X.P(0, -R, 0) }];
    return L;
  }
};
B.trucut = { gocSgk: () => ({ q: K.qTuGoc(-50, 18) }),
  ten: P => P.kieu === "mong" ? "Móng trụ" : "Hình trụ cụt",
  tham: [
    { k: "kieu", ten: "Kiểu", loai: "chon", mac: "cut", ds: [["cut", "Trụ cụt (mặt cắt xiên)"], ["mong", "Móng trụ (cắt qua đường kính đáy)"]], datLai: true },
    { k: "r", ten: "Bán kính đáy r", loai: "so", min: .5, max: 5, buoc: .1, mac: 2 },
    { k: "h", ten: "Chiều cao tại trục h", loai: "so", min: 1, max: 10, buoc: .1, mac: 4, hien: P => P.kieu !== "mong" },
    { k: "goc", ten: "Góc giữa mặt cắt và đáy", don: "°", loai: "so", min: 5, max: 75, buoc: 1, mac: 25 }
  ],
  dung(P) {
    const L = new Luoi(), r = +P.r;
    if (P.kieu === "mong") {
      const t = Math.tan(P.goc * DEG), nu = 48, nv = 6, uu = i => -Math.PI / 2 + Math.PI * i / nu;
      const day = L.mat("Đáy (nửa hình tròn)", { phang: true }), xq = L.mat("Mặt cong xung quanh", { tron: true }), cat = L.mat("Mặt cắt (nửa elip)", { phang: true });
      const vc = [], vcT = [];
      for (let i = 0; i <= nu; i++) { const u = uu(i), x = r * Math.cos(u), y = r * Math.sin(u); vc.push([x, y, 0]); vcT.push([x, y, t * x]); }
      L.g[day].poly = vc; L.g[cat].poly = vcT;
      L.quat([0, 0, 0], vc, day, [0, 0, -1], false);
      const id = L.luoiUV(nu, nv, (i, j) => { const u = uu(i), x = r * Math.cos(u), y = r * Math.sin(u); return [x, y, t * x * j / nv]; }, xq, p => [p[0], p[1], 0], false);
      L.quat([0, 0, 0], vcT, cat, [-t, 0, 1], false);
      const A = [0, -r, 0], Bv = [0, r, 0], I = [0, 0, 0], H = [r, 0, 0], C = [r, 0, t * r];
      L.canh.push(vc, vcT, [A, Bv]); L.phu.push([I, H], [H, C], [I, C]); L.vuong = [[H, I, C]];
      L.nhan.push(["A", A], ["B", Bv], ["I", I], ["H", H], ["C", C]);
      for (let i = 6; i < nu; i += 6) L.wire.push(id[i].map(k => L.v[k]));
      L.wire.push(id.map(c => L.v[c[3]]));
      L.V = 2 / 3 * r ** 3 * t; L.ct = "V = ⅔ · r³ · tan α"; L.tt = "Tam giác IHC vuông tại H, góc HIC = α";
      L.neo = [{ k: "tamDay", ten: "Tâm đáy I (trung điểm AB)", p: I }, { k: "dinhA", ten: "Đầu mút A của đường kính", p: A }];
    } else {
      const nu = 72, nv = 6; let t = Math.tan(P.goc * DEG); const tMax = (P.h - .15) / r;
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
      for (let i = 0; i < nu; i += 9) L.wire.push(id[i].map(k => L.v[k]));
      [2, 4].forEach(j => { const pl = id.map(c => L.v[c[j]]); pl.push(pl[0]); L.wire.push(pl); });
      L.V = Math.PI * r * r * P.h; L.ct = "V = π · r² · h"; L.tt = "h đo dọc trục IJ (tâm đáy → tâm mặt cắt)";
      L.neo = [{ k: "tamDay", ten: "Tâm đáy I", p: I }, { k: "tamCat", ten: "Tâm mặt cắt J", p: J }];
    }
    return L;
  }
};
/* ---- Trụ xiên, nón xiên ---- */
B.xien = { gocSgk: () => ({ q: GOC_DUNG }),
  ten: P => P.kieu === "non" ? "Hình nón xiên" : "Hình trụ xiên",
  tham: [{ k: "kieu", ten: "Kiểu", loai: "chon", mac: "tru", ds: [["tru", "Trụ xiên (hai đáy song song, đường sinh xiên)"], ["non", "Nón xiên (đỉnh không nằm trên trục)"]], datLai: true },
    { k: "r", ten: "Bán kính đáy r", loai: "so", min: .3, max: 5, buoc: .1, mac: 2 }, { k: "h", ten: "Chiều cao h", loai: "so", min: .5, max: 10, buoc: .1, mac: 4 },
    { k: "goc", ten: "Góc nghiêng của trục so với phương đứng", don: "°", loai: "so", min: 0, max: 60, buoc: 1, mac: 30 }],
  dung(P) {
    const r = +P.r, h = +P.h, d = h * Math.tan(P.goc * DEG), L = new Luoi(), nu = 72, O = [0, 0, 0], T = [0, d, h];
    const vong = Array.from({ length: nu }, (_, i) => [r * Math.cos(TAU * i / nu), r * Math.sin(TAU * i / nu), 0]);
    const truc = p => lerp(O, T, p[2] / h), lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    L.quat(O, vong, L.mat("Đáy (hình tròn)", { phang: true, poly: vong }), [0, 0, -1], true);
    const xq = L.mat("Mặt xung quanh", { tron: true });
    if (P.kieu === "non") {
      const id = L.luoiUV(nu, 8, (i, j) => lerp(vong[i % nu], T, j / 8), xq, p => sub(p, truc(p)), true);
      for (let i = 0; i < nu; i += 9) L.wire.push(id[i].map(k => L.v[k]));
      L.nhan.push(["S", T], ["O", O]); L.V = Math.PI * r * r * h / 3; L.ct = "V = ⅓ · π · r² · h";
    } else {
      const tren = vong.map(p => add(p, T));
      const id = L.luoiUV(nu, 4, (i, j) => lerp(vong[i % nu], tren[i % nu], j / 4), xq, p => sub(p, truc(p)), true);
      L.quat(T, tren, L.mat("Đáy trên (hình tròn)", { phang: true, poly: tren }), [0, 0, 1], true);
      L.canh.push([...tren, tren[0]]);
      for (let i = 0; i < nu; i += 9) L.wire.push(id[i].map(k => L.v[k]));
      L.nhan.push(["O", O], ["O'", T]); L.V = Math.PI * r * r * h; L.ct = "V = π · r² · h (h là khoảng cách hai đáy)";
    }
    L.canh.push([...vong, vong[0]]);
    const H = [0, d, 0]; L.phu.push([O, T], [T, H]); if (d > 1e-6) { L.nhan.push(["H", H]); L.phu.push([O, H]); L.vuong = [[H, T, O]]; }
    L.tt = "Đường cao " + (P.kieu === "non" ? "SH" : "O'H") + " = h vuông góc với mặt đáy";
    L.neo = [{ k: "tamDay", ten: "Tâm đáy O", p: O }];
    return L;
  }
};
/* ---- Các phần của mặt cầu ---- */
B.chomcau = {
  ten: P => P.kieu === "quat" ? "Quạt cầu" : "Chỏm cầu", quet: true, gocSgk: gocTruc,
  tham: [
    { k: "kieu", ten: "Kiểu", loai: "chon", mac: "chom", ds: [["chom", "Chỏm cầu"], ["quat", "Quạt cầu (chỏm + nón đỉnh I)"]], datLai: true },
    { k: "R", ten: "Bán kính mặt cầu R", loai: "so", min: 1, max: 6, buoc: .1, mac: 3 },
    { k: "h", ten: "Chiều cao chỏm h", loai: "so", min: .2, max: 11.9, buoc: .1, mac: 1.3 }, TRUC
  ],
  dung(P) {
    const L = new Luoi(), R = +P.R, hMax = 2 * R - .05, h = Math.min(+P.h, hMax);
    if (h < P.h) L.ghiChu = "Đã giới hạn h ≤ " + so1(hMax) + ".";
    const z0 = R - h, t0 = Math.acos(Math.max(-1, Math.min(1, z0 / R))), rho = R * Math.sin(t0), nt = Math.max(8, Math.round(30 * t0 / Math.PI));
    const vom = Array.from({ length: nt + 1 }, (_, i) => { const t = t0 * i / nt; return [R * Math.sin(t), R * Math.cos(t)]; });
    const doan = [{ ten: P.kieu === "quat" ? "Mặt cầu (phần chỏm)" : "Mặt chỏm cầu", pts: vom }];
    if (P.kieu === "quat") doan.push({ ten: "Mặt nón (đỉnh I)", pts: [[rho, z0], [0, 0]] });
    else doan.push({ ten: "Đáy chỏm (hình tròn)", phang: true, pts: [[rho, z0], [0, z0]] });
    const X = khoiXoay(L, { doan, quet: P.quet, truc: P.truc });
    nhanXoay(L, X, [["H", 0, z0], ["A", rho, z0, 0]]);
    if (P.kieu === "quat") { nhanXoay(L, X, [["I", 0, 0]]); L.phu.push([X.P(0, 0, 0), X.P(0, z0, 0)], [X.P(0, z0, 0), X.P(rho, z0, X.du)]); L.V = 2 / 3 * Math.PI * R * R * h; L.ct = "V = ⅔ · π · R² · h"; }
    else { nhanXoay(L, X, [["T", 0, R]]); L.phu.push([X.P(0, z0, 0), X.P(0, R, 0)], [X.P(0, z0, 0), X.P(rho, z0, X.du)]); L.V = Math.PI * h * h * (R - h / 3); L.ct = "V = π · h² · (R − h/3)"; }
    L.V *= phanQuet(P); L.tt = "Bán kính đáy r = √(h(2R − h)) ≈ " + so1(rho);
    L.neo = [{ k: "tamDay", ten: "Tâm đáy H", p: X.P(0, z0, 0) }, { k: "tamCau", ten: "Tâm mặt cầu I", p: [0, 0, 0] }];
    return L;
  }
};
B.doiCau = {
  ten: () => "Đới cầu (khối cầu giữa hai mặt phẳng song song)", quet: true, gocSgk: gocTruc,
  tham: [{ k: "R", ten: "Bán kính mặt cầu R", loai: "so", min: 1, max: 6, buoc: .1, mac: 3 },
    { k: "z1", ten: "Mặt phẳng dưới cách tâm (âm: dưới tâm)", loai: "so", min: -5.9, max: 5.8, buoc: .1, mac: -1.2 },
    { k: "z2", ten: "Mặt phẳng trên cách tâm", loai: "so", min: -5.8, max: 5.9, buoc: .1, mac: 1.8 }, TRUC],
  dung(P) {
    const R = +P.R, L = new Luoi(); let z1 = Math.max(-R + .02, Math.min(+P.z1, R - .1)), z2 = Math.min(R - .02, Math.max(+P.z2, z1 + .1));
    const r1 = Math.sqrt(R * R - z1 * z1), r2 = Math.sqrt(R * R - z2 * z2), a1 = Math.asin(z1 / R), a2 = Math.asin(z2 / R);
    const X = khoiXoay(L, { doan: [{ ten: "Đáy dưới (hình tròn)", phang: true, pts: [[0, z1], [r1, z1]] }, { ten: "Mặt đới cầu", pts: cungTron(R, a1, a2, 24) }, { ten: "Đáy trên (hình tròn)", phang: true, pts: [[r2, z2], [0, z2]] }], quet: P.quet, truc: P.truc });
    nhanXoay(L, X, [["I", 0, 0], ["H", 0, z1], ["K", 0, z2], ["A", r1, z1, 0], ["B", r2, z2, 0]]);
    L.phu.push([X.P(0, z1, 0), X.P(0, z2, 0)]);
    L.V = Math.PI * (R * R * (z2 - z1) - (z2 ** 3 - z1 ** 3) / 3) * phanQuet(P); L.ct = "V = π ∫ (R² − z²) dz trên [z₁; z₂]"; L.tt = "Bán kính hai đáy: " + so1(r1) + " và " + so1(r2);
    L.neo = [{ k: "tam", ten: "Tâm mặt cầu I", p: [0, 0, 0] }, { k: "tamDay", ten: "Tâm đáy dưới H", p: X.P(0, z1, 0) }];
    return L;
  }
};
B.muiCau = {
  ten: () => "Múi cầu (hình múi bưởi)", gocSgk: gocTruc,
  tham: [{ k: "R", ten: "Bán kính R", loai: "so", min: .5, max: 6, buoc: .1, mac: 3 }, { k: "beta", ten: "Góc nhị diện của múi", don: "°", loai: "so", min: 10, max: 350, buoc: 1, mac: 70 }, TRUC],
  dung(P) {
    const R = +P.R, be = +P.beta, L = new Luoi();
    const X = khoiXoay(L, { doan: [{ ten: "Mặt múi cầu", pts: cungTron(R, -Math.PI / 2, Math.PI / 2, 36).map(([s, r]) => [Math.max(0, s), r]) }], quet: be, truc: P.truc, tenDau: "Mặt phẳng múi thứ nhất", tenCuoi: "Mặt phẳng múi thứ hai", mauDau: null, mauCuoi: null, noiBat: false });
    L.canh.push(cung(X, R, 0));
    nhanXoay(L, X, [["O", 0, 0], ["P", 0, R], ["Q", 0, -R]]);
    L.V = be / 360 * 4 / 3 * Math.PI * R ** 3; L.ct = "V = (β / 360°) · 4/3 · π · R³"; L.tt = "Hai nửa mặt phẳng qua đường kính PQ tạo góc β = " + so1(be) + "°";
    L.neo = [{ k: "tam", ten: "Tâm O", p: [0, 0, 0] }];
    return L;
  }
};

/* ======================= NHÓM 3 — ỨNG DỤNG TÍCH PHÂN & THỰC TẾ 12 ======================= */
B.paraboloid = {
  ten: () => "Paraboloid tròn xoay", quet: true, gocSgk: gocTruc,
  tham: [{ k: "Rm", ten: "Bán kính miệng R", loai: "so", min: .5, max: 5, buoc: .1, mac: 2.4 }, { k: "H", ten: "Chiều cao H", loai: "so", min: .5, max: 8, buoc: .1, mac: 4 }, TRUC],
  dung(P) {
    const Rm = +P.Rm, H = +P.H, c = H / (Rm * Rm), L = new Luoi();
    const X = khoiXoay(L, { doan: [{ ten: "Mặt paraboloid", pts: Array.from({ length: 21 }, (_, i) => { const r = Rm * i / 20; return [r, c * r * r]; }) }, { ten: "Miệng (hình tròn)", phang: true, pts: [[Rm, H], [0, H]] }], quet: P.quet, truc: P.truc });
    nhanXoay(L, X, [["I", 0, 0], ["K", 0, H], ["A", Rm, H, 0]]);
    L.phu.push([X.P(0, 0, 0), X.P(0, H, 0)]);
    L.V = Math.PI * Rm * Rm * H / 2 * phanQuet(P); L.ct = "V = ½ · π · R² · H"; L.tt = "Mặt sinh bởi parabol z = " + so(c, 3) + "·r² quay quanh trục";
    L.neo = [{ k: "dinh", ten: "Đỉnh I của paraboloid", p: [0, 0, 0] }, { k: "tamMieng", ten: "Tâm miệng K", p: X.P(0, H, 0) }];
    return L;
  }
};
B.elipsoid = {
  ten: () => "Elipsoid tròn xoay", quet: true, gocSgk: gocTruc,
  tham: [{ k: "a", ten: "Bán trục dọc trục quay a", loai: "so", min: .5, max: 6, buoc: .1, mac: 3.2 }, { k: "b", ten: "Bán kính đường tròn xích đạo b", loai: "so", min: .5, max: 6, buoc: .1, mac: 2 }, TRUC],
  dung(P) {
    const a = +P.a, b = +P.b, L = new Luoi();
    const X = khoiXoay(L, { doan: [{ ten: "Mặt elipsoid", pts: Array.from({ length: 37 }, (_, i) => { const t = -Math.PI / 2 + Math.PI * i / 36; return [Math.max(0, b * Math.cos(t)), a * Math.sin(t)]; }), soVT: 6 }], quet: P.quet, truc: P.truc });
    L.canh.push(cung(X, b, 0)); nhanXoay(L, X, [["O", 0, 0], ["A", 0, a], ["B", b, 0, Math.PI / 2]]);
    L.phu.push([X.P(0, -a, 0), X.P(0, a, 0)]);
    L.V = 4 / 3 * Math.PI * a * b * b * phanQuet(P); L.ct = "V = 4/3 · π · a · b²"; L.tt = "Sinh bởi elip r²/b² + s²/a² = 1 quay quanh trục";
    L.neo = [{ k: "tam", ten: "Tâm O", p: [0, 0, 0] }];
    return L;
  }
};
B.hyperboloid = {
  ten: () => "Hyperboloid một tầng (tháp giải nhiệt)", quet: true, gocSgk: gocTruc,
  tham: [{ k: "a", ten: "Bán kính eo a", loai: "so", min: .3, max: 4, buoc: .1, mac: 1.4 }, { k: "c", ten: "Tham số c (độ thắt)", loai: "so", min: .3, max: 5, buoc: .1, mac: 1.6 }, { k: "H", ten: "Chiều cao H", loai: "so", min: 1, max: 9, buoc: .1, mac: 5 }, TRUC],
  dung(P) {
    const a = +P.a, c = +P.c, H = +P.H, rr = s => a * Math.sqrt(1 + s * s / (c * c)), re = rr(H / 2), L = new Luoi();
    const X = khoiXoay(L, { doan: [{ ten: "Đáy dưới (hình tròn)", phang: true, pts: [[0, -H / 2], [re, -H / 2]] }, { ten: "Mặt hyperboloid", pts: Array.from({ length: 25 }, (_, i) => { const s = -H / 2 + H * i / 24; return [rr(s), s]; }) }, { ten: "Đáy trên (hình tròn)", phang: true, pts: [[re, H / 2], [0, H / 2]] }], quet: P.quet, truc: P.truc });
    L.canh.push(cung(X, a, 0)); nhanXoay(L, X, [["O", 0, 0], ["I", 0, -H / 2], ["J", 0, H / 2]]);
    L.phu.push([X.P(0, -H / 2, 0), X.P(0, H / 2, 0)]);
    L.V = Math.PI * a * a * (H + H ** 3 / (12 * c * c)) * phanQuet(P); L.ct = "V = π ∫ a²(1 + s²/c²) ds"; L.tt = "Bán kính đáy ≈ " + so1(re) + ", đường tròn eo bán kính a vẽ đậm";
    L.neo = [{ k: "tam", ten: "Tâm eo O", p: [0, 0, 0] }, { k: "day", ten: "Tâm đáy dưới I", p: X.P(0, -H / 2, 0) }];
    return L;
  }
};
B.xuyen = {
  ten: () => "Hình xuyến (torus)", quet: true, gocSgk: gocTruc,
  tham: [{ k: "R", ten: "Bán kính đường tròn tâm R", loai: "so", min: 1, max: 6, buoc: .1, mac: 3 }, { k: "r", ten: "Bán kính ống r", loai: "so", min: .2, max: 5.5, buoc: .1, mac: 1 }, TRUC],
  dung(P) {
    const R = +P.R, L = new Luoi(); let r = +P.r; if (r > R - .05) { r = R - .05; L.ghiChu = "Bán kính ống phải nhỏ hơn R — đã lấy r = " + so1(r) + "."; }
    const X = khoiXoay(L, { doan: [{ ten: "Mặt xuyến", pts: Array.from({ length: 33 }, (_, i) => { const v = TAU * i / 32; return [R + r * Math.cos(v), r * Math.sin(v)]; }), soVT: 4 }], quet: P.quet, truc: P.truc, nu: 72 });
    L.phu.push(cung(X, R, 0)); nhanXoay(L, X, [["I", 0, 0]]);
    L.V = 2 * Math.PI * Math.PI * R * r * r * phanQuet(P); L.ct = "V = 2 · π² · R · r²"; L.tt = "Hình tròn bán kính r quay quanh trục cách tâm R";
    L.neo = [{ k: "tam", ten: "Tâm I của hình xuyến", p: [0, 0, 0] }, { k: "day", ten: "Đặt nằm trên mặt Oxy", p: X.P(0, -r, 0) }];
    return L;
  }
};
B.steinmetz = { gocSgk: () => ({ q: K.qTuGoc(32, 24) }),
  ten: () => "Khối Steinmetz (giao hai hình trụ vuông góc)",
  tham: [{ k: "r", ten: "Bán kính hai hình trụ r", loai: "so", min: .5, max: 5, buoc: .1, mac: 2.5 }],
  dung(P) {
    const r = +P.r, L = new Luoi(), nu = 48, nv = 10;
    const manh = (ten, f, ra) => { const g = L.mat(ten, { tron: true }); return L.luoiUV(nu, nv, f, g, ra, false); };
    for (const [d, sg] of [["Ox", 1], ["Ox", -1], ["Oy", 1], ["Oy", -1]]) {
      const th = i => (sg > 0 ? -Math.PI / 2 : Math.PI / 2) + Math.PI * i / nu;
      if (d === "Ox") manh("Mặt trụ trục Ox (" + (sg > 0 ? "phải" : "trái") + ")", (i, j) => { const t = th(i), c = Math.abs(Math.cos(t)) * r; return [-c + 2 * c * j / nv, r * Math.cos(t), r * Math.sin(t)]; }, p => [0, p[1], p[2]]);
      else manh("Mặt trụ trục Oy (" + (sg > 0 ? "trước" : "sau") + ")", (i, j) => { const t = th(i), c = Math.abs(Math.cos(t)) * r; return [r * Math.cos(t), -c + 2 * c * j / nv, r * Math.sin(t)]; }, p => [p[0], 0, p[2]]);
    }
    for (const s of [1, -1]) L.canh.push(Array.from({ length: 97 }, (_, i) => { const t = TAU * i / 96; return [s * r * Math.cos(t), r * Math.cos(t), r * Math.sin(t)]; }));
    L.nhan.push(["O", [0, 0, 0]]);
    L.V = 16 * r ** 3 / 3; L.ct = "V = 16r³/3 (thiết diện ngang là hình vuông cạnh 2√(r² − z²))"; L.tt = "Hai cạnh cong là hai elip nằm trong hai mặt phẳng x = ± y";
    L.neo = [{ k: "tam", ten: "Tâm O", p: [0, 0, 0] }, { k: "day", ten: "Đặt trên mặt Oxy", p: [0, 0, -r] }];
    return L;
  }
};
/* ---- Mặt yên ngựa (paraboloid hyperbolic) z = x²/a² − y²/b² ---- */
B.yenNgua = {
  ten: () => "Hình yên ngựa (paraboloid hyperbolic)", gocSgk: () => ({ q: K.qTuGoc(38, 30) }),
  tham: [{ k: "a", ten: "Hệ số a (độ mở theo Ox)", loai: "so", min: .8, max: 5, buoc: .1, mac: 2 }, { k: "b", ten: "Hệ số b (độ mở theo Oy)", loai: "so", min: .8, max: 5, buoc: .1, mac: 2 },
    { k: "X", ten: "Miền vẽ: |x| ≤ X", loai: "so", min: 1, max: 5, buoc: .1, mac: 2.5 }, { k: "Y", ten: "Miền vẽ: |y| ≤ Y", loai: "so", min: 1, max: 5, buoc: .1, mac: 2.5 }],
  dung(P) {
    const a = +P.a, b = +P.b, X = +P.X, Y = +P.Y, N = 40, z = (x, y) => x * x / (a * a) - y * y / (b * b), L = new Luoi();
    const g = L.mat("Mặt yên ngựa", { tron: true }), xy = (i, j) => [-X + 2 * X * i / N, -Y + 2 * Y * j / N];
    const id = L.luoiUV(N, N, (i, j) => { const [x, y] = xy(i, j); return [x, y, z(x, y)]; }, g, p => [-2 * p[0] / (a * a), 2 * p[1] / (b * b), 1], false);
    const v = (i, j) => L.v[id[i][j]];
    L.canh.push(Array.from({ length: N + 1 }, (_, i) => v(i, 0)), Array.from({ length: N + 1 }, (_, i) => v(i, N)), Array.from({ length: N + 1 }, (_, j) => v(0, j)), Array.from({ length: N + 1 }, (_, j) => v(N, j)));
    for (let k = 5; k < N; k += 5) { L.wire.push(Array.from({ length: N + 1 }, (_, j) => v(k, j)), Array.from({ length: N + 1 }, (_, i) => v(i, k))); }
    L.noiBat.push(Array.from({ length: N + 1 }, (_, i) => v(i, N / 2)), Array.from({ length: N + 1 }, (_, j) => v(N / 2, j)));
    L.nhan.push(["O", [0, 0, 0]]); L.haiMat = true; L.luoiLuon = true; L.khongKhoi = true;
    L.ct = "z = x²/a² − y²/b²"; L.tt = "Cắt bởi mặt phẳng y = 0: parabol quay lên; x = 0: parabol quay xuống (hai đường cam). O là điểm yên ngựa.";
    L.neo = [{ k: "goc", ten: "Điểm yên ngựa O", p: [0, 0, 0] }];
    return L;
  }
};
/* ---- Khối tròn xoay sinh bởi đồ thị (y = f(x) hoặc x = g(y)) quanh Ox hoặc Oy ---- */
const MAU_F = [
  ["sqrt(x)", 0, 4, "y = √x trên [0; 4] (SGK)", "yf"],
  ["x^2/4+0.4", 0, 3, "Cái chén: y = x²/4 + 0,4", "yf"],
  ["1.2+0.35*sin(pi*x/4)", 0, 4, "Thùng rượu", "yf"],
  ["0.7+0.45*sin(1.3*x)+0.12*x", 0, 5, "Bình hoa", "yf"],
  ["sqrt(4-x^2)", -2, 2, "Nửa đường tròn → khối cầu", "yf"],
  ["x^2", 0, 2, "Quay y = x² quanh Oy (vỏ trụ)", "yf", "y"],
  ["sqrt(y)", 0, 4, "x = √y quanh Oy (chậu)", "xg", "y"]
];
B.quayHam = {
  ten: P => "Khối tròn xoay: " + (P.kieu === "xg" ? "x = g(y)" : "y = f(x)") + " quay quanh " + (P.truc === "y" ? "Oy" : "Ox"), quet: true, gocSgk: () => ({ q: GOC_NGANG }),
  tham: [
    { k: "mau", ten: "Mẫu có sẵn", loai: "mau" },
    { k: "kieu", ten: "Dạng đồ thị", loai: "chon", mac: "yf", ds: [["yf", "y = f(x) — miền giữa đồ thị và Ox"], ["xg", "x = g(y) — miền giữa đồ thị và Oy"]] },
    { k: "f", ten: P => P.kieu === "xg" ? "Hàm số x = g(y)" : "Hàm số y = f(x)", loai: "ham", mac: "sqrt(x)" },
    { k: "a", ten: "Cận a", loai: "nhap", mac: 0 },
    { k: "b", ten: "Cận b", loai: "nhap", mac: 4 },
    { k: "truc", ten: "Trục quay", loai: "chon", mac: "x", ds: [["x", "Ox"], ["y", "Oy"]] },
    { k: "kt", ten: "Hiện miền phẳng sinh khối (viền cam)", loai: "bat", mac: true }
  ],
  dung(P) {
    const xg = P.kieu === "xg", f = bienDich(xg ? String(P.f).replace(/y/gi, "x") : P.f), a = +P.a, b = +P.b, truc = P.truc === "y" ? "y" : "x";
    if (!isFinite(a) || !isFinite(b) || !(b > a)) throw new Error("Cần hai cận thỏa a < b.");
    if (b - a > 20) throw new Error("Đoạn [a; b] quá dài (tối đa 20 đơn vị).");
    const N = 72, ts = [], fs = [];
    for (let i = 0; i <= N; i++) { const t = a + (b - a) * i / N, y = f(t);
      if (!isFinite(y)) throw new Error("Hàm không xác định tại " + (xg ? "y" : "x") + " = " + so1(t) + ".");
      if (Math.abs(y) > 25) throw new Error("Giá trị hàm quá lớn tại " + (xg ? "y" : "x") + " = " + so1(t) + ".");
      ts.push(t); fs.push(y); }
    // trục quay trùng trục "nền" của miền → phương pháp đĩa; khác → phương pháp vỏ trụ
    const dia = (truc === "x") !== xg, L = new Luoi(); let doan, V, ct;
    const M = 600, hh = (b - a) / M, simpson = g => { let s = 0; for (let i = 0; i <= M; i++) s += (i === 0 || i === M ? 1 : i % 2 ? 4 : 2) * g(a + i * hh); return s * hh / 3; };
    if (dia) {
      const pr = ts.map((t, i) => [Math.abs(fs[i]), t]), d = [];
      if (pr[0][0] > 1e-6) d.push({ ten: "Đáy tại " + (xg ? "y" : "x") + " = a", phang: true, pts: [[0, a], pr[0]] });
      d.push({ ten: "Mặt xung quanh", pts: pr, soVT: 6 });
      if (pr[N][0] > 1e-6) d.push({ ten: "Đáy tại " + (xg ? "y" : "x") + " = b", phang: true, pts: [pr[N], [0, b]] });
      doan = d; V = Math.PI * simpson(t => f(t) ** 2); ct = xg ? "V = π ∫ₐᵇ g²(y) dy" : "V = π ∫ₐᵇ f²(x) dx";
    } else {
      if (a < 0 && b > 0) throw new Error("Miền nằm hai phía trục quay — hãy chọn đoạn [a; b] cùng dấu.");
      if (fs.some(y => y < -1e-9) && fs.some(y => y > 1e-9)) throw new Error("Hàm đổi dấu trên [a; b] — hãy chọn đoạn hàm không đổi dấu.");
      const ra = Math.abs(a), rb = Math.abs(b), Fa = fs[0], Fb = fs[N];
      doan = [{ ten: "Đáy (hình vành khăn)", phang: true, pts: [[ra, 0], [rb, 0]] }, { ten: "Mặt trụ ngoài", pts: [[rb, 0], [rb, Fb]] },
        { ten: "Mặt cong (đồ thị quay)", pts: ts.map((t, i) => [Math.abs(t), fs[i]]).reverse(), soVT: 6 }, { ten: "Mặt trụ trong", pts: [[ra, Fa], [ra, 0]] }];
      V = 2 * Math.PI * Math.abs(simpson(t => Math.abs(t) * f(t))); ct = xg ? "V = 2π ∫ₐᵇ |y| · |g(y)| dy (vỏ trụ)" : "V = 2π ∫ₐᵇ |x| · |f(x)| dx (vỏ trụ)";
    }
    const X = khoiXoay(L, { doan, quet: P.quet, truc, vienSinh: !!P.kt, vienKin: true, nu: 64 });
    const sMin = Math.min(...doan.flatMap(d => d.pts.map(p => p[1]))), sMax = Math.max(...doan.flatMap(d => d.pts.map(p => p[1])));
    L.phu.push([X.P(0, Math.min(0, sMin) - .5, 0), X.P(0, Math.max(0, sMax) + .5, 0)]);
    L.nhan.push(["O", [0, 0, 0]]);
    L.V = V * phanQuet(P); L.ct = ct; L.tt = "V ≈ " + so(V / Math.PI, 3) + " · π" + (phanQuet(P) < 1 ? " (khi quét đủ 360°)" : "");
    L.neo = [{ k: "goc", ten: "Gốc O của hệ trục đồ thị", p: [0, 0, 0] }];
    return L;
  }
};
/* ---- Vật thể thực tế (tròn xoay): trống đồng, thùng rượu, chai, bình ---- */
function noiSuy(ds, n) {
  const out = [];
  for (let i = 0; i <= n; i++) { const s = i / n; let k = 0; while (k < ds.length - 2 && s > ds[k + 1][0]) k++;
    const p0 = ds[Math.max(0, k - 1)], p1 = ds[k], p2 = ds[k + 1], p3 = ds[Math.min(ds.length - 1, k + 2)], w = (p2[0] - p1[0]) || 1, t = (s - p1[0]) / w;
    const m1 = (p2[1] - p0[1]) / ((p2[0] - p0[0]) || 1) * w, m2 = (p3[1] - p1[1]) / ((p3[0] - p1[0]) || 1) * w, t2 = t * t, t3 = t2 * t;
    out.push([Math.max(.02, (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2), s]); }
  return out;
}
const VAT = {
  trongDong: { ten: "Trống đồng", diem: [[0, 1], [.06, .97], [.38, .74], [.6, .74], [.76, .9], [.9, .96], [.97, .92], [1, 1.02]], H: 3.2, R: 2.6 },
  thungRuou: { ten: "Thùng rượu", diem: [[0, .8], [.25, .95], [.5, 1], [.75, .95], [1, .8]], H: 4.4, R: 1.8 },
  chai: { ten: "Chai lọ", diem: [[0, .96], [.03, 1], [.5, 1], [.6, .9], [.7, .48], [.77, .34], [.94, .34], [.97, .4], [1, .4]], H: 5.2, R: 1.3 },
  binhHoa: { ten: "Bình hoa", diem: [[0, .55], [.1, .8], [.35, 1], [.6, .7], [.8, .45], [.93, .5], [1, .62]], H: 4.8, R: 1.6 }
};
B.vatThe = {
  ten: P => "Vật thể tròn xoay: " + VAT[P.kieu].ten.toLowerCase(), quet: true, gocSgk: gocTruc,
  tham: [{ k: "kieu", ten: "Mẫu thực tế", loai: "chon", mac: "trongDong", ds: Object.entries(VAT).map(([k, v]) => [k, v.ten]), datLai: true },
    { k: "R", ten: "Bán kính lớn nhất R", loai: "so", min: .5, max: 5, buoc: .1, mac: 2.2 }, { k: "H", ten: "Chiều cao H", loai: "so", min: 1, max: 9, buoc: .1, mac: 4 }, TRUC],
  dung(P) {
    const v = VAT[P.kieu] || VAT.trongDong, R = +P.R, H = +P.H, pr = noiSuy(v.diem, 48).map(([r, s]) => [r * R, s * H]), L = new Luoi();
    const X = khoiXoay(L, { doan: [{ ten: "Đáy dưới", phang: true, pts: [[0, 0], pr[0]] }, { ten: "Thân " + v.ten.toLowerCase(), pts: pr, soVT: 7 }, { ten: "Mặt trên", phang: true, pts: [pr[pr.length - 1], [0, H]] }], quet: P.quet, truc: P.truc });
    let s = 0; for (let i = 0; i < pr.length - 1; i++) s += Math.PI * (pr[i][0] ** 2 + pr[i][0] * pr[i + 1][0] + pr[i + 1][0] ** 2) / 3 * (pr[i + 1][1] - pr[i][1]);
    nhanXoay(L, X, [["O", 0, 0], ["O'", 0, H]]); L.phu.push([X.P(0, 0, 0), X.P(0, H, 0)]);
    L.V = s * phanQuet(P); L.ct = "V = π ∫₀ᴴ r²(z) dz = ∫ S(z) dz"; L.tt = "Thiết diện vuông góc trục tại độ cao z là hình tròn bán kính r(z)";
    L.neo = [{ k: "tamDay", ten: "Tâm đáy O", p: [0, 0, 0] }];
    return L;
  }
};
/* ---- Vật thể biết diện tích thiết diện S(x) ---- */
B.thietDien = {
  ten: P => ({ vuongTron: "Vật thể đáy tròn, thiết diện ⊥ Ox là hình vuông", tgTron: "Vật thể đáy tròn, thiết diện ⊥ Ox là tam giác đều", maiVom: "Mái vòm: thiết diện ngang là hình vuông" })[P.kieu],
  tham: [{ k: "kieu", ten: "Vật thể", loai: "chon", mac: "vuongTron", ds: [["vuongTron", "Đáy hình tròn, S(x) là hình vuông"], ["tgTron", "Đáy hình tròn, S(x) là tam giác đều"], ["maiVom", "Mái vòm trên đáy hình vuông"]], datLai: true },
    { k: "R", ten: "Bán kính R", loai: "so", min: .5, max: 5, buoc: .1, mac: 2.5 },
    { k: "xc", ten: P => P.kieu === "maiVom" ? "Vị trí thiết diện (z / R)" : "Vị trí thiết diện (x / R)", loai: "so", min: -.95, max: .95, buoc: .01, mac: .35 }],
  dung(P) {
    const R = +P.R, L = new Luoi(), N = 56, nv = 6, w = x => Math.sqrt(Math.max(0, R * R - x * x));
    if (P.kieu === "maiVom") {
      const zz = i => R * Math.sin(Math.PI / 2 * i / N), day = L.mat("Đáy (hình vuông)", { phang: true });
      const vuong = [[-R, -R, 0], [R, -R, 0], [R, R, 0], [-R, R, 0]]; L.g[day].poly = vuong; L.daGiac(vuong, day, [0, 0, -1]);
      const mat = (ten, f, ra) => L.luoiUV(N, nv, f, L.mat(ten, { tron: true }), ra, false);
      mat("Mặt vòm trước", (i, j) => { const z = zz(i), c = w(z); return [c, -c + 2 * c * j / nv, z]; }, [1, 0, .3]);
      mat("Mặt vòm sau", (i, j) => { const z = zz(i), c = w(z); return [-c, -c + 2 * c * j / nv, z]; }, [-1, 0, .3]);
      mat("Mặt vòm trái", (i, j) => { const z = zz(i), c = w(z); return [-c + 2 * c * j / nv, -c, z]; }, [0, -1, .3]);
      mat("Mặt vòm phải", (i, j) => { const z = zz(i), c = w(z); return [-c + 2 * c * j / nv, c, z]; }, [0, 1, .3]);
      for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) L.canh.push(Array.from({ length: N + 1 }, (_, i) => { const z = zz(i), c = w(z); return [sx * c, sy * c, z]; }));
      L.canh.push([...vuong, vuong[0]]);
      const zc = Math.abs(+P.xc) * R, c = w(zc); L.noiBat.push([[c, c, zc], [c, -c, zc], [-c, -c, zc], [-c, c, zc], [c, c, zc]]);
      L.V = 8 * R ** 3 / 3; L.ct = "V = ∫₀ᴿ S(z) dz = ∫₀ᴿ 4(R² − z²) dz = 8R³/3"; L.tt = "Thiết diện tại độ cao z = " + so1(zc) + ": hình vuông cạnh " + so1(2 * c) + ", S = " + so1(4 * c * c);
    } else {
      const xs = Array.from({ length: N + 1 }, (_, i) => -R * Math.cos(Math.PI * i / N)), tg = P.kieu === "tgTron";
      const vong = Array.from({ length: 96 }, (_, i) => [R * Math.cos(TAU * i / 96), R * Math.sin(TAU * i / 96), 0]);
      const day = L.mat("Đáy (hình tròn)", { phang: true, poly: vong }); L.daGiac(vong, day, [0, 0, -1]); L.canh.push([...vong, vong[0]]);
      const mat = (ten, f, ra) => L.luoiUV(N, nv, f, L.mat(ten, { tron: true }), ra, false);
      if (!tg) {
        mat("Mặt bên trái", (i, j) => { const x = xs[i], c = w(x); return [x, -c, 2 * c * j / nv]; }, p => [p[0], p[1], 0]);
        mat("Mặt bên phải", (i, j) => { const x = xs[i], c = w(x); return [x, c, 2 * c * j / nv]; }, p => [p[0], p[1], 0]);
        mat("Mặt trên", (i, j) => { const x = xs[i], c = w(x); return [x, -c + 2 * c * j / nv, 2 * c]; }, p => [p[0] * .5, 0, 1]);
        for (const s of [1, -1]) L.canh.push(xs.map(x => [x, s * w(x), 2 * w(x)]));
        L.V = 16 * R ** 3 / 3; L.ct = "V = ∫₋ᴿᴿ S(x) dx = ∫ (2√(R² − x²))² dx = 16R³/3";
      } else {
        const k = Math.sqrt(3);
        mat("Mặt nghiêng trái", (i, j) => { const x = xs[i], c = w(x), t = j / nv; return [x, -c + c * t, k * c * t]; }, p => [p[0] * .3, -1, .6]);
        mat("Mặt nghiêng phải", (i, j) => { const x = xs[i], c = w(x), t = j / nv; return [x, c - c * t, k * c * t]; }, p => [p[0] * .3, 1, .6]);
        L.canh.push(xs.map(x => [x, 0, k * w(x)]));
        L.V = 4 * Math.sqrt(3) * R ** 3 / 3; L.ct = "V = ∫ (√3/4)(2√(R² − x²))² dx = 4√3·R³/3";
      }
      const xc = +P.xc * R, c = w(xc);
      L.noiBat.push(tg ? [[xc, -c, 0], [xc, c, 0], [xc, 0, Math.sqrt(3) * c], [xc, -c, 0]] : [[xc, -c, 0], [xc, c, 0], [xc, c, 2 * c], [xc, -c, 2 * c], [xc, -c, 0]]);
      L.tt = "Thiết diện tại x = " + so1(xc) + ": cạnh 2√(R² − x²) = " + so1(2 * c) + ", S(x) = " + so1(tg ? Math.sqrt(3) * c * c : 4 * c * c);
    }
    L.nhan.push(["O", [0, 0, 0]]); L.phu.push([[-R - .4, 0, 0], [R + .4, 0, 0]]);
    L.neo = [{ k: "tam", ten: "Tâm đáy O", p: [0, 0, 0] }];
    return L;
  }
};

/* ======================= DANH MỤC ======================= */
const ICO = {
  chop: '<path d="M12 3 4 18h16z"/><path d="M12 3l2 15" stroke-dasharray="2 2" opacity=".6"/>',
  chopcut: '<path d="M8 6h8l4 12H4z"/>',
  langtru: '<path d="M5 8h10l4-3H9zM5 8v11h10V8M19 5v11l-4 3"/>',
  hop: '<path d="M4 8h11v12H4zM4 8l4-4h11l-4 4M19 4v12l-4 4"/>',
  deu: '<path d="M12 2 20 12 12 22 4 12z"/><path d="M4 12h16M12 2l3 10-3 10"/>',
  morong: '<path d="M4 18 9 6h6l5 12z"/><path d="M9 6l3 12 3-12"/>',
  tru: '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6"/>',
  non: '<path d="M12 3 5 18c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5z"/>',
  trucut: '<path d="M5 8l14-4v13c0 1.4-3.1 2.5-7 2.5S5 18.4 5 17z"/><ellipse cx="12" cy="17" rx="7" ry="2.5" opacity=".6"/>',
  cau: '<circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="8" ry="3"/>',
  xuyen: '<ellipse cx="12" cy="12" rx="9" ry="5.5"/><path d="M8.5 11.5c2-1.6 5-1.6 7 0M9.5 11c1.5 1 3.5 1 5 0"/>',
  ham: '<path d="M3 19h18M4 17c4 0 5-10 9-10s4 6 8 6"/>',
  vat: '<path d="M8 3h8M9 3v4c-3 1-4 4-4 7 0 4 3 7 7 7s7-3 7-7c0-3-1-6-4-7V3"/>'
};
const MUC = [
  // —— Nhóm 1: Khối đa diện
  ["tdDeu", "dadien", "Hình chóp", "Tứ diện đều", "chop", "tuDien", { kieu: "deu" }, "tu dien deu"],
  ["tdVuong", "dadien", "Hình chóp", "Tứ diện vuông OABC", "chop", "tuDien", { kieu: "vuong", a: 3, b: 4, c: 3.5 }, "tu dien vuong goc"],
  ["tdGanDeu", "dadien", "Hình chóp", "Tứ diện gần đều", "chop", "tuDien", { kieu: "gan" }, "tu dien gan deu"],
  ["chop3deu", "dadien", "Hình chóp", "Hình chóp tam giác đều", "chop", "chop", { day: "tgdeu", chan: "tam", h: 4.5 }, "chop deu tam giac s.abc"],
  ["chop3", "dadien", "Hình chóp", "Hình chóp tam giác S.ABC", "chop", "chop", { day: "tgvuongB", chan: "A", a: 3.5, b: 4 }, "chop tam giac sa vuong goc"],
  ["chop4", "dadien", "Hình chóp", "Hình chóp tứ giác S.ABCD", "chop", "chop", { day: "tuGiac", chan: "lech", a: 4.4 }, "chop tu giac bat ky s.abcd"],
  ["chopSA", "dadien", "Hình chóp", "Hình chóp S.ABCD có SA ⊥ đáy", "chop", "chop", { day: "binhhanh", chan: "A", a: 4, b: 3.6, goc: 70, h: 4.5 }, "chop sa vuong goc day binh hanh"],
  ["chopMatBen", "dadien", "Hình chóp", "Hình chóp có mặt bên vuông góc đáy", "chop", "chop", { day: "vuong", chan: "trungAB", a: 4, h: 3.5 }, "chop mat ben vuong goc day sab"],
  ["chop4deu", "dadien", "Hình chóp", "Hình chóp tứ giác đều", "chop", "chop", { day: "vuong", chan: "tam" }, "chop deu"],
  ["chop5", "dadien", "Hình chóp", "Hình chóp ngũ giác đều", "chop", "chop", { day: "ngudeu", chan: "tam", a: 3 }, "chop ngu giac"],
  ["chop6", "dadien", "Hình chóp", "Hình chóp lục giác đều", "chop", "chop", { day: "lucdeu", chan: "tam", a: 2.6 }, "chop luc giac"],
  ["chopN", "dadien", "Hình chóp", "Hình chóp đa giác đều n cạnh", "chop", "chop", { day: "deuN", n: 8, chan: "tam", a: 2 }, "chop n giac da giac"],
  ["chopCut3", "dadien", "Hình chóp cụt", "Chóp cụt tam giác", "chopcut", "chopCut", { day: "tgdeu", a: 4.5 }, "chop cut tam giac"],
  ["chopCut4", "dadien", "Hình chóp cụt", "Chóp cụt tứ giác", "chopcut", "chopCut", { day: "chunhat", a: 4.5, b: 3.5 }, "chop cut tu giac"],
  ["chopCutDeu", "dadien", "Hình chóp cụt", "Chóp cụt đều (lục giác đều)", "chopcut", "chopCut", { day: "lucdeu", a: 2.5, k: .55 }, "chop cut deu"],
  ["ltXien3", "dadien", "Hình lăng trụ", "Lăng trụ xiên tam giác", "langtru", "langTru", { day: "tgdeu", xien: "tam", a: 4 }, "lang tru xien tam giac"],
  ["ltXien4", "dadien", "Hình lăng trụ", "Lăng trụ xiên tứ giác", "langtru", "langTru", { day: "chunhat", xien: "tam", a: 3.5, b: 3 }, "lang tru xien tu giac"],
  ["ltDung", "dadien", "Hình lăng trụ", "Lăng trụ đứng (tam giác vuông)", "langtru", "langTru", { day: "tgvuongB", a: 3.5, b: 4 }, "lang tru dung"],
  ["ltDeu3", "dadien", "Hình lăng trụ", "Lăng trụ tam giác đều", "langtru", "langTru", { day: "tgdeu", a: 4 }, "lang tru deu tam giac"],
  ["ltDeu4", "dadien", "Hình lăng trụ", "Lăng trụ tứ giác đều", "langtru", "langTru", { day: "vuong", a: 3, h: 5 }, "lang tru deu tu giac"],
  ["ltDeu6", "dadien", "Hình lăng trụ", "Lăng trụ lục giác đều", "langtru", "langTru", { day: "lucdeu", a: 2, h: 4 }, "lang tru deu luc giac"],
  ["hopXien", "dadien", "Hình hộp", "Hình hộp xiên", "hop", "hop", { day: "binhhanh", xien: "trung", a: 3.5, b: 3 }, "hop xien"],
  ["hopDung", "dadien", "Hình hộp", "Hình hộp đứng", "hop", "hop", { day: "binhhanh", a: 3.5, b: 3 }, "hop dung"],
  ["hopCN", "dadien", "Hình hộp", "Hình hộp chữ nhật", "hop", "hop", { day: "chunhat", a: 4, b: 3, h: 2.6 }, "hop chu nhat"],
  ["lapPhuong", "dadien", "Hình hộp", "Hình lập phương", "hop", "lapPhuong", {}, "lap phuong"],
  ["dd4", "dadien", "5 khối đa diện đều", "Tứ diện đều (4 mặt)", "deu", "platon", { loaiN: "4", a: 4 }, "platon tu dien deu"],
  ["dd6", "dadien", "5 khối đa diện đều", "Lập phương (6 mặt)", "deu", "platon", { loaiN: "6", a: 3.5 }, "platon lap phuong"],
  ["batdien", "dadien", "5 khối đa diện đều", "Bát diện đều (8 mặt)", "deu", "platon", { loaiN: "8", a: 4 }, "bat dien deu 8 mat platon"],
  ["dd12", "dadien", "5 khối đa diện đều", "Mười hai mặt đều (12 mặt)", "deu", "platon", { loaiN: "12", a: 2 }, "platon muoi hai mat dodecahedron"],
  ["dd20", "dadien", "5 khối đa diện đều", "Hai mươi mặt đều (20 mặt)", "deu", "platon", { loaiN: "20", a: 2.6 }, "platon hai muoi mat icosahedron"],
  ["ltCut", "dadien", "Đa diện mở rộng & cắt vát", "Lăng trụ cụt (cắt chéo)", "morong", "ltCut", {}, "lang tru cut cat cheo"],
  ["nem", "dadien", "Đa diện mở rộng & cắt vát", "Khối nêm, mái nhà", "morong", "nem", {}, "nem mai nha prismatoid"],
  ["songChop", "dadien", "Đa diện mở rộng & cắt vát", "Song chóp (hai chóp chung đáy)", "morong", "songChop", {}, "song chop bipyramid"],
  ["chuL", "dadien", "Đa diện mở rộng & cắt vát", "Đa diện lõm: khối chữ L", "morong", "daLom", { kieu: "chuL" }, "da dien lom chu l"],
  ["khe", "dadien", "Đa diện mở rộng & cắt vát", "Đa diện lõm: khối có khe rãnh", "morong", "daLom", { kieu: "khe", a: 5, b: 4, c: 1.4, e: 1.4, h: 2.6 }, "da dien lom khe ranh khuyet"],
  ["sao", "dadien", "Đa diện mở rộng & cắt vát", "Đa diện sao tám cánh", "morong", "daLom", { kieu: "sao", a: 3 }, "da dien sao stella"],
  ["bong", "dadien", "Khối bán đều (Archimedes)", "Quả bóng đá 32 mặt", "deu", "banDeu", { kieu: "bong" }, "qua bong da archimedes 32 mat"],
  ["lpCut", "dadien", "Khối bán đều (Archimedes)", "Lập phương cụt", "deu", "banDeu", { kieu: "lpCut", a: 1.4 }, "lap phuong cut archimedes"],
  ["bdCut", "dadien", "Khối bán đều (Archimedes)", "Bát diện cụt", "deu", "banDeu", { kieu: "bdCut", a: 1.4 }, "bat dien cut archimedes"],
  // —— Nhóm 2: Khối tròn xoay
  ["tru", "tronxoay", "Trụ, nón, cầu", "Hình trụ", "tru", "tru", {}, "tru tron"],
  ["non", "tronxoay", "Trụ, nón, cầu", "Hình nón", "non", "non", {}, "non tron"],
  ["nonCut", "tronxoay", "Trụ, nón, cầu", "Hình nón cụt", "non", "nonCut", {}, "non cut"],
  ["cau", "tronxoay", "Trụ, nón, cầu", "Mặt cầu, khối cầu", "cau", "cau", {}, "mat cau khoi cau"],
  ["trucut", "tronxoay", "Trụ cắt xiên", "Hình trụ cụt", "trucut", "trucut", { kieu: "cut", goc: 25 }, "tru cut mat cat xien"],
  ["mongtru", "tronxoay", "Trụ cắt xiên", "Móng trụ", "trucut", "trucut", { kieu: "mong", goc: 45 }, "mong tru"],
  ["truXien", "tronxoay", "Trụ xiên, nón xiên", "Hình trụ xiên", "tru", "xien", { kieu: "tru" }, "tru xien"],
  ["nonXien", "tronxoay", "Trụ xiên, nón xiên", "Hình nón xiên", "non", "xien", { kieu: "non", goc: 25 }, "non xien"],
  ["chomcau", "tronxoay", "Các phần của mặt cầu", "Chỏm cầu", "cau", "chomcau", { kieu: "chom" }, "chom cau"],
  ["doiCau", "tronxoay", "Các phần của mặt cầu", "Đới cầu", "cau", "doiCau", {}, "doi cau"],
  ["quatcau", "tronxoay", "Các phần của mặt cầu", "Quạt cầu", "cau", "chomcau", { kieu: "quat", h: 1.6 }, "quat cau"],
  ["muiCau", "tronxoay", "Các phần của mặt cầu", "Múi cầu", "cau", "muiCau", {}, "mui cau mui buoi"],
  // —— Nhóm 3: Ứng dụng tích phân & thực tế 12
  ["paraboloid", "ungdung", "Mặt bậc hai & xuyến", "Paraboloid tròn xoay", "cau", "paraboloid", {}, "paraboloid chao den chao parabol"],
  ["elipsoid", "ungdung", "Mặt bậc hai & xuyến", "Elipsoid tròn xoay", "cau", "elipsoid", {}, "elipsoid ellipsoid qua bong bau duc"],
  ["hyperboloid", "ungdung", "Mặt bậc hai & xuyến", "Hyperboloid một tầng", "tru", "hyperboloid", {}, "hyperboloid thap giai nhiet"],
  ["xuyen", "ungdung", "Mặt bậc hai & xuyến", "Hình xuyến (torus)", "xuyen", "xuyen", {}, "xuyen torus phao banh donut"],
  ["steinmetz", "ungdung", "Mặt bậc hai & xuyến", "Khối Steinmetz (giao hai trụ)", "tru", "steinmetz", {}, "steinmetz giao hai hinh tru"],
  ["yenNgua", "ungdung", "Mặt bậc hai & xuyến", "Hình yên ngựa (paraboloid hyperbolic)", "ham", "yenNgua", {}, "yen ngua paraboloid hyperbolic mat cong"],
  ["quayHam", "ungdung", "Khối tạo bởi đồ thị", "Quay đồ thị quanh Ox / Oy", "ham", "quayHam", {}, "tich phan the tich quay quanh ox oy ham so y = f(x) x = g(y)"],
  ["vatThe", "ungdung", "Khối tạo bởi đồ thị", "Vật thực tế: trống đồng, thùng, chai", "vat", "vatThe", {}, "trong dong thung ruou chai lo binh hoa thuc te"],
  ["thietDien", "ungdung", "Khối tạo bởi đồ thị", "Thiết diện S(x): mái vòm, đáy tròn", "ham", "thietDien", {}, "thiet dien s(x) mai vom"]
];
K.dangKy({ B, MUC, ICO, MAU_F });
})();
