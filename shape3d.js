/* ===== shape3d.js — KMath · giao diện tab "Hình 3D" (menu Vẽ hình TikZ, mục 4) + bảng "◈ Khối 3D" trong tab Tạo video.
   Cần shape3d-engine.js và shape3d-catalog.js nạp trước. Lộ ra window.KHinh3D.khoiDongTab() (app.js gọi khi mở tab).
   Mọi id/class có tiền tố h3 để không đụng giao diện khác. ===== */
(() => {
"use strict";
const K = window.KHinh3D; if (!K) return;
const { MUC, MUC_ID, TEN_NHOM, B, ICO, MAU_F, MAU, so, boDau, qMul, qAxis, qNorm, qToMat, slerp, dot, TEN_LOAI_PHU } = K;
const $ = id => document.getElementById("h3_" + id);
const giamDong = matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const DEG = Math.PI / 180;
const eIO = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;

/* ================= Trạng thái ================= */
const st = {
  id: "chop4", nhom: "dadien", tim: "", P: {}, PTheo: {}, mauTheo: {}, hoanTac: {},
  neo: "tamDay", off: [0, 0, 0], oxyz: false, luoiOxy: false, che: "dac", khuat: true, nhan: true, phu: true, luoiMat: false, giay: false, doDam: 1,
  mauHT: "#F59E0B", tay: false, doMo: .45, but: true, hover: -1, loi: "", frame: null, moT: 0, diemHien: {}, keoGan: null,
  cheDo: "xoay", giuDung: true, tuXoay: false, nhanh: false, quay: null, phuTheo: {}, neoTheo: {}, catTheo: {}, demCanh: 0
};
const cam = { q: [1, 0, 0, 0], xien: null, zoom: 60, px: 0, py: 0, anim: null, vx: 0, vy: 0 };
let catAnim = null, catNho = { khoa: "", kq: null };
let canh = null, daDung = false, cv, ctx, sk, dpr = 1, choVe = false, moAnim = null, quetAnim = null, henNet = 0, tLan = 0;
const mauHT = () => st.mauTheo[st.id] || (st.mauTheo[st.id] = {});
const layDiem = () => canh ? K.giaiDiem(canh, st.diemHien[st.id]) : [];

/* ================= Giao diện ================= */
const SVG = (p, w) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.6) + '" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + p + "</svg>";
const ICO_CHAY = '<path d="M8 5v14l11-7z"/>', ICO_DUNG = '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>';
const KHUNG = `
<div class="vt3 h3">
  <header class="vt3Dau"><div class="vt3Ten"><h2>Hình 3D</h2></div></header>
  <div class="h3Vung" id="h3_vung">
    <aside class="h3Khoi h3Chon" aria-label="Chọn hình">
      <div class="h3Tim">${SVG('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 2)}
        <input id="h3_tim" type="search" placeholder="Hình chóp,..." autocomplete="off" aria-label="Tìm hình"></div>
      <div class="h3Seg h3NhomTab" role="tablist" id="h3_nhomTab" aria-label="Nhóm hình">
        <button type="button" role="tab" data-nhom="dadien" aria-selected="true">Đa diện</button>
        <button type="button" role="tab" data-nhom="tronxoay" aria-selected="false">Tròn xoay</button>
        <button type="button" role="tab" data-nhom="ungdung" aria-selected="false">Ứng dụng 12</button>
      </div>
      <div class="h3Ds" id="h3_dsHinh"></div>
    </aside>
    <section class="h3Khoi h3San" id="h3_san" aria-label="Khung vẽ 3D">
      <canvas id="h3_cv" tabindex="0" aria-label="Hình 3D. Kéo để xoay, Shift hoặc chuột phải để dời hình, cuộn để phóng to, bấm vào một mặt để tô màu."></canvas>
      <div class="h3Loi" id="h3_loiHinh" hidden></div>
      <div class="h3Hud h3HudTren">
        <div class="h3HudTrai">
          <button type="button" class="h3NutVuong" id="h3_nThuGon" aria-pressed="false" title="Thu gọn / mở danh mục hình (mở rộng khung vẽ)">${SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="m15 10-2 2 2 2"/>', 1.8)}</button>
          <div class="h3HudTen"><b id="h3_tenHinh"></b><span id="h3_tomTat"></span></div>
        </div>
        <div class="h3GocNhin" role="group" aria-label="Góc nhìn">
          <button type="button" data-goc="sgk" class="dang" title="Như hình vẽ trong SGK">Chuẩn SGK</button><button type="button" data-goc="vuong" title="Phép chiếu vuông góc, nhìn nghiêng">Vuông góc 3D</button><button type="button" data-goc="truoc">Mặt trước</button><button type="button" data-goc="tren">Từ trên xuống</button>
        </div>
      </div>
      <div class="h3Zoom"><button type="button" id="h3_nOxyz" class="h3NutOxyz" aria-pressed="false" title="Ẩn / hiện hệ trục Oxyz">Oxyz</button><button type="button" id="h3_phongTo" aria-label="Phóng to" title="Phóng to">+</button><button type="button" id="h3_thuNho" aria-label="Thu nhỏ" title="Thu nhỏ">−</button><button type="button" id="h3_nVua" aria-label="Vừa khung" title="Vừa khung">${SVG('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', 2)}</button></div>
      <div class="h3BangMau" id="h3_bangMauNhanh" hidden></div>
      <div class="h3Dock" role="toolbar" aria-label="Công cụ khung vẽ">
        <div class="h3SegNho" role="group" aria-label="Chế độ chuột">
          <button type="button" id="h3_cdXoay" aria-pressed="true" title="Kéo để xoay hình">${SVG('<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4h-4"/>', 2)}<span>Xoay</span></button><button type="button" id="h3_cdDoi" aria-pressed="false" title="Kéo để dời hình">${SVG('<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>', 1.8)}<span>Dời</span></button>
        </div>
        <button type="button" class="h3NutDock" id="h3_nTuXoay" aria-pressed="false" title="Tự xoay quanh trục đứng">${SVG('<path d="M4 12a8 3.5 0 1 0 16 0"/><path d="M20 12a8 3.5 0 0 0-11-3.3"/><path d="M9 6l-.5 2.8L11.3 9"/>', 1.8)}</button>
        <button type="button" class="h3NutDock" id="h3_nDatLai" title="Đặt lại góc nhìn và khung hình">${SVG('<path d="M4 4v6h6"/><path d="M5 15a8 8 0 1 0 2-8.5L4 10"/>', 1.8)}</button>
        <button type="button" class="h3NutDock" id="h3_nMau" aria-pressed="false" title="Chọn màu tô — bấm vào một mặt trên hình để tô"><i class="h3MauHT" id="h3_mauHT"></i></button>
        <span class="h3Vach"></span>
        <div class="h3ThanhNho" id="h3_moPhang" hidden title="Trải phẳng / Gấp hình">
          <button type="button" id="h3_nMoChay" aria-label="Trải phẳng">${SVG(ICO_CHAY, 2)}</button>
          <label for="h3_oMo">Trải</label><input type="range" id="h3_oMo" min="0" max="100" step="1" value="0"><output id="h3_vMo" for="h3_oMo">0%</output>
        </div>
        <div class="h3ThanhNho" id="h3_quet" hidden title="Góc quét tạo khối tròn xoay">
          <button type="button" id="h3_nQuet" aria-label="Chạy quét tạo khối">${SVG(ICO_CHAY, 2)}</button>
          <label for="h3_oQuet">Quét</label><input type="range" id="h3_oQuet" min="1" max="360" step="1" value="360"><output id="h3_vQuet" for="h3_oQuet">360°</output>
        </div>
        <span class="h3Vach"></span>
        <button type="button" class="h3NutQuay" id="h3_nQuay" title="Quay video mọi thao tác trong khung vẽ"><i class="h3Cham"></i><span id="h3_chuQuay">Quay</span></button>
      </div>
      <div class="h3Chip" id="h3_chipMat" hidden></div>
    </section>
    <aside class="h3Khoi h3Bang" aria-label="Bảng điều khiển">
      <div class="h3Seg h3BangTab" role="tablist" id="h3_bangTab">
        <button type="button" role="tab" data-th="thamSo" aria-selected="true">Tham số</button><button type="button" role="tab" data-th="dung" aria-selected="false">Dựng thêm</button><button type="button" role="tab" data-th="catTD" aria-selected="false">Thiết diện</button><button type="button" role="tab" data-th="oxyz" aria-selected="false">Oxyz</button><button type="button" role="tab" data-th="toMau" aria-selected="false">Tô màu</button><button type="button" role="tab" data-th="xuat" aria-selected="false">Xuất</button>
      </div>
      <div class="h3Than">
        <section data-th="thamSo"><div id="h3_dsThamSo" class="h3Truong" style="gap:12px"></div><div class="h3TheTich" id="h3_theTich"></div></section>
        <section data-th="dung" hidden>
          <p class="h3Ghi">Dựng thêm điểm phụ (có tên hiện trên hình) và đường phụ. Đường nào bị che tự vẽ nét đứt, có cả trong mã TikZ.</p>
          <div class="h3Truong"><label for="h3_dLoai">Dựng</label><select id="h3_dLoai">
            <option value="trung">Trung điểm của đoạn thẳng</option><option value="trongTam">Trọng tâm (tam giác / tứ diện)</option><option value="tamNgoai">Tâm đường tròn ngoại tiếp tam giác</option>
            <option value="chia">Điểm chia đoạn thẳng theo tỉ số</option><option value="chieuMP">Hình chiếu của điểm lên mặt phẳng</option><option value="chieuDT">Hình chiếu của điểm lên đường thẳng</option>
            <option value="giao">Giao điểm hai đường thẳng</option><option value="doan">Nối hai điểm (đường phụ)</option></select></div>
          <div class="h3DongDung" id="h3_dDiem"></div>
          <div class="h3HangNut h3DongTen"><label class="h3NhanNho" for="h3_dTen" id="h3_dTenNhan">Tên điểm mới</label><input type="text" id="h3_dTen" maxlength="4" autocomplete="off"><label class="h3NhanNho" for="h3_dK" id="h3_dKNhan" hidden>Tỉ số</label><input type="text" id="h3_dK" value="1/2" hidden aria-label="Tỉ số chia"><button type="button" class="h3NutChinh h3NutNhoChinh" id="h3_nDung">Thêm</button></div>
          <p class="h3Ghi" id="h3_dMoTa"></p>
          <div class="h3Truong"><label for="h3_dLenh">Hoặc gõ lệnh nhanh (mỗi dòng một lệnh)</label>
            <textarea class="h3Ma h3Lenh" id="h3_dLenh" spellcheck="false" placeholder="M = trung điểm SA&#10;G = trọng tâm SBC&#10;H = hình chiếu S lên ABC&#10;I = giao AC và BD&#10;K = chia SB 1/3&#10;nối MG, SH"></textarea>
            <div class="h3HangNut"><button type="button" class="h3Nut" id="h3_nLenh">Dựng theo lệnh</button><button type="button" class="h3Nut" id="h3_nXoaDung">Xoá hết điểm phụ</button></div></div>
          <p class="h3LoiMuc" id="h3_dLoi" role="alert" hidden></p>
          <h3>Đã dựng</h3><div class="h3DsDung" id="h3_dsDung"></div>
        </section>
        <section data-th="catTD" hidden>
          <p class="h3Ghi" id="h3_cKhong" hidden>Thiết diện dùng cho khối đa diện (chóp, lăng trụ, hộp…). Hãy chọn một khối đa diện.</p>
          <label class="h3Bat"><input type="checkbox" id="h3_cBat"><span><b>Bật mặt phẳng cắt</b> — vẽ thiết diện, tách đôi khối</span></label>
          <div class="h3HopCat" id="h3_cHop">
            <div class="h3Seg" id="h3_cKieu" role="group" aria-label="Kiểu mặt phẳng cắt"><button type="button" data-kieu="ngang" aria-pressed="true">Song song đáy</button><button type="button" data-kieu="nghieng" aria-pressed="false">Nghiêng</button><button type="button" data-kieu="3diem" aria-pressed="false">Qua 3 điểm</button></div>
            <div class="h3Truong" id="h3_cVTHop"><div class="h3DongNhan"><label for="h3_cVT">Vị trí mặt cắt</label><output id="h3_cVTv">50%</output></div><input type="range" id="h3_cVT" min="0" max="100" step="1" value="50"></div>
            <div class="h3Hai" id="h3_cNgHop" hidden><div class="h3Truong"><div class="h3DongNhan"><label for="h3_cGX">Nghiêng quanh Ox</label><output id="h3_cGXv">20°</output></div><input type="range" id="h3_cGX" min="-75" max="75" step="1" value="20"></div>
              <div class="h3Truong"><div class="h3DongNhan"><label for="h3_cGY">Nghiêng quanh Oy</label><output id="h3_cGYv">0°</output></div><input type="range" id="h3_cGY" min="-75" max="75" step="1" value="0"></div></div>
            <div class="h3DongDung" id="h3_cBaHop" hidden></div>
            <div class="h3HangNut h3DongTen"><label class="h3NhanNho" for="h3_cTen">Tên đỉnh thiết diện</label><input type="text" id="h3_cTen" value="M, N, P, Q" autocomplete="off" style="width:120px"></div>
            <div class="h3Truong"><span class="h3NhanNho">Màu thiết diện</span><div class="h3OMau" id="h3_cMau"></div></div>
            <div class="h3Truong"><div class="h3DongNhan"><label for="h3_cDoMo">Độ đậm màu thiết diện</label><output id="h3_cDoMov">55%</output></div><input type="range" id="h3_cDoMo" min="10" max="100" step="5" value="55"></div>
            <div class="h3TheTich" id="h3_cTT"></div>
            <h3>Tách / ghép khối</h3>
            <div class="h3HangNut"><button type="button" class="h3NutChinh h3NutNhoChinh" id="h3_cNutTach" style="margin-left:0">Tách khối</button><input type="range" id="h3_cTach" min="0" max="100" step="1" value="0" aria-label="Mức tách khối" style="flex:1"><output id="h3_cTachv" class="h3TtMa">0%</output></div>
            <p class="h3Ghi">Hai nửa được cắt thật theo mặt phẳng và bịt kín bằng thiết diện; kéo thanh hoặc bấm nút để tách ra rồi ghép lại (quay video được).</p>
          </div>
        </section>
        <section data-th="oxyz" hidden>
          <label class="h3Bat"><input type="checkbox" id="h3_oOxyz"><span>Hiện hệ trục Oxyz</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oLuoi"><span>Lưới mặt phẳng Oxy (ô đơn vị)</span></label>
          <div class="h3HopGoc">
            <h3>Đặt hệ trục vào hình</h3>
            <p class="h3Ghi">Chọn điểm làm <b>gốc O</b> và cạnh chỉ hướng <b>trục Ox</b>. Trục Oz luôn hướng lên, trục Oy vuông góc Ox nằm ngang. Toạ độ mọi điểm bên dưới tính theo hệ trục này.</p>
            <div class="h3Hai"><div class="h3Truong"><label for="h3_oGoc">Gốc O tại điểm</label><select id="h3_oGoc"></select></div>
              <div class="h3Truong"><label for="h3_oTrucX">Trục Ox theo hướng</label><select id="h3_oTrucX"></select></div></div>
            <div class="h3GoiYNeo" id="h3_goiYNeo"></div>
            <div class="h3ToaDo" id="h3_hopToaDo" hidden><label>x₀<input type="number" id="h3_x0" step="0.5" value="0"></label><label>y₀<input type="number" id="h3_y0" step="0.5" value="0"></label><label>z₀<input type="number" id="h3_z0" step="0.5" value="0"></label></div>
          </div>
          <h3>Toạ độ điểm</h3>
          <div class="h3HangNhap"><input type="text" id="h3_oDiem" list="h3_dsTenDiem" placeholder="Tên điểm (vd: C) hoặc M(1; 2; 3)" autocomplete="off" aria-label="Nhập tên điểm hoặc điểm mới"><button type="button" class="h3Nut" id="h3_nDiem">Hiện</button></div>
          <datalist id="h3_dsTenDiem"></datalist>
          <p class="h3LoiMuc" id="h3_loiDiem" role="alert" hidden></p>
          <div class="h3DsDiem" id="h3_dsDiemHien"></div>
          <p class="h3Ghi" id="h3_ghiMo" hidden>Đang trải phẳng: vị trí điểm theo hình đang mở; bảng dưới là toạ độ khi khối kín.</p>
          <details class="h3BangDiem" open><summary>Toạ độ các điểm trên hình <button type="button" class="h3NutNho" id="h3_nXoaDiem">Bỏ đánh dấu</button></summary><div id="h3_bangDiem"></div></details>
        </section>
        <section data-th="toMau" hidden>
          <p class="h3Ghi"><b>Cách tô:</b> chọn màu rồi <b>bấm thẳng vào mặt</b> trên hình (bấm lại cùng màu để bỏ). Kéo chuột vẫn xoay bình thường. Nút tròn màu ở thanh dưới khung vẽ cũng mở nhanh bảng màu.</p>
          <div class="h3OMau" id="h3_oMau" role="group" aria-label="Chọn màu"></div>
          <div class="h3Truong"><div class="h3DongNhan"><label for="h3_oDoMo">Độ đậm màu</label><output id="h3_vDoMo">45%</output></div><input type="range" id="h3_oDoMo" min="10" max="100" step="5" value="45"></div>
          <label class="h3Bat"><input type="checkbox" id="h3_oBut" checked><span>Bấm vào mặt để tô (tắt nếu chỉ muốn xoay)</span></label>
          <h3>Các mặt của khối</h3><div id="h3_dsMat" class="h3DsMat"></div>
          <div class="h3HangNut"><button type="button" class="h3Nut" id="h3_nHoan">Hoàn tác</button><button type="button" class="h3Nut" id="h3_nXoaMau">Xóa hết màu</button></div>
        </section>
        <section data-th="xuat" hidden>
          <h3>Chế độ hiển thị</h3>
          <div class="h3Seg" id="h3_oChe" role="group" aria-label="Chế độ hiển thị"><button type="button" data-che="dac" aria-pressed="true">Đặc</button><button type="button" data-che="trong" aria-pressed="false">Trong suốt</button><button type="button" data-che="khung" aria-pressed="false">Khung dây</button></div>
          <div class="h3Truong"><div class="h3DongNhan"><label for="h3_oDoDam">Độ đậm nét vẽ</label><output id="h3_vDoDam">100%</output></div><input type="range" id="h3_oDoDam" min="60" max="180" step="10" value="100"></div>
          <label class="h3Bat"><input type="checkbox" id="h3_oKhuat" checked><span>Nét khuất vẽ nét đứt (chuẩn SGK)</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oNhan" checked><span>Nhãn đỉnh, tên điểm (tự tránh đè nét)</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oPhu" checked><span>Đường phụ, ký hiệu góc vuông</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oLuoiMat"><span>Đường lưới trên mặt cong</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oGiuDung" checked><span>Giữ Oz thẳng đứng khi xoay (đường cao luôn thẳng đứng; tắt = xoay tự do)</span></label>
          <label class="h3Bat"><input type="checkbox" id="h3_oGiay"><span>Xem trên nền giấy in (nền trắng, nét đen)</span></label>
          <h3>Xuất</h3>
          <button type="button" class="h3NutChinh" id="h3_nTikz">Tạo mã TikZ từ góc nhìn này</button>
          <textarea class="h3Ma" id="h3_maTikz" readonly spellcheck="false" aria-label="Mã TikZ"></textarea>
          <div class="h3HangNut"><button type="button" class="h3Nut" id="h3_nCopy">Copy mã TikZ</button><button type="button" class="h3Nut" id="h3_nPng">Tải PNG nền trong suốt</button><span class="h3TtMa" id="h3_ttMa"></span></div>
          <button type="button" class="h3Nut h3NutVideo" id="h3_nVideo">${SVG('<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2.5v9L17 14"/>', 1.8)}Đưa hình này vào kịch bản video</button>
          <p class="h3Ghi">TikZ thuần cho pdflatex: toạ độ khai báo bằng vòng lặp, nét thấy liền, nét khuất nét đứt, số thập phân dấu chấm, nhãn đỉnh đặt đúng hướng như trên hình.</p>
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
  try { canh = K.dungCanh({ id: st.id, P: st.P, neo: st.neoTheo[st.id], off: st.off, moT: st.moT, phu: st.phuTheo[st.id] }); st.neo = canh.neo; st.loi = ""; st.demCanh++; if (st.moT > 0 && !canh.mo) st.moT = 0; return true; }
  catch (e) { st.loi = e.message; return false; }
}
/* ===== thiết diện: cảnh đang vẽ (khối nguyên + thiết diện, hoặc hai nửa đã tách) ===== */
const MAC_CAT = () => ({ bat: false, kieu: "ngang", t: .5, gx: 20, gy: 0, ba: [], ten: "M, N, P, Q", mau: "#F59E0B", a: .55, tach: 0 });
const catHT = () => st.catTheo[st.id] || (st.catTheo[st.id] = MAC_CAT());
const laDaDien = () => !!(canh && canh.g.every(g => g.poly) && !canh.coQuet);
function tinhCat() {
  const c = catHT(); if (!c.bat || !laDaDien() || st.moT > 0) return null;
  const khoa = st.demCanh + "|" + JSON.stringify(c) + "|" + JSON.stringify(mauHT());
  if (catNho.khoa !== khoa) { catNho.khoa = khoa; catNho.kq = K.catThietDien(canh, { kieu: c.kieu, t: c.t, gx: c.gx, gy: c.gy, ba: c.ba, ten: K.tachTen(c.ten), mau: { c: c.mau, a: c.a }, tach: c.tach, mauMat: mauHT() }); }
  return catNho.kq;
}
const canhVe = () => { const r = tinhCat(); return r && r.S ? r.S : canh; };
const laTach = S => S !== canh && S.g !== canh.g;
const tuyChon = () => ({ giay: st.giay, che: st.che, khuat: st.khuat, nhan: st.nhan, phu: st.phu, luoiMat: st.luoiMat, oxyz: st.oxyz, luoiOxy: st.luoiOxy, hover: st.hover, mau: laTach(canhVe()) ? {} : mauHT(), diem: layDiem(), doDam: st.doDam, nhanh: st.nhanh, xien: !!cam.xien });
/* đang thao tác: vẽ nhanh (lấy mẫu nét thưa hơn), dừng 140 ms thì vẽ lại nét tinh */
function tuongTac() { st.nhanh = true; clearTimeout(henNet); henNet = setTimeout(() => { st.nhanh = false; yeuCau(); }, 140); }

/* ================= Vẽ màn hình ================= */
function veManHinh() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  if (!canh) return;
  st.canhVe = canhVe(); st.frame = K.ve(ctx, st.canhVe, cam, cv.width, cv.height, dpr, tuyChon());
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
  if (catAnim && canh) { const u = Math.min(1, (t - catAnim.t0) / catAnim.dur), c = catHT(); c.tach = catAnim.tu + (catAnim.den - catAnim.tu) * eIO(u); capCat(true); tuongTac();
    if (u >= 1) { catAnim = null; capCat(); } else tiep = true; }
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
function xoayCam(dx, dy) { const k = .0085; if (cam.xien && st.giuDung) dy = 0; /* góc SGK: chỉ quay quanh trục đứng để đường cao luôn thẳng đứng */ giuTam(() => {
  cam.q = st.giuDung ? qNorm(qMul(qAxis([1, 0, 0], dy * k), qMul(cam.q, qAxis([0, 0, 1], dx * k)))) : qNorm(qMul(qAxis([1, 0, 0], dy * k), qMul(qAxis([0, 1, 0], dx * k), cam.q))); }); }
function xoayQuanhOz(a) { giuTam(() => { cam.q = qNorm(qMul(cam.q, qAxis([0, 0, 1], a))); }); }
const vuaKhung = (q, xien) => canh ? K.vuaKhung(canh, q, sk.clientWidth || 600, sk.clientHeight || 500, { oxyz: st.oxyz, moT: st.moT, diem: layDiem(), xien, leX: 120, leY: 190, dy: -14 }) : { zoom: cam.zoom, px: 0, py: 0 };
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
  const F = st.frame; if (!F || !canh || !canh.keo.length || st.moT > 0 || (catHT().bat && catHT().tach > 0)) return null;
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
    sk.classList.add("keo"); $("bangMauNhanh").hidden = true; $("nMau").setAttribute("aria-pressed", "false");
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
  $("nVua").onclick = () => denGoc("giu");
  $("nThuGon").onclick = () => { const v = $("vung").classList.toggle("thuGon"); $("nThuGon").setAttribute("aria-pressed", v); setTimeout(() => denGoc("giu"), 60); };
  $("nMau").onclick = () => { const b = $("bangMauNhanh"); b.hidden = !b.hidden; $("nMau").setAttribute("aria-pressed", !b.hidden); if (!b.hidden) datBut(true); };
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
    const g0 = F.chon(x * dpr, y * dpr), Sv = st.canhVe || canh, g = g0;
    if (g !== st.hover || chip.hidden !== (g < 0)) {
      st.hover = g;
      if (g < 0) chip.hidden = true;
      else { const gg = matGoc(g), m = (gg >= 0 ? mauHT()[gg] : null) || Sv.g[g].mau; chip.innerHTML = '<i style="background:' + (m ? m.c : "#B0C4E0") + '"></i>' + esc(Sv.g[g].ten) + (st.but ? (mauHT()[g] ? " · bấm để đổi / bỏ màu" : " · bấm để tô") : ""); chip.hidden = false; }
      document.querySelectorAll("#h3_dsMat .h3DongMat").forEach(d => d.classList.toggle("dangChi", +d.dataset.g === matGoc(g)));
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
function toMat(g, xoa) { if (g < 0) return false; luuHoanTac(); const m = mauHT(); let bo = xoa || st.tay || (m[g] && m[g].c === st.mauHT && Math.abs(m[g].a - st.doMo) < .01); if (bo) delete m[g]; else m[g] = { c: st.mauHT, a: st.doMo }; veDsMat(); yeuCau(); return !bo; }
function matGoc(g) { const S = st.canhVe || canh; if (g < 0 || !S || S === canh || S.g === canh.g) return g; const x = S.g[g]; return x && x.goc != null ? x.goc : g; }
function toTaiDiem(x, y) { const F = st.frame; if (!F) return; let g = F.chon(x * dpr, y * dpr); if (g >= 0 && matGoc(g) < 0) { bao("Đây là thiết diện — đổi màu trong thẻ Thiết diện"); return; } g = matGoc(g); if (g >= 0) { const to = toMat(g); bao((to ? "Đã tô: " : "Đã bỏ màu: ") + canh.g[g].ten + (to ? " — bấm lại để bỏ" : "")); } }
function veBangMau() {
  $("mauHT").style.background = st.tay ? "repeating-linear-gradient(45deg,#94a3b8 0 3px,transparent 3px 6px)" : st.mauHT;
  const nhanh = $("bangMauNhanh");
  nhanh.innerHTML = MAU.map(c => '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="Màu ' + c + '" aria-pressed="' + (!st.tay && st.mauHT === c) + '"></button>').join("") + '<button type="button" class="h3Tay" data-tay="1" aria-pressed="' + st.tay + '" title="Tẩy: bấm vào mặt để bỏ màu">' + SVG('<path d="m7 21-4-4 11-11 7 7-7 7z"/><path d="M7 21h13"/>', 2) + "</button><span>Bấm vào mặt trên hình để tô</span>";
  nhanh.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { st.mauHT = b.dataset.c; st.tay = false; datBut(true); veBangMau(); });
  nhanh.querySelector("[data-tay]").onclick = () => { st.tay = !st.tay; datBut(true); veBangMau(); };
  const box = $("oMau");
  box.innerHTML = MAU.map(c => '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="Màu ' + c + '" aria-pressed="' + (!st.tay && st.mauHT === c) + '"></button>').join("")
    + '<input type="color" id="h3_mauRieng" value="' + st.mauHT + '" aria-label="Chọn màu khác" title="Chọn màu khác">'
    + '<button type="button" class="h3Tay" id="h3_nTay" aria-pressed="' + st.tay + '" aria-label="Tẩy màu" title="Tẩy: bấm vào mặt để xóa màu">' + SVG('<path d="m7 21-4-4 11-11 7 7-7 7z"/><path d="M7 21h13"/>', 2) + "</button>";
  box.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { st.mauHT = b.dataset.c; st.tay = false; datBut(true); veBangMau(); });
  $("mauRieng").oninput = e => { st.mauHT = e.target.value; st.tay = false; datBut(true); veBangMau(); };
  $("nTay").onclick = () => { st.tay = !st.tay; datBut(true); veBangMau(); };
}
function datBut(v) { st.but = v; $("oBut").checked = v; }
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
  if (!$("vung").querySelector('[data-th="dung"]').hidden) veDungThem();
  if (!$("vung").querySelector('[data-th="catTD"]').hidden) veCat();
  $("oMo").value = 0; $("vMo").textContent = "0%"; capThanh(); capNutMo(); capNutQuet();
  veDsHinh(); veThamSo(); veNeo(); veDsMat(); capNhatTen(); hienLoi();
  denGoc("sgk", dauTien);
}
function capThanh() { // hiện thanh góc quét (khối tròn xoay) và thanh trải phẳng (khối có hình trải)
  const coQuet = !!(canh && canh.coQuet), q = coQuet ? +st.P.quet : 360;
  $("quet").hidden = !coQuet; if (coQuet) { $("oQuet").value = q; $("vQuet").textContent = q + "°"; }
  $("moPhang").hidden = !(canh && canh.coMo) && !(coQuet && ["tru", "non", "nonCut"].includes(MUC_ID[st.id].dung));
  const khoa = (coQuet && q < 360) || (catHT().bat && laDaDien()); $("oMo").disabled = khoa; $("nMoChay").disabled = khoa;
  $("moPhang").title = khoa ? (catHT().bat ? "Tắt mặt phẳng cắt để trải phẳng" : "Quét đủ 360° để trải phẳng") : "Trải phẳng / Gấp hình";
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
    else if (t.loai === "ham") { const bien = P.kieu === "xg" ? "y" : "x", vt = P.kieu === "xg" ? "x" : "y", vd = [["sqrt(x)"], ["x^2/4 + 1"], ["2 + sin(x)"], ["e^(-x)"], ["1/(1 + x^2)"]].map(([c]) => c.replace(/x/g, bien));
      html += '<div class="h3Truong"><label for="' + id + '">' + esc(ten) + '</label><input type="text" class="h3Ham' + (st.loi ? " sai" : "") + '" id="' + id + '" data-k="' + t.k + '" value="' + esc(P[t.k]) + '" autocomplete="off" spellcheck="false" aria-describedby="h3_xemHam">'
        + '<div class="h3XemHam" id="h3_xemHam">' + vt + " = " + dangToan(P[t.k]) + '</div><div class="h3MauHam"><span>Mẫu:</span>' + vd.map(c => '<button type="button" class="h3NutNho" data-ham="' + esc(c) + '">' + vt + " = " + dangToan(c) + "</button>").join("") + "</div>"
        + (st.loi ? '<p class="h3LoiMuc" role="alert">' + esc(st.loi) + "</p>" : "") + "</div>"; }
    else if (t.loai === "nhap") html += (t.k === "a" ? '<div class="h3Hai">' : "") + '<div class="h3Truong"><label for="' + id + '">' + esc(ten) + '</label><input type="number" id="' + id + '" data-k="' + t.k + '" step="0.1" value="' + P[t.k] + '"></div>' + (t.k === "b" ? "</div>" : "");
    else if (t.loai === "bat") html += '<label class="h3Bat"><input type="checkbox" id="' + id + '" data-k="' + t.k + '"' + (P[t.k] ? " checked" : "") + "><span>" + esc(ten) + "</span></label>";
  }
  if (canh && (canh.tenDay || canh.tenTren)) html += '<div class="h3HopTen"><h3>Tên đỉnh</h3><div class="h3Hai">'
    + (canh.tenDay ? '<div class="h3Truong"><label for="h3_tenDay">Đỉnh đáy</label><input type="text" id="h3_tenDay" value="' + esc(canh.tenDay.join(", ")) + '" autocomplete="off" spellcheck="false"></div>' : "")
    + (canh.tenTren ? '<div class="h3Truong"><label for="h3_tenTren">' + (canh.tenTren.length === 1 ? "Đỉnh" : "Đỉnh phía trên") + '</label><input type="text" id="h3_tenTren" value="' + esc(canh.tenTren.join(", ")) + '" autocomplete="off" spellcheck="false"></div>' : "")
    + '</div><p class="h3Ghi">Gõ tên mới, cách nhau dấu phẩy (vd M, N, P, Q). Tên đổi ngay trên hình, bảng toạ độ, hệ trục, video và mã TikZ.</p></div>';
  box.innerHTML = html;
  [["tenDay", "h3_tenDay"], ["tenTren", "h3_tenTren"]].forEach(([k, id]) => { const o = document.getElementById(id); if (o) o.onchange = () => { P[k] = o.value.trim(); doiThamSo(true); veDsDiem(); }; });
  box.querySelectorAll("[data-ham]").forEach(b => b.onclick = () => { P.f = b.dataset.ham; doiThamSo(true, true); });
  box.querySelectorAll("select[data-k]").forEach(s => s.onchange = () => { const t = bd.tham.find(x => x.k === s.dataset.k); P[s.dataset.k] = s.value; if (t.datLai) { st.mauTheo[st.id] = {}; st.hoanTac[st.id] = []; } st.moT = 0; doiThamSo(true, true, s.dataset.k === "truc"); });
  box.querySelectorAll("input[type=range]").forEach(s => s.oninput = () => { const t = bd.tham.find(x => x.k === s.dataset.k); P[s.dataset.k] = +s.value; $("ts_" + s.dataset.k + "_v").textContent = so(+s.value) + (t.don || ""); tuongTac(); doiThamSo(false); });
  box.querySelectorAll("input[type=range]").forEach(s => s.onchange = () => veDsDiem());
  box.querySelectorAll("input[type=number]").forEach(s => s.onchange = () => { P[s.dataset.k] = s.value; doiThamSo(false, true); });
  box.querySelectorAll("input[type=checkbox][data-k]").forEach(s => s.onchange = () => { P[s.dataset.k] = s.checked; doiThamSo(false); });
  let hen = 0;
  box.querySelectorAll("input.h3Ham").forEach(s => s.oninput = () => { const x = document.getElementById("h3_xemHam"); if (x) x.innerHTML = (P.kieu === "xg" ? "x" : "y") + " = " + dangToan(s.value); clearTimeout(hen); hen = setTimeout(() => { P.f = s.value; doiThamSo(false, true); }, 380); });
  box.querySelectorAll("select[data-mau]").forEach(s => s.onchange = () => { const x = MAU_F[+s.value]; if (!x) return; P.f = x[0]; P.a = x[1]; P.b = x[2]; P.kieu = x[4] || "yf"; if (x[5]) P.truc = x[5]; doiThamSo(true, true); });
  veTheTich();
}
function capNhatThamSoNhanh(k) { const s = $("ts_" + k); if (s) { s.value = st.P[k]; const o = $("ts_" + k + "_v"); if (o) o.textContent = so(+st.P[k]); } }
function doiThamSo(veLaiBang, vuaKhungLai, doiGoc) {
  const soMat = canh ? canh.g.length : 0, ok = dungCanh(), o = document.querySelector("#h3_dsThamSo input.h3Ham");
  if (ok) { if (veLaiBang) veThamSo(); else veTheTich(); veNeo(); if (canh.g.length !== soMat || veLaiBang) veDsMat(); capNhatTen(); capThanh();
    if (doiGoc) denGoc("sgk"); else if (vuaKhungLai || st.moT > 0) denGoc("giu", !vuaKhungLai);
    if (o) { o.classList.remove("sai"); const p = o.parentElement.querySelector(".h3LoiMuc"); if (p) p.remove(); } }
  else if (o) { o.classList.add("sai"); let p = o.parentElement.querySelector(".h3LoiMuc"); if (!p) { p = document.createElement("p"); p.className = "h3LoiMuc"; p.setAttribute("role", "alert"); o.parentElement.appendChild(p); } p.textContent = st.loi; }
  else bao(st.loi);
  yeuCau();
}
function veTheTich() { if (!canh) return; $("theTich").innerHTML = (canh.V == null ? '<div class="so"><span>Mặt cong (không phải khối)</span><b></b></div>' : '<div class="so"><span>Thể tích</span><b>V ≈ ' + so(canh.V) + "</b></div>") + '<div class="ct"><div class="ct">' + esc(canh.ct || "") + "</div>" + (canh.tt ? '<p class="h3Ghi">' + esc(canh.tt) + "</p>" : "") + (canh.ghiChu ? '<p class="h3CanhBao">' + esc(canh.ghiChu) + "</p>" : ""); }
function capNhatTen() { $("tenHinh").textContent = canh.ten; $("tomTat").textContent = (canh.V == null ? "Mặt cong" : "V ≈ " + so(canh.V)) + " · " + canh.g.length + " mặt logic"; }
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
  const neo = canh.neo, ten = tenCacDiem(), sG = $("oGoc"), sX = $("oTrucX");
  let goc = "k:" + neo, huong = "";
  if (neo.startsWith("diem:")) { const [a, b] = neo.slice(5).split(">"); goc = "d:" + a; huong = b || ""; }
  const ds = canh.neoDs.filter(n => !(n.k === "tuChon"));
  sG.innerHTML = (ten.length ? '<optgroup label="Điểm có tên trên hình">' + ten.map(t => '<option value="d:' + esc(t) + '">Điểm ' + esc(t) + "</option>").join("") + "</optgroup>" : "")
    + '<optgroup label="Vị trí khác">' + ds.map(n => '<option value="k:' + n.k + '">' + esc(n.ten) + "</option>").join("") + '<option value="k:tuChon">Dời gốc theo toạ độ tự nhập</option></optgroup>';
  sG.value = goc; if (sG.value !== goc) sG.selectedIndex = 0;
  if (goc.startsWith("d:")) { const g = goc.slice(2); sX.disabled = false;
    sX.innerHTML = '<option value="">Giữ hướng mặc định của hình</option>' + ten.filter(t => t !== g).map(t => '<option value="' + esc(t) + '">Hướng ' + esc(g) + " → " + esc(t) + " (" + esc(g + t) + " ≡ Ox)</option>").join(""); sX.value = huong; }
  else { sX.innerHTML = '<option value="">Theo hướng mặc định</option>'; sX.disabled = true; }
  const moTa = goc.startsWith("d:") ? "Gốc O ≡ " + goc.slice(2) + (huong ? ", tia " + goc.slice(2) + huong + " là tia Ox" : "") : (canh.neoDs.find(n => n.k === neo) || {}).ten || "";
  $("goiYNeo").innerHTML = '<p class="h3TrangThai">Đang dùng: <b>' + esc(moTa) + "</b></p>" + (canh.neoDs.length > 2 ? '<div class="h3GoiYNut"><span>Gợi ý nhanh:</span>' + ds.filter(n => n.k !== "trongTam").map(n => '<button type="button" class="h3NutNho" data-neo="' + n.k + '">' + esc(n.ten) + "</button>").join("") + "</div>" : "");
  $("goiYNeo").querySelectorAll("[data-neo]").forEach(b => b.onclick = () => datNeo(b.dataset.neo));
  $("hopToaDo").hidden = neo !== "tuChon";
  veDsDiem();
}
function datNeo(k) { st.neoTheo[st.id] = k; st.neo = k; dungCanh(); veNeo(); veDsMat(); if (!st.oxyz) datOxyz(true); else denGoc("giu"); bao("Đã đặt lại hệ trục Oxyz — xem trục trên hình"); }
function khoaToaDo() {}
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


/* ===== viết biểu thức người dùng gõ thành dạng toán (căn, luỹ thừa, π…) — không hiện mã thô ===== */
function dangToan(src) {
  let s = String(src || "").replace(/\s+/g, "").replace(/\*\*/g, "^");
  let i = 0;
  const nhom = () => { let d = 0, j = i; for (; j < s.length; j++) { if (s[j] === "(") d++; else if (s[j] === ")") { d--; if (!d) break; } } const t = s.slice(i + 1, j); i = j + 1; return t; };
  const doc = () => { let out = "";
    while (i < s.length) { const c = s[i];
      if (s.startsWith("sqrt(", i)) { i += 4; out += '√<span class="h3Can">' + dangToan(nhom()) + "</span>"; continue; }
      if (s.startsWith("abs(", i)) { i += 3; out += "|" + dangToan(nhom()) + "|"; continue; }
      if (s.startsWith("pi", i) && !/[a-z]/i.test(s[i + 2] || "")) { out += "π"; i += 2; continue; }
      if (c === "^") { i++; let mu; if (s[i] === "(") mu = nhom(); else { const m = s.slice(i).match(/^-?[A-Za-z0-9.]+/); mu = m ? m[0] : ""; i += mu.length; } out += "<sup>" + dangToan(mu) + "</sup>"; continue; }
      if (c === "*") { out += "·"; i++; continue; }
      if (c === "-") { out += "−"; i++; continue; }
      if (/[+=]/.test(c)) { out += " " + c + " "; i++; continue; }
      if (/[a-z]/i.test(c)) { const m = s.slice(i).match(/^[a-z]+/i)[0]; out += /^(sin|cos|tan|cot|ln|log|exp)$/i.test(m) ? m : m.length === 1 ? "<i>" + m + "</i>" : m; i += m.length; continue; }
      out += esc(c); i++; }
    return out.replace(/,/g, "{,}").replace(/\{,\}/g, ","); };
  return doc().replace(/(\d)\.(\d)/g, "$1,$2");
}
/* ================= Thiết diện ================= */
function veCat() {
  if (!canh) return; const c = catHT(), ok = laDaDien();
  $("cKhong").hidden = ok; $("cBat").disabled = !ok; $("cBat").checked = ok && c.bat; $("cHop").classList.toggle("tat", !(ok && c.bat));
  document.querySelectorAll("#h3_cKieu button").forEach(b => b.setAttribute("aria-pressed", b.dataset.kieu === c.kieu));
  $("cVTHop").hidden = c.kieu === "3diem"; $("cNgHop").hidden = c.kieu !== "nghieng"; $("cBaHop").hidden = c.kieu !== "3diem";
  $("cVT").value = Math.round(c.t * 100); $("cVTv").textContent = Math.round(c.t * 100) + "%";
  $("cGX").value = c.gx; $("cGXv").textContent = c.gx + "°"; $("cGY").value = c.gy; $("cGYv").textContent = c.gy + "°";
  const ten = tenCacDiem(); if (c.ba.length < 3 || c.ba.some(t => !ten.includes(t))) c.ba = ten.slice(0, 3);
  $("cBaHop").innerHTML = ["Điểm thứ nhất", "Điểm thứ hai", "Điểm thứ ba"].map((n, i) => '<label class="h3Truong"><span class="h3NhanNho">' + n + '</span><select data-ba="' + i + '">' + ten.map(t => '<option' + (c.ba[i] === t ? " selected" : "") + ">" + esc(t) + "</option>").join("") + "</select></label>").join("");
  $("cBaHop").querySelectorAll("select").forEach(s => s.onchange = () => { c.ba[+s.dataset.ba] = s.value; capCat(); });
  $("cTen").value = c.ten;
  $("cMau").innerHTML = MAU.map(m => '<button type="button" data-cm="' + m + '" style="background:' + m + '" aria-label="Màu ' + m + '" aria-pressed="' + (c.mau === m) + '"></button>').join("") + '<input type="color" id="h3_cMauRieng" value="' + c.mau + '" aria-label="Màu khác">';
  $("cMau").querySelectorAll("[data-cm]").forEach(b => b.onclick = () => { c.mau = b.dataset.cm; veCat(); capCat(); });
  $("cMauRieng").oninput = e => { c.mau = e.target.value; capCat(); };
  $("cDoMo").value = Math.round(c.a * 100); $("cDoMov").textContent = Math.round(c.a * 100) + "%";
  capCat();
}
function capCat(tuAnim) {
  const c = catHT(); $("cTach").value = Math.round(c.tach * 100); $("cTachv").textContent = Math.round(c.tach * 100) + "%";
  $("cNutTach").textContent = catAnim ? "Dừng" : c.tach > .5 ? "Ghép lại" : "Tách khối";
  const r = c.bat && laDaDien() ? tinhCat() : null, tt = $("cTT");
  if (!c.bat || !laDaDien()) tt.innerHTML = '<p class="h3Ghi">Bật mặt phẳng cắt để xem thiết diện.</p>';
  else if (!r || r.loi) tt.innerHTML = '<p class="h3CanhBao">' + esc(r ? r.loi : "Chưa cắt được") + "</p>";
  else { const ten = { 3: "tam giác", 4: "tứ giác", 5: "ngũ giác", 6: "lục giác" }[r.soDinh] || r.soDinh + "-giác";
    tt.innerHTML = '<div class="so"><span>Thiết diện là ' + ten + " <i>" + esc(r.ten.join("")) + '</i></span><b>S ≈ ' + so(r.dt) + "</b></div>"; }
  capThanh();
  if (!tuAnim) { tuongTac(); yeuCau(); }
}
function ganCat() {
  const c = () => catHT();
  $("cBat").onchange = e => { c().bat = e.target.checked; if (c().bat && st.moT > 0) { st.moT = 0; K.apDungMo(canh, 0); $("oMo").value = 0; $("vMo").textContent = "0%"; } veCat(); denGoc("giu"); };
  $("cKieu").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; c().kieu = b.dataset.kieu; if (!c().bat) c().bat = true; veCat(); });
  $("cVT").oninput = e => { c().t = e.target.value / 100; $("cVTv").textContent = e.target.value + "%"; capCat(); };
  $("cGX").oninput = e => { c().gx = +e.target.value; $("cGXv").textContent = e.target.value + "°"; capCat(); };
  $("cGY").oninput = e => { c().gy = +e.target.value; $("cGYv").textContent = e.target.value + "°"; capCat(); };
  $("cTen").onchange = e => { c().ten = e.target.value; capCat(); };
  $("cDoMo").oninput = e => { c().a = e.target.value / 100; $("cDoMov").textContent = e.target.value + "%"; capCat(); };
  $("cTach").oninput = e => { catAnim = null; c().tach = e.target.value / 100; capCat(); };
  $("cTach").onchange = () => vuaKhungTach();
  $("cNutTach").onclick = () => { if (catAnim) { catAnim = null; capCat(); return; } if (!c().bat) { c().bat = true; veCat(); } const den = c().tach > .5 ? 0 : 1;
    if (den === 1) vuaKhungTach(); if (giamDong) { c().tach = den; capCat(); return; } catAnim = { t0: performance.now(), tu: c().tach, den, dur: 1600 }; capCat(); yeuCau(); };
}
function vuaKhungTach() { // thu khung để hai nửa tách ra vẫn nằm gọn
  const cc = catHT(); if (!cc.bat || !laDaDien()) return; const r = K.catThietDien(canh, Object.assign({}, cc, { ten: K.tachTen(cc.ten), tach: 1 })); if (!r || !r.S) return;
  const f = K.vuaKhung(canh, cam.q, sk.clientWidth || 600, sk.clientHeight || 500, { oxyz: st.oxyz, xien: cam.xien, diem: r.S.v.map(p => ({ p })), leX: 120, leY: 190, dy: -14 });
  if (f.zoom < cam.zoom) cam.anim = { t0: performance.now(), dur: 450, q0: cam.q, q1: cam.q, z0: cam.zoom, z1: f.zoom, x0: cam.px, x1: f.px, y0: cam.py, y1: f.py }; yeuCau();
}
/* ================= Dựng thêm điểm phụ, đường phụ ================= */
const NHAN_O = { trung: ["Đầu mút thứ nhất", "Đầu mút thứ hai"], trongTam: ["Đỉnh 1", "Đỉnh 2", "Đỉnh 3", "Đỉnh 4 (tứ diện, có thể bỏ)"], tamNgoai: ["Đỉnh 1", "Đỉnh 2", "Đỉnh 3"],
  chia: ["Từ điểm", "Đến điểm"], chieuMP: ["Điểm cần chiếu", "Mặt phẳng qua điểm", "… điểm", "… điểm"], chieuDT: ["Điểm cần chiếu", "Đường thẳng qua điểm", "… điểm"],
  giao: ["Đường thứ nhất qua", "… và", "Đường thứ hai qua", "… và"], doan: ["Nối từ", "đến"] };
const MO_TA = { trung: "M là trung điểm đoạn thẳng nối hai điểm.", trongTam: "G là trọng tâm tam giác (hoặc tứ diện nếu chọn đủ 4 đỉnh).", tamNgoai: "Tâm đường tròn ngoại tiếp tam giác (cách đều 3 đỉnh).",
  chia: "M thuộc đoạn XY với XM = k·XY (vd k = 1/3 hoặc 2/3).", chieuMP: "Chân đường vuông góc hạ từ điểm xuống mặt phẳng — tự vẽ đường cao và ký hiệu góc vuông.", chieuDT: "Chân đường vuông góc hạ từ điểm xuống đường thẳng — tự vẽ đoạn vuông góc.",
  giao: "Giao điểm của hai đường thẳng cùng nằm trong một mặt phẳng (vd AC và BD).", doan: "Vẽ thêm đoạn thẳng phụ; phần bị che tự thành nét đứt." };
const TEN_GOI_Y = "MNPQKEFIJHGTUVXYZRL".split("");
const dsPhu = () => st.phuTheo[st.id] || (st.phuTheo[st.id] = []);
function tenMoi() { const co = new Set(tenCacDiem()); return TEN_GOI_Y.find(t => !co.has(t)) || TEN_GOI_Y.map(t => t + "1").find(t => !co.has(t)) || "M"; }
function docTiSo(t) { t = String(t).trim().replace(",", "."); const m = t.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/); const v = m ? +m[1] / +m[2] : +t; return isFinite(v) ? v : NaN; }
function moTaPhu(d) { const ds = d.ds.join(""); switch (d.loai) {
  case "trung": return d.ten + " = trung điểm " + ds; case "trongTam": return d.ten + " = trọng tâm " + ds; case "tamNgoai": return d.ten + " = tâm đường tròn ngoại tiếp " + ds;
  case "chia": return d.ten + " ∈ " + ds + ", " + d.ds[0] + d.ten + " = " + d.kChu + "·" + ds; case "chieuMP": return d.ten + " = hình chiếu của " + d.ds[0] + " lên (" + d.ds.slice(1).join("") + ")";
  case "chieuDT": return d.ten + " = hình chiếu của " + d.ds[0] + " lên " + d.ds.slice(1).join(""); case "giao": return d.ten + " = " + d.ds[0] + d.ds[1] + " ∩ " + d.ds[2] + d.ds[3]; default: return "Nối " + ds; } }
function veDungThem() {
  if (!canh) return; const loai = $("dLoai").value, nh = NHAN_O[loai], ten = tenCacDiem(), cu = [...$("dDiem").querySelectorAll("select")].map(s => s.value);
  $("dDiem").innerHTML = nh.map((n, i) => '<label class="h3Truong"><span class="h3NhanNho">' + esc(n) + '</span><select data-i="' + i + '">' + (loai === "trongTam" && i === 3 ? '<option value="">— bỏ qua —</option>' : "") + ten.map(t => '<option value="' + esc(t) + '">' + esc(t) + "</option>").join("") + "</select></label>").join("");
  const sel = [...$("dDiem").querySelectorAll("select")];
  sel.forEach((s, i) => { if (cu[i] != null && [...s.options].some(o => o.value === cu[i])) s.value = cu[i]; else if (!(loai === "trongTam" && i === 3)) s.selectedIndex = Math.min(i, s.options.length - 1); });
  const coTen = loai !== "doan"; $("dTen").hidden = !coTen; $("dTenNhan").hidden = !coTen; if (coTen && (!$("dTen").value || ten.includes($("dTen").value))) $("dTen").value = tenMoi();
  $("dK").hidden = $("dKNhan").hidden = loai !== "chia"; $("dMoTa").textContent = MO_TA[loai];
  $("dsDung").innerHTML = dsPhu().length ? dsPhu().map((d, i) => '<div class="h3DongPhu"><span>' + esc(moTaPhu(d)) + '</span><button type="button" data-xp="' + i + '" aria-label="Xoá">×</button></div>').join("") : '<p class="h3Ghi">Chưa có điểm, đường phụ nào.</p>';
  $("dsDung").querySelectorAll("[data-xp]").forEach(b => b.onclick = () => { const ds = dsPhu(), d = ds[+b.dataset.xp];
    const phuThuoc = d.ten && ds.some((x, j) => j > +b.dataset.xp && x.ds.includes(d.ten)); if (phuThuoc) { baoLoiDung("Còn điểm/đường khác dựng từ " + d.ten + " — hãy xoá chúng trước."); return; }
    ds.splice(+b.dataset.xp, 1); capNhatPhu(); });
}
function baoLoiDung(t) { const e = $("dLoi"); e.textContent = t || ""; e.hidden = !t; }
function themPhu(defs) {
  const ds = dsPhu(), n0 = ds.length; baoLoiDung("");
  for (const d of defs) {
    if (d.ten && tenCacDiem().concat(ds.slice(n0).map(x => x.ten)).includes(d.ten)) { baoLoiDung("Tên " + d.ten + " đã có trên hình — hãy đặt tên khác."); ds.length = n0; return false; }
    ds.push(d);
  }
  if (!dungCanh() || canh.loiPhu.length) { const loi = canh && canh.loiPhu.length ? canh.loiPhu.join(" · ") : st.loi; ds.length = n0; dungCanh(); baoLoiDung("Chưa dựng được: " + loi); return false; }
  capNhatPhu(); bao("Đã dựng: " + defs.map(moTaPhu).join("; ")); return true;
}
function capNhatPhu() { dungCanh(); if (st.moT > 0) K.apDungMo(canh, st.moT); veDungThem(); veNeo(); veDsDiem(); yeuCau(); }
function dungTuForm() {
  const loai = $("dLoai").value, ds = [...$("dDiem").querySelectorAll("select")].map(s => s.value).filter(Boolean);
  if (new Set(ds).size !== ds.length) { baoLoiDung("Các điểm được chọn phải khác nhau."); return; }
  const d = { loai, ds };
  if (loai !== "doan") { const t = $("dTen").value.trim(); if (!/^[A-Z][A-Za-z0-9]*'*$/.test(t)) { baoLoiDung("Tên điểm bắt đầu bằng chữ in hoa, vd M, N, G, H1, A'."); return; } d.ten = t; }
  if (loai === "chia") { const k = docTiSo($("dK").value); if (!isFinite(k)) { baoLoiDung("Tỉ số k chưa đúng, vd 1/3 hoặc 0,25."); return; } d.k = k; d.kChu = $("dK").value.trim(); }
  if (themPhu([d])) $("dTen").value = tenMoi();
}
/* lệnh nhanh: "M = trung điểm SA", "G = trọng tâm SBC", "H = hình chiếu S lên ABC", "I = giao AC và BD", "K = chia SB 1/3", "nối MG, SH" */
const tachTen = s => s.match(/[A-Z][0-9]*'*/g) || [];
function docLenh(txt) {
  const out = [], loi = [];
  String(txt).split(/\n|;/).map(x => x.trim()).filter(Boolean).forEach(dong => {
    let m = dong.match(/^([A-Z][A-Za-z0-9]*'*)\s*=\s*(.+)$/), ten = null, than = dong;
    if (m) { ten = m[1]; than = m[2]; }
    const tk = than.split(/[\s,]+/).filter(Boolean), tu = boDau(tk.filter(t => !/^[A-Z][A-Z0-9']*$/.test(t) && !/^-?\d/.test(t)).join(" ")), nhom = tk.filter(t => /^[A-Z][A-Z0-9']*$/.test(t)).map(tachTen), so1 = tk.find(t => /^-?\d/.test(t));
    const P = nhom.flat();
    if (!ten && /^noi|^ve doan|^duong phu/.test(tu)) { nhom.forEach(g => { if (g.length === 2) out.push({ loai: "doan", ds: g }); else loi.push("“" + dong + "”: mỗi đoạn cần đúng 2 điểm (vd nối MG, SH)"); }); return; }
    if (!ten) { loi.push("“" + dong + "”: thiếu tên điểm mới (vd M = trung điểm SA)"); return; }
    let d = null;
    if (/trung diem/.test(tu) && P.length === 2) d = { loai: "trung", ds: P };
    else if (/trong tam/.test(tu) && (P.length === 3 || P.length === 4 || P.length === 2)) d = { loai: "trongTam", ds: P };
    else if (/^tam/.test(tu) && P.length === 3) d = { loai: "tamNgoai", ds: P };
    else if (/(hinh chieu|chan duong cao|chan duong vuong goc)/.test(tu) && (P.length === 4 || P.length === 3)) d = { loai: P.length === 4 ? "chieuMP" : "chieuDT", ds: P };
    else if (/giao/.test(tu) && P.length === 4) d = { loai: "giao", ds: P };
    else if (/(chia|thuoc|ti so)/.test(tu) && P.length === 2 && so1) { const k = docTiSo(so1); if (isFinite(k)) d = { loai: "chia", ds: P, k, kChu: so1 }; }
    if (!d) { loi.push("“" + dong + "”: chưa hiểu — xem các mẫu trong ô"); return; }
    d.ten = ten; out.push(d);
  });
  return { out, loi };
}
/* ================= Trải phẳng ================= */
function datMo(t, tuAnim) {
  t = Math.max(0, Math.min(1, t)); if (!canh || !canh.coMo) return;
  if (t > 0 && catHT().bat) { bao("Hãy tắt mặt phẳng cắt (thẻ Thiết diện) trước khi trải phẳng"); $("oMo").value = 0; return; }
  if (t > 0 && !K.damBaoMo(canh)) { bao("Khối này chưa trải phẳng được"); return; }
  st.moT = t; K.apDungMo(canh, t); const pc = Math.round(t * 100); $("oMo").value = pc; $("vMo").textContent = pc + "%"; $("ghiMo").hidden = !(t > 0);
  if (!tuAnim) { capNutMo(); tuongTac(); yeuCau(); }
}
function capNutMo() { const chay = !!moAnim, mo = st.moT >= .5, b = $("nMoChay"); b.innerHTML = SVG(chay ? ICO_DUNG : mo ? '<path d="M4 20 20 4M4 4h7M4 4v7"/>' : ICO_CHAY, 2); b.setAttribute("aria-label", chay ? "Dừng" : mo ? "Gấp lại thành khối" : "Trải phẳng"); b.title = b.getAttribute("aria-label"); }

/* ================= Xuất TikZ, PNG ================= */
function taoTikz() { if (!canh || !st.frame) return ""; const ma = K.taoTikz(st.canhVe || canh, st.frame, Object.assign(tuyChon(), { nhanh: false })); $("maTikz").value = ma; $("ttMa").textContent = ma.split("\n").length + " dòng · " + (ma.length / 1024).toFixed(1).replace(".", ",") + " KB"; return ma; }
function taiPng() {
  const W = Math.round(sk.clientWidth * 3), H = Math.round(sk.clientHeight * 3), c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  K.ve(x, canhVe(), cam, W, H, 3, Object.assign(tuyChon(), { giay: true, hover: -1, nhanh: false }));
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
  if (P.tenDay) nd.push("tenDay = " + P.tenDay); if (P.tenTren) nd.push("tenTren = " + P.tenTren);
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
    $("bangTab").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
      document.querySelectorAll("#h3_bangTab button").forEach(x => x.setAttribute("aria-selected", x === b));
      goc.querySelectorAll(".h3Than > section").forEach(s => s.hidden = s.dataset.th !== b.dataset.th);
      if (b.dataset.th === "dung") veDungThem();
      if (b.dataset.th === "catTD") veCat();
      if (b.dataset.th === "xuat") taoTikz(); });
    $("oBut").onchange = e => datBut(e.target.checked);
    $("oDoMo").oninput = e => { st.doMo = e.target.value / 100; $("vDoMo").textContent = e.target.value + "%"; };
    $("oDoDam").oninput = e => { st.doDam = e.target.value / 100; $("vDoDam").textContent = e.target.value + "%"; yeuCau(); };
    $("nHoan").onclick = () => { const s = st.hoanTac[st.id]; if (!s || !s.length) { bao("Không còn bước để hoàn tác"); return; } st.mauTheo[st.id] = JSON.parse(s.pop()); veDsMat(); yeuCau(); };
    $("nXoaMau").onclick = () => { luuHoanTac(); st.mauTheo[st.id] = {}; veDsMat(); yeuCau(); };
    $("oGoc").onchange = () => { const v = $("oGoc").value; datNeo(v.startsWith("d:") ? "diem:" + v.slice(2) : v.slice(2)); };
    $("oTrucX").onchange = () => { const g = $("oGoc").value; if (g.startsWith("d:")) datNeo("diem:" + g.slice(2) + ($("oTrucX").value ? ">" + $("oTrucX").value : "")); };
    $("dLoai").onchange = () => veDungThem();
    ganCat();
    $("nDung").onclick = dungTuForm;
    $("dTen").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); dungTuForm(); } });
    $("nLenh").onclick = () => { const r = docLenh($("dLenh").value); if (r.loi.length) { baoLoiDung(r.loi.join(" · ")); if (!r.out.length) return; } if (r.out.length && themPhu(r.out)) { $("dLenh").value = ""; if (r.loi.length) baoLoiDung(r.loi.join(" · ")); } };
    $("nXoaDung").onclick = () => { st.phuTheo[st.id] = []; baoLoiDung(""); capNhatPhu(); };
    ["x0", "y0", "z0"].forEach((id, i) => $(id).addEventListener("input", e => { st.off[i] = +e.target.value || 0; if (canh && canh.neo === "tuChon") { dungCanh(); veDsDiem(); yeuCau(); } }));
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
