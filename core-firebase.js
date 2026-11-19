/* ===== core-firebase.js — Firebase Auth/Firestore + window.KFB K-Pado bridge + engine loader.
   Kept as type="module" (the ONE exception): it uses ESM `import` from the
   Firebase CDN, which is only legal inside a module script. Rewriting it to
   the firebase-compat global API would touch nearly every KFB.* call site
   and risk real regressions, so it stays a module -- it already only
   communicates with the rest of the app via window.*, exactly like every
   other script here. ===== */


import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, increment, serverTimestamp, writeBatch, collection, addDoc, getDocs, query, where, orderBy, limit, onSnapshot, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, EMAIL_QUAN_TRI, LIEN_HE } from "./cauhinh.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// ===== Cầu nối Firebase cho module Thi Online (dùng collection/query/realtime) =====
window.KFB = { db, auth, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, query, where, orderBy, limit, onSnapshot, serverTimestamp, writeBatch, increment, arrayUnion, signInAnonymously,
	uid: () => auth.currentUser && auth.currentUser.uid, taiKhoan: () => auth.currentUser };
window.KFB.veTikzThu = async ma => {
	if (!boMay || typeof boMay.veTikz !== "function") return { ok: false, log: "Bộ vẽ hình chưa sẵn sàng." };
	try {
		const r = await Promise.race([boMay.veTikz(ma, { doPhanGiai: 2 }), new Promise(ok => setTimeout(() => ok({ loi: true, loiTxt: "quá 90 giây không vẽ xong" }), 90000))]);
		const url = (d, kieu) => !d ? "" : typeof d === "string" && /^(data:|blob:)/.test(d) ? d : typeof d === "string" && kieu === "image/png" ? "data:image/png;base64," + d : URL.createObjectURL(new Blob([d], { type: kieu }));
		if (r && !r.loi && (r.png || r.svg)) return { ok: true, png: url(r.png, "image/png"), svg: url(r.svg, "image/svg+xml") };
		return { ok: false, log: String((r && (r.log || (typeof r.loi === "string" && r.loi) || r.loiTxt)) || "không vẽ được").slice(-3000) };
	} catch (e) { return { ok: false, log: String(e && e.message || e).slice(-3000) }; }
};
const KPADO_URL = "https://kpado.dangkhoa08352708.workers.dev";   // ← địa chỉ Worker K-Pado
// ----- K-Pado: 1 lần gọi (có hẹn giờ chờ phản hồi đầu + canh luồng im lặng) -----
const kpLoi = (m, tam) => Object.assign(new Error(m), { tam: !!tam });
const KP_TAM = /Không kết nối|network|Failed to fetch|Load failed|quá \d+ giây|timeout|im lặng|ngắt|\b(408|425|500|502|503|504|520|521|522|523|524)\b|Proxy:|lỗi luồng|không trả về mã/i;
async function kpGoiMotLan(ten, data, tok) {
	const ctl = new AbortController(); let hen = setTimeout(() => ctl.abort(), 30000);   // 30 giây chưa có phản hồi đầu → bỏ, thử lại
	let res;
	try { res = await fetch(KPADO_URL.replace(/\/+$/, "") + "/" + ten, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok }, body: JSON.stringify(data || {}) }); }
	catch (e) { clearTimeout(hen); throw kpLoi(ctl.signal.aborted ? "Máy chủ K-Pado quá 30 giây không phản hồi." : "Không kết nối được máy chủ K-Pado. Kiểm tra mạng.", true); }
	clearTimeout(hen);
	if (res.ok && (res.headers.get("Content-Type") || "").includes("text/event-stream")) {
		// đọc luồng Gemini từng đoạn; luồng im lặng quá 75 giây (Worker/proxy giữ kết nối mỗi 10–15 giây) → coi như đứt
		const rd = res.body.getReader(), dec = new TextDecoder(); let dem = "", chu = "", meta = {}, lyDo = "", loiLuong = "", dut = false;
		const canh = () => { clearTimeout(hen); hen = setTimeout(() => { dut = true; try { rd.cancel(); } catch (e) { } }, 75000); };
		const xuLy = khoi => {
			let ev = "", dl = "";
			khoi.split("\n").forEach(d => { if (d.startsWith("event:")) ev = d.slice(6).trim(); else if (d.startsWith("data:")) dl += d.slice(5).trim(); });
			if (!dl) return;
			let o; try { o = JSON.parse(dl); } catch (e) { return; }
			if (ev === "meta") { meta = o; return; }
			if (ev === "loi" || o.error) { loiLuong = o.loi || (o.error && o.error.message) || "lỗi luồng"; return; }
			const c = (o.candidates || [])[0] || {};
			((c.content || {}).parts || []).forEach(p => { if (p.text && !p.thought) chu += p.text; });   // p.thought = tóm tắt suy nghĩ, chỉ để giữ kết nối
			if (c.finishReason) lyDo = c.finishReason;
			if (typeof window.KFB.kpadoTienDo === "function") window.KFB.kpadoTienDo(chu.length);
		};
		canh();
		try {
			for (;;) {
				const { done, value } = await rd.read(); if (done) break; canh();
				dem += dec.decode(value, { stream: true }).replace(/\r\n/g, "\n");
				let k; while ((k = dem.indexOf("\n\n")) >= 0) { xuLy(dem.slice(0, k)); dem = dem.slice(k + 2); }
			}
		} catch (e) { dut = true; }
		finally { clearTimeout(hen); }
		if (dem.trim()) xuLy(dem);
		if (!chu && dut) throw kpLoi("Luồng K-Pado bị ngắt giữa chừng.", true);
		if (loiLuong && !chu) throw kpLoi("Gemini: " + loiLuong, KP_TAM.test(loiLuong) && !/quá tải cả/.test(loiLuong));
		let t = chu.trim();
		if (meta.che !== "json") {
			const kh = [...t.matchAll(/```[a-zA-Z]*\s*\n([\s\S]*?)```/g)].map(m => m[1].trim()); if (kh.length) t = kh.join("\n\n");
			const vt = t.search(/\\begin\{(ex|tikzpicture)\}/); if (vt > 0) t = t.slice(vt);
			if (meta.che === "tikz") { const m = t.match(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/); if (m) t = m[0]; }
		}
		if (!t) throw kpLoi("K-Pado không trả về mã LaTeX" + (lyDo ? " (" + lyDo + ")" : "") + ". Thử lại hoặc bật Chế độ VIP.", !lyDo || lyDo === "OTHER");
		return { ...meta, tho: t.trim(), catNgang: lyDo === "MAX_TOKENS" || (dut && !!chu) };
	}
	const j = await res.json().catch(() => ({}));
	if (!res.ok) { const m = j.loi || ("Máy chủ K-Pado lỗi " + res.status); throw kpLoi(m, [408, 425, 500, 502, 503, 504, 520, 521, 522, 523, 524].includes(res.status) || (res.status === 429 && !/lượt K-Pado/.test(m))); }
	return j;
}
// ----- K-Pado: tự thử lại ngầm tối đa 2 lần khi lỗi mạng / khởi động nguội / 5xx / 524 -----
window.KFB.kpado = async (ten, data) => {
	const u = auth.currentUser;
	if (!u) throw new Error("Chưa đăng nhập.");
	let j;
	for (let lan = 0; ; lan++) {
		try { j = await kpGoiMotLan(ten, data, await u.getIdToken()); break; }
		catch (e) {
			if (!e.tam || lan >= 2) throw e;
			if (typeof window.KFB.kpadoThuLai === "function") window.KFB.kpadoThuLai(lan + 1);
			await new Promise(ok => setTimeout(ok, lan ? 4000 : 1500));
		}
	}
	if (j.che === "json") { j.ketQua = j.tho; return j; }
	if (j.tho) {                                  // chuẩn hoá bằng bộ luật ngay trên máy
		if (boMay && typeof boMay.chuanHoa === "function") {
			try { const c = boMay.chuanHoa(j.tho, {}); j.ketQua = c.ketQua || j.tho; j.baoCao = { daSua: (c.nhatKi || []).length, canSuaTay: (c.canhBao || []).length, phienBanBoLuat: c.phienBan, catNgang: !!j.catNgang }; }
			catch (e) { j.ketQua = j.tho; j.baoCao = { daSua: 0, canSuaTay: 0, loiBoLuat: String(e && e.message || e), catNgang: !!j.catNgang }; }
		} else { j.ketQua = j.tho; j.baoCao = { daSua: 0, canSuaTay: 0, loiBoLuat: "Bộ luật chưa tải xong", catNgang: !!j.catNgang }; }
	}
	return j;
};
// ----- K-Pado: "đánh thức" Worker + proxy Vercel trước khi dùng (tránh lần gọi đầu bị nguội) -----
window.KFB.kpadoPing = () => fetch(KPADO_URL.replace(/\/+$/, "") + "/ping", { cache: "no-store" }).catch(() => { });
setTimeout(() => window.KFB.kpadoPing(), 2500);
setInterval(() => { const t = document.getElementById("tabKPado"); if (t && !t.hidden && document.visibilityState === "visible") window.KFB.kpadoPing(); }, 240000);
let boMay = null;   // bộ luật, chỉ tải được khi tài khoản đã duyệt
const $ = id => document.getElementById(id);

/* ---------- chuyển màn hình ---------- */
function man(ten) { ["manTai", "manDangNhap", "manChoDuyet", "manCongCu"].forEach(m => $(m).hidden = m !== ten); }
function hien(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("hien"); clearTimeout(hien.t); hien.t = setTimeout(() => t.classList.remove("hien"), 2000); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }
$("lienHe").textContent = LIEN_HE;

/* ---------- đăng nhập ---------- */
$("nutDangNhap").addEventListener("click", async () => {
	$("loiDangNhap").textContent = "";
	try { await signInWithPopup(auth, new GoogleAuthProvider()); }
	catch (e) { $("loiDangNhap").textContent = "Không đăng nhập được (" + e.code + "). Thử lại hoặc cho phép cửa sổ bật lên."; }
});
/* ---------- đăng nhập email / mật khẩu (cổng mới) ---------- */
const kcBao = (t, loi) => { const b = $("loiDangNhap"); b.className = "kcBao" + (loi ? " loi" : ""); b.textContent = t; };
const kcLoi = c => ({
	"auth/invalid-email": "Email không hợp lệ.",
	"auth/missing-password": "Chưa nhập mật khẩu.",
	"auth/weak-password": "Mật khẩu cần ít nhất 6 ký tự.",
	"auth/email-already-in-use": "Email này đã có tài khoản — chọn Đăng nhập.",
	"auth/invalid-credential": "Sai email hoặc mật khẩu.",
	"auth/wrong-password": "Sai email hoặc mật khẩu.",
	"auth/user-not-found": "Chưa có tài khoản với email này — chọn Đăng ký.",
	"auth/too-many-requests": "Thử sai quá nhiều lần, vui lòng đợi ít phút.",
	"auth/operation-not-allowed": "Hệ thống chưa bật đăng nhập bằng email — dùng nút Google."
})[c] || "Không thực hiện được (" + c + ").";
$("kcForm").addEventListener("submit", async e => {
	e.preventDefault();
	const email = $("kcEmail").value.trim(), mk = $("kcMk").value, dk = window.__kcChe === "dk", nut = $("kcNutChinh");
	if (!email || !mk) { kcBao("Nhập đủ email và mật khẩu.", true); return; }
	nut.disabled = true; kcBao(dk ? "Đang tạo tài khoản…" : "Đang đăng nhập…");
	try {
		if (dk) {
			const kq = await createUserWithEmailAndPassword(auth, email, mk);
			const ten = $("kcTenNd").value.trim();
			if (ten) await updateProfile(kq.user, { displayName: ten });
		} else await signInWithEmailAndPassword(auth, email, mk);
		kcBao("");
	} catch (er) { kcBao(kcLoi(er.code), true); }
	finally { nut.disabled = false; }
});
$("kcQuenMk").addEventListener("click", async () => {
	const email = $("kcEmail").value.trim();
	if (!email) { kcBao("Nhập email rồi bấm lại Quên mật khẩu.", true); $("kcEmail").focus(); return; }
	try { await sendPasswordResetEmail(auth, email); kcBao("Đã gửi thư đặt lại mật khẩu tới " + email + "."); }
	catch (er) { kcBao(kcLoi(er.code), true); }
});
$("nutThoat").addEventListener("click", () => { boMay = null; signOut(auth); });
$("nutKiemTraLai").addEventListener("click", () => auth.currentUser && kiemTraQuyen(auth.currentUser));

// Chế độ HS làm bài (?thi=MÃ): KHÔNG qua cổng duyệt, tự đăng nhập ẩn danh, nạp bộ luật ngay
const LA_THI = new URLSearchParams(location.search).has("thi");
onAuthStateChanged(auth, async user => {
	if (LA_THI) {
		$("taiKhoan").hidden = true;
		if (!user) { try { await signInAnonymously(auth); } catch (e) { console.error("Đăng nhập ẩn danh lỗi:", e.code || e); } return; }
		try { await taiBoLuat(); } catch (e) { console.error("Tải bộ luật (chế độ thi) lỗi:", e.message || e); }
		return;
	}
	if (!user) { $("taiKhoan").hidden = true; man("manDangNhap"); return; }
	$("taiKhoan").hidden = false;
	$("emailNd").textContent = user.email;
	if (user.photoURL) $("anh").src = user.photoURL; else $("anh").hidden = true;
	$("linkAdmin").hidden = !EMAIL_QUAN_TRI.includes(user.email);
	await kiemTraQuyen(user);
});

// Tạo hồ sơ lần đầu (trạng thái chờ duyệt), đọc trạng thái hiện tại
async function kiemTraQuyen(user) {
	man("manTai");
	const ref = doc(db, "nguoiDung", user.uid);
	let snap = await getDoc(ref);
	if (!snap.exists()) {
		await setDoc(ref, { email: user.email, ten: user.displayName || "", daDuyet: false, ngayDangKy: serverTimestamp() });
		snap = await getDoc(ref);
	}
	const d = snap.data();
	const laQT = EMAIL_QUAN_TRI.includes(user.email);
	const hetHan = d.hetHan ? d.hetHan.toDate() : null;
	const conHan = !hetHan || hetHan > new Date();
	if (laQT || (d.daDuyet && conHan)) {
		$("hanDung").textContent = laQT ? "· quản trị viên" : hetHan ? "· hạn dùng đến " + hetHan.toLocaleDateString("vi-VN") : "· không giới hạn";
		try { await taiBoLuat(); }
		catch (e) {
			$("nhanTrangThai").textContent = "Lỗi";
			$("tieuDeCho").textContent = "Chưa tải được bộ luật";
			$("loiChoDuyet").textContent = e.message;
			man("manChoDuyet"); return;
		}
		man("manCongCu");
		return;
	}
	if (d.daDuyet && !conHan) {
		$("nhanTrangThai").textContent = "Hết hạn";
		$("tieuDeCho").textContent = "Tài khoản đã hết hạn sử dụng";
		$("loiChoDuyet").textContent = "Hạn dùng kết thúc ngày " + hetHan.toLocaleDateString("vi-VN") + ". Liên hệ để gia hạn.";
	} else {
		$("nhanTrangThai").textContent = "Đang chờ duyệt";
		$("tieuDeCho").textContent = "Tài khoản chưa được kích hoạt";
		$("loiChoDuyet").textContent = "Đã ghi nhận đăng kí của " + user.email + ". Quản trị viên sẽ duyệt tài khoản của bạn.";
	}
	man("manChoDuyet");
}

/* ---------- tải bộ luật từ cơ sở dữ liệu ---------- */
async function taiBoLuat() {
	if (boMay) return;
	let snap;
	try { snap = await getDoc(doc(db, "heThong", "boLuat")); }
	catch (e) { throw new Error("Tài khoản không có quyền tải bộ luật (" + e.code + ")."); }
	if (!snap.exists()) throw new Error("Quản trị viên chưa tải bộ luật lên. Vào trang Quản trị → Cập nhật bộ luật.");
	const hop = {};
	new Function("window", snap.data().ma)(hop);
	if (!hop.TDK || typeof hop.TDK.chuanHoa !== "function") throw new Error("Bộ luật trên hệ thống bị lỗi, báo quản trị viên.");
	boMay = hop.TDK;
	window.__TDK = boMay;   // cho khu Chuyển đổi đề dùng chung bộ luật
	const pb = snap.data().phienBan;
	if (pb) $("hanDung").textContent += " · bộ luật " + pb;
}

/* ---------- kho hình TikZ dùng chung (không giới hạn số hình) ----------
   khoTikz/{id}        : mỗi hình một tài liệu (mã TikZ đầy đủ, đề bài)
   khoTikzMuc/p1, p2…  : chỉ mục nhỏ để so khớp (dấu vân tay, loại, đoạn đề), mỗi phần ≤ 850 KB
   khoTikzMuc/_muc     : danh sách phần + phiên bản — máy người dùng chỉ tải lại phần nào đã đổi */
const KHO = { phan: null };
const KHO_MUC = "khoTikzMuc", KHO_MA = "khoTikz", CO_PHAN = 850000, maHoa = new TextEncoder();
const chiMucKho = m => { const x = { id: m.id, loai: m.loai, de: String(m.de || "").slice(0, 240), ngay: m.ngay || Date.now() }; for (const k of ["km", "vt", "tl", "vt2", "tl2", "khoaAnh", "loi", "the", "tp", "tpv"]) if (m[k]) x[k] = m[k]; return x; };
const loiQuyen = (e, viec) => new Error(viec + " (" + (e.code || e.message) + ")" + (/permission/.test(e.code || e.message) ? " — cần thêm quy tắc Firestore cho kho TikZ" : ""));
async function luuCacheKho() { const W = boMay && boMay._w2t; if (W && KHO.phan) await W.khoGhi("khotikz:muc", { phan: KHO.phan }); }
window.__khoTikz = {
	laQT: () => !!(auth.currentUser && EMAIL_QUAN_TRI.includes(auth.currentUser.email)),
	async tai(epTai) {
		const W = boMay && boMay._w2t;
		let meta;
		try { meta = await getDoc(doc(db, KHO_MUC, "_muc")); } catch (e) { throw loiQuyen(e, "tài khoản chưa đọc được kho"); }
		const dsPhan = meta.exists() ? (meta.data().phan || {}) : {};
		const cu = (W && !epTai && await W.khoDoc("khotikz:muc")) || { phan: {} };
		const phan = {};
		await Promise.all(Object.keys(dsPhan).map(async p => {
			const c = cu.phan && cu.phan[p];
			if (c && c.pb === dsPhan[p] && Array.isArray(c.ds)) { phan[p] = c; return; }
			const s = await getDoc(doc(db, KHO_MUC, p));
			let ds = []; try { ds = s.exists() ? JSON.parse(s.data().ds) : []; } catch (e) { ds = []; }
			phan[p] = { pb: dsPhan[p], ds };
		}));
		KHO.phan = phan; await luuCacheKho();
		const ds = []; for (const p in phan) for (const m of phan[p].ds) ds.push(Object.assign({ _p: p }, m));
		ds.sort((a, b) => (b.ngay || 0) - (a.ngay || 0));
		const d = meta.exists() ? meta.data() : {};
		return { ds, capNhat: d.capNhat && d.capNhat.toDate ? d.capNhat.toDate().getTime() : null };
	},
	async layMa(id) {
		const W = boMay && boMay._w2t;
		const c = W && await W.khoDoc("ktma:" + id); if (c && c.ma) return c.ma;
		const s = await getDoc(doc(db, KHO_MA, id));
		const ma = s.exists() ? s.data().ma : null;
		if (ma && W) await W.khoGhi("ktma:" + id, { ma });
		return ma;
	},
	// thêm một lô hình (đã có mã + dấu vân tay); trả về các mục chỉ mục đã lưu
	async them(ds) {
		if (!KHO.phan) await this.tai();
		const W = boMay && boMay._w2t;
		const truoc = JSON.stringify(KHO.phan);
		const ten = Object.keys(KHO.phan).sort((a, b) => +a.slice(1) - +b.slice(1));
		let p = ten[ten.length - 1], so = p ? +p.slice(1) : 0;
		let co = p ? maHoa.encode(JSON.stringify(KHO.phan[p].ds)).length : Infinity;
		const lo = writeBatch(db), sua = new Set(), ra = [];
		const email = auth.currentUser ? auth.currentUser.email : "";
		for (const m of ds) {
			lo.set(doc(db, KHO_MA, m.id), { ma: m.ma, de: m.de || "", the: m.the || "", loai: m.loai || "", ngay: m.ngay || Date.now(), nguoi: email });
			const x = chiMucKho(m), b = maHoa.encode(JSON.stringify(x)).length + 1;
			if (!p || co + b > CO_PHAN) { so++; p = "p" + so; KHO.phan[p] = { pb: 0, ds: [] }; co = 2; }
			KHO.phan[p].ds.push(x); co += b; sua.add(p); ra.push(Object.assign({ _p: p }, x));
		}
		const pb = Date.now();
		for (const q of sua) { KHO.phan[q].pb = pb; lo.set(doc(db, KHO_MUC, q), { ds: JSON.stringify(KHO.phan[q].ds) }); }
		const dsPhan = {}; let tong = 0; for (const q in KHO.phan) { dsPhan[q] = KHO.phan[q].pb; tong += KHO.phan[q].ds.length; }
		lo.set(doc(db, KHO_MUC, "_muc"), { phan: dsPhan, tong, capNhat: serverTimestamp(), nguoiSua: email });
		try { await lo.commit(); } catch (e) { KHO.phan = JSON.parse(truoc); throw loiQuyen(e, "hệ thống từ chối lưu kho"); }
		await luuCacheKho();
		if (W) for (const m of ds) await W.khoGhi("ktma:" + m.id, { ma: m.ma });
		return ra;
	},
	async xoa(id) { return this.xoaNhieu([id]); },
	// sửa vài trường chỉ mục (đề, ảnh gốc, khoá code…) của các mục đã có: [{id, ...trường}]
	async capNhat(ds) {
		if (!KHO.phan) await this.tai();
		const truoc = JSON.stringify(KHO.phan), pb = Date.now(), sua = new Set(), lo = writeBatch(db);
		const theoId = new Map(ds.map(x => [x.id, x]));
		for (const q in KHO.phan) KHO.phan[q].ds.forEach((m, i) => { const x = theoId.get(m.id); if (!x) return; const moi = Object.assign({}, m); for (const k in x) if (k !== "id" && k !== "_p" && k !== "ma") moi[k] = x[k]; KHO.phan[q].ds[i] = chiMucKho(moi); if (moi.km) KHO.phan[q].ds[i].km = moi.km; sua.add(q); });
		if (!sua.size) return;
		// phần nào phình quá giới hạn (thêm chỉ mục thành phần…) → chuyển bớt mục sang phần mới
		for (const q of [...sua]) { let co = maHoa.encode(JSON.stringify(KHO.phan[q].ds)).length; if (co <= CO_PHAN) continue; const ten = Object.keys(KHO.phan).sort((a, b) => +a.slice(1) - +b.slice(1)); let so = +ten[ten.length - 1].slice(1), moi = null; while (co > CO_PHAN && KHO.phan[q].ds.length > 1) { const m = KHO.phan[q].ds.pop(); co -= maHoa.encode(JSON.stringify(m)).length + 1; if (!moi || maHoa.encode(JSON.stringify(KHO.phan[moi].ds)).length > CO_PHAN - 50000) { so++; moi = "p" + so; KHO.phan[moi] = { pb: 0, ds: [] }; sua.add(moi); } KHO.phan[moi].ds.push(m); } }
		for (const q of sua) { KHO.phan[q].pb = pb; lo.set(doc(db, KHO_MUC, q), { ds: JSON.stringify(KHO.phan[q].ds) }); }
		const dsPhan = {}; let tong = 0; for (const q in KHO.phan) { dsPhan[q] = KHO.phan[q].pb; tong += KHO.phan[q].ds.length; }
		lo.set(doc(db, KHO_MUC, "_muc"), { phan: dsPhan, tong, capNhat: serverTimestamp() });
		try { await lo.commit(); } catch (e) { KHO.phan = JSON.parse(truoc); throw loiQuyen(e, "hệ thống từ chối cập nhật"); }
		await luuCacheKho();
	},
	// lệnh dùng chung (định nghĩa \newcommand, \tikzset, màu… mà hình trong kho dùng tới)
	async taiDau() { try { const s = await getDoc(doc(db, KHO_MUC, "_dau")); return s.exists() ? (s.data().chu || "") : ""; } catch (e) { return ""; } },
	async ghiDau(chu) { try { await setDoc(doc(db, KHO_MUC, "_dau"), { chu: String(chu || ""), capNhat: serverTimestamp() }); } catch (e) { throw loiQuyen(e, "hệ thống từ chối lưu lệnh dùng chung"); } },
	async xoaNhieu(ids) {
		if (!KHO.phan) await this.tai();
		const bo = new Set(ids); if (!bo.size) return;
		const truoc = JSON.stringify(KHO.phan); const pb = Date.now();
		const ids2 = [...bo];
		for (let a = 0; a < ids2.length; a += 400) {
			const lo = writeBatch(db), sua = new Set();
			for (const id of ids2.slice(a, a + 400)) {
				lo.delete(doc(db, KHO_MA, id));
				for (const q in KHO.phan) { const n = KHO.phan[q].ds.length; KHO.phan[q].ds = KHO.phan[q].ds.filter(m => m.id !== id); if (KHO.phan[q].ds.length !== n) sua.add(q); }
			}
			for (const q of sua) { KHO.phan[q].pb = pb; lo.set(doc(db, KHO_MUC, q), { ds: JSON.stringify(KHO.phan[q].ds) }); }
			const dsPhan = {}; let tong = 0; for (const q in KHO.phan) { dsPhan[q] = KHO.phan[q].pb; tong += KHO.phan[q].ds.length; }
			lo.set(doc(db, KHO_MUC, "_muc"), { phan: dsPhan, tong, capNhat: serverTimestamp() });
			try { await lo.commit(); } catch (e) { KHO.phan = JSON.parse(truoc); throw loiQuyen(e, "hệ thống từ chối xoá"); }
		}
		await luuCacheKho();
	}
};

/* ---------- công cụ ---------- */
const O_TT = ["tenDuAn", "gvSoan", "gvPB1"];
const O_CHON = ["bocSo", "bocTenDiem", "nhanForeach", "xoaCanChinh", "xoaCommentCode", "khoiDinhDanh", "thutLe", "ghiChuSuaTay"];
function doc_(k) { try { return localStorage.getItem("tdk_" + k); } catch (e) { return null; } }
function luu(k, v) { try { localStorage.setItem("tdk_" + k, v); } catch (e) {} }
try { const v = localStorage.getItem("tdk_cheDoMau"); if (v) document.getElementById("cheDoMau").value = v; } catch (e) {}
document.getElementById("cheDoMau").addEventListener("change", e => { try { localStorage.setItem("tdk_cheDoMau", e.target.value); } catch (er) {} });
O_TT.forEach(k => { const v = doc_(k); if (v) $(k).value = v; $(k).addEventListener("input", () => luu(k, $(k).value)); });
O_CHON.forEach(k => { const v = doc_(k); if (v !== null) $(k).checked = v === "1"; $(k).addEventListener("change", () => luu(k, $(k).checked ? "1" : "0")); });
function dem(s) { const n = s ? s.split("\n").length : 0; return n ? "· " + n + " dòng" : ""; }
$("vao").addEventListener("input", () => $("demVao").textContent = dem($("vao").value));

// Render thử từng hình TikZ sau chuẩn hoá. Hình nào lỗi → tự TRẢ VỀ CODE GỐC của đúng hình đó (nếu code gốc vẽ được).
const RE_HINH = /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g;
async function veThuHinh(h) {
	try {
		const r = await Promise.race([boMay.veTikz(h, { doPhanGiai: 1 }), new Promise(ok => setTimeout(() => ok({ loi: true, loiTxt: "quá 25 giây không vẽ xong" }), 25000))]);
		return r && !r.loi && (r.png || r.svg) ? "" : (r && r.loiTxt ? String(r.loiTxt).slice(0, 160) : "không vẽ được");
	} catch (e) { return String(e.message || e).slice(0, 160); }
}
async function chayLuongCH(ds, n, f) { let k = 0; await Promise.all(Array.from({ length: Math.min(n, ds.length) }, async () => { while (k < ds.length) { const i = k++; await f(ds[i], i); } })); }
// Nhớ kết quả render theo code hình (trong phiên) — hình trùng nhau giữa các file chỉ vẽ 1 lần. Không nhớ lỗi quá giờ.
const nhoVe = new Map();
async function veThuNho(h) {
	if (nhoVe.has(h)) return nhoVe.get(h);
	const r = await veThuHinh(h);
	if (!/^quá \d+ giây/.test(r)) { if (nhoVe.size > 3000) nhoVe.clear(); nhoVe.set(h, r); }
	return r;
}
// Lõi kiểm hình (dùng chung 1 file / nhiều file): render từng hình của `ra`; hình lỗi → thử code gốc cùng vị trí, vẽ được thì thay vào.
// Trả { moi, ket, tong } hoặc null nếu bị dừng.
async function kiemHinhLoi(goc, ra, o = {}) {
	const src = ra || goc, hinh = [...src.matchAll(RE_HINH)], tien = o.tien || (() => {}), dung = o.dung || (() => false);
	const loi = new Array(hinh.length).fill(""); let xong = 0;
	await chayLuongCH(hinh.map((_, i) => i), o.song || 1, async i => { if (dung()) return; loi[i] = await veThuNho(hinh[i][0]); tien("ve", ++xong, hinh.length); });
	if (dung()) return null;
	const hong = loi.map((t, i) => t ? i : -1).filter(i => i >= 0), ket = [];
	let moi = ra;
	if (ra && hong.length) {
		const hinhGoc = [...goc.matchAll(RE_HINH)], khop = hinhGoc.length === hinh.length;
		for (const i of hong.slice().reverse()) {            // thay từ cuối lên để không lệch vị trí
			let tra = "khongKhop";
			if (khop) {
				if (hinhGoc[i][0] === hinh[i][0]) tra = "gocLoi";   // chuẩn hoá không đổi hình này → lỗi có sẵn từ gốc
				else { if (dung()) return null; tien("goc", i + 1);
					if (!(await veThuNho(hinhGoc[i][0]))) { moi = moi.slice(0, hinh[i].index) + hinhGoc[i][0] + moi.slice(hinh[i].index + hinh[i][0].length); tra = "goc"; } else tra = "gocLoi"; }
			}
			ket.unshift({ i, txt: loi[i], tra });
		}
	} else hong.forEach(i => ket.push({ i, txt: loi[i], tra: "" }));
	const cuoi = moi || src, vt = [...cuoi.matchAll(RE_HINH)];
	ket.forEach(k => { const m = vt[k.i]; if (!m) return; k.dong = cuoi.slice(0, m.index).split("\n").length; k.a = m.index; k.b = m.index + m[0].length;
		k.mo = (m[0].split("\n").find(l => /\\(draw|fill|filldraw|coordinate|path|node|foreach|tkz[A-Za-z]*|clip)\b/.test(l)) || "").trim().slice(0, 80); });
	return { moi, ket, tong: hinh.length };
}
function htmlKiem(r) {
	const ket = r.ket, daTra = ket.filter(k => k.tra === "goc").length, conLoi = ket.length - daTra;
	const dong = k => k.dong ? '<button class="dong" type="button" data-a="' + k.a + '" data-b="' + k.b + '">dòng ' + k.dong + "</button>" : "";
	const moTa = k => k.tra === "goc" ? "<b>đã tự trả về code gốc</b> (code gốc vẽ được)" : k.tra === "gocLoi" ? "cả code gốc cũng không vẽ được — " + esc(k.txt) : k.tra === "khongKhop" ? "không tự trả về được (số hình trước/sau chuẩn hoá khác nhau) — " + esc(k.txt) : esc(k.txt);
	if (!r.tong) return '<span class="the on">Không có hình TikZ nào để kiểm.</span>';
	return (!ket.length ? '<span class="the on">✓ ' + r.tong + " hình TikZ đều vẽ được — chuẩn hoá không làm hỏng hình.</span>"
		: (conLoi ? '<span class="the canh">⚠ ' + conLoi + "/" + r.tong + " hình chưa vẽ được" + (daTra ? " · " + daTra + " hình đã tự trả về code gốc" : "") + "</span>"
			: '<span class="the on">✓ ' + r.tong + " hình đều vẽ được · " + daTra + " hình bị chuẩn hoá làm lỗi đã tự trả về code gốc</span>")
		+ '<ul class="ds kiemDs">' + ket.map(k => '<li><span class="ma">Hình #' + (k.i + 1) + "</span>" + dong(k) + "<span>" + moTa(k) + (k.mo ? ' <code class="moHinh">' + esc(k.mo) + "</code>" : "") + "</span></li>").join("") + "</ul>");
}
let dangKiem = false;
async function kiemRenderChuan() {
	if (dangKiem) return;
	const box = $("kiemRa"), goc = $("vao").value, ra = $("ra").value, src = ra || goc;
	if (!src.trim()) { box.innerHTML = '<span class="the">Chưa có code để kiểm.</span>'; return; }
	if (!boMay || typeof boMay.veTikz !== "function") { box.innerHTML = '<span class="the canh">Bộ render hình chưa sẵn sàng.</span>'; return; }
	if (!/\\begin\{tikzpicture\}/.test(src)) { box.innerHTML = '<span class="the on">Không có hình TikZ nào để kiểm.</span>'; return; }
	dangKiem = true; const btn = $("nutKiem"), lab = btn.textContent; btn.disabled = true; btn.textContent = "⏳ Đang render…";
	try {
		const r = await kiemHinhLoi(goc, ra, { song: 3, tien: (k, a, b) => box.innerHTML = '<span class="the">⏳ ' + (k === "ve" ? "Đang render thử " + a + "/" + b + " hình…" : "Thử lại hình #" + a + " bằng code gốc…") + "</span>" });
		if (ra && r.moi !== ra) { $("ra").value = r.moi; $("demRa").textContent = dem(r.moi); }
		box.innerHTML = htmlKiem(r);
	} finally { dangKiem = false; btn.disabled = false; btn.textContent = lab; }
}
// bấm "dòng N" → nhảy tới và bôi đen cả hình trong ô kết quả
$("kiemRa").addEventListener("click", e => {
	const b = e.target.closest("button[data-a]"); if (!b) return;
	const ta = $("ra"), a = +b.dataset.a, z = +b.dataset.b;
	ta.focus(); ta.setSelectionRange(a, z);
	const n = ta.value.slice(0, a).split("\n").length; ta.scrollTop = Math.max(0, (n - 3) * parseFloat(getComputedStyle(ta).lineHeight));
});
async function chay() {
	const src = $("vao").value;
	if (!src.trim()) { hien("Chưa có code để chuẩn hoá"); return; }
	const tuyChon = {};
	O_TT.forEach(k => tuyChon[k] = $(k).value.trim());
	O_CHON.forEach(k => tuyChon[k] = $(k).checked);
	tuyChon.cheDoMau = $("cheDoMau").value;
	if (!boMay) { hien("Bộ luật chưa sẵn sàng"); return; }
	try {
		const data = boMay.chuanHoa(src, tuyChon);
		$("ra").value = data.ketQua;
		$("demRa").textContent = dem(data.ketQua);
		veBaoCao(data);
		$("kiemRa").innerHTML = "";
		hien("Đã chuẩn hoá");
		if (/\\begin\{tikzpicture\}/.test(data.ketQua)) kiemRenderChuan();      // tự kiểm hình ngay
	} catch (e) {
		$("tomtat").innerHTML = '<span class="the canh">Máy gặp lỗi khi đọc đoạn code này. Gửi đoạn code cho quản trị viên để sửa luật.</span>';
		return;
	}
	// đếm lượt dùng (không lưu nội dung code)
	updateDoc(doc(db, "nguoiDung", auth.currentUser.uid), { luotDung: increment(1), lanCuoi: serverTimestamp() }).catch(() => {});
}
// ---- Chuẩn hoá nhiều file .tex một lần ----
let nfKq = [];
function layTuyChonChuan() {
	const t = {};
	O_TT.forEach(k => t[k] = $(k).value.trim());
	O_CHON.forEach(k => t[k] = $(k).checked);
	t.cheDoMau = $("cheDoMau").value;
	return t;
}
function taiTep(ten, noi) {
	const url = URL.createObjectURL(new Blob(["﻿" + noi], { type: "text/plain;charset=utf-8" }));
	const a = document.createElement("a");
	a.href = url; a.download = ten;
	document.body.appendChild(a); a.click(); a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function tenTexChuan(ten) { return ten.replace(/\.(tex|txt)$/i, "") + "_chuanhoa.tex"; }
function theKiemNf(it) {
	if (it.kiemTt) return '<span class="the">' + esc(it.kiemTt) + "</span>";
	const k = it.kiem; if (!k) return "";
	if (!k.tong) return '<span class="the on">Không có hình TikZ</span>';
	const tra = k.ket.filter(x => x.tra === "goc").length, con = k.ket.length - tra;
	return (con ? '<span class="the canh">⚠ ' + con + "/" + k.tong + " hình không vẽ được</span>" : '<span class="the on">✓ ' + k.tong + " hình vẽ được</span>")
		+ (tra ? '<span class="the sua">' + tra + " hình đã tự trả về code gốc</span>" : "");
}
function veNf() {
	const ds = $("nfDs"), co = nfKq.filter(x => !x.loi).length;
	$("nutTaiHet").hidden = co < 2;
	ds.innerHTML = nfKq.map((it, i) =>
		'<li class="nfDong"><span class="ma">' + esc(it.ten) + '</span>' +
		(it.loi ? '<span class="the canh">' + esc(it.loi) + '</span>' :
			'<span class="the sua">Đã tự sửa ' + it.sua + ' chỗ</span>' +
			(it.canh ? '<span class="the canh">' + it.canh + ' chỗ cần sửa tay</span>' : '<span class="the on">Không còn chỗ cần sửa tay</span>') + theKiemNf(it)) +
		'<span class="nfNut2"><button class="nut" type="button" data-xem="' + i + '">Xem</button>' +
		(it.loi ? '' : '<button class="nut chinh" type="button" data-tai="' + i + '">⬇ Tải .tex</button>') + '</span></li>').join("")
		|| '<li class="trong">Chưa nạp file nào.</li>';
}
let nfDangKiem = false, nfDung = false;
async function kiemHinhNhieu() {
	const ds = nfKq.filter(it => !it.loi && /\\begin\{tikzpicture\}/.test(it.ketQua));
	nfKq.forEach(it => { if (!it.loi && !ds.includes(it)) it.kiem = { moi: it.ketQua, ket: [], tong: 0 }; });
	if (!ds.length) { veNf(); return; }
	if (!boMay || typeof boMay.veTikz !== "function") { ds.forEach(it => it.kiemTt = "Bộ render hình chưa sẵn sàng, chưa kiểm hình"); veNf(); return; }
	nfDangKiem = true; nfDung = false; $("nutDungNf").hidden = false; $("nutTaiHet").disabled = true;
	ds.forEach(it => it.kiemTt = "Chờ kiểm hình…"); veNf();
	try {
		for (let f = 0; f < ds.length; f++) {
			const it = ds[f];
			if (nfDung) { it.kiemTt = "Đã dừng, chưa kiểm hình"; continue; }
			it.kiemTt = "⏳ File " + (f + 1) + "/" + ds.length + " · đang render…"; veNf();
			const r = await kiemHinhLoi(it.goc, it.ketQua, { song: 1, dung: () => nfDung,
				tien: (k, a, b) => { it.kiemTt = "⏳ File " + (f + 1) + "/" + ds.length + (k === "ve" ? " · đã render " + a + "/" + b + " hình" : " · thử code gốc hình #" + a); veNf(); } });
			if (!r) { it.kiemTt = "Đã dừng, chưa kiểm hình"; veNf(); continue; }
			it.ketQua = r.moi; it.kiem = r; it.kiemTt = ""; veNf();
		}
	} finally { nfDangKiem = false; $("nutDungNf").hidden = true; $("nutTaiHet").disabled = false; veNf(); }
}
$("nutDungNf").addEventListener("click", () => { nfDung = true; $("nutDungNf").hidden = true; hien("Đang dừng sau hình hiện tại…"); });
$("nutNapNhieu").addEventListener("click", () => { if (nfDangKiem) { hien("Đang kiểm hình, bấm Dừng trước khi nạp lô mới"); return; } $("chuanNap").click(); });
$("chuanNap").addEventListener("change", async e => {
	const files = Array.from(e.target.files || []);
	e.target.value = "";
	if (!files.length) return;
	if (!boMay) { hien("Bộ luật chưa sẵn sàng"); return; }
	const tuyChon = layTuyChonChuan();
	nfKq = [];
	$("nfDs").innerHTML = '<li class="trong">Đang chuẩn hoá ' + files.length + ' file…</li>';
	for (const f of files) {
		const it = { ten: f.name, goc: "", ketQua: "", canh: 0, sua: 0, loi: "", r: null };
		try {
			it.goc = await f.text();
			it.r = boMay.chuanHoa(it.goc, tuyChon);
			it.ketQua = it.r.ketQua;
			it.canh = it.r.canhBao.length;
			it.sua = it.r.nhatKi.reduce((a, x) => a + x.n, 0);
		} catch (err) {
			it.loi = "Máy gặp lỗi khi đọc file này";
		}
		nfKq.push(it);
		veNf();
		await new Promise(r => setTimeout(r, 0));
	}
	hien("Đã chuẩn hoá " + nfKq.length + " file · đang render kiểm hình từng file…");
	await kiemHinhNhieu();
	const tra = nfKq.reduce((a, it) => a + (it.kiem ? it.kiem.ket.filter(x => x.tra === "goc").length : 0), 0),
		hong = nfKq.reduce((a, it) => a + (it.kiem ? it.kiem.ket.filter(x => x.tra !== "goc").length : 0), 0);
	hien("Đã chuẩn hoá " + nfKq.length + " file" + (tra ? " · " + tra + " hình đã trả về code gốc" : "") + (hong ? " · " + hong + " hình không vẽ được" : " · mọi hình đều vẽ được"));
});
$("nfDs").addEventListener("click", async e => {
	const xem = e.target.closest("button[data-xem]"), tai = e.target.closest("button[data-tai]");
	if (xem) {
		const it = nfKq[+xem.dataset.xem];
		$("vao").value = it.goc;
		$("ra").value = it.ketQua;
		$("demVao").textContent = dem(it.goc);
		$("demRa").textContent = dem(it.ketQua);
		veBaoCao(it.r);
		$("kiemRa").innerHTML = it.kiem ? htmlKiem(it.kiem) : (it.kiemTt ? '<span class="the">' + esc(it.kiemTt) + "</span>" : "");
		$("tabChuan").scrollIntoView({ behavior: "smooth", block: "start" });
	}
	if (tai) {
		const it = nfKq[+tai.dataset.tai];
		taiTep(tenTexChuan(it.ten), it.ketQua);
	}
});
$("nutTaiHet").addEventListener("click", async () => {
	const ds = nfKq.filter(x => !x.loi);
	if (!ds.length) return;
	try {
		if (!window.JSZip) await new Promise((ok, loi) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"; s.onload = ok; s.onerror = loi; document.head.appendChild(s); });
		const z = new window.JSZip(), da = new Map();
		ds.forEach(it => {
			let ten = tenTexChuan(it.ten), n = da.get(ten) || 0;
			da.set(ten, n + 1);
			if (n) ten = ten.replace(/\.tex$/, "_" + (n + 1) + ".tex");
			z.file(ten, "﻿" + it.ketQua);
		});
		const blob = await z.generateAsync({ type: "blob" });
		const url = URL.createObjectURL(blob), a = document.createElement("a");
		a.href = url; a.download = "chuanhoa_" + ds.length + "_file.zip";
		document.body.appendChild(a); a.click(); a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1500);
	} catch (err) {
		hien("Không tạo được file zip, hãy tải từng file");
	}
});
function veBaoCao(r) {
	const tong = r.nhatKi.reduce((a, e) => a + e.n, 0);
	const nhom = new Map();
	r.canhBao.forEach(c => { const k = c.ma + "|" + c.mo; if (!nhom.has(k)) nhom.set(k, { ma: c.ma, mo: c.mo, dong: [] }); nhom.get(k).dong.push(c.dong); });
	$("tomtat").innerHTML = '<span class="the sua">Đã tự sửa ' + tong + ' chỗ</span>' +
		(r.canhBao.length ? '<span class="the canh" id="denCanh" title="Xem danh sách">' + r.canhBao.length + ' chỗ cần sửa tay · ' + nhom.size + ' loại ↓</span>' : '<span class="the on">Không còn chỗ nào cần sửa tay</span>');
	const den = document.getElementById("denCanh"); if (den) den.addEventListener("click", () => $("dsCanh").scrollIntoView({ behavior: "smooth", block: "center" }));
	$("dsCanh").innerHTML = nhom.size ? Array.from(nhom.values()).map(g =>
		'<li class="nhomCB"><div class="dauCB"><span class="ma">' + esc(g.ma) + '</span><span>' + esc(g.mo) + '</span><span class="so">×' + g.dong.length + '</span></div>' +
		'<div class="cacDong">' + g.dong.slice(0, 40).map(d => '<button class="dong" type="button" data-dong="' + d + '">dòng ' + d + '</button>').join("") +
		(g.dong.length > 40 ? '<span class="them">… và ' + (g.dong.length - 40) + ' chỗ khác (tìm %! SỬA TAY trong code)</span>' : "") + '</div></li>').join("")
		: '<li class="trong">Không có chỗ nào cần sửa tay.</li>';
	const ds = r.nhatKi.slice().sort((a, b) => a.ma.localeCompare(b.ma, "vi", { numeric: true }));
	$("dsSua").innerHTML = ds.length ? ds.map(e =>
		'<li><span class="ma">' + esc(e.ma) + '</span><span>' + esc(e.mo) + '</span><span class="so">×' + e.n + '</span></li>').join("")
		: '<li class="trong">Code đã đúng quy định, không cần sửa gì.</li>';
}
$("dsCanh").addEventListener("click", e => {
	const b = e.target.closest("button[data-dong]"); if (!b) return;
	const n = +b.dataset.dong, ta = $("ra"), dong = ta.value.split("\n");
	let dau = 0; for (let i = 0; i < n - 1; i++) dau += dong[i].length + 1;
	ta.focus(); ta.setSelectionRange(dau, dau + (dong[n - 1] || "").length);
	ta.scrollTop = Math.max(0, (n - 4) * parseFloat(getComputedStyle(ta).lineHeight));
});
$("nutChay").addEventListener("click", chay);
$("nutKiem").addEventListener("click", kiemRenderChuan);
$("nutXoa").addEventListener("click", () => { $("vao").value = ""; $("demVao").textContent = ""; $("vao").focus(); });
$("nutChep").addEventListener("click", () => {
	const ta = $("ra"); if (!ta.value) return;
	const chon = () => { ta.focus(); ta.select(); hien("Đã chọn toàn bộ — bấm Ctrl+C để sao chép"); };
	if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(() => hien("Đã sao chép code chuẩn"), chon); else chon();
});
$("vao").addEventListener("keydown", e => {
	if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); chay(); }
	if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); const t = e.target, a = t.selectionStart; t.setRangeText("\t", a, t.selectionEnd, "end"); }
});
