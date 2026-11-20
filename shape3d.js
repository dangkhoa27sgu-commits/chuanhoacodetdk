/* ===== shape3d.js — KMath · giao diện tab "Hình 3D" (menu Vẽ hình TikZ, mục 4) + bảng "◈ Khối 3D" trong tab Tạo video.
   Cần shape3d-engine.js và shape3d-catalog.js nạp trước. Lộ ra window.KHinh3D.khoiDongTab() (app.js gọi khi mở tab).
   Mọi id/class có tiền tố h3 để không đụng giao diện khác. ===== */
(() => {
"use strict";
const K = window.KHinh3D; if (!K) return;
const { MUC, MUC_ID, TEN_NHOM, B, ICO, MAU_F, MAU, so, boDau, qMul, qAxis, qNorm, qToMat, slerp, dot } = K;
const $ = id => document.getElementById("h3_" + id);
const giamDong = matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const DEG = Math.PI / 180;
const eIO = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;

/* ================= Trạng thái ================= */
const st = {
  id: "chop4", nhom: "dadien", tim: "", P: {}, PTheo: {}, mauTheo: {}, hoanTac: {},
  neo: "tamDay", off: [0, 0, 0], oxyz: false, luoiOxy: false, che: "dac", khuat: true, nhan: true, phu: true, luoiMat: false, giay: false, doDam: 1,
  mauHT: "#5EEBFF", tay: false, doMo: .45, but: false, hover: -1, loi: "", frame: null, moT: 0, diemHien: {}, keoGan: null,
  cheDo: "xoay", giuDung: false, tuXoay: false, nhanh: false, quay: null
};
const cam = { q: [1, 0, 0, 0], xien: null, zoom: 60, px: 0, py: 0, anim: null, vx: 0, vy: 0 };
let canh = null, daDung = false, cv, ctx, sk, dpr = 1, choVe = false, moAnim = null, quetAnim = null, henNet = 0, tLan = 0;
const mauHT = () => st.mauTheo[st.id] || (st.mauTheo[st.id] = {});
const layDiem = () => canh ? K.giaiDiem(canh, st.diemHien[st.id]) : [];

/* ================= Giao diện ================= */
const SVG = (p, w) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.6) + '" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + p + "</svg>";
const ICO_CHAY = '<path d="M8 5v14l11-7z"/>', ICO_DUNG = '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>';
const KHUNG = `
<div class="vt3 h3">
  <header class="vt3Dau"><div class="vt3Ten"><h2>Hình 3D</h2></div></header>
  <div class="h3Vung">
    <aside class="h3Khoi h3Chon" aria-label="Chọn hình">
      <div class="h3Tim">${SVG('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 2)}
        <input id="h3_tim" type="search" placeholder="Hình chóp,..." autocomplete="off" aria-label="Tìm hình"></div>
      <div class="h3Seg h3NhomTab" role="tablist" id="h3_nhomTab" aria-label="Nhóm hình">
        <button type="button" role="tab" data-nhom="dadien" aria-selected="true">Đa diện</button>
        <button type="button" role="tab" data-nhom="tronxoay" aria-selected="false">Tròn xoay</button>
        <button type="button" role="tab" data-nhom="ungdung" aria-selected="false">Ứng dụng 12</button>
      </div>
      <div class="h3Ds" id="h3_dsHinh"></div>
      <p class="h3ChuThich" id="h3_chuThich"></p>
    </aside>
    <section class="h3Khoi h3San" id="h3_san" aria-label="Khung vẽ 3D">
      <canvas id="h3_cv" tabindex="0" aria-label="Hình 3D. Kéo để xoay tự do, Shift hoặc chuột phải để dời hình, cuộn để phóng to, phím mũi tên để xoay."></canvas>
      <div class="h3Loi" id="h3_loiHinh" hidden></div>
      <div class="h3Hud h3HudTren">
        <div class="h3HudTen"><b id="h3_tenHinh"></b><span id="h3_tomTat"></span></div>
        <div class="h3GocNhin" role="group" aria-label="Góc nhìn">
          <button type="button" data-goc="sgk" class="dang" title="Phép chiếu song song xiên như hình vẽ SGK">Chuẩn SGK</button><button type="button" data-goc="vuong" title="Phép chiếu vuông góc, nhìn nghiêng">Vuông góc 3D</button><button type="button" data-goc="truoc">Mặt trước</button><button type="button" data-goc="tren">Từ trên xuống</button>
        </div>
      </div>
      <div class="h3Hud h3HudDuoi">
        <div class="h3CotTrai">
          <div class="h3GoiY" id="h3_goiY">Kéo: xoay tự do 360° · Shift / chuột phải: dời hình · Cuộn, chụm: phóng to</div>
          <div class="h3Thanh" id="h3_quet" hidden>
            <button type="button" id="h3_nQuet" aria-label="Chạy quét tạo khối" title="Chạy quét tạo khối">${SVG(ICO_CHAY, 2)}</button>
            <label for="h3_oQuet">Góc quét tạo khối</label><input type="range" id="h3_oQuet" min="1" max="360" step="1" value="360"><output id="h3_vQuet" for="h3_oQuet">360°</output>
          </div>
          <div class="h3Thanh" id="h3_moPhang" hidden>
            <button type="button" id="h3_nMoChay" aria-label="Trải phẳng" title="Trải phẳng">${SVG(ICO_CHAY, 2)}</button>
            <label for="h3_oMo">Trải phẳng / Gấp hình</label><input type="range" id="h3_oMo" min="0" max="100" step="1" value="0"><output id="h3_vMo" for="h3_oMo">0%</output>
          </div>
        </div>
        <div class="h3Dock" role="toolbar" aria-label="Công cụ khung vẽ">
          <div class="h3SegNho" role="group" aria-label="Chế độ chuột">
            <button type="button" id="h3_cdXoay" aria-pressed="true" title="Kéo để xoay hình">${SVG('<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4h-4"/>', 2)}Xoay</button><button type="button" id="h3_cdDoi" aria-pressed="false" title="Kéo để dời hình">${SVG('<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>', 1.8)}Dời</button>
          </div>
          <button type="button" class="h3NutDock" id="h3_nTuXoay" aria-pressed="false" title="Tự xoay quanh trục đứng">${SVG('<path d="M4 12a8 3.5 0 1 0 16 0"/><path d="M20 12a8 3.5 0 0 0-11-3.3"/><path d="M9 6l-.5 2.8L11.3 9"/>', 1.8)}Tự xoay</button>
          <button type="button" class="h3NutDock" id="h3_nDatLai" title="Đặt lại góc nhìn và khung hình">${SVG('<path d="M4 4v6h6"/><path d="M5 15a8 8 0 1 0 2-8.5L4 10"/>', 1.8)}Đặt lại</button>
          <button type="button" class="h3NutQuay" id="h3_nQuay" title="Quay video mọi thao tác trong khung vẽ"><i class="h3Cham"></i><span id="h3_chuQuay">Quay video</span></button>
        </div>
        <div class="h3Zoom"><button type="button" id="h3_nOxyz" class="h3NutOxyz" aria-pressed="false" title="Ẩn / hiện hệ trục Oxyz">Oxyz</button><button type="button" id="h3_phongTo" aria-label="Phóng to">+</button><button type="button" id="h3_thuNho" aria-label="Thu nhỏ">−</button></div>
      </div>
      <div class="h3Chip" id="h3_chipMat" hidden></div>
    </section>
    <aside class="h3Khoi h3Bang" aria-label="Bảng điều khiển">
      <div class="h3Seg h3BangTab" role="tablist" id="h3_bangTab">
        <button type="button" role="tab" data-th="thamSo" aria-selected="true">Tham số</button><button type="button" role="tab" data-th="oxyz" aria-selected="false">Oxyz</button><button type="button" role="tab" data-th="toMau" aria-selected="false">Tô màu</button><button type="button" role="tab" data-th="xuat" aria-selected="false">Hiển thị &amp; Xuất</button>
      </div>
      <div class="h3Than">
        <section data-th="thamSo"><div id="h3_dsThamSo" class="h3Truong" style="gap:12px"></div><div class="h3TheTich" id="h3_theTich"></div></section>
        <section data-th="oxyz" hidden>
          <label class="h3Bat"><input type="checkbox" id="h3_oOxyz"><span>Hiện hệ trục Oxyz</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oLuoi"><span>Lưới mặt phẳng Oxy (ô đơn vị)</span></label>
          <p class="h3Ghi">Hệ trục tay phải, <b>Oz hướng lên</b>; ở góc chuẩn SGK: Ox chéo ra phía trước, Oy sang phải. Phần trục nằm trong khối tự vẽ nét đứt.</p>
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
          <div class="h3Truong"><div class="h3DongNhan"><label for="h3_oDoDam">Độ đậm nét vẽ</label><output id="h3_vDoDam">100%</output></div><input type="range" id="h3_oDoDam" min="60" max="180" step="10" value="100"></div>
          <label class="h3Bat"><input type="checkbox" id="h3_oKhuat" checked><span>Nét khuất vẽ nét đứt (chuẩn SGK)</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oNhan" checked><span>Nhãn đỉnh, tên điểm (tự tránh đè nét)</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oPhu" checked><span>Đường phụ (đường cao, tâm, đường chéo)</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oLuoiMat"><span>Đường lưới trên mặt cong</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oGiuDung"><span>Giữ Oz thẳng đứng khi xoay (tắt = xoay tự do mọi hướng)</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oGiay"><span>Xem trên nền giấy in (nền trắng, nét đen)</span></label>
          <h3>Xuất</h3>
          <button type="button" class="h3NutChinh" id="h3_nTikz">Tạo mã TikZ từ góc nhìn này</button>
          <textarea class="h3Ma" id="h3_maTikz" readonly spellcheck="false" aria-label="Mã TikZ"></textarea>
          <div class="h3HangNut"><button type="button" class="h3Nut" id="h3_nCopy">Copy mã TikZ</button><button type="button" class="h3Nut" id="h3_nPng">Tải PNG nền trong suốt</button><span class="h3TtMa" id="h3_ttMa"></span></div>
          <button type="button" class="h3Nut h3NutVideo" id="h3_nVideo">${SVG('<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2.5v9L17 14"/>', 1.8)}Đưa hình này vào kịch bản video</button>
          <p class="h3Ghi">TikZ thuần cho pdflatex: toạ độ khai báo bằng <code>\\foreach</code>, nét thấy liền, nét khuất <code>dashed</code>, toạ độ dấu chấm, nhãn đỉnh đặt đúng hướng như trên hình.</p>
        </section>
      </div>
    </aside>
  </div>
</div>
<div class="h3Bao" id="h3_bao" role="status" hidden></div>`;

let baoHen = 0;
function bao(t) { let b = $("bao"); if (!b) { b = document.createElement("div"); b.className = "h3Bao"; b.id = "h3_bao"; b.setAttribute("role", "status"); document.body.appendChild(b); } b.textContent = t; b.hidden = false; clearTimeout(baoHen); baoHen = setTimeout(() => b.hidden = true, 2600); }

/* ================= Dựng cảnh ================= */
function dungCanh() {
  try { canh = K.dungCanh({ id: st.id, P: st.P, neo: st.neo, off: st.off, moT: st.moT }); st.neo = canh.neo; st.loi = ""; if (st.moT > 0 && !canh.mo) st.moT = 0; return true; }
  catch (e) { st.loi = e.message; return false; }
}
const tuyChon = () => ({ giay: st.giay, che: st.che, khuat: st.khuat, nhan: st.nhan, phu: st.phu, luoiMat: st.luoiMat, oxyz: st.oxyz, luoiOxy: st.luoiOxy, hover: st.hover, mau: mauHT(), diem: layDiem(), doDam: st.doDam, nhanh: st.nhanh, xien: !!cam.xien });
/* đang thao tác: vẽ nhanh (lấy mẫu nét thưa hơn), dừng 140 ms thì vẽ lại nét tinh */
function tuongTac() { st.nhanh = true; clearTimeout(henNet); henNet = setTimeout(() => { st.nhanh = false; yeuCau(); }, 140); }

/* ================= Vẽ màn hình ================= */
function veManHinh() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  if (!canh) return;
  st.frame = K.ve(ctx, canh, cam, cv.width, cv.height, dpr, tuyChon());
  if (st.keoGan && st.frame && st.moT === 0) { // tay nắm nâng hạ đỉnh
    const x = canh.nhan.find(([n]) => n === st.keoGan.nhan); if (x) { const q = st.frame.prj(x[1]), k = dpr, s = 7 * k;
      ctx.save(); ctx.strokeStyle = "#F59E0B"; ctx.fillStyle = "#F59E0B"; ctx.lineWidth = 2.2 * k; ctx.beginPath(); ctx.arc(q[0], q[1], 10 * k, 0, 7); ctx.stroke();
      [[-1, -20], [1, 20]].forEach(([d, oy]) => { const y0 = q[1] + oy * k; ctx.beginPath(); ctx.moveTo(q[0] + 18 * k, y0); ctx.lineTo(q[0] + 18 * k - s * .6, y0 - d * s); ctx.lineTo(q[0] + 18 * k + s * .6, y0 - d * s); ctx.closePath(); ctx.fill(); });
      ctx.beginPath(); ctx.moveTo(q[0] + 18 * k, q[1] - 14 * k); ctx.lineTo(q[0] + 18 * k, q[1] + 14 * k); ctx.stroke(); ctx.restore(); }
  }
}
function yeuCau() { if (!choVe && daDung) { choVe = true; requestAnimationFrame(khungHinh); } }
function khungHinh(t) {
  choVe = false; let tiep = false; const dt = tLan ? Math.min(.05, (t - tLan) / 1000) : 0; tLan = t;
  if (cam.anim) { const a = cam.anim, u = Math.min(1, (t - a.t0) / a.dur), e = eIO(u);
    cam.q = slerp(a.q0, a.q1, e); cam.zoom = a.z0 + (a.z1 - a.z0) * e; cam.px = a.x0 + (a.x1 - a.x0) * e; cam.py = a.y0 + (a.y1 - a.y0) * e;
    if (u >= 1) cam.anim = null; else tiep = true; tuongTac(); }
  else if (Math.abs(cam.vx) + Math.abs(cam.vy) > .05) { xoayCam(cam.vx, cam.vy); cam.vx *= .92; cam.vy *= .92; tiep = true; tuongTac(); }
  if (st.tuXoay && !cam.anim) { xoayQuanhOz(32 * DEG * dt); tiep = true; tuongTac(); }
  if (moAnim && canh && canh.coMo) { const u = Math.min(1, (t - moAnim.t0) / moAnim.dur);
    datMo(moAnim.tu + (moAnim.den - moAnim.tu) * eIO(u), true); tuongTac();
    if (u >= 1) { const den = moAnim.den; moAnim = null; capNutMo(); if (den === 0) denGoc(canh.moHam ? "giu" : "sgk"); else denGoc("giu"); } else tiep = true; }
  if (quetAnim && canh) { const u = Math.min(1, (t - quetAnim.t0) / quetAnim.dur), v = Math.max(1, Math.round(quetAnim.tu + (360 - quetAnim.tu) * eIO(u)));
    if (v !== +st.P.quet) datQuet(v, true); tuongTac();
    if (u >= 1) { quetAnim = null; capNutQuet(); } else tiep = true; }
  if (sk.offsetParent !== null) veManHinh(); if (tiep) yeuCau(); else tLan = 0;
}
function coKhung() { const r = sk.getBoundingClientRect(); if (!r.width) return; dpr = Math.min(2.5, window.devicePixelRatio || 1); cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr)); yeuCau(); }
/* xoay quanh tâm hình (không bị ghim vào gốc toạ độ): giữ nguyên vị trí của tâm trên màn hình */
function giuTam(doi) {
  if (!canh) { doi(); return; } const c = canh.tam, M0 = K.maTranChieu(cam.q, cam.xien), x0 = dot(M0.r0, c), y0 = dot(M0.r1, c);
  doi(); const M1 = K.maTranChieu(cam.q, cam.xien);
  cam.px += (x0 - dot(M1.r0, c)) * cam.zoom; cam.py -= (y0 - dot(M1.r1, c)) * cam.zoom;
}
function xoayCam(dx, dy) { const k = .0085; giuTam(() => {
  cam.q = st.giuDung ? qNorm(qMul(qAxis([1, 0, 0], dy * k), qMul(cam.q, qAxis([0, 0, 1], dx * k)))) : qNorm(qMul(qAxis([1, 0, 0], dy * k), qMul(qAxis([0, 1, 0], dx * k), cam.q))); }); }
function xoayQuanhOz(a) { giuTam(() => { cam.q = qNorm(qMul(cam.q, qAxis([0, 0, 1], a))); }); }
const vuaKhung = (q, xien) => canh ? K.vuaKhung(canh, q, sk.clientWidth || 600, sk.clientHeight || 500, { oxyz: st.oxyz, moT: st.moT, diem: layDiem(), xien, leX: 130, leY: 330, dy: -62 }) : { zoom: cam.zoom, px: 0, py: 0 };
function denGoc(ten, tucThi) {
  let q1 = cam.q, xien = cam.xien;
  if (ten !== "giu") { const g = K.camGoc(ten, canh); q1 = g.q; xien = g.xien; sk.querySelectorAll(".h3GocNhin button").forEach(b => b.classList.toggle("dang", b.dataset.goc === ten)); }
  const f = vuaKhung(q1, xien); cam.vx = cam.vy = 0; cam.xien = xien;
  if (tucThi || giamDong) { cam.q = q1; cam.zoom = f.zoom; cam.px = f.px; cam.py = f.py; cam.anim = null; yeuCau(); return; }
  cam.anim = { t0: performance.now(), dur: 520, q0: cam.q, q1, z0: cam.zoom, z1: f.zoom, x0: cam.px, x1: f.px, y0: cam.py, y1: f.py }; yeuCau();
}
function zoomTai(sx, sy, f) {
  const W = sk.clientWidth, H = sk.clientHeight, nz = Math.max(4, Math.min(4000, cam.zoom * f));
  const cx = (sx - W / 2 - cam.px) / cam.zoom, cy = (sy - H / 2 - cam.py) / cam.zoom;
  cam.px = sx - W / 2 - cx * nz; cam.py = sy - H / 2 - cy * nz; cam.zoom = nz; tuongTac(); yeuCau();
}
function datCheDo(cd) { st.cheDo = cd; $("cdXoay").setAttribute("aria-pressed", cd === "xoay"); $("cdDoi").setAttribute("aria-pressed", cd === "doi"); sk.classList.toggle("cheDoi", cd === "doi"); }

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
      keo = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, doi: e.button === 1 || e.button === 2 || e.shiftKey || st.cheDo === "doi", dich: false, nut: e.button, vx: 0, vy: 0, t: performance.now(), nang: tn, giaTri: tn ? +st.P[tn.k] : 0 }; }
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
    tuongTac();
    if (keo.nang) { // kéo dọc màn hình → đổi chiều cao theo trục Oz
      const M = K.maTranChieu(cam.q, cam.xien), lenZ = Math.max(.25, M.r1[2]), h = keo.nang, v = Math.round(Math.min(h.max, Math.max(h.min, keo.giaTri - (e.clientY - keo.y0) / (cam.zoom * lenZ))) * 10) / 10;
      if (v !== +st.P[h.k]) { st.P[h.k] = v; if (dungCanh()) { capNhatThamSoNhanh(h.k); veTheTich(); capNhatTen(); } }
      const chip = $("chipMat"); chip.innerHTML = "Nâng hạ đỉnh " + esc(h.nhan) + " · " + h.ten + " = <b>" + so(v) + "</b>"; chip.hidden = false; yeuCau(); return; }
    if (keo.doi) { cam.px += dx; cam.py += dy; } else { xoayCam(dx, dy); keo.vx = dx; keo.vy = dy; keo.t = performance.now(); }
    yeuCau();
  });
  const tha = e => {
    if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId);
    if (ptr.size < 2) chum = null;
    if (ptr.size === 0) { sk.classList.remove("keo");
      if (keo && keo.nang) { $("chipMat").hidden = true; veDsDiem(); }
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
    if (m) { e.preventDefault(); cam.anim = null; if (e.shiftKey || st.cheDo === "doi") { cam.px -= Math.sign(m[0]) * 30; cam.py -= Math.sign(m[1]) * 30; } else xoayCam(m[0], m[1]); tuongTac(); yeuCau(); }
    else if (e.key === "+" || e.key === "=") zoomTai(sk.clientWidth / 2, sk.clientHeight / 2, 1.15);
    else if (e.key === "-") zoomTai(sk.clientWidth / 2, sk.clientHeight / 2, 1 / 1.15);
    else if (e.key === "0") denGoc("sgk");
  });
  $("phongTo").onclick = () => zoomTai(sk.clientWidth / 2, sk.clientHeight / 2, 1.2);
  $("thuNho").onclick = () => zoomTai(sk.clientWidth / 2, sk.clientHeight / 2, 1 / 1.2);
  sk.querySelectorAll(".h3GocNhin button").forEach(b => b.onclick = () => denGoc(b.dataset.goc));
  $("nDatLai").onclick = () => { st.tuXoay = false; $("nTuXoay").setAttribute("aria-pressed", "false"); denGoc("sgk"); };
  $("cdXoay").onclick = () => datCheDo("xoay"); $("cdDoi").onclick = () => datCheDo("doi");
  $("nTuXoay").onclick = () => { st.tuXoay = !st.tuXoay; $("nTuXoay").setAttribute("aria-pressed", st.tuXoay); tLan = 0; yeuCau(); };
  $("nQuay").onclick = () => st.quay ? dungQuay() : batQuay();
  new ResizeObserver(coKhung).observe(sk);
}
let hoverHen = 0;
function capNhatHover(x, y) {
  if (hoverHen) return; hoverHen = requestAnimationFrame(() => {
    hoverHen = 0; const F = st.frame; if (!F || !canh) return;
    const tn = tayNamGan(x, y), chip = $("chipMat");
    if (tn !== st.keoGan) { st.keoGan = tn; sk.classList.toggle("nangHa", !!tn); yeuCau(); }
    if (tn) { chip.innerHTML = "Kéo lên / xuống để nâng hạ đỉnh " + esc(tn.nhan) + " (" + tn.ten + " = " + so(+st.P[tn.k]) + ")"; chip.hidden = false; return; }
    const g = F.chon(x * dpr, y * dpr);
    if (g !== st.hover || chip.hidden !== (g < 0)) {
      st.hover = g;
      if (g < 0) chip.hidden = true;
      else { const m = mauHT()[g] || canh.g[g].mau; chip.innerHTML = '<i style="background:' + (m ? m.c : "#B0C4E0") + '"></i>' + esc(canh.g[g].ten) + (st.but ? " · bấm để tô" : ""); chip.hidden = false; }
      document.querySelectorAll("#h3_dsMat .h3DongMat").forEach(d => d.classList.toggle("dangChi", +d.dataset.g === g));
      yeuCau();
    }
  });
}

/* ================= Quay video khung vẽ (MediaRecorder: ưu tiên MP4, dự phòng WebM) ================= */
function chonDinhDang() {
  const ds = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return ds.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || "";
}
function batQuay() {
  if (!window.MediaRecorder || !cv.captureStream) { bao("Trình duyệt này chưa hỗ trợ quay video — hãy dùng Chrome, Edge hoặc Safari mới"); return; }
  const tl = Math.min(1, 1920 / cv.width), W = Math.round(cv.width * tl / 2) * 2, H = Math.round(cv.height * tl / 2) * 2;
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  const loai = chonDinhDang(), luong = c.captureStream(60);
  let rec; try { rec = new MediaRecorder(luong, loai ? { mimeType: loai, videoBitsPerSecond: 8e6 } : { videoBitsPerSecond: 8e6 }); } catch (e) { bao("Không mở được bộ quay video: " + e.message); return; }
  const manh = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) manh.push(e.data); };
  rec.onstop = () => {
    const kieu = (rec.mimeType || loai || "video/webm").split(";")[0], duoi = kieu.includes("mp4") ? "mp4" : "webm", blob = new Blob(manh, { type: kieu });
    const a = document.createElement("a"), d = new Date(), p = n => String(n).padStart(2, "0");
    a.href = URL.createObjectURL(blob); a.download = "hinh3d-" + st.id + "-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + "." + duoi;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    bao("Đã tải video " + duoi.toUpperCase() + " (" + (blob.size / 1048576).toFixed(1).replace(".", ",") + " MB)");
  };
  st.quay = { rec, c, x, t0: performance.now(), W, H, tl };
  rec.start(500); sk.classList.add("dangQuay"); $("nQuay").setAttribute("aria-pressed", "true");
  const vong = () => {
    const q = st.quay; if (!q) return;
    const g = q.x; g.setTransform(1, 0, 0, 1, 0, 0);
    if (st.giay) { g.fillStyle = "#fff"; g.fillRect(0, 0, q.W, q.H); }
    else { const gr = g.createRadialGradient(q.W / 2, q.H * .45, 10, q.W / 2, q.H / 2, Math.max(q.W, q.H) * .75); gr.addColorStop(0, "#15265a"); gr.addColorStop(1, "#050b1d"); g.fillStyle = gr; g.fillRect(0, 0, q.W, q.H); }
    g.drawImage(cv, 0, 0, q.W, q.H);
    const k = q.W / 1280, mau = st.giay ? "rgba(15,23,42," : "rgba(226,232,240,";
    g.font = "700 " + 26 * k + "px " + '"Be Vietnam Pro",system-ui,sans-serif'; g.textBaseline = "top"; g.textAlign = "left"; g.fillStyle = mau + ".95)"; g.fillText(canh ? canh.ten : "", 26 * k, 22 * k);
    g.font = "600 " + 16 * k + "px " + '"Be Vietnam Pro",system-ui,sans-serif'; g.textAlign = "right"; g.textBaseline = "bottom"; g.fillStyle = mau + ".55)"; g.fillText("KMath · ThS. Trương Đăng Khoa", q.W - 22 * k, q.H - 16 * k);
    const s = Math.floor((performance.now() - q.t0) / 1000); $("chuQuay").textContent = "Dừng & tải video " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    requestAnimationFrame(vong);
  };
  requestAnimationFrame(vong);
  bao("Đang quay — mọi thao tác xoay, dời, trải phẳng, quét, tô màu đều được ghi lại");
}
function dungQuay() {
  const q = st.quay; if (!q) return; st.quay = null;
  try { q.rec.stop(); } catch (e) {}
  sk.classList.remove("dangQuay"); $("nQuay").setAttribute("aria-pressed", "false"); $("chuQuay").textContent = "Quay video";
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
  box.innerHTML = canh.g.map((g, i) => { const c = m[i] || g.mau, rieng = !!m[i];
    return '<div class="h3DongMat" data-g="' + i + '"><button type="button" class="ten" data-to="' + i + '" title="Tô mặt này bằng màu đang chọn"><span class="cham" style="background:' + (c ? c.c : "rgba(176,196,224,.55)") + ";opacity:" + (c ? .35 + .65 * c.a : 1) + '"></span><span class="tenM">' + esc(g.ten) + "</span></button>"
      + (rieng ? "<small>" + Math.round(c.a * 100) + '%</small><button type="button" class="xoa" data-xoa="' + i + '" aria-label="Xóa màu ' + esc(g.ten) + '">×</button>' : "<small></small><span></span>") + "</div>"; }).join("");
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
    html += '<button type="button" class="h3Muc" data-id="' + m.id + '"' + (m.dung ? "" : ' disabled title="Sẽ bổ sung"') + ' aria-current="' + (m.id === st.id) + '"><span class="ico">' + SVG(ICO[m.ico] || ICO.chop) + "</span><span>" + esc(m.ten) + "</span>" + (m.dung ? "<span></span>" : '<span class="sap">Sắp có</span>') + "</button>";
  }
  box.innerHTML = html;
  box.querySelectorAll(".h3Muc:not(:disabled)").forEach(b => b.onclick = () => chonHinh(b.dataset.id));
}
function chonHinh(id, dauTien) {
  const m = MUC_ID[id]; if (!m || !m.dung) return;
  st.id = id; st.P = st.PTheo[id] || (st.PTheo[id] = K.macDinh(id)); st.moT = 0; moAnim = null; quetAnim = null;
  if (!dungCanh()) { hienLoi(); return; }
  $("oMo").value = 0; $("vMo").textContent = "0%"; capThanh(); capNutMo(); capNutQuet();
  veDsHinh(); veThamSo(); veNeo(); veDsMat(); capNhatTen(); hienLoi();
  denGoc("sgk", dauTien);
}
function capThanh() { // hiện thanh góc quét (khối tròn xoay) và thanh trải phẳng (khối có hình trải)
  const coQuet = !!(canh && canh.coQuet), q = coQuet ? +st.P.quet : 360;
  $("quet").hidden = !coQuet; if (coQuet) { $("oQuet").value = q; $("vQuet").textContent = q + "°"; }
  $("moPhang").hidden = !(canh && canh.coMo) && !(coQuet && ["tru", "non", "nonCut"].includes(MUC_ID[st.id].dung));
  const khoa = coQuet && q < 360; $("oMo").disabled = khoa; $("nMoChay").disabled = khoa;
  $("moPhang").title = khoa ? "Quét đủ 360° để trải phẳng" : "";
}

/* ================= Bảng tham số ================= */
function veThamSo() {
  const bd = B[MUC_ID[st.id].dung], P = st.P, box = $("dsThamSo"); let html = "";
  for (const t of bd.tham) {
    if (t.hien && !t.hien(P)) continue;
    const ten = typeof t.ten === "function" ? t.ten(P) : t.ten, id = "h3_ts_" + t.k;
    if (t.loai === "chon") html += '<div class="h3Truong"><label for="' + id + '">' + esc(ten) + '</label><select id="' + id + '" data-k="' + t.k + '">' + t.ds.map(([v, n]) => '<option value="' + v + '"' + (String(P[t.k]) === String(v) ? " selected" : "") + ">" + esc(n) + "</option>").join("") + "</select></div>";
    else if (t.loai === "so") html += '<div class="h3Truong"><div class="h3DongNhan"><label for="' + id + '">' + esc(ten) + '</label><output id="' + id + '_v">' + so(P[t.k]) + (t.don || "") + '</output></div><input type="range" id="' + id + '" data-k="' + t.k + '" min="' + t.min + '" max="' + t.max + '" step="' + t.buoc + '" value="' + P[t.k] + '"></div>';
    else if (t.loai === "mau") html += '<div class="h3Truong"><label for="' + id + '">' + esc(ten) + '</label><select id="' + id + '" data-mau="1"><option value="">— Chọn mẫu —</option>' + MAU_F.map((x, i) => '<option value="' + i + '">' + esc(x[3]) + "</option>").join("") + "</select></div>";
    else if (t.loai === "ham") html += '<div class="h3Truong"><label for="' + id + '">' + esc(ten) + '</label><input type="text" class="h3Ham' + (st.loi ? " sai" : "") + '" id="' + id + '" data-k="' + t.k + '" value="' + esc(P[t.k]) + '" autocomplete="off" spellcheck="false"><p class="h3Ghi">Ví dụ: <code>sqrt(x)</code>, <code>x^2/4 + 1</code>, <code>2 + sin(x)</code>, <code>e^(-x)</code>' + (P.kieu === "xg" ? " — biến là <code>y</code>" : "") + "</p>" + (st.loi ? '<p class="h3LoiMuc" role="alert">' + esc(st.loi) + "</p>" : "") + "</div>";
    else if (t.loai === "nhap") html += (t.k === "a" ? '<div class="h3Hai">' : "") + '<div class="h3Truong"><label for="' + id + '">' + esc(ten) + '</label><input type="number" id="' + id + '" data-k="' + t.k + '" step="0.1" value="' + P[t.k] + '"></div>' + (t.k === "b" ? "</div>" : "");
    else if (t.loai === "bat") html += '<label class="h3Bat"><input type="checkbox" id="' + id + '" data-k="' + t.k + '"' + (P[t.k] ? " checked" : "") + "><span>" + esc(ten) + "</span></label>";
  }
  box.innerHTML = html;
  box.querySelectorAll("select[data-k]").forEach(s => s.onchange = () => { const t = bd.tham.find(x => x.k === s.dataset.k); P[s.dataset.k] = s.value; if (t.datLai) { st.mauTheo[st.id] = {}; st.hoanTac[st.id] = []; } st.moT = 0; doiThamSo(true, true, s.dataset.k === "truc"); });
  box.querySelectorAll("input[type=range]").forEach(s => s.oninput = () => { const t = bd.tham.find(x => x.k === s.dataset.k); P[s.dataset.k] = +s.value; $("ts_" + s.dataset.k + "_v").textContent = so(+s.value) + (t.don || ""); tuongTac(); doiThamSo(false); });
  box.querySelectorAll("input[type=range]").forEach(s => s.onchange = () => veDsDiem());
  box.querySelectorAll("input[type=number]").forEach(s => s.onchange = () => { P[s.dataset.k] = s.value; doiThamSo(false, true); });
  box.querySelectorAll("input[type=checkbox][data-k]").forEach(s => s.onchange = () => { P[s.dataset.k] = s.checked; doiThamSo(false); });
  let hen = 0;
  box.querySelectorAll("input.h3Ham").forEach(s => s.oninput = () => { clearTimeout(hen); hen = setTimeout(() => { P.f = s.value; doiThamSo(false, true); }, 380); });
  box.querySelectorAll("select[data-mau]").forEach(s => s.onchange = () => { const x = MAU_F[+s.value]; if (!x) return; P.f = x[0]; P.a = x[1]; P.b = x[2]; P.kieu = x[4] || "yf"; if (x[5]) P.truc = x[5]; doiThamSo(true, true); });
  veTheTich();
}
function capNhatThamSoNhanh(k) { const s = $("ts_" + k); if (s) { s.value = st.P[k]; const o = $("ts_" + k + "_v"); if (o) o.textContent = so(+st.P[k]); } }
function doiThamSo(veLaiBang, vuaKhungLai, doiGoc) {
  const soMat = canh ? canh.g.length : 0, ok = dungCanh(), o = document.querySelector("#h3_dsThamSo input.h3Ham");
  if (ok) { if (veLaiBang) veThamSo(); else veTheTich(); veNeo(); if (canh.g.length !== soMat || veLaiBang) veDsMat(); capNhatTen(); capThanh();
    if (doiGoc) denGoc("sgk"); else if (vuaKhungLai) denGoc("giu");
    if (o) { o.classList.remove("sai"); const p = o.parentElement.querySelector(".h3LoiMuc"); if (p) p.remove(); } }
  else if (o) { o.classList.add("sai"); let p = o.parentElement.querySelector(".h3LoiMuc"); if (!p) { p = document.createElement("p"); p.className = "h3LoiMuc"; p.setAttribute("role", "alert"); o.parentElement.appendChild(p); } p.textContent = st.loi; }
  else bao(st.loi);
  yeuCau();
}
function veTheTich() { if (!canh) return; $("theTich").innerHTML = '<div class="so"><span>Thể tích</span><b>V ≈ ' + so(canh.V) + '</b></div><div class="ct">' + esc(canh.ct || "") + "</div>" + (canh.tt ? '<p class="h3Ghi">' + esc(canh.tt) + "</p>" : "") + (canh.ghiChu ? '<p class="h3CanhBao">' + esc(canh.ghiChu) + "</p>" : ""); }
function capNhatTen() { $("tenHinh").textContent = canh.ten; $("tomTat").textContent = "V ≈ " + so(canh.V) + " · " + canh.g.length + " mặt logic"; }
function hienLoi() { const e = $("loiHinh"); if (st.loi && !canh) { e.textContent = st.loi; e.hidden = false; } else e.hidden = true; }

/* ================= Góc quét tạo khối ================= */
function datQuet(v, tuAnim) {
  st.P.quet = Math.max(1, Math.min(360, Math.round(v))); st.moT = 0;
  const soMat = canh ? canh.g.length : 0;
  if (dungCanh()) { if (canh.g.length !== soMat) veDsMat(); veTheTich(); capNhatTen(); }
  $("oQuet").value = st.P.quet; $("vQuet").textContent = st.P.quet + "°"; capThanh();
  if (!tuAnim) { tuongTac(); yeuCau(); }
}
function capNutQuet() { const b = $("nQuet"), chay = !!quetAnim; b.innerHTML = SVG(chay ? ICO_DUNG : ICO_CHAY, 2); b.setAttribute("aria-label", chay ? "Dừng quét" : "Chạy quét tạo khối từ 0°"); b.title = b.getAttribute("aria-label"); }

/* ================= Oxyz, toạ độ điểm ================= */
function veNeo() {
  const box = $("dsNeo");
  box.innerHTML = canh.neoDs.map(n => '<label><input type="radio" name="h3neo" value="' + n.k + '"' + (n.k === st.neo ? " checked" : "") + "><span>" + esc(n.ten) + "</span></label>").join("");
  box.querySelectorAll("input").forEach(r => r.onchange = () => { st.neo = r.value; dungCanh(); veDsMat(); veDsDiem(); denGoc("giu"); khoaToaDo(); });
  khoaToaDo(); veDsDiem();
}
function khoaToaDo() { const t = st.neo === "tuChon"; ["x0", "y0", "z0"].forEach(id => $(id).disabled = !t); }
function datOxyz(v) { st.oxyz = v; $("oOxyz").checked = v; $("nOxyz").setAttribute("aria-pressed", v); denGoc("giu"); }
function tenCacDiem() { const ds = []; (canh ? canh.nhan0 : []).forEach(([n]) => { if (!ds.includes(n)) ds.push(n); }); return ds; }
function baoLoiDiem(t) { const e = $("loiDiem"); e.textContent = t || ""; e.hidden = !t; }
function themDiem(txt) {
  const s = String(txt).trim(); baoLoiDiem(""); if (!s || !canh) return;
  const m = s.match(/^([A-Za-z][A-Za-z0-9']*)\s*\((.*)\)\s*$/); let muc;
  if (m) {
    const body = m[2].trim(), parts = body.includes(";") ? body.split(";").map(x => x.replace(",", ".")) : body.split(","), v = parts.map(x => Number(x.trim()));
    if (parts.length !== 3 || v.some((x, i) => !isFinite(x) || parts[i].trim() === "")) { baoLoiDiem("Cần đủ 3 toạ độ, ví dụ M(1; 2; 3) hoặc M(1,5; -2; 0)."); return; }
    if (tenCacDiem().includes(m[1])) { baoLoiDiem("Điểm " + m[1] + " đã có trên hình — chỉ cần nhập “" + m[1] + "” để xem toạ độ."); return; }
    if (v.some(x => Math.abs(x) > 50)) { baoLoiDiem("Toạ độ quá lớn (tối đa ±50)."); return; }
    muc = { ten: m[1], p: v, rieng: true };
  } else {
    const ds = tenCacDiem(), ten = ds.find(n => n === s) || ds.find(n => n.toLowerCase() === s.toLowerCase());
    if (!ten) { baoLoiDiem("Hình này không có điểm “" + s + "”." + (ds.length ? " Các điểm: " + ds.join(", ") + "." : "") + " Hoặc nhập điểm mới dạng M(1; 2; 3)."); return; }
    muc = { ten };
  }
  const ds = st.diemHien[st.id] || (st.diemHien[st.id] = []), i = ds.findIndex(d => d.ten === muc.ten);
  if (i >= 0) ds.splice(i, 1); ds.push(muc);
  if (!st.oxyz) datOxyz(true);
  $("oDiem").value = ""; veDsDiem(); denGoc("giu");
}
function veDsDiem() {
  if (!canh) return;
  $("dsTenDiem").innerHTML = tenCacDiem().map(n => '<option value="' + esc(n) + '">').join("");
  $("dsDiemHien").innerHTML = layDiem().map(d => '<span class="h3ChipDiem"><b>' + esc(d.ten) + "</b>" + K.toaDoChu(d.p) + (d.rieng ? " <small>tự nhập</small>" : "") + '<button type="button" data-bo="' + esc(d.ten) + '" aria-label="Bỏ điểm ' + esc(d.ten) + '">×</button></span>').join("");
  $("dsDiemHien").querySelectorAll("[data-bo]").forEach(b => b.onclick = () => { const ds = st.diemHien[st.id] || []; const i = ds.findIndex(d => d.ten === b.dataset.bo); if (i >= 0) ds.splice(i, 1); veDsDiem(); yeuCau(); });
  const daCo = new Set();
  $("bangDiem").innerHTML = canh.nhan0.length ? "<table><thead><tr><th>Điểm</th><th>x</th><th>y</th><th>z</th></tr></thead><tbody>" + canh.nhan0.filter(([n]) => !daCo.has(n) && daCo.add(n)).map(([n, p]) => '<tr data-ten="' + esc(n) + '" tabindex="0"><td><b>' + esc(n) + "</b></td><td>" + so(p[0]) + "</td><td>" + so(p[1]) + "</td><td>" + so(p[2]) + "</td></tr>").join("") + "</tbody></table>" : '<p class="h3Ghi">Khối này không đặt tên đỉnh.</p>';
  $("bangDiem").querySelectorAll("tr[data-ten]").forEach(r => { r.onclick = () => themDiem(r.dataset.ten); r.onkeydown = e => { if (e.key === "Enter") themDiem(r.dataset.ten); }; });
  $("ghiMo").hidden = !(canh.coMo && st.moT > 0);
}

/* ================= Trải phẳng ================= */
function datMo(t, tuAnim) {
  t = Math.max(0, Math.min(1, t)); if (!canh || !canh.coMo) return;
  if (t > 0 && !K.damBaoMo(canh)) { bao("Khối này chưa trải phẳng được"); return; }
  st.moT = t; K.apDungMo(canh, t); const pc = Math.round(t * 100); $("oMo").value = pc; $("vMo").textContent = pc + "%"; $("ghiMo").hidden = !(t > 0);
  if (!tuAnim) { capNutMo(); tuongTac(); yeuCau(); }
}
function capNutMo() { const chay = !!moAnim, mo = st.moT >= .5, b = $("nMoChay"); b.innerHTML = SVG(chay ? ICO_DUNG : mo ? '<path d="M4 20 20 4M4 4h7M4 4v7"/>' : ICO_CHAY, 2); b.setAttribute("aria-label", chay ? "Dừng" : mo ? "Gấp lại thành khối" : "Trải phẳng"); b.title = b.getAttribute("aria-label"); }

/* ================= Xuất TikZ, PNG ================= */
function taoTikz() { if (!canh || !st.frame) return ""; const ma = K.taoTikz(canh, st.frame, Object.assign(tuyChon(), { nhanh: false })); $("maTikz").value = ma; $("ttMa").textContent = ma.split("\n").length + " dòng · " + (ma.length / 1024).toFixed(1).replace(".", ",") + " KB"; return ma; }
function taiPng() {
  const W = Math.round(sk.clientWidth * 3), H = Math.round(sk.clientHeight * 3), c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  K.ve(x, canh, cam, W, H, 3, Object.assign(tuyChon(), { giay: true, hover: -1, nhanh: false }));
  const im = x.getImageData(0, 0, W, H).data; let mnx = W, mny = H, mxx = 0, mxy = 0;
  for (let y = 0; y < H; y += 2) for (let xx = 0; xx < W; xx += 2) if (im[(y * W + xx) * 4 + 3] > 8) { if (xx < mnx) mnx = xx; if (xx > mxx) mxx = xx; if (y < mny) mny = y; if (y > mxy) mxy = y; }
  if (mxx <= mnx) { bao("Hình đang nằm ngoài khung — hãy bấm Đặt lại"); return; }
  const pad = 24, cw = Math.min(W, mxx - mnx + 2 * pad), ch = Math.min(H, mxy - mny + 2 * pad), o = document.createElement("canvas"); o.width = cw; o.height = ch;
  o.getContext("2d").drawImage(c, Math.max(0, mnx - pad), Math.max(0, mny - pad), cw, ch, 0, 0, cw, ch);
  const a = document.createElement("a"); a.href = o.toDataURL("image/png"); a.download = "hinh3d-" + st.id + ".png"; document.body.appendChild(a); a.click(); a.remove();
  bao("Đã tải PNG " + cw + " × " + ch + " px (nền trong suốt)");
}

/* ================= Đưa vào video ================= */
const TEN_MAU_VD = { vang: "#FFC94D", do: "#FF5A5F", xanh: "#4FB3FF", luc: "#4ADE80", hong: "#FF7EB6", cam: "#FF9F43", tim: "#B794F6", cyan: "#5EEBFF" };
const TV_MAU = { vang: "vàng", do: "đỏ", xanh: "xanh", luc: "lục", hong: "hồng", cam: "cam", tim: "tím", cyan: "cyan" };
const mauGan = hex => { const c = K.hexRgb(hex); let best = "xanh", d = 1e9; for (const [k, h] of Object.entries(TEN_MAU_VD)) { const e = K.hexRgb(h), dd = (c[0] - e[0]) ** 2 + (c[1] - e[1]) ** 2 + (c[2] - e[2]) ** 2; if (dd < d) { d = dd; best = k; } } return TV_MAU[best]; };
const soLenh = v => String(Math.round(v * 100) / 100).replace(".", ",");
const tenLenh = id => MUC_ID[id].ten.toLowerCase();
function lenhTuTab() {
  const id = st.id, bd = B[MUC_ID[id].dung], md = K.macDinh(id), P = st.P, ts = [];
  if (canh && canh.coQuet) ts.push("quét 4");
  ts.push("xoay 360 5"); if (canh && canh.coMo && !(canh.coQuet && +P.quet < 360)) { ts.push("trải 3"); ts.push("giữ 3"); }
  if (cam.xien) ts.push("xiên");
  else { const R = qToMat(cam.q), d = R[2], th = Math.round(Math.atan2(d[1], d[0]) / DEG), ph = Math.round(Math.asin(Math.max(-1, Math.min(1, d[2]))) / DEG); ts.push("góc " + th + " " + ph); }
  if (st.che !== "dac") ts.push(st.che === "trong" ? "trong suốt" : "khung dây");
  if (st.oxyz) ts.push("oxyz"); if (!st.nhan) ts.push("không nhãn");
  const nd = [tenLenh(id)];
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
    $("chuThich").innerHTML = "Đủ <b>" + MUC.filter(m => m.dung).length + "</b> hình · 3 nhóm · trải phẳng, quét tạo khối, quay video";
    $("bangTab").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
      document.querySelectorAll("#h3_bangTab button").forEach(x => x.setAttribute("aria-selected", x === b));
      goc.querySelectorAll(".h3Than > section").forEach(s => s.hidden = s.dataset.th !== b.dataset.th);
      if (b.dataset.th === "toMau" && !st.but) datBut(true);
      if (b.dataset.th === "xuat") taoTikz(); });
    $("oBut").onchange = e => datBut(e.target.checked);
    $("oDoMo").oninput = e => { st.doMo = e.target.value / 100; $("vDoMo").textContent = e.target.value + "%"; };
    $("oDoDam").oninput = e => { st.doDam = e.target.value / 100; $("vDoDam").textContent = e.target.value + "%"; yeuCau(); };
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
    $("nMoChay").onclick = () => {
      if (moAnim) { moAnim = null; capNutMo(); return; }
      const den = st.moT < .5 ? 1 : 0; if (giamDong) { datMo(den); denGoc("giu"); return; }
      if (den === 1 && st.moT === 0) { datMo(.001); denGoc(canh.moHam ? "giu" : "xuong"); }
      moAnim = { t0: performance.now(), tu: st.moT, den, dur: 2200 }; capNutMo(); yeuCau(); };
    $("oQuet").addEventListener("input", e => { quetAnim = null; capNutQuet(); datQuet(+e.target.value); });
    $("nQuet").onclick = () => { if (quetAnim) { quetAnim = null; capNutQuet(); return; } if (st.moT > 0) datMo(0); const tu = +st.P.quet >= 360 ? 1 : +st.P.quet; if (giamDong) { datQuet(360); return; } datQuet(tu); quetAnim = { t0: performance.now(), tu, dur: 4200 * (360 - tu) / 359 + 300 }; capNutQuet(); yeuCau(); };
    $("oChe").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; st.che = b.dataset.che; document.querySelectorAll("#h3_oChe button").forEach(x => x.setAttribute("aria-pressed", x === b)); yeuCau(); });
    [["oKhuat", "khuat"], ["oNhan", "nhan"], ["oPhu", "phu"], ["oLuoiMat", "luoiMat"], ["oGiuDung", "giuDung"]].forEach(([id, k]) => $(id).onchange = e => { st[k] = e.target.checked; yeuCau(); });
    $("oGiay").onchange = e => { st.giay = e.target.checked; sk.classList.toggle("giay", st.giay); yeuCau(); };
    $("nTikz").onclick = () => { taoTikz(); bao("Đã tạo mã TikZ từ góc nhìn hiện tại"); };
    $("nCopy").onclick = async () => { const t = $("maTikz").value || taoTikz(); try { await navigator.clipboard.writeText(t); bao("Đã copy mã TikZ"); } catch (e) { const a = $("maTikz"); a.focus(); a.select(); try { document.execCommand("copy"); bao("Đã copy mã TikZ"); } catch (_) { bao("Hãy bôi đen mã và nhấn Ctrl + C"); } } };
    $("nPng").onclick = taiPng;
    $("nVideo").onclick = () => chenVaoKichBan(lenhTuTab(), true);
    document.addEventListener("visibilitychange", () => { if (document.hidden && st.quay) dungQuay(); });
    chonHinh(st.id, true);
    requestAnimationFrame(() => { coKhung(); denGoc("sgk", true); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => yeuCau());
  } else { coKhung(); yeuCau(); }
}

/* ================= Bảng "◈ Khối 3D" trong tab Tạo video ================= */
const VD = { mo: false, t0: 0, phan: null, lenh: "" };
function lenhVD() {
  const g = id => document.getElementById("h3vd_" + id), id = g("hinh").value, ts = [];
  const co = +g("co").value; if (Math.abs(co - 1) > .01) ts.push(soLenh(co));
  let S0 = null; try { S0 = K.dungCanh({ id }); } catch (e) {}
  const coMo = !!(S0 && S0.coMo), coQuet = !!(S0 && S0.coQuet);
  g("quet").disabled = !coQuet; g("trai").disabled = !coMo; g("gap").disabled = !coMo || !g("trai").checked; g("ghiTrai").hidden = coMo;
  if (coQuet && g("quet").checked) ts.push("quét " + soLenh(+g("gq").value || 4));
  if (g("xoay").checked) ts.push("xoay " + g("do").value + " " + soLenh(+g("gx").value || 5)); else ts.push("tĩnh");
  if (coMo && g("trai").checked) { ts.push("trải " + soLenh(+g("gt").value || 3)); if (g("gap").checked) ts.push("gập 2"); }
  const giu = +g("giu").value; if (giu > 0) ts.push("giữ " + soLenh(giu));
  if (g("goc").value === "xien") ts.push("xiên"); else if (g("goc").value !== "sgk") ts.push("góc " + { truoc: "trước", tren: "trên", nghieng: "nghiêng" }[g("goc").value]);
  if (g("che").value !== "dac") ts.push(g("che").value === "trong" ? "trong suốt" : "khung dây");
  if (g("oxyz").checked) ts.push("oxyz"); if (!g("nhan").checked) ts.push("không nhãn");
  const nd = [tenLenh(id)]; if (g("to").value) nd.push("tô " + g("to").value + " " + g("mau").value);
  return "khoi3d(" + ts.join(" | ") + "): " + nd.join("; ");
}
function veBangVD() {
  const ban = document.getElementById("h3VdBan"); if (!ban || ban.dataset.da) return; ban.dataset.da = 1;
  const opt = (ds, md) => ds.map(([v, n]) => '<option value="' + v + '"' + (v === md ? " selected" : "") + ">" + n + "</option>").join("");
  const nhomHinh = Object.entries(TEN_NHOM).map(([k, t]) => '<optgroup label="' + esc(t) + '">' + MUC.filter(m => m.dung && m.nhom === k).map(m => '<option value="' + m.id + '"' + (m.id === "chop4deu" ? " selected" : "") + ">" + esc(m.ten) + "</option>").join("") + "</optgroup>").join("");
  ban.innerHTML = '<div class="h3VdLuoi"><canvas id="h3vd_cv" class="h3VdXem" aria-label="Xem thử khối 3D trong video"></canvas><div class="h3VdForm">'
    + '<label class="h3VdO h3VdRong"><span>Hình</span><select id="h3vd_hinh">' + nhomHinh + "</select></label>"
    + '<label class="h3VdO"><span>Cỡ</span><input type="range" id="h3vd_co" min="0.6" max="1.8" step="0.1" value="1"></label>'
    + '<label class="h3VdO"><span>Góc nhìn</span><select id="h3vd_goc">' + opt([["sgk", "Vuông góc 3D"], ["xien", "Chiếu xiên SGK"], ["nghieng", "Nghiêng 3D"], ["truoc", "Mặt trước"], ["tren", "Từ trên xuống"]], "sgk") + "</select></label>"
    + '<div class="h3VdO h3VdRong h3VdHang"><label class="h3Bat"><input type="checkbox" id="h3vd_quet" checked><span>Quét tạo khối</span></label><input type="number" id="h3vd_gq" min="1" max="20" step="0.5" value="4" aria-label="Số giây quét"><span>giây</span><small>(khối tròn xoay)</small></div>'
    + '<div class="h3VdO h3VdRong h3VdHang"><label class="h3Bat"><input type="checkbox" id="h3vd_xoay" checked><span>Xoay</span></label><select id="h3vd_do">' + opt([["180", "nửa vòng"], ["360", "1 vòng"], ["720", "2 vòng"], ["-360", "1 vòng ngược"]], "360") + '</select><input type="number" id="h3vd_gx" min="1" max="30" step="0.5" value="5" aria-label="Số giây xoay"><span>giây</span></div>'
    + '<div class="h3VdO h3VdRong h3VdHang"><label class="h3Bat"><input type="checkbox" id="h3vd_trai" checked><span>Trải phẳng</span></label><input type="number" id="h3vd_gt" min="1" max="20" step="0.5" value="3" aria-label="Số giây trải"><span>giây</span><label class="h3Bat"><input type="checkbox" id="h3vd_gap"><span>rồi gập lại</span></label><small id="h3vd_ghiTrai" hidden>(hình này không trải phẳng)</small></div>'
    + '<label class="h3VdO"><span>Hiển thị</span><select id="h3vd_che">' + opt([["dac", "Đặc"], ["trong", "Trong suốt"], ["khung", "Khung dây"]], "dac") + "</select></label>"
    + '<label class="h3VdO"><span>Giữ sau khi xong (giây, 0 = tới hết trang)</span><input type="number" id="h3vd_giu" min="0" max="60" step="0.5" value="0"></label>'
    + '<div class="h3VdO h3VdRong h3VdHang"><label class="h3Bat"><input type="checkbox" id="h3vd_oxyz"><span>Oxyz</span></label><label class="h3Bat"><input type="checkbox" id="h3vd_nhan" checked><span>Nhãn đỉnh</span></label><span class="h3VdTach"></span><span>Tô</span><select id="h3vd_to"></select><select id="h3vd_mau">' + opt(Object.keys(TV_MAU).map(k => [TV_MAU[k], TV_MAU[k]]), "vàng") + "</select></div>"
    + '</div></div><div class="h3VdChan"><code id="h3vd_lenh"></code><button type="button" class="vdNutNho h3VdChen" id="h3vd_chen">＋ Chèn dòng vào kịch bản</button></div>';
  const g = id => document.getElementById("h3vd_" + id);
  const capMat = () => { const id = g("hinh").value; let S; try { S = K.dungCanh({ id }); } catch (e) { return; } const cu = g("to").value; g("to").innerHTML = '<option value="">— không —</option>' + S.g.map(x => '<option value="' + esc(x.ten) + '">' + esc(x.ten) + "</option>").join(""); if ([...g("to").options].some(o => o.value === cu)) g("to").value = cu; };
  const capNhat = () => { VD.lenh = lenhVD(); g("lenh").textContent = VD.lenh; try { const i = VD.lenh.indexOf("):"); VD.phan = K.taoPhanTuVideo(VD.lenh.slice(7, i), VD.lenh.slice(i + 2), { u: 1, doc: true, bao: () => {} }); } catch (e) { VD.phan = null; } VD.t0 = performance.now(); };
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
  if (VD.phan && W) { const e = VD.phan, tong = e.d + (e.giu || 1.2) + .4, tau = ((performance.now() - VD.t0) / 1000) % tong; K.veVideo(x, e.k3, 0, 0, W, H, tau, W / 980 * 1.1); }
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
