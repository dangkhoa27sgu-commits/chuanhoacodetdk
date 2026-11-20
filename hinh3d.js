/* ===== hinh3d.js — KMath · tab "Hình 3D" (menu Vẽ hình TikZ, mục 4) + bảng "◈ Khối 3D" trong tab Tạo video.
   Cần hinh3d-loi.js nạp trước. Lộ ra window.KHinh3D.khoiDongTab() (app.js gọi khi mở tab).
   Mọi id/class có tiền tố h3 để không đụng giao diện khác. ===== */
(() => {
"use strict";
const K = window.KHinh3D; if (!K) return;
const { MUC, MUC_ID, TEN_NHOM, B, ICO, MAU_F, GOC, MAU, so, boDau, qTuGoc, qMul, qAxis, qNorm, qToMat, slerp, dot, len } = K;
const $ = id => document.getElementById("h3_" + id);
const giamDong = matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const DEG = Math.PI / 180;

/* ================= Trạng thái ================= */
const st = {
  id: "chop4", nhom: "dadien", tim: "", P: {}, PTheo: {}, mauTheo: {}, hoanTac: {},
  neo: "tamDay", off: [0, 0, 0], oxyz: true, luoiOxy: false, che: "dac", khuat: true, nhan: true, phu: true, luoiMat: false, giay: false,
  mauHT: "#5EEBFF", tay: false, doMo: .45, but: false, hover: -1, loi: "", frame: null, moT: 0, diemHien: {}, keoGan: null
};
const cam = { q: qTuGoc(...GOC.sgk), zoom: 60, px: 0, py: 0, anim: null, vx: 0, vy: 0 };
let canh = null, daDung = false, cv, ctx, sk, dpr = 1, choVe = false, moAnim = null;
const mauHT = () => st.mauTheo[st.id] || (st.mauTheo[st.id] = {});
const layDiem = () => canh ? K.giaiDiem(canh, st.diemHien[st.id]) : [];

/* ================= Giao diện ================= */
const SVG = (p, w) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.6) + '" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + p + "</svg>";
const KHUNG = `
<div class="vt3 h3">
  <header class="vt3Dau"><div class="vt3Ten"><h2>Hình 3D</h2></div></header>
  <div class="h3Vung">
    <aside class="h3Khoi h3Chon" aria-label="Chọn hình">
      <div class="h3Tim">${SVG('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 2)}
        <input id="h3_tim" type="search" placeholder="Hình chóp, hình trụ,…" autocomplete="off" aria-label="Tìm hình"></div>
      <div class="h3Seg h3NhomTab" role="tablist" id="h3_nhomTab" aria-label="Nhóm hình">
        <button type="button" role="tab" data-nhom="dadien" aria-selected="true">Đa diện</button>
        <button type="button" role="tab" data-nhom="tronxoay" aria-selected="false">Tròn xoay</button>
        <button type="button" role="tab" data-nhom="ungdung" aria-selected="false">Ứng dụng 12</button>
      </div>
      <div class="h3Ds" id="h3_dsHinh"></div>
      <p class="h3ChuThich" id="h3_chuThich"></p>
    </aside>
    <section class="h3Khoi h3San" id="h3_san" aria-label="Khung vẽ 3D">
      <canvas id="h3_cv" tabindex="0" aria-label="Hình 3D. Kéo để xoay, Shift + kéo để dời, cuộn để phóng to, phím mũi tên để xoay."></canvas>
      <div class="h3Loi" id="h3_loiHinh" hidden></div>
      <div class="h3Hud h3HudTren">
        <div class="h3HudTen"><b id="h3_tenHinh"></b><span id="h3_tomTat"></span></div>
        <div class="h3GocNhin" role="group" aria-label="Góc nhìn">
          <button type="button" data-goc="sgk" class="dang">Góc chuẩn SGK</button><button type="button" data-goc="truoc">Mặt trước</button><button type="button" data-goc="tren">Từ trên xuống</button><button type="button" data-goc="nghieng">Góc nghiêng 3D</button><button type="button" data-goc="datlai" title="Đặt lại góc nhìn và khung hình">Đặt lại</button>
        </div>
      </div>
      <div class="h3Hud h3HudDuoi">
        <div class="h3GoiY" id="h3_goiY">Kéo: xoay 360° · Shift / chuột phải: dời · Cuộn, chụm: phóng to · Kéo đỉnh S: nâng hạ</div>
        <div class="h3MoPhang" id="h3_moPhang" hidden>
          <button type="button" id="h3_nMoChay" aria-label="Mở trải phẳng" title="Mở trải phẳng"><svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" id="h3_icoMo" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></button>
          <label for="h3_oMo">Trải phẳng</label><input type="range" id="h3_oMo" min="0" max="100" step="1" value="0"><output id="h3_vMo" for="h3_oMo">0%</output>
        </div>
        <div class="h3Chip" id="h3_chipMat" hidden></div>
        <div class="h3Zoom"><button type="button" id="h3_nOxyz" class="h3NutOxyz" aria-pressed="true" title="Ẩn / hiện hệ trục Oxyz">Oxyz</button><button type="button" id="h3_phongTo" aria-label="Phóng to">+</button><button type="button" id="h3_thuNho" aria-label="Thu nhỏ">−</button></div>
      </div>
    </section>
    <aside class="h3Khoi h3Bang" aria-label="Bảng điều khiển">
      <div class="h3Seg h3BangTab" role="tablist" id="h3_bangTab">
        <button type="button" role="tab" data-th="thamSo" aria-selected="true">Tham số</button><button type="button" role="tab" data-th="oxyz" aria-selected="false">Oxyz</button><button type="button" role="tab" data-th="toMau" aria-selected="false">Tô màu</button><button type="button" role="tab" data-th="xuat" aria-selected="false">Hiển thị &amp; Xuất</button>
      </div>
      <div class="h3Than">
        <section data-th="thamSo"><div id="h3_dsThamSo" class="h3Truong" style="gap:12px"></div><div class="h3TheTich" id="h3_theTich"></div></section>
        <section data-th="oxyz" hidden>
          <label class="h3Bat"><input type="checkbox" id="h3_oOxyz" checked><span>Hiện hệ trục Oxyz</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oLuoi"><span>Lưới mặt phẳng Oxy (ô đơn vị)</span></label>
          <p class="h3Ghi">Hệ trục tay phải, <b>Oz hướng lên</b> theo quy ước SGK. Phần trục nằm trong khối tự vẽ nét đứt.</p>
          <h3>Gắn gốc O vào</h3><div id="h3_dsNeo" class="h3DsNeo" role="radiogroup" aria-label="Vị trí gốc O"></div>
          <div class="h3ToaDo"><label>x₀<input type="number" id="h3_x0" step="0.5" value="0"></label><label>y₀<input type="number" id="h3_y0" step="0.5" value="0"></label><label>z₀<input type="number" id="h3_z0" step="0.5" value="0"></label></div>
          <h3>Toạ độ điểm</h3>
          <div class="h3HangNhap"><input type="text" id="h3_oDiem" list="h3_dsTenDiem" placeholder="Tên điểm (vd: C) hoặc M(1; 2; 3)" autocomplete="off" aria-label="Nhập tên điểm hoặc điểm mới"><button type="button" class="h3Nut" id="h3_nDiem">Hiện</button></div>
          <datalist id="h3_dsTenDiem"></datalist>
          <p class="h3LoiMuc" id="h3_loiDiem" role="alert" hidden></p>
          <div class="h3DsDiem" id="h3_dsDiemHien"></div>
          <p class="h3Ghi" id="h3_ghiMo" hidden>Đang trải phẳng: vị trí điểm theo hình đang mở; bảng dưới là toạ độ khi khối kín.</p>
          <details class="h3BangDiem" open><summary>Toạ độ các điểm trên hình <button type="button" class="h3NutNho" id="h3_nXoaDiem">Bỏ đánh dấu</button></summary><div id="h3_bangDiem"></div></details>
        </section>
        <section data-th="toMau" hidden>
          <label class="h3Bat"><input type="checkbox" id="h3_oBut"><span><b>Bút tô</b>: bấm thẳng vào một mặt trên hình để tô (kéo vẫn xoay bình thường)</span></label>
          <div class="h3OMau" id="h3_oMau" role="group" aria-label="Chọn màu"></div>
          <div class="h3Truong"><div class="h3DongNhan"><label for="h3_oDoMo">Độ đậm màu</label><output id="h3_vDoMo">45%</output></div><input type="range" id="h3_oDoMo" min="10" max="100" step="5" value="45"></div>
          <h3>Các mặt của khối</h3><div id="h3_dsMat" class="h3DsMat"></div>
          <div class="h3HangNut"><button type="button" class="h3Nut" id="h3_nHoan">Hoàn tác</button><button type="button" class="h3Nut" id="h3_nXoaMau">Xóa hết màu</button></div>
          <p class="h3Ghi">Mặt cong được gom thành mặt logic (đáy, mặt xung quanh, mặt cắt…), bấm một lần là tô cả mặt.</p>
        </section>
        <section data-th="xuat" hidden>
          <h3>Chế độ hiển thị</h3>
          <div class="h3Seg" id="h3_oChe" role="group" aria-label="Chế độ hiển thị"><button type="button" data-che="dac" aria-pressed="true">Đặc</button><button type="button" data-che="trong" aria-pressed="false">Trong suốt</button><button type="button" data-che="khung" aria-pressed="false">Khung dây</button></div>
          <label class="h3Bat"><input type="checkbox" id="h3_oKhuat" checked><span>Nét khuất vẽ nét đứt (chuẩn SGK)</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oNhan" checked><span>Nhãn đỉnh, tên điểm</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oPhu" checked><span>Đường phụ (đường cao, tâm, đường chéo)</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oLuoiMat"><span>Đường lưới trên mặt cong</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oGiay"><span>Xem trên nền giấy in (nền trắng, nét đen)</span></label>
          <h3>Xuất</h3>
          <button type="button" class="h3NutChinh" id="h3_nTikz">Tạo mã TikZ từ góc nhìn này</button>
          <textarea class="h3Ma" id="h3_maTikz" readonly spellcheck="false" aria-label="Mã TikZ"></textarea>
          <div class="h3HangNut"><button type="button" class="h3Nut" id="h3_nCopy">Copy mã TikZ</button><button type="button" class="h3Nut" id="h3_nPng">Tải PNG nền trong suốt</button><span class="h3TtMa" id="h3_ttMa"></span></div>
          <button type="button" class="h3Nut h3NutVideo" id="h3_nVideo">${SVG('<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2.5v9L17 14"/>', 1.8)}Đưa hình này vào video (xoay + trải phẳng)</button>
          <p class="h3Ghi">TikZ thuần cho pdflatex: nét thấy liền, nét khuất <code>dashed</code>, toạ độ dấu chấm, đỉnh và nhãn bằng <code>\\foreach</code>, mặt tô bằng <code>\\fill</code>.</p>
        </section>
      </div>
    </aside>
  </div>
</div>
<div class="h3Bao" id="h3_bao" role="status" hidden></div>`;

let baoHen = 0;
function bao(t) { let b = $("bao"); if (!b) { b = document.createElement("div"); b.className = "h3Bao"; b.id = "h3_bao"; b.setAttribute("role", "status"); document.body.appendChild(b); } b.textContent = t; b.hidden = false; clearTimeout(baoHen); baoHen = setTimeout(() => b.hidden = true, 2400); }

/* ================= Dựng cảnh ================= */
function dungCanh() {
  try { canh = K.dungCanh({ id: st.id, P: st.P, neo: st.neo, off: st.off, moT: st.moT }); st.neo = canh.neo; st.loi = ""; return true; }
  catch (e) { st.loi = e.message; return false; }
}
const tuyChon = () => ({ giay: st.giay, che: st.che, khuat: st.khuat, nhan: st.nhan, phu: st.phu, luoiMat: st.luoiMat, oxyz: st.oxyz, luoiOxy: st.luoiOxy, hover: st.hover, mau: mauHT(), diem: layDiem() });

/* ================= Vẽ màn hình ================= */
function veManHinh() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  if (!canh) return;
  st.frame = K.ve(ctx, canh, cam, cv.width, cv.height, dpr, tuyChon());
  if (st.keoGan && st.frame && st.moT === 0) { // tay nắm nâng hạ đỉnh (S)
    const x = canh.nhan.find(([n]) => n === st.keoGan.nhan); if (x) { const q = st.frame.prj(x[1]), k = dpr, s = 7 * k;
      ctx.save(); ctx.strokeStyle = "#FBBF24"; ctx.fillStyle = "#FBBF24"; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.arc(q[0], q[1], 9 * k, 0, 7); ctx.stroke();
      [[-1, -20], [1, 20]].forEach(([d, oy]) => { const y0 = q[1] + oy * k; ctx.beginPath(); ctx.moveTo(q[0] + 16 * k, y0); ctx.lineTo(q[0] + 16 * k - s * .6, y0 - d * s); ctx.lineTo(q[0] + 16 * k + s * .6, y0 - d * s); ctx.closePath(); ctx.fill(); });
      ctx.beginPath(); ctx.moveTo(q[0] + 16 * k, q[1] - 14 * k); ctx.lineTo(q[0] + 16 * k, q[1] + 14 * k); ctx.stroke(); ctx.restore(); }
  }
}
function yeuCau() { if (!choVe && daDung) { choVe = true; requestAnimationFrame(khungHinh); } }
function khungHinh(t) {
  choVe = false; let tiep = false;
  if (cam.anim) { const a = cam.anim, u = Math.min(1, (t - a.t0) / a.dur), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    cam.q = slerp(a.q0, a.q1, e); cam.zoom = a.z0 + (a.z1 - a.z0) * e; cam.px = a.x0 + (a.x1 - a.x0) * e; cam.py = a.y0 + (a.y1 - a.y0) * e;
    if (u >= 1) cam.anim = null; else tiep = true; }
  else if (Math.abs(cam.vx) + Math.abs(cam.vy) > .05) { xoayCam(cam.vx, cam.vy); cam.vx *= .92; cam.vy *= .92; tiep = true; }
  if (moAnim && canh && canh.mo) { const u = Math.min(1, (t - moAnim.t0) / moAnim.dur), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    datMo(moAnim.tu + (moAnim.den - moAnim.tu) * e, true);
    if (u >= 1) { const den = moAnim.den; moAnim = null; if (den === 0) denGoc("giu"); } else tiep = true; }
  if (sk.offsetParent !== null) veManHinh(); if (tiep) yeuCau();
}
function coKhung() { const r = sk.getBoundingClientRect(); if (!r.width) return; dpr = Math.min(2.5, window.devicePixelRatio || 1); cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr)); yeuCau(); }
function xoayCam(dx, dy) { const k = .0085; cam.q = qNorm(qMul(qAxis([1, 0, 0], dy * k), qMul(cam.q, qAxis([0, 0, 1], dx * k)))); }
const vuaKhung = q => canh ? K.vuaKhung(canh, q, sk.clientWidth || 600, sk.clientHeight || 500, { oxyz: st.oxyz, moT: st.moT, diem: layDiem() }) : { zoom: cam.zoom, px: 0, py: 0 };
function denGoc(ten, tucThi) {
  const bd = B[MUC_ID[st.id].dung], g = ten === "sgk" && bd.goc ? bd.goc : GOC[ten];
  const q1 = ten === "giu" ? cam.q : qTuGoc(...g), f = vuaKhung(q1);
  if (ten !== "giu") sk.querySelectorAll(".h3GocNhin button").forEach(b => b.classList.toggle("dang", b.dataset.goc === ten));
  cam.vx = cam.vy = 0;
  if (tucThi || giamDong) { cam.q = q1; cam.zoom = f.zoom; cam.px = f.px; cam.py = f.py; cam.anim = null; yeuCau(); return; }
  cam.anim = { t0: performance.now(), dur: 520, q0: cam.q, q1, z0: cam.zoom, z1: f.zoom, x0: cam.px, x1: f.px, y0: cam.py, y1: f.py }; yeuCau();
}
function zoomTai(sx, sy, f) {
  const W = sk.clientWidth, H = sk.clientHeight, nz = Math.max(4, Math.min(4000, cam.zoom * f));
  const cx = (sx - W / 2 - cam.px) / cam.zoom, cy = (sy - H / 2 - cam.py) / cam.zoom;
  cam.px = sx - W / 2 - cx * nz; cam.py = sy - H / 2 - cy * nz; cam.zoom = nz; yeuCau();
}

/* ================= Tương tác ================= */
const ptr = new Map(); let keo = null, chum = null;
function tayNamGan(x, y) { // đỉnh có thể kéo nâng hạ nằm gần con trỏ?
  const F = st.frame; if (!F || !canh || !canh.keo.length || st.moT > 0) return null;
  for (const h of canh.keo) { const n = canh.nhan.find(([t]) => t === h.nhan); if (!n) continue; const q = F.prj(n[1]); if (Math.hypot(q[0] / dpr - x, q[1] / dpr - y) < 16) return h; }
  return null;
}
function ganSuKien() {
  cv.addEventListener("pointerdown", e => {
    cv.focus({ preventScroll: true }); cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); cam.anim = null; cam.vx = cam.vy = 0;
    const r = cv.getBoundingClientRect();
    if (ptr.size === 1) { const tn = e.button === 0 && !e.shiftKey ? tayNamGan(e.clientX - r.left, e.clientY - r.top) : null;
      keo = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, doi: e.button === 1 || e.button === 2 || e.shiftKey, dich: false, nut: e.button, vx: 0, vy: 0, t: performance.now(), nang: tn, giaTri: tn ? +st.P[tn.k] : 0 }; }
    else if (ptr.size === 2) { const [a, b] = [...ptr.values()]; chum = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; if (keo) keo.dich = true; }
    sk.classList.add("keo"); $("goiY").hidden = true;
  });
  cv.addEventListener("pointermove", e => {
    const r = cv.getBoundingClientRect();
    if (!ptr.has(e.pointerId)) { capNhatHover(e.clientX - r.left, e.clientY - r.top); return; }
    ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptr.size === 2 && chum) { const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      cam.px += mx - chum.mx; cam.py += my - chum.my; zoomTai(mx - r.left, my - r.top, d / (chum.d || d)); chum = { d, mx, my }; return; }
    if (!keo) return;
    const dx = e.clientX - keo.x, dy = e.clientY - keo.y; keo.x = e.clientX; keo.y = e.clientY;
    if (Math.hypot(e.clientX - keo.x0, e.clientY - keo.y0) > 4) keo.dich = true;
    if (!keo.dich) return;
    if (keo.nang) { // kéo dọc màn hình → đổi chiều cao theo trục Oz
      const R = qToMat(cam.q), lenZ = Math.max(.25, R[1][2]), h = keo.nang, v = Math.round(Math.min(h.max, Math.max(h.min, keo.giaTri - (e.clientY - keo.y0) / (cam.zoom * lenZ))) * 10) / 10;
      if (v !== +st.P[h.k]) { st.P[h.k] = v; if (dungCanh()) { capNhatThamSoNhanh(h.k); veTheTich(); capNhatTen(); veDsDiem(); } }
      const chip = $("chipMat"); chip.innerHTML = "Nâng hạ đỉnh " + h.nhan + " · " + h.ten + " = <b>" + so(v) + "</b>"; chip.hidden = false; yeuCau(); return; }
    if (keo.doi) { cam.px += dx; cam.py += dy; } else { xoayCam(dx, dy); keo.vx = dx; keo.vy = dy; keo.t = performance.now(); }
    yeuCau();
  });
  const tha = e => {
    if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId);
    if (ptr.size < 2) chum = null;
    if (ptr.size === 0) { sk.classList.remove("keo");
      if (keo && keo.nang) { $("chipMat").hidden = true; }
      else if (keo && !keo.dich && keo.nut === 0 && st.but) { const r = cv.getBoundingClientRect(); toTaiDiem(e.clientX - r.left, e.clientY - r.top); }
      else if (keo && keo.dich && !keo.doi && !giamDong && performance.now() - keo.t < 80) { cam.vx = keo.vx; cam.vy = keo.vy; yeuCau(); }
      keo = null; }
  };
  cv.addEventListener("pointerup", tha); cv.addEventListener("pointercancel", tha);
  cv.addEventListener("pointerleave", () => { if (!ptr.size && (st.hover !== -1 || st.keoGan)) { st.hover = -1; st.keoGan = null; $("chipMat").hidden = true; sk.classList.remove("nangHa"); yeuCau(); } });
  cv.addEventListener("contextmenu", e => e.preventDefault());
  cv.addEventListener("wheel", e => { e.preventDefault(); const r = cv.getBoundingClientRect(); cam.anim = null; zoomTai(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.deltaMode ? .05 : .0015))); }, { passive: false });
  cv.addEventListener("keydown", e => {
    const b = 6 * DEG / .0085, m = { ArrowLeft: [-b, 0], ArrowRight: [b, 0], ArrowUp: [0, -b], ArrowDown: [0, b] }[e.key];
    if (m) { e.preventDefault(); cam.anim = null; xoayCam(m[0], m[1]); yeuCau(); }
    else if (e.key === "+" || e.key === "=") zoomTai(sk.clientWidth / 2, sk.clientHeight / 2, 1.15);
    else if (e.key === "-") zoomTai(sk.clientWidth / 2, sk.clientHeight / 2, 1 / 1.15);
    else if (e.key === "0") denGoc("sgk");
  });
  $("phongTo").onclick = () => zoomTai(sk.clientWidth / 2, sk.clientHeight / 2, 1.2);
  $("thuNho").onclick = () => zoomTai(sk.clientWidth / 2, sk.clientHeight / 2, 1 / 1.2);
  sk.querySelectorAll(".h3GocNhin button").forEach(b => b.onclick = () => denGoc(b.dataset.goc === "datlai" ? "sgk" : b.dataset.goc));
  new ResizeObserver(coKhung).observe(sk);
}
let hoverHen = 0;
function capNhatHover(x, y) {
  if (hoverHen) return; hoverHen = requestAnimationFrame(() => {
    hoverHen = 0; const F = st.frame; if (!F || !canh) return;
    const tn = tayNamGan(x, y), chip = $("chipMat");
    if (tn !== st.keoGan) { st.keoGan = tn; sk.classList.toggle("nangHa", !!tn); yeuCau(); }
    if (tn) { chip.innerHTML = "Kéo lên / xuống để nâng hạ đỉnh " + tn.nhan + " (" + tn.ten + " = " + so(+st.P[tn.k]) + ")"; chip.hidden = false; return; }
    const g = F.chon(x * dpr, y * dpr);
    if (g !== st.hover || chip.hidden !== (g < 0)) {
      st.hover = g;
      if (g < 0) chip.hidden = true;
      else { const m = mauHT()[g]; chip.innerHTML = '<i style="background:' + (m ? m.c : "#B0C4E0") + '"></i>' + esc(canh.g[g].ten) + (st.but ? " · bấm để tô" : ""); chip.hidden = false; }
      document.querySelectorAll("#h3_dsMat .h3DongMat").forEach(d => d.classList.toggle("dangChi", +d.dataset.g === g));
      yeuCau();
    }
  });
}

/* ================= Tô màu ================= */
function luuHoanTac() { (st.hoanTac[st.id] || (st.hoanTac[st.id] = [])).push(JSON.stringify(mauHT())); if (st.hoanTac[st.id].length > 60) st.hoanTac[st.id].shift(); }
function toMat(g, xoa) { if (g < 0) return; luuHoanTac(); const m = mauHT(); if (xoa || st.tay) delete m[g]; else m[g] = { c: st.mauHT, a: st.doMo }; veDsMat(); yeuCau(); }
function toTaiDiem(x, y) { const F = st.frame; if (!F) return; const g = F.chon(x * dpr, y * dpr); if (g >= 0) { toMat(g); bao((st.tay ? "Đã xóa màu: " : "Đã tô: ") + canh.g[g].ten); } }
function veBangMau() {
  const box = $("oMau");
  box.innerHTML = MAU.map(c => '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="Màu ' + c + '" aria-pressed="' + (!st.tay && st.mauHT === c) + '"></button>').join("")
    + '<input type="color" id="h3_mauRieng" value="' + st.mauHT + '" aria-label="Chọn màu khác" title="Chọn màu khác">'
    + '<button type="button" class="h3Tay" id="h3_nTay" aria-pressed="' + st.tay + '" aria-label="Tẩy màu" title="Tẩy: bấm vào mặt để xóa màu">' + SVG('<path d="m7 21-4-4 11-11 7 7-7 7z"/><path d="M7 21h13"/>', 2) + "</button>";
  box.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { st.mauHT = b.dataset.c; st.tay = false; datBut(true); veBangMau(); });
  $("mauRieng").oninput = e => { st.mauHT = e.target.value; st.tay = false; datBut(true); veBangMau(); };
  $("nTay").onclick = () => { st.tay = !st.tay; datBut(true); veBangMau(); };
}
function datBut(v) { st.but = v; $("oBut").checked = v; sk.classList.toggle("butTo", v); }
function veDsMat() {
  const box = $("dsMat"); if (!canh) { box.innerHTML = ""; return; } const m = mauHT();
  box.innerHTML = canh.g.map((g, i) => { const c = m[i];
    return '<div class="h3DongMat" data-g="' + i + '"><button type="button" class="ten" data-to="' + i + '" title="Tô mặt này bằng màu đang chọn"><span class="cham" style="background:' + (c ? c.c : "rgba(176,196,224,.55)") + ";opacity:" + (c ? .35 + .65 * c.a : 1) + '"></span><span class="tenM">' + esc(g.ten) + "</span></button>"
      + (c ? "<small>" + Math.round(c.a * 100) + '%</small><button type="button" class="xoa" data-xoa="' + i + '" aria-label="Xóa màu ' + esc(g.ten) + '">×</button>' : "<small></small><span></span>") + "</div>"; }).join("");
  box.querySelectorAll("[data-to]").forEach(b => b.onclick = () => toMat(+b.dataset.to));
  box.querySelectorAll("[data-xoa]").forEach(b => b.onclick = () => toMat(+b.dataset.xoa, true));
  box.querySelectorAll(".h3DongMat").forEach(d => { d.onmouseenter = () => { st.hover = +d.dataset.g; yeuCau(); }; d.onmouseleave = () => { st.hover = -1; yeuCau(); }; });
}

/* ================= Danh mục hình ================= */
function veDsHinh() {
  const q = boDau(st.tim.trim()), box = $("dsHinh");
  const ds = q ? MUC.filter(m => boDau(m.ten + " " + m.con + " " + m.tu).includes(q)) : MUC.filter(m => m.nhom === st.nhom);
  document.querySelectorAll("#h3_nhomTab button").forEach(b => b.setAttribute("aria-selected", !q && b.dataset.nhom === st.nhom));
  if (!ds.length) { box.innerHTML = '<p class="h3Ghi" style="padding:10px 8px">Không tìm thấy hình phù hợp với “' + esc(st.tim) + "”.</p>"; return; }
  let html = "", con = "";
  for (const m of ds) {
    const nhan = q ? TEN_NHOM[m.nhom] + " › " + m.con : m.con;
    if (nhan !== con) { con = nhan; html += "<h4>" + esc(nhan) + "</h4>"; }
    html += '<button type="button" class="h3Muc" data-id="' + m.id + '"' + (m.dung ? "" : ' disabled title="Sẽ bổ sung"') + ' aria-current="' + (m.id === st.id) + '"><span class="ico">' + SVG(ICO[m.ico]) + "</span><span>" + esc(m.ten) + "</span>" + (m.dung ? "<span></span>" : '<span class="sap">Sắp có</span>') + "</button>";
  }
  box.innerHTML = html;
  box.querySelectorAll(".h3Muc:not(:disabled)").forEach(b => b.onclick = () => chonHinh(b.dataset.id));
}
function chonHinh(id, dauTien) {
  const m = MUC_ID[id]; if (!m || !m.dung) return;
  st.id = id; st.P = st.PTheo[id] || (st.PTheo[id] = K.macDinh(id)); st.moT = 0; moAnim = null;
  if (!dungCanh()) { hienLoi(); return; }
  $("moPhang").hidden = !canh.mo; $("oMo").value = 0; $("vMo").textContent = "0%"; capNutMo();
  veDsHinh(); veThamSo(); veNeo(); veDsMat(); capNhatTen(); hienLoi();
  denGoc("sgk", dauTien);
}

/* ================= Bảng tham số ================= */
function veThamSo() {
  const bd = B[MUC_ID[st.id].dung], P = st.P, box = $("dsThamSo"); let html = "";
  for (const t of bd.tham) {
    if (t.hien && !t.hien(P)) continue;
    const ten = typeof t.ten === "function" ? t.ten(P) : t.ten, id = "h3_ts_" + t.k;
    if (t.loai === "chon") html += '<div class="h3Truong"><label for="' + id + '">' + esc(ten) + '</label><select id="' + id + '" data-k="' + t.k + '">' + t.ds.map(([v, n]) => '<option value="' + v + '"' + (P[t.k] === v ? " selected" : "") + ">" + esc(n) + "</option>").join("") + "</select></div>";
    else if (t.loai === "so") html += '<div class="h3Truong"><div class="h3DongNhan"><label for="' + id + '">' + esc(ten) + '</label><output id="' + id + '_v">' + so(P[t.k]) + (t.don || "") + '</output></div><input type="range" id="' + id + '" data-k="' + t.k + '" min="' + t.min + '" max="' + t.max + '" step="' + t.buoc + '" value="' + P[t.k] + '"></div>';
    else if (t.loai === "mau") html += '<div class="h3Truong"><label for="' + id + '">' + esc(ten) + '</label><select id="' + id + '" data-mau="1"><option value="">— Chọn mẫu —</option>' + MAU_F.map((x, i) => '<option value="' + i + '">' + esc(x[3]) + "</option>").join("") + "</select></div>";
    else if (t.loai === "ham") html += '<div class="h3Truong"><label for="' + id + '">' + esc(ten) + '</label><input type="text" class="h3Ham' + (st.loi ? " sai" : "") + '" id="' + id + '" data-k="' + t.k + '" value="' + esc(P[t.k]) + '" autocomplete="off" spellcheck="false"><p class="h3Ghi">Ví dụ: <code>sqrt(x)</code>, <code>x^2/4 + 1</code>, <code>2 + sin(x)</code>, <code>e^(-x)</code></p>' + (st.loi ? '<p class="h3LoiMuc" role="alert">' + esc(st.loi) + "</p>" : "") + "</div>";
    else if (t.loai === "nhap") html += (t.k === "a" ? '<div class="h3Hai">' : "") + '<div class="h3Truong"><label for="' + id + '">' + esc(ten) + '</label><input type="number" id="' + id + '" data-k="' + t.k + '" step="0.1" value="' + P[t.k] + '"></div>' + (t.k === "b" ? "</div>" : "");
    else if (t.loai === "bat") html += '<label class="h3Bat"><input type="checkbox" id="' + id + '" data-k="' + t.k + '"' + (P[t.k] ? " checked" : "") + "><span>" + esc(ten) + "</span></label>";
  }
  box.innerHTML = html;
  box.querySelectorAll("select[data-k]").forEach(s => s.onchange = () => { const t = bd.tham.find(x => x.k === s.dataset.k); P[s.dataset.k] = s.value; if (t.datLai) { st.mauTheo[st.id] = {}; st.hoanTac[st.id] = []; } doiThamSo(true); });
  box.querySelectorAll("input[type=range]").forEach(s => s.oninput = () => { const t = bd.tham.find(x => x.k === s.dataset.k); P[s.dataset.k] = +s.value; $("ts_" + s.dataset.k + "_v").textContent = so(+s.value) + (t.don || ""); doiThamSo(false); });
  box.querySelectorAll("input[type=number]").forEach(s => s.onchange = () => { P[s.dataset.k] = s.value; doiThamSo(false, true); });
  box.querySelectorAll("input[type=checkbox][data-k]").forEach(s => s.onchange = () => { P[s.dataset.k] = s.checked; doiThamSo(false); });
  let hen = 0;
  box.querySelectorAll("input.h3Ham").forEach(s => s.oninput = () => { clearTimeout(hen); hen = setTimeout(() => { P.f = s.value; doiThamSo(false, true); }, 380); });
  box.querySelectorAll("select[data-mau]").forEach(s => s.onchange = () => { const x = MAU_F[+s.value]; if (!x) return; P.f = x[0]; P.a = x[1]; P.b = x[2]; doiThamSo(true, true); });
  veTheTich();
}
function capNhatThamSoNhanh(k) { const s = $("ts_" + k); if (s) { s.value = st.P[k]; const o = $("ts_" + k + "_v"); if (o) o.textContent = so(+st.P[k]); } }
function doiThamSo(veLaiBang, vuaKhungLai) {
  const ok = dungCanh(), o = document.querySelector("#h3_dsThamSo input.h3Ham");
  if (ok) { if (veLaiBang) veThamSo(); else veTheTich(); veNeo(); veDsMat(); capNhatTen(); if (vuaKhungLai) denGoc("giu");
    if (o) { o.classList.remove("sai"); const p = o.parentElement.querySelector(".h3LoiMuc"); if (p) p.remove(); } }
  else if (o) { o.classList.add("sai"); let p = o.parentElement.querySelector(".h3LoiMuc"); if (!p) { p = document.createElement("p"); p.className = "h3LoiMuc"; p.setAttribute("role", "alert"); o.parentElement.appendChild(p); } p.textContent = st.loi; }
  else bao(st.loi);
  yeuCau();
}
function veTheTich() { if (!canh) return; $("theTich").innerHTML = '<div class="so"><span>Thể tích</span><b>V ≈ ' + so(canh.V) + '</b></div><div class="ct">' + esc(canh.ct) + "</div>" + (canh.tt ? '<p class="h3Ghi">' + esc(canh.tt) + "</p>" : "") + (canh.ghiChu ? '<p class="h3CanhBao">' + esc(canh.ghiChu) + "</p>" : ""); }
function capNhatTen() { veDsDiem(); $("tenHinh").textContent = canh.ten; $("tomTat").textContent = "V ≈ " + so(canh.V) + " · " + canh.g.length + " mặt logic"; }
function hienLoi() { const e = $("loiHinh"); if (st.loi && !canh) { e.textContent = st.loi; e.hidden = false; } else e.hidden = true; }

/* ================= Oxyz, toạ độ điểm ================= */
function veNeo() {
  const box = $("dsNeo");
  box.innerHTML = canh.neoDs.map(n => '<label><input type="radio" name="h3neo" value="' + n.k + '"' + (n.k === st.neo ? " checked" : "") + "><span>" + esc(n.ten) + "</span></label>").join("");
  box.querySelectorAll("input").forEach(r => r.onchange = () => { st.neo = r.value; dungCanh(); veDsMat(); veDsDiem(); denGoc("giu"); khoaToaDo(); });
  khoaToaDo();
}
function khoaToaDo() { const t = st.neo === "tuChon"; ["x0", "y0", "z0"].forEach(id => $(id).disabled = !t); }
function datOxyz(v) { st.oxyz = v; $("oOxyz").checked = v; $("nOxyz").setAttribute("aria-pressed", v); denGoc("giu"); }
function tenCacDiem() { const ds = []; (canh ? canh.nhan0 : []).forEach(([n]) => { if (!ds.includes(n)) ds.push(n); }); return ds; }
function baoLoiDiem(t) { const e = $("loiDiem"); e.textContent = t || ""; e.hidden = !t; }
function themDiem(txt) {
  const s = String(txt).trim(); baoLoiDiem(""); if (!s || !canh) return;
  const m = s.match(/^([A-Za-z][A-Za-z0-9]*)\s*\((.*)\)\s*$/); let muc;
  if (m) {
    const body = m[2].trim(), parts = body.includes(";") ? body.split(";").map(x => x.replace(",", ".")) : body.split(","), v = parts.map(x => Number(x.trim()));
    if (parts.length !== 3 || v.some((x, i) => !isFinite(x) || parts[i].trim() === "")) { baoLoiDiem("Cần đủ 3 toạ độ, ví dụ M(1; 2; 3) hoặc M(1,5; -2; 0)."); return; }
    if (tenCacDiem().includes(m[1])) { baoLoiDiem("Điểm " + m[1] + " đã có trên hình — chỉ cần nhập “" + m[1] + "” để xem toạ độ."); return; }
    if (v.some(x => Math.abs(x) > 50)) { baoLoiDiem("Toạ độ quá lớn (tối đa ±50)."); return; }
    muc = { ten: m[1], p: v, rieng: true };
  } else {
    const ds = tenCacDiem(), ten = ds.find(n => n === s) || ds.find(n => n.toLowerCase() === s.toLowerCase());
    if (!ten) { baoLoiDiem("Hình này không có điểm “" + s + "”. Các điểm: " + ds.join(", ") + ". Hoặc nhập điểm mới dạng M(1; 2; 3)."); return; }
    muc = { ten };
  }
  const ds = st.diemHien[st.id] || (st.diemHien[st.id] = []), i = ds.findIndex(d => d.ten === muc.ten);
  if (i >= 0) ds.splice(i, 1); ds.push(muc);
  if (!st.oxyz) datOxyz(true);
  $("oDiem").value = ""; veDsDiem(); denGoc("giu");
}
function veDsDiem() {
  if (!canh) return;
  $("dsTenDiem").innerHTML = tenCacDiem().map(n => '<option value="' + n + '">').join("");
  $("dsDiemHien").innerHTML = layDiem().map(d => '<span class="h3ChipDiem"><b>' + esc(d.ten) + "</b>" + K.toaDoChu(d.p) + (d.rieng ? " <small>tự nhập</small>" : "") + '<button type="button" data-bo="' + esc(d.ten) + '" aria-label="Bỏ điểm ' + esc(d.ten) + '">×</button></span>').join("");
  $("dsDiemHien").querySelectorAll("[data-bo]").forEach(b => b.onclick = () => { const ds = st.diemHien[st.id] || []; const i = ds.findIndex(d => d.ten === b.dataset.bo); if (i >= 0) ds.splice(i, 1); veDsDiem(); yeuCau(); });
  const daCo = new Set();
  $("bangDiem").innerHTML = "<table><thead><tr><th>Điểm</th><th>x</th><th>y</th><th>z</th></tr></thead><tbody>" + canh.nhan0.filter(([n]) => !daCo.has(n) && daCo.add(n)).map(([n, p]) => '<tr data-ten="' + esc(n) + '" tabindex="0"><td><b>' + esc(n) + "</b></td><td>" + so(p[0]) + "</td><td>" + so(p[1]) + "</td><td>" + so(p[2]) + "</td></tr>").join("") + "</tbody></table>";
  $("bangDiem").querySelectorAll("tr[data-ten]").forEach(r => { r.onclick = () => themDiem(r.dataset.ten); r.onkeydown = e => { if (e.key === "Enter") themDiem(r.dataset.ten); }; });
  $("ghiMo").hidden = !(canh.mo && st.moT > 0);
}

/* ================= Trải phẳng ================= */
function datMo(t, tuAnim) {
  st.moT = Math.max(0, Math.min(1, t)); if (!canh || !canh.mo) return;
  K.apDungMo(canh, st.moT); const pc = Math.round(st.moT * 100); $("oMo").value = pc; $("vMo").textContent = pc + "%"; capNutMo(); $("ghiMo").hidden = !(st.moT > 0);
  if (!tuAnim) yeuCau();
}
function capNutMo() { const mo = st.moT >= .5, b = $("nMoChay"); b.setAttribute("aria-label", mo ? "Gập lại thành khối" : "Mở trải phẳng"); b.title = b.getAttribute("aria-label"); $("icoMo").innerHTML = mo ? '<path d="M7 17 17 7M7 7h10v10"/>' : '<path d="M8 5v14l11-7z"/>'; }

/* ================= Xuất TikZ, PNG ================= */
function taoTikz() { if (!canh || !st.frame) return ""; const ma = K.taoTikz(canh, st.frame, tuyChon()); $("maTikz").value = ma; $("ttMa").textContent = ma.split("\n").length + " dòng · " + (ma.length / 1024).toFixed(1).replace(".", ",") + " KB"; return ma; }
function taiPng() {
  const W = Math.round(sk.clientWidth * 3), H = Math.round(sk.clientHeight * 3), c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  K.ve(x, canh, cam, W, H, 3, Object.assign(tuyChon(), { giay: true, hover: -1 }));
  const im = x.getImageData(0, 0, W, H).data; let mnx = W, mny = H, mxx = 0, mxy = 0;
  for (let y = 0; y < H; y += 2) for (let xx = 0; xx < W; xx += 2) if (im[(y * W + xx) * 4 + 3] > 8) { if (xx < mnx) mnx = xx; if (xx > mxx) mxx = xx; if (y < mny) mny = y; if (y > mxy) mxy = y; }
  if (mxx <= mnx) { bao("Hình đang nằm ngoài khung — hãy bấm Đặt lại"); return; }
  const pad = 24, cw = Math.min(W, mxx - mnx + 2 * pad), ch = Math.min(H, mxy - mny + 2 * pad), o = document.createElement("canvas"); o.width = cw; o.height = ch;
  o.getContext("2d").drawImage(c, Math.max(0, mnx - pad), Math.max(0, mny - pad), cw, ch, 0, 0, cw, ch);
  const a = document.createElement("a"); a.href = o.toDataURL("image/png"); a.download = "hinh3d-" + st.id + ".png"; document.body.appendChild(a); a.click(); a.remove();
  bao("Đã tải PNG " + cw + " × " + ch + " px (nền trong suốt)");
}

/* ================= Đưa vào video ================= */
const TEN_LENH = { chop4: "chóp tứ giác", chop4deu: "chóp tứ giác đều", batdien: "bát diện đều", trucut: "trụ cụt", mongtru: "móng trụ", chomcau: "chỏm cầu", quatcau: "quạt cầu", paraboloid: "paraboloid", xuyen: "xuyến", quayOx: "quay Ox" };
const TEN_MAU_VD = { vang: "#FFC94D", do: "#FF5A5F", xanh: "#4FB3FF", luc: "#4ADE80", hong: "#FF7EB6", cam: "#FF9F43", tim: "#B794F6", cyan: "#5EEBFF" };
const TV_MAU = { vang: "vàng", do: "đỏ", xanh: "xanh", luc: "lục", hong: "hồng", cam: "cam", tim: "tím", cyan: "cyan" };
const mauGan = hex => { const c = K.hexRgb(hex); let best = "xanh", d = 1e9; for (const [k, h] of Object.entries(TEN_MAU_VD)) { const e = K.hexRgb(h), dd = (c[0] - e[0]) ** 2 + (c[1] - e[1]) ** 2 + (c[2] - e[2]) ** 2; if (dd < d) { d = dd; best = k; } } return TV_MAU[best]; };
const soLenh = v => String(Math.round(v * 100) / 100).replace(".", ",");
function lenhTuTab() {
  const id = st.id, bd = B[MUC_ID[id].dung], md = K.macDinh(id), P = st.P, ts = ["xoay 360 5"]; if (canh && canh.mo) { ts.push("trải 3"); ts.push("giữ 3"); }
  const R = qToMat(cam.q), d = R[2], th = Math.round(Math.atan2(d[1], d[0]) / DEG), ph = Math.round(Math.asin(Math.max(-1, Math.min(1, d[2]))) / DEG);
  const g0 = bd.goc || GOC.sgk; if (Math.abs(th - Math.round(g0[0])) > 1 || Math.abs(ph - Math.round(g0[1])) > 1) ts.push("góc " + th + " " + ph);
  if (st.che !== "dac") ts.push(st.che === "trong" ? "trong suốt" : "khung dây");
  if (st.oxyz) ts.push("oxyz"); if (!st.nhan) ts.push("không nhãn");
  const nd = [TEN_LENH[id] || MUC_ID[id].ten];
  bd.tham.forEach(t => { if (t.loai === "mau" || P[t.k] === undefined) return; if (String(P[t.k]) === String(md[t.k])) return; nd.push(t.k + " = " + (typeof P[t.k] === "number" ? soLenh(P[t.k]) : P[t.k])); });
  Object.entries(mauHT()).forEach(([g, m]) => { if (canh && canh.g[g]) nd.push("tô " + canh.g[g].ten + " " + mauGan(m.c) + (Math.abs(m.a - .55) > .04 ? " " + Math.round(m.a * 100) + "%" : "")); });
  return "khoi3d(" + ts.join(" | ") + "): " + nd.join("; ");
}
function chenVaoKichBan(lenh, chuyenTab) {
  const ta = document.getElementById("vdKB"); if (!ta) { bao("Chưa thấy tab Tạo video"); return; }
  if (chuyenTab) { const n = document.getElementById("nutTabVideo"); if (n) n.click(); }
  const a = ta.selectionStart ?? ta.value.length, dau = ta.value.slice(0, a), sau = ta.value.slice(a);
  const chen = (dau && !dau.endsWith("\n") ? "\n" : "") + lenh + (sau && !sau.startsWith("\n") ? "\n" : "");
  ta.setRangeText(chen, a, a, "end"); ta.focus(); ta.dispatchEvent(new Event("input", { bubbles: true }));
  bao("Đã chèn dòng khoi3d vào kịch bản video");
}

/* ================= Khởi động tab ================= */
function khoiDongTab() {
  const goc = document.getElementById("tabHinh3D"); if (!goc) return;
  if (!daDung) {
    goc.innerHTML = KHUNG; daDung = true;
    cv = $("cv"); ctx = cv.getContext("2d"); sk = $("san");
    ganSuKien(); veBangMau();
    $("nhomTab").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; st.nhom = b.dataset.nhom; st.tim = ""; $("tim").value = ""; veDsHinh(); });
    $("tim").addEventListener("input", e => { st.tim = e.target.value; veDsHinh(); });
    const n = MUC.filter(m => m.dung).length; $("chuThich").innerHTML = "Đang có <b>" + n + "/" + MUC.length + "</b> hình · các mục mờ sẽ bổ sung dần.";
    $("bangTab").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
      document.querySelectorAll("#h3_bangTab button").forEach(x => x.setAttribute("aria-selected", x === b));
      goc.querySelectorAll(".h3Than > section").forEach(s => s.hidden = s.dataset.th !== b.dataset.th);
      if (b.dataset.th === "toMau" && !st.but) datBut(true);
      if (b.dataset.th === "xuat") taoTikz(); });
    $("oBut").onchange = e => datBut(e.target.checked);
    $("oDoMo").oninput = e => { st.doMo = e.target.value / 100; $("vDoMo").textContent = e.target.value + "%"; };
    $("nHoan").onclick = () => { const s = st.hoanTac[st.id]; if (!s || !s.length) { bao("Không còn bước để hoàn tác"); return; } st.mauTheo[st.id] = JSON.parse(s.pop()); veDsMat(); yeuCau(); };
    $("nXoaMau").onclick = () => { luuHoanTac(); st.mauTheo[st.id] = {}; veDsMat(); yeuCau(); };
    ["x0", "y0", "z0"].forEach((id, i) => $(id).addEventListener("input", e => { st.off[i] = +e.target.value || 0; if (st.neo === "tuChon") { dungCanh(); veDsDiem(); yeuCau(); } }));
    $("oOxyz").onchange = e => datOxyz(e.target.checked);
    $("nOxyz").onclick = () => datOxyz(!st.oxyz);
    $("oLuoi").onchange = e => { st.luoiOxy = e.target.checked; if (st.luoiOxy && !st.oxyz) datOxyz(true); yeuCau(); };
    $("nDiem").onclick = () => themDiem($("oDiem").value);
    $("oDiem").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); themDiem($("oDiem").value); } });
    $("nXoaDiem").onclick = e => { e.preventDefault(); st.diemHien[st.id] = []; veDsDiem(); yeuCau(); };
    $("oMo").addEventListener("input", e => { moAnim = null; const truoc = st.moT; datMo(e.target.value / 100); if (truoc === 0 && st.moT > 0) denGoc("giu"); });
    $("oMo").addEventListener("change", () => denGoc("giu"));
    $("nMoChay").onclick = () => { const den = st.moT < .5 ? 1 : 0; if (giamDong) { datMo(den); denGoc("giu"); return; } if (den === 1 && st.moT === 0) { st.moT = .001; denGoc("giu"); } moAnim = { t0: performance.now(), tu: st.moT, den, dur: 2000 }; yeuCau(); };
    $("oChe").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; st.che = b.dataset.che; document.querySelectorAll("#h3_oChe button").forEach(x => x.setAttribute("aria-pressed", x === b)); yeuCau(); });
    [["oKhuat", "khuat"], ["oNhan", "nhan"], ["oPhu", "phu"], ["oLuoiMat", "luoiMat"]].forEach(([id, k]) => $(id).onchange = e => { st[k] = e.target.checked; yeuCau(); });
    $("oGiay").onchange = e => { st.giay = e.target.checked; sk.classList.toggle("giay", st.giay); yeuCau(); };
    $("nTikz").onclick = () => { taoTikz(); bao("Đã tạo mã TikZ từ góc nhìn hiện tại"); };
    $("nCopy").onclick = async () => { const t = $("maTikz").value || taoTikz(); try { await navigator.clipboard.writeText(t); bao("Đã copy mã TikZ"); } catch (e) { const a = $("maTikz"); a.focus(); a.select(); try { document.execCommand("copy"); bao("Đã copy mã TikZ"); } catch (_) { bao("Hãy bôi đen mã và nhấn Ctrl + C"); } } };
    $("nPng").onclick = taiPng;
    $("nVideo").onclick = () => chenVaoKichBan(lenhTuTab(), true);
    chonHinh(st.id, true);
    requestAnimationFrame(() => { coKhung(); denGoc("sgk", true); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => yeuCau());
  } else { coKhung(); yeuCau(); }
}

/* ================= Bảng "◈ Khối 3D" trong tab Tạo video ================= */
const VD = { mo: false, hen: 0, t0: 0, phan: null, lenh: "" };
const HINH_VD = MUC.filter(m => m.dung && TEN_LENH[m.id]);
function lenhVD() {
  const g = id => document.getElementById("h3vd_" + id), id = g("hinh").value, ts = [];
  const co = +g("co").value; if (Math.abs(co - 1) > .01) ts.push(soLenh(co));
  if (g("xoay").checked) ts.push("xoay " + g("do").value + " " + soLenh(+g("gx").value || 5)); else ts.push("tĩnh");
  const coMo = !!B[MUC_ID[id].dung].dung(K.macDinh(id)).mo;
  g("trai").disabled = !coMo; g("gap").disabled = !coMo || !g("trai").checked; g("ghiTrai").hidden = coMo;
  if (coMo && g("trai").checked) { ts.push("trải " + soLenh(+g("gt").value || 3)); if (g("gap").checked) ts.push("gập 2"); }
  const giu = +g("giu").value; if (giu > 0) ts.push("giữ " + soLenh(giu));
  if (g("goc").value !== "sgk") ts.push("góc " + { truoc: "trước", tren: "trên", nghieng: "nghiêng" }[g("goc").value]);
  if (g("che").value !== "dac") ts.push(g("che").value === "trong" ? "trong suốt" : "khung dây");
  if (g("oxyz").checked) ts.push("oxyz"); if (!g("nhan").checked) ts.push("không nhãn");
  const nd = [TEN_LENH[id]]; if (g("to").value) nd.push("tô " + g("to").value + " " + g("mau").value);
  return "khoi3d(" + ts.join(" | ") + "): " + nd.join("; ");
}
function veBangVD() {
  const ban = document.getElementById("h3VdBan"); if (!ban || ban.dataset.da) return; ban.dataset.da = 1;
  const opt = (ds, md) => ds.map(([v, n]) => '<option value="' + v + '"' + (v === md ? " selected" : "") + ">" + n + "</option>").join("");
  ban.innerHTML = '<div class="h3VdLuoi"><canvas id="h3vd_cv" class="h3VdXem" aria-label="Xem thử khối 3D trong video"></canvas><div class="h3VdForm">'
    + '<label class="h3VdO h3VdRong"><span>Hình</span><select id="h3vd_hinh">' + opt(HINH_VD.map(m => [m.id, m.ten]), "chop4deu") + "</select></label>"
    + '<label class="h3VdO"><span>Cỡ</span><input type="range" id="h3vd_co" min="0.6" max="1.8" step="0.1" value="1"></label>'
    + '<label class="h3VdO"><span>Góc nhìn</span><select id="h3vd_goc">' + opt([["sgk", "Chuẩn SGK"], ["nghieng", "Nghiêng 3D"], ["truoc", "Mặt trước"], ["tren", "Từ trên xuống"]], "sgk") + "</select></label>"
    + '<div class="h3VdO h3VdRong h3VdHang"><label class="h3Bat"><input type="checkbox" id="h3vd_xoay" checked><span>Xoay</span></label><select id="h3vd_do">' + opt([["180", "nửa vòng"], ["360", "1 vòng"], ["720", "2 vòng"], ["-360", "1 vòng ngược"]], "360") + '</select><input type="number" id="h3vd_gx" min="1" max="30" step="0.5" value="5" aria-label="Số giây xoay"><span>giây</span></div>'
    + '<div class="h3VdO h3VdRong h3VdHang"><label class="h3Bat"><input type="checkbox" id="h3vd_trai" checked><span>Trải phẳng</span></label><input type="number" id="h3vd_gt" min="1" max="20" step="0.5" value="3" aria-label="Số giây trải"><span>giây</span><label class="h3Bat"><input type="checkbox" id="h3vd_gap"><span>rồi gập lại</span></label><small id="h3vd_ghiTrai" hidden>(chỉ hình chóp, bát diện)</small></div>'
    + '<label class="h3VdO"><span>Hiển thị</span><select id="h3vd_che">' + opt([["dac", "Đặc"], ["trong", "Trong suốt"], ["khung", "Khung dây"]], "dac") + "</select></label>"
    + '<label class="h3VdO"><span>Giữ sau khi xong (giây, 0 = tới hết trang)</span><input type="number" id="h3vd_giu" min="0" max="60" step="0.5" value="0"></label>'
    + '<div class="h3VdO h3VdRong h3VdHang"><label class="h3Bat"><input type="checkbox" id="h3vd_oxyz"><span>Oxyz</span></label><label class="h3Bat"><input type="checkbox" id="h3vd_nhan" checked><span>Nhãn đỉnh</span></label><span class="h3VdTach"></span><span>Tô</span><select id="h3vd_to"></select><select id="h3vd_mau">' + opt(Object.keys(TV_MAU).map(k => [TV_MAU[k], TV_MAU[k]]), "vàng") + "</select></div>"
    + '</div></div><div class="h3VdChan"><code id="h3vd_lenh"></code><button type="button" class="vdNutNho h3VdChen" id="h3vd_chen">＋ Chèn dòng vào kịch bản</button></div>';
  const g = id => document.getElementById("h3vd_" + id);
  const capMat = () => { const id = g("hinh").value; let S; try { S = K.dungCanh({ id }); } catch (e) { return; } const cu = g("to").value; g("to").innerHTML = '<option value="">— không —</option>' + S.g.map(x => '<option value="' + esc(x.ten) + '">' + esc(x.ten) + "</option>").join(""); if ([...g("to").options].some(o => o.value === cu)) g("to").value = cu; };
  const capNhat = () => { VD.lenh = lenhVD(); g("lenh").textContent = VD.lenh; try { VD.phan = K.taoPhanTuVideo(VD.lenh.slice(7, VD.lenh.indexOf("):")), VD.lenh.slice(VD.lenh.indexOf("):") + 2), { u: 1, doc: true, bao: () => {} }); } catch (e) { VD.phan = null; } VD.t0 = performance.now(); };
  ban.addEventListener("input", e => { if (e.target.id === "h3vd_hinh") capMat(); capNhat(); });
  ban.addEventListener("change", e => { if (e.target.id === "h3vd_hinh") capMat(); capNhat(); });
  g("chen").addEventListener("click", () => chenVaoKichBan(VD.lenh, false));
  capMat(); capNhat();
}
function vongXemVD() {
  if (!VD.mo) return; const c = document.getElementById("h3vd_cv"); if (!c) return;
  const r = c.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1), W = Math.round(r.width * d), H = Math.round(r.height * d);
  if (W && (c.width !== W || c.height !== H)) { c.width = W; c.height = H; }
  const x = c.getContext("2d"); x.setTransform(1, 0, 0, 1, 0, 0);
  const gr = x.createRadialGradient(W / 2, H * .4, 10, W / 2, H / 2, Math.max(W, H)); gr.addColorStop(0, "#14234a"); gr.addColorStop(1, "#070d1f"); x.fillStyle = gr; x.fillRect(0, 0, W, H);
  if (VD.phan && W) { const e = VD.phan, tong = e.d + (e.giu || 1.2) + .4, tau = ((performance.now() - VD.t0) / 1000) % tong; const u = W / 980; K.veVideo(x, e.k3, 0, 0, W, H, tau, u * 1.1); }
  requestAnimationFrame(vongXemVD);
}
function ganBangVD() {
  const nut = document.getElementById("h3VdMo"), ban = document.getElementById("h3VdBan"); if (!nut || !ban) return;
  nut.addEventListener("click", () => { const mo = ban.hidden; ban.hidden = !mo; nut.setAttribute("aria-expanded", mo); VD.mo = mo; if (mo) { veBangVD(); requestAnimationFrame(vongXemVD); } });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ganBangVD); else ganBangVD();

K.khoiDongTab = khoiDongTab;
K.lenhTuTab = lenhTuTab;
})();
