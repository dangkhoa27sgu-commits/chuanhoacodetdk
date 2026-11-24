/* tronde.js — KMath · Trộn đề thi (lõi xử lý .docx / .tex, không dùng DOM — chạy được cả trong Node để kiểm thử)
 * Nguyên tắc: không viết lại nội dung câu hỏi. Word: chỉ dời nguyên khối XML (công thức MathType/Equation, ảnh, bảng giữ
 * nguyên từng byte), đánh lại "Câu n", chuyển định dạng đánh dấu đáp án theo phương án. LaTeX: chỉ hoán vị khối \begin{ex}
 * và các nhóm {…} của \choice / \choiceTF (kèm \itemch trong \loigiai). Mỗi mã đề đều được kiểm tra song ánh với bản gốc.
 * API: window.KTronDe = { phanTich, tron, xacThuc, sinhMa, kiemMa, rngTuSeed, rngMay, docxDapAn, texDapAn, ... }
 */
(function (G) {
	"use strict";
	// ---------------- tiện ích chung ----------------
	const boDau = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
	const chuan = s => boDau(s).toUpperCase().replace(/[\s\u00a0]+/g, " ").trim();
	const XA = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	const XD = s => String(s).replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|amp|quot|apos);/g, (m, e) => e[0] === "#" ? String.fromCodePoint(/^#x/i.test(e) ? parseInt(e.slice(2), 16) : +e.slice(1)) : ({ lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" })[e]);
	const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const OBJ = "\uFFFC", KHOANG = /[ \u00a0\t\n]/;
	function rngTuSeed(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
	function rngMay() { const c = G.crypto; if (c && c.getRandomValues) { const a = new Uint32Array(1); return () => { c.getRandomValues(a); return a[0] / 4294967296; }; } return Math.random; }
	function hoanVi(n, rnd) { const p = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } return p; }
	// hoán vị khác thứ tự gốc (khi n ≥ 2) để mỗi mã đề thật sự khác bản gốc
	function hoanViKhac(n, rnd) { let p = hoanVi(n, rnd); for (let k = 0; k < 6 && n > 1 && p.every((v, i) => v === i); k++) p = hoanVi(n, rnd); return p; }
	const LOAI_TEN = { tn: "TN", ds: "ĐS", tln: "TLN", tl: "TL" };

	// ---------------- mã đề 4 chữ số ----------------
	const MA_RE = /^\d{4}$/;
	function kiemMa(ds) { const dem = {}; ds.forEach(m => { dem[m] = (dem[m] || 0) + 1; }); return ds.map(m => ({ ma: m, loi: !MA_RE.test(m) ? "Cần đúng 4 chữ số" : dem[m] > 1 ? "Trùng mã" : "" })); }
	function sinhMa(n, rnd, daCo) { rnd = rnd || rngMay(); const dung = new Set(daCo || []), ra = []; let lan = 0; while (ra.length < n && lan++ < 200000) { const m = String(Math.floor(rnd() * 10000)).padStart(4, "0"); if (m === "0000" || dung.has(m)) continue; dung.add(m); ra.push(m); } return ra; }

	// ---------------- khoá xáo phương án ("Cả A và B…", "Tất cả…") ----------------
	function laKhoa(t) {
		const s = boDau(t).toLowerCase().replace(/\\[a-z]+/g, " ").replace(/[$\\{}~]/g, " ").replace(/[\s\u00a0]+/g, " ").trim();
		return /^(ca|tat ca)\b/.test(s) || /\b(phuong an|dap an|menh de|khang dinh|ket qua|cau)\s+(tren|o tren|con lai|da neu)\b/.test(s)
			|| /\bkhong co\s+(phuong an|dap an|menh de|khang dinh|ket qua|cau)\b/.test(s) || /^[a-d]\s*(va|,|hoac)\s*[a-d]\b/.test(s)
			|| /\b(deu dung|deu sai)\s*$/.test(s) && /\b[a-d]\b.*\b[a-d]\b/.test(s);
	}

	/* =====================================================================
	 *  LaTeX (ex_test)
	 * ===================================================================== */
	function laChuThich(src, i) { const d = src.lastIndexOf("\n", i - 1) + 1; for (let k = d; k < i; k++) if (src[k] === "%" && src[k - 1] !== "\\") return true; return false; }
	function boChuThich(s) { return s.replace(/(^|[^\\])%.*$/gm, "$1"); }
	function docNhom(s, j) { let d = 0; for (let e = j; e < s.length; e++) { const c = s[e]; if (c === "\\") { e++; continue; } if (c === "%") { const nl = s.indexOf("\n", e); if (nl < 0) return -1; e = nl; continue; } if (c === "{") d++; else if (c === "}" && --d === 0) return e + 1; } return -1; }
	function boQuaTrang(s, j) { for (;;) { while (j < s.length && /\s/.test(s[j])) j++; if (s[j] === "%") { const nl = s.indexOf("\n", j); if (nl < 0) return s.length; j = nl + 1; continue; } return j; } }
	function timLenh(s, re, tu, den) { re.lastIndex = tu || 0; let m; while ((m = re.exec(s))) { if (den != null && m.index >= den) return null; if (!laChuThich(s, m.index)) return m; } return null; }
	function loaiTex(raw) { const t = boChuThich(raw), lg = t.search(/\\loigiai\b/), dau = lg >= 0 ? t.slice(0, lg) : t; return /\\choiceTF(?![A-Za-z])/.test(dau) ? "ds" : /\\choice(?![A-Za-z])/.test(dau) ? "tn" : /\\shortans(?![A-Za-z])/.test(dau) ? "tln" : "tl"; }
	// 4 nhóm {…} của \choice/\choiceTF (trước \loigiai)
	function tachChoice(raw) {
		const lgm = timLenh(raw, /\\loigiai\b/g), lg = lgm ? lgm.index : raw.length;
		const m = timLenh(raw, /\\choice(TF)?(?![A-Za-z])/g, 0, lg); if (!m) return null;
		let j = boQuaTrang(raw, m.index + m[0].length);
		if (raw[j] === "[") { const k = raw.indexOf("]", j); if (k < 0) return null; j = boQuaTrang(raw, k + 1); }
		const nh = [];
		for (let k = 0; k < 4; k++) { if (k) j = boQuaTrang(raw, j); if (raw[j] !== "{") return null; const e = docNhom(raw, j); if (e < 0) return null; nh.push({ s: j, e }); j = e; }
		return { lenh: m[1] ? "choiceTF" : "choice", nh, dung: nh.map(g => /\\True\b/.test(boChuThich(raw.slice(g.s, g.e)))) };
	}
	// \itemch trong itemchoice của \loigiai — đổi theo thứ tự ý a–d
	function tachItemch(raw) {
		const lg = timLenh(raw, /\\loigiai\b/g); if (!lg) return null;
		const b = timLenh(raw, /\\begin\{itemchoice\}/g, lg.index); if (!b) return null;
		const e = timLenh(raw, /\\end\{itemchoice\}/g, b.index); if (!e) return { loi: "itemchoice chưa đóng" };
		const ds = []; const re = /\\itemch(?![A-Za-z])/g; re.lastIndex = b.index; let m;
		while ((m = re.exec(raw)) && m.index < e.index) if (!laChuThich(raw, m.index)) ds.push(m.index + m[0].length);
		if (ds.length !== 4) return { loi: ds.length + " ý \\itemch" };
		const muc = ds.map((s, i) => { const het = i < 3 ? ds[i + 1] - 7 : e.index; let a = s; while (a < het && /\s/.test(raw[a])) a++; let z = het; for (;;) { while (z > a && /\s/.test(raw[z - 1])) z--; if (z - 2 >= a && raw.slice(z - 2, z) === "\\\\") { z -= 2; continue; } break; } return { s: a, e: z }; });
		return { muc };
	}
	function thayKhoang(s, ds) { ds = ds.slice().sort((a, b) => b.s - a.s); for (const d of ds) s = s.slice(0, d.s) + d.t + s.slice(d.e); return s; }
	function dapAnTex(raw, loai) {
		if (loai === "tn" || loai === "ds") { const c = tachChoice(raw); if (!c) return ""; return loai === "tn" ? (c.dung.filter(Boolean).length === 1 ? "ABCD"[c.dung.indexOf(true)] : "") : c.dung.map(x => x ? "Đ" : "S").join(""); }
		if (loai === "tln") { const m = timLenh(raw, /\\shortans\s*(\[[^\]]*\])?\s*\{/g); if (!m) return ""; const j = m.index + m[0].length - 1, e = docNhom(raw, j); return e < 0 ? "" : raw.slice(j + 1, e - 1).replace(/\$/g, "").trim(); }
		return "";
	}
	// dạng chuẩn để so khớp (thứ tự phương án/ý không quan trọng)
	function chuanTex(raw) {
		const c = tachChoice(raw), it = c && c.lenh === "choiceTF" ? tachItemch(raw) : null; const ds = [], ph = [];
		if (c) c.nh.forEach((g, k) => { ds.push({ s: g.s, e: g.e, t: "\u0001" }); ph.push(raw.slice(g.s, g.e) + (it && it.muc ? "\u0002" + raw.slice(it.muc[k].s, it.muc[k].e) : "")); });
		if (it && it.muc) it.muc.forEach(g => ds.push({ s: g.s, e: g.e, t: "\u0003" }));
		return thayKhoang(raw, ds) + "\u0004" + ph.sort().join("\u0005");
	}
	function phanTichTex(src) {
		const ex = [], canhBao = [], loi = [];
		const re = /\\begin\{ex\}/g; let m;
		while ((m = re.exec(src))) {
			if (laChuThich(src, m.index)) continue;
			const reE = /\\end\{ex\}/g; reE.lastIndex = m.index + 10; let e; while ((e = reE.exec(src)) && laChuThich(src, e.index));
			if (!e) { loi.push("Khối \\begin{ex} thứ " + (ex.length + 1) + " không có \\end{ex} — file nguồn bị lỗi, không trộn để tránh mất câu."); break; }
			const trong = timLenh(src, /\\begin\{ex\}/g, m.index + 10, e.index);
			if (trong) { loi.push("Khối \\begin{ex} thứ " + (ex.length + 1) + " lồng/thiếu \\end{ex} — file nguồn bị lỗi."); }
			ex.push({ s: m.index, e: e.index + 9 }); re.lastIndex = e.index + 9;
		}
		const moc = []; const reM = /\\(caulc|cauds|caukq|cautl)(?![A-Za-z])/g;
		while ((m = reM.exec(src))) if (!laChuThich(src, m.index)) moc.push({ i: m.index, loai: { caulc: "tn", cauds: "ds", caukq: "tln", cautl: "tl" }[m[1]] });
		ex.forEach((x, i) => { x.raw = src.slice(x.s, x.e); x.loai = loaiTex(x.raw); x.da = dapAnTex(x.raw, x.loai); x.goc = i; });
		// nhóm phần
		const phan = [];
		if (moc.length) ex.forEach(x => { let k = -1; moc.forEach((mm, j) => { if (mm.i < x.s) k = j; }); let p = phan.find(q => q.moc === k); if (!p) { p = { moc: k, loai: k >= 0 ? moc[k].loai : x.loai, ex: [] }; phan.push(p); } p.ex.push(x.goc); });
		else ex.forEach(x => { const p = phan[phan.length - 1]; if (p && p.loai === x.loai) p.ex.push(x.goc); else phan.push({ moc: -1, loai: x.loai, ex: [x.goc] }); });
		// kiểm từng câu
		ex.forEach((x, i) => {
			x.khoa = "";
			if (x.loai === "tn" || x.loai === "ds") {
				const c = tachChoice(x.raw);
				if (!c) { x.khoa = "không đọc được đủ 4 phương án"; canhBao.push("Câu gốc " + (i + 1) + ": " + x.khoa + " — giữ nguyên thứ tự phương án."); }
				else {
					x.pa = c.nh.map(g => x.raw.slice(g.s + 1, g.e - 1));
					if (x.loai === "tn" && c.dung.filter(Boolean).length !== 1) { x.khoa = "chưa có đúng một \\True"; canhBao.push("Câu gốc " + (i + 1) + " (TN): " + (c.dung.filter(Boolean).length ? "có nhiều \\True" : "chưa đánh dấu \\True") + " — giữ nguyên thứ tự phương án."); }
					if (!x.khoa && x.loai === "tn" && x.pa.some(laKhoa)) x.khoa = "có phương án kiểu “Cả A và B…/Tất cả…”";
					if (!x.khoa && x.loai === "ds") { const it = tachItemch(x.raw); if (it && it.loi) { x.khoa = "lời giải có " + it.loi + " (cần đúng 4)"; canhBao.push("Câu gốc " + (i + 1) + " (ĐS): " + x.khoa + " — giữ nguyên thứ tự ý."); } }
				}
			}
			if (!x.da && x.loai !== "tl") canhBao.push("Câu gốc " + (i + 1) + " (" + LOAI_TEN[x.loai] + "): chưa có đáp án.");
		});
		return { loai: "tex", src, ex, phan, moc, canhBao, loi };
	}
	function tronTex(info, cfg, ma, rnd) {
		const src = info.src, gan = new Array(info.ex.length), ketQua = [];
		info.phan.forEach(p => {
			const tron = p.loai !== "tl" && ((p.loai === "tn" && cfg.tronTN) || (p.loai === "ds" && cfg.tronDS) || (p.loai === "tln" && cfg.tronTLN));
			const pv = tron ? hoanViKhac(p.ex.length, rnd) : p.ex.map((_, i) => i); const cau = [];
			p.ex.forEach((slot, k) => {
				const x = info.ex[p.ex[pv[k]]]; let raw = x.raw, pa = [0, 1, 2, 3];
				const doiPA = !x.khoa && ((x.loai === "tn" && cfg.tronPA) || (x.loai === "ds" && cfg.tronY));
				if (doiPA) {
					pa = hoanViKhac(4, rnd); const c = tachChoice(raw), ds = c.nh.map((g, k2) => ({ s: g.s, e: g.e, t: raw.slice(c.nh[pa[k2]].s, c.nh[pa[k2]].e) }));
					if (x.loai === "ds") { const it = tachItemch(raw); if (it && it.muc) it.muc.forEach((g, k2) => ds.push({ s: g.s, e: g.e, t: raw.slice(it.muc[pa[k2]].s, it.muc[pa[k2]].e) })); }
					raw = thayKhoang(raw, ds);
				}
				gan[slot] = raw;
				cau.push({ so: k + 1, goc: p.ex.indexOf(x.goc) + 1, gocId: x.goc, loai: x.loai, pa, da: daSauDoi(x.da, x.loai, pa), daGoc: x.da });
			});
			ketQua.push({ loai: p.loai, cau });
		});
		let tho = "", tu = 0; info.ex.forEach((x, i) => { tho += src.slice(tu, x.s) + gan[i]; tu = x.e; }); tho += src.slice(tu);
		return { ma, loai: "tex", tho, text: cfg.dongMa === false ? tho : dongMaTex(tho, ma), phan: ketQua };
	}
	function daSauDoi(da, loai, pa) {
		if (!da) return "";
		if (loai === "tn") { const k = "ABCD".indexOf(da); return k < 0 ? da : "ABCD"[pa.indexOf(k)]; }
		if (loai === "ds") return da.length === 4 ? pa.map(k => da[k]).join("") : da;
		return da;
	}
	function dongMaTex(t, ma) {
		const ten = new Set(); t.replace(/\\Opensolutionfile\s*\{[^}]*\}\s*\[([^\]]+)\]/g, (m, x) => { ten.add(x.trim()); return m; });
		[...ten].sort((a, b) => b.length - a.length).forEach(x => { t = t.replace(new RegExp(reEsc(x) + "(?![\\w-])", "g"), x + "-" + ma); });
		const m = timLenh(t, /\\tendethi\s*\{/g);
		if (m) { const j = m.index + m[0].length - 1, e = docNhom(t, j); if (e > 0) t = t.slice(0, e - 1) + " -- MÃ ĐỀ " + ma + t.slice(e - 1); }
		const dong = "\\def\\maDe{" + ma + "}% KMath · Trộn đề — mã đề " + ma + "\n";
		const bd = timLenh(t, /\\begin\{document\}/g);
		return bd ? t.slice(0, bd.index) + dong + t.slice(bd.index) : dong + t;
	}
	function xacThucTex(info, bien) {
		const loi = [], p2 = phanTichTex(bien.tho);
		if (p2.ex.length !== info.ex.length) loi.push("Số câu " + p2.ex.length + " ≠ gốc " + info.ex.length);
		const khung = s => { let r = "", tu = 0; phanTichTex(s).ex.forEach(x => { r += s.slice(tu, x.s) + "\u0000"; tu = x.e; }); return r + s.slice(tu); };
		if (khung(info.src) !== khung(bien.tho)) loi.push("Phần ngoài các câu (tiêu đề, \\caulc…, \\Opensolutionfile…) bị thay đổi");
		const thuTu = []; bien.phan.forEach(p => p.cau.forEach(c => thuTu.push(c)));
		// vị trí khe theo thứ tự xuất hiện trong file
		const slotGoc = []; info.phan.forEach(p => p.ex.forEach(i => slotGoc.push(i)));
		const daGap = new Set();
		const theoKhe = new Map(); let k = 0; info.phan.forEach((p, pi) => p.ex.forEach((slot, j) => { theoKhe.set(slot, bien.phan[pi].cau[j]); k++; }));
		p2.ex.forEach((x, i) => {
			const c = theoKhe.get(i); if (!c) { loi.push("Câu ở vị trí " + (i + 1) + " không có trong bảng đối chiếu"); return; }
			const g = c.gocId;
			if (daGap.has(g)) loi.push("Câu gốc " + (g + 1) + " xuất hiện 2 lần"); daGap.add(g);
			if (chuanTex(x.raw) !== chuanTex(info.ex[g].raw)) loi.push("Nội dung câu gốc " + (g + 1) + " bị thay đổi");
			if (x.loai !== info.ex[g].loai) loi.push("Loại câu gốc " + (g + 1) + " bị đổi");
			if (c.da !== daSauDoi(info.ex[g].da, x.loai, c.pa)) loi.push("Bảng đáp án câu gốc " + (g + 1) + " không khớp hoán vị phương án");
			const da = dapAnTex(x.raw, x.loai); if (da !== c.da) loi.push("Đáp án câu gốc " + (g + 1) + ": đọc lại " + (da || "∅") + " ≠ " + (c.da || "∅"));
		});
		if (daGap.size !== info.ex.length) loi.push("Thiếu " + (info.ex.length - daGap.size) + " câu gốc");
		const p3 = phanTichTex(bien.text); if (p3.ex.length !== info.ex.length || p3.ex.some((x, i) => x.raw !== p2.ex[i].raw)) loi.push("Đóng dấu mã đề làm thay đổi nội dung câu");
		return loi;
	}

	/* =====================================================================
	 *  Word (.docx) — thao tác trực tiếp trên word/document.xml
	 * ===================================================================== */
	const TAG = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<(\/?)([A-Za-z_][\w:.\-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
	function cuoiPT(x, s) { const T = new RegExp(TAG.source, "g"); T.lastIndex = s; let d = 0, m; while ((m = T.exec(x))) { if (!m[2]) continue; if (m[1]) { if (--d === 0) return T.lastIndex; } else if (!m[4]) d++; else if (d === 0) return T.lastIndex; } return -1; }
	function conTrucTiep(x, a, b) { const out = [], T = new RegExp(TAG.source, "g"); T.lastIndex = a; let m; while ((m = T.exec(x)) && m.index < b) { if (!m[2] || m[1]) continue; const s = m.index, e = m[4] ? T.lastIndex : cuoiPT(x, s); if (e < 0) throw new Error("XML Word bị hỏng (thẻ " + m[2] + " không đóng)"); out.push({ s, e, ten: m[2] }); T.lastIndex = e; } return out; }
	function chuXml(x) { return XD(x.replace(/<m:oMath\b[\s\S]*?<\/m:oMath>/g, OBJ).replace(/<(w:object|w:drawing|w:pict|mc:AlternateContent)\b[\s\S]*?<\/\1>/g, OBJ).replace(/<w:tab\/>/g, "\t").replace(/<w:br\b[^>]*\/>/g, "\n").replace(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<[^>]+>/g, (m, t) => t == null ? "" : t)); }
	const PT_OBJ = new Set(["w:object", "w:drawing", "w:pict", "mc:AlternateContent", "w:sym", "w:embedObject", "w:footnoteReference", "w:endnoteReference"]);
	const PT_KHOA = new Set(["w:hyperlink", "w:smartTag", "w:fldSimple", "w:sdt", "w:ins", "w:customXml", "w:dir", "w:bdo", "w:moveTo"]);
	let UID = 0;
	function docP(x) {
		if (/^<w:p\b[^>]*\/>$/.test(x)) return { mo: x.replace(/\/>$/, ">"), pPr: "", ps: [], tuDong: x };
		const mo = x.slice(0, x.indexOf(">") + 1), b = x.lastIndexOf("</w:p>"), ps = []; let pPr = "";
		for (const c of conTrucTiep(x, mo.length, b)) {
			const cx = x.slice(c.s, c.e);
			if (c.ten === "w:pPr") { pPr = cx; continue; }
			if (c.ten === "w:r") {
				if (/^<w:r\b[^>]*\/>$/.test(cx)) continue;
				const rmo = cx.slice(0, cx.indexOf(">") + 1), rb = cx.lastIndexOf("</w:r>"), con = conTrucTiep(cx, rmo.length, rb), uid = ++UID;
				const rp = con.find(d => d.ten === "w:rPr"), rPr = rp ? cx.slice(rp.s, rp.e) : "";
				for (const d of con) {
					if (d.ten === "w:rPr") continue; const dx = cx.slice(d.s, d.e), p = { run: uid, rmo, rPr, x: dx, k: "nil", t: "" };
					if (d.ten === "w:t") { p.k = "t"; p.t = /\/>$/.test(dx) ? "" : XD(dx.slice(dx.indexOf(">") + 1, dx.lastIndexOf("</w:t>"))); }
					else if (d.ten === "w:tab" || d.ten === "w:ptab") { p.k = "tab"; p.t = "\t"; }
					else if (d.ten === "w:br" || d.ten === "w:cr") { p.k = "br"; p.t = "\n"; }
					else if (PT_OBJ.has(d.ten)) { p.k = "obj"; p.t = OBJ; }
					ps.push(p);
				}
				continue;
			}
			const p = { run: 0, x: cx, k: "nil", t: "" };
			if (c.ten === "m:oMath" || c.ten === "m:oMathPara") { p.k = "obj"; p.t = OBJ; }
			else if (PT_KHOA.has(c.ten)) { p.k = "khoa"; p.t = chuXml(cx); }
			ps.push(p);
		}
		return { mo, pPr, ps };
	}
	const taoT = t => '<w:t xml:space="preserve">' + XA(t) + "</w:t>";
	function xuatP(P) {
		if (P.tuDong && !P.ps.length && !P.doi) return P.tuDong;
		let s = P.mo + P.pPr, cur = 0;
		for (const p of P.ps) {
			if (p.run) { if (p.run !== cur) { if (cur) s += "</w:r>"; s += p.rmo + p.rPr; cur = p.run; } s += p.k === "t" && p.sua ? taoT(p.t) : p.x; }
			else { if (cur) { s += "</w:r>"; cur = 0; } s += p.x; }
		}
		if (cur) s += "</w:r>";
		return s + "</w:p>";
	}
	const chuP = P => P.ps.map(p => p.t).join("");
	function cat(ps, a, b) {
		const truoc = [], giua = [], sau = []; let pos = 0;
		for (const p of ps) {
			const L = p.t.length, e = pos + L;
			if (!L) { (a === b ? (pos <= a ? truoc : sau) : pos <= a ? truoc : pos >= b ? sau : giua).push(p); continue; }
			if (e <= a) truoc.push(p); else if (pos >= b) sau.push(p); else if (pos >= a && e <= b) giua.push(p);
			else { if (p.k !== "t") throw new Error("KHOA"); const c1 = Math.max(0, a - pos), c2 = Math.min(L, b - pos); if (c1 > 0) truoc.push(Object.assign({}, p, { t: p.t.slice(0, c1), sua: true })); giua.push(Object.assign({}, p, { t: p.t.slice(c1, c2), sua: true })); if (c2 < L) sau.push(Object.assign({}, p, { t: p.t.slice(c2), sua: true })); }
			pos = e;
		}
		return { truoc, giua, sau };
	}
	// ----- đánh dấu đáp án (chữ đỏ / gạch chân / tô nền) -----
	const laDo = v => { if (!/^[0-9a-f]{6}$/i.test(v || "")) return false; const r = parseInt(v.slice(0, 2), 16), g = parseInt(v.slice(2, 4), 16), b = parseInt(v.slice(4, 6), 16); return r >= 0x90 && g < 0x70 && b < 0x70; };
	const DAU_RE = [/<w:color\b[^>]*\/>/g, /<w:u\b[^>]*\/>/g, /<w:highlight\b[^>]*\/>/g];
	function phanDau(rPr) { const ra = []; if (!rPr) return ra; const c = rPr.match(/<w:color\b[^>]*\/>/); if (c && laDo((c[0].match(/w:val="([^"]*)"/) || [])[1])) ra.push(c[0]); const u = rPr.match(/<w:u\b[^>]*\/>/); if (u && !/w:val="none"/.test(u[0])) ra.push(u[0]); const h = rPr.match(/<w:highlight\b[^>]*\/>/); if (h && !/w:val="none"/.test(h[0])) ra.push(h[0]); return ra; }
	const coDau = rPr => phanDau(rPr).length > 0;
	function boDauRPr(rPr) { if (!rPr) return ""; let r = rPr; phanDau(rPr).forEach(d => { r = r.split(d).join(""); }); return r === "<w:rPr></w:rPr>" ? "" : r; }
	const THU_TU_RPR = ["rStyle", "rFonts", "b", "bCs", "i", "iCs", "caps", "smallCaps", "strike", "dstrike", "outline", "shadow", "emboss", "imprint", "noProof", "snapToGrid", "vanish", "webHidden", "color", "spacing", "w", "kern", "position", "sz", "szCs", "highlight", "u", "effect", "bdr", "shd", "fitText", "vertAlign", "rtl", "cs", "em", "lang", "eastAsianLayout", "specVanish", "oMath"];
	function themDauRPr(rPr, dau) {
		let r = boDauRPr(rPr) || "<w:rPr></w:rPr>"; if (/^<w:rPr\s*\/>$/.test(r)) r = "<w:rPr></w:rPr>";
		const a = r.indexOf(">") + 1, b = r.lastIndexOf("</w:rPr>"), tenDau = new Set(dau.map(d => (d.match(/^<(w:[A-Za-z]+)/) || [])[1]));
		const con = conTrucTiep(r, a, b).map(c => r.slice(c.s, c.e)).filter(x => !tenDau.has((x.match(/^<(w:[A-Za-z]+)/) || [])[1]));
		dau.forEach(d => con.push(d));
		const vt = x => { const t = (x.match(/^<w:([A-Za-z]+)/) || [])[1]; const i = THU_TU_RPR.indexOf(t); return i < 0 ? 99 : i; };
		con.sort((p, q) => vt(p) - vt(q));
		return r.slice(0, a) + con.join("") + r.slice(b);
	}
	// ----- câu hỏi: các "đơn vị" là mọi đoạn văn (kể cả trong ô bảng) -----
	function moCau(bx) {
		const u = [];
		bx.forEach((x, bi) => {
			if (/^<w:p\b/.test(x)) { u.push({ b: bi, s: 0, e: x.length, P: docP(x), cap: true }); return; }
			const re = /<w:p[\s>\/]/g; let m;
			while ((m = re.exec(x))) { const e = cuoiPT(x, m.index); if (e < 0) break; u.push({ b: bi, s: m.index, e, P: docP(x.slice(m.index, e)), cap: false }); re.lastIndex = e; }
		});
		u.forEach(d => { d.txt = chuP(d.P); });
		return u;
	}
	const rongTxt = t => !t.replace(/[\s\u00a0]/g, "");
	const LG_RE = /^[\s\u00a0]*(lời giải|lời giải chi tiết|hướng dẫn( giải)?|giải\s*[:.]|chọn\s*:?\s*[A-D]\b|đáp án\s*[:.]|đáp số\s*[:.])/i;
	function timNhan(U, gioi, loai) {
		const chu = loai === "tn" ? "ABCD" : "abcd", cand = [[], [], [], []];
		const re = loai === "tn" ? /([A-D])[ \u00a0]*[.)]/g : /([a-d])[ \u00a0]*[).]/g;
		for (let ui = 0; ui < gioi; ui++) {
			const t = U[ui].txt; re.lastIndex = 0; let m;
			while ((m = re.exec(t))) {
				let j = m.index - 1; while (j >= 0 && (t[j] === " " || t[j] === "\u00a0")) j--;
				const truoc = j < 0 ? "^" : t[j], strict = truoc === "^" || truoc === "\t" || truoc === "\n";
				const loose = strict || (m.index > 0 && /[ \u00a0]/.test(t[m.index - 1]) && (j < 0 || /[.;:?!\uFFFC)\]]/.test(t[j]) || m.index - j > 2));
				if (/[A-Za-zÀ-ỹ0-9]/.test(t[m.index - 1] || "")) continue;
				let het = m.index + m[0].length; while (het < t.length && (t[het] === " " || t[het] === "\u00a0")) het++;
				let sep = m.index; while (sep > 0 && KHOANG.test(t[sep - 1])) sep--;
				cand[chu.indexOf(m[1])].push({ u: ui, i: m.index, het, sep, strict, loose });
			}
		}
		const truocNhau = (x, y) => x.u < y.u || (x.u === y.u && x.i < y.i);
		for (const mode of ["strict", "loose"]) {
			const d = cand[3].filter(c => c[mode]).pop(); if (!d) continue;
			const seq = [d]; let ok = true;
			for (let k = 2; k >= 0; k--) { const c = cand[k].filter(x => x[mode] && truocNhau(x, seq[0])).pop(); if (!c) { ok = false; break; } seq.unshift(c); }
			if (ok) return seq;
		}
		return null;
	}
	// phân tích một câu TN/ĐS → các khe phương án
	function moPhuongAn(U, bx, loai) {
		let gioi = U.length; for (let i = 1; i < U.length; i++) if (LG_RE.test(U[i].txt)) { gioi = i; break; }
		const lab = timNhan(U, gioi, loai); if (!lab) return { khoa: "không nhận ra đủ 4 " + (loai === "tn" ? "phương án A, B, C, D" : "ý a), b), c), d)"), gioi };
		if (lab[0].u === 0 && /^[\s\u00a0]*C[âÂ]u[\s\u00a0]*\d+[\s\u00a0]*[.:]?[\s\u00a0]*$/.test(U[0].txt.slice(0, lab[0].i))) {/* "Câu n. A. …": vẫn hợp lệ */ }
		const slot = [];
		for (let k = 0; k < 4; k++) {
			const L = lab[k], N = lab[k + 1], t = U[L.u].txt; let b;
			if (N && N.u === L.u) b = N.sep; else { b = t.length; while (b > L.het && KHOANG.test(t[b - 1])) b--; }
			if (b < L.het) b = L.het;
			const den = N ? N.u : gioi, giua = []; for (let ui = L.u + 1; ui < den; ui++) giua.push(ui);
			slot.push({ u: L.u, a: L.het, b, nhan: L, giua, rongGiua: giua.every(ui => rongTxt(U[ui].txt)) });
		}
		if (slot.some(s => s.b <= s.a)) return { khoa: "có phương án rỗng", gioi };
		let doanMoi = false;
		if (slot.some(s => !s.rongGiua)) {
			const motDong = slot.every((s, k) => U[s.u].cap && (k === 3 || lab[k + 1].u !== s.u));
			if (!motDong) return { khoa: "phương án có hình/đoạn phụ nằm giữa các phương án cùng dòng", gioi };
			if (!slot[3].rongGiua && slot.slice(0, 3).every(s => s.rongGiua)) return { khoa: "có nội dung sau phương án " + (loai === "tn" ? "D" : "d)"), gioi };
			// đoạn phụ phải là nguyên khối cấp cao nằm giữa hai khối nhãn
			for (const s of slot) for (const ui of s.giua) if (U[ui].b === U[s.u].b) return { khoa: "cấu trúc phương án phức tạp", gioi };
			doanMoi = true;
		}
		slot.forEach((s, k) => {
			const den = k < 3 ? U[lab[k + 1].u].b : (gioi < U.length ? U[gioi].b : bx.length);
			s.khoi = []; if (doanMoi && !s.rongGiua) for (let bi = U[s.u].b + 1; bi < den; bi++) s.khoi.push(bi);
		});
		// nhãn có đánh dấu?
		const dauNhan = slot.map(s => {
			const P = U[s.u].P; let pos = 0, co = false, dauMau = null;
			for (const p of P.ps) { const e = pos + p.t.length; if (p.run && e > s.nhan.sep && pos < s.nhan.het && (p.k === "t" || p.k === "tab") && p.t.trim() !== "" && coDau(p.rPr)) { co = true; dauMau = dauMau || phanDau(p.rPr); } pos = e; }
			if (!co) { pos = 0; let tong = 0, dau = 0; for (const p of P.ps) { const e = pos + p.t.length; if (p.k === "t" && e > s.a && pos < s.b) { const n = Math.min(e, s.b) - Math.max(pos, s.a), m = p.t.slice(Math.max(0, s.a - pos), Math.min(p.t.length, s.b - pos)).replace(/\s/g, "").length; tong += m; if (coDau(p.rPr)) { dau += m; dauMau = dauMau || phanDau(p.rPr); } void n; } pos = e; } if (tong > 0 && dau === tong) co = true; }
			return { co, dauMau };
		});
		const paTxt = slot.map(s => U[s.u].txt.slice(s.a, s.b) + s.khoi.map(bi => chuXml(bx[bi])).join(" "));
		return { lab, slot, gioi, dauNhan, paTxt, doanMoi };
	}
	function sapTheoThuTu(ops) { return ops.sort((x, y) => y.a - x.a); }
	// áp các thao tác lên một đơn vị (đoạn văn)
	function apDonVi(P, ops) {
		let ps = P.ps;
		for (const o of sapTheoThuTu(ops)) {
			const c = cat(ps, o.a, o.b);
			if (o.loai === "thay") ps = c.truoc.concat(o.ps.map(p => Object.assign({}, p)), c.sau);
			else if (o.loai === "chu") {
				const mau = c.giua.find(p => p.k === "t") || [...c.truoc].reverse().find(p => p.k === "t"); if (!mau) throw new Error("KHOA");
				if (c.giua.some(p => p.t && p.k !== "t")) throw new Error("KHOA");
				ps = c.truoc.concat([Object.assign({}, mau, { t: o.t, sua: true })], c.giua.filter(p => !p.t), c.sau);
			} else if (o.loai === "kieu") {
				const uid = ++UID;
				ps = c.truoc.concat(c.giua.map(p => p.run && (p.k === "t" || p.k === "tab") ? Object.assign({}, p, { rPr: o.dung ? themDauRPr(p.rPr, o.dau) : boDauRPr(p.rPr), run: uid, rmo: "<w:r>", sua: p.k === "t" ? true : p.sua }) : p), c.sau);
			}
		}
		return Object.assign({}, P, { ps, doi: true });
	}
	function dungLaiKhoi(bx, U, opsTheoU) {
		const moi = bx.slice(), theoKhoi = new Map();
		opsTheoU.forEach((ops, ui) => { if (!ops || !ops.length) return; const d = U[ui]; (theoKhoi.get(d.b) || theoKhoi.set(d.b, []).get(d.b)).push({ d, x: xuatP(apDonVi(d.P, ops)) }); });
		theoKhoi.forEach((ds, bi) => { let x = bx[bi]; ds.sort((p, q) => q.d.s - p.d.s).forEach(o => { x = x.slice(0, o.d.s) + o.x + x.slice(o.d.e); }); moi[bi] = x; });
		return moi;
	}
	// số "Câu n" ở đầu câu
	function viTriSoCau(t) { const m = t.match(/^([\s\u00a0\uFFFC]*C[âÂ]u[\s\u00a0]*)(\d+)/); return m ? { a: m[1].length, b: m[1].length + m[2].length } : null; }
	function vienChon(U, tu, den) { const ra = []; for (let ui = tu; ui < den; ui++) { const t = U[ui].txt, re = /(?:^|[\s.:;])Chọn[\s\u00a0]*:?[\s\u00a0]*([A-D])(?![A-Za-zÀ-ỹ])/g; let m; while ((m = re.exec(t))) { const i = m.index + m[0].length - 1; ra.push({ u: ui, a: i, b: i + 1, chu: m[1] }); } } return ra; }

	// ----- cấu trúc cả file -----
	function khoiCap1(xml) {
		const bo = xml.indexOf("<w:body>"), bc = xml.lastIndexOf("</w:body>"); if (bo < 0 || bc < 0) throw new Error("Không thấy <w:body> trong document.xml");
		const B = conTrucTiep(xml, bo + 8, bc).map(c => { const x = xml.slice(c.s, c.e), b = { s: c.s, e: c.e, ten: c.ten, x };
			if (c.ten === "w:p") { const P = docP(x); b.tx = chuP(P); const np = (P.pPr.match(/<w:numPr>[\s\S]*?<\/w:numPr>/) || [""])[0]; if (np) b.num = { id: (np.match(/<w:numId w:val="(\d+)"/) || [])[1], lv: (np.match(/<w:ilvl w:val="(\d+)"/) || [, "0"])[1] }; if (/<w:sectPr\b/.test(P.pPr)) b.sect = true; }
			else b.tx = c.ten === "w:sectPr" ? "" : chuXml(x);
			return b; });
		return { bo, bc, B };
	}
	const boDauNhan = s => chuan(s).replace(/^[-–—.…*•_=~\s]+/, "");
	const laDe = b => b.ten === "w:p" && /^DE\s*(SO\s*)?\d{1,3}$/.test(boDauNhan(b.tx));
	const laPhan = b => b.ten === "w:p" && /^PHAN\s*(IV|III|II|I|[1-4])\b/.test(boDauNhan(b.tx));
	function laDuoi(b) { if (b.ten !== "w:p") return false; const t = boDauNhan(b.tx); if (/^HET(\s|[-–—.…*!]|$)/.test(t) && t.replace(/[^A-Z]/g, "") === "HET") return "het"; const goc = b.tx.replace(/[^A-Za-zÀ-ỹĐđ]/g, ""); return goc && goc === goc.toUpperCase() && /^(DAP AN|BANG DAP AN|HUONG DAN|LOI GIAI|GIAI CHI TIET|DAP SO)/.test(t) ? "da" : false; }
	function loaiPhan(tx) { const t = chuan(tx); if (/NHIEU PHUONG AN|LUA CHON/.test(t)) return "tn"; if (/DUNG\s*[\/-]?\s*SAI/.test(t)) return "ds"; if (/TRA LOI NGAN|YEU CAU TRA LOI/.test(t)) return "tln"; if (/TU LUAN/.test(t)) return "tl"; const r = (boDauNhan(tx).match(/^PHAN\s*(IV|III|II|I|[1-4])\b/) || [])[1]; return { I: "tn", 1: "tn", II: "ds", 2: "ds", III: "tln", 3: "tln", IV: "tl", 4: "tl" }[r] || ""; }
	const laSoCau = b => b.ten === "w:p" && /^CAU\s*\d+/.test(chuan(b.tx.replace(/^[\s\u00a0\uFFFC]+/, "")));
	const DAU_CAU = /^[ \u00a0\uFFFC]*(C[âÂ]u[ \u00a0]*\d+[ \u00a0]*[.:]|PH[ẦẤA]N[ \u00a0]+(IV|III|II|I)\b)/;
	// "…\nCâu 1. …" trong cùng một đoạn (xuống dòng bằng Shift+Enter) → tách thành đoạn riêng để không mất câu
	function tachDoanCau(xml) {
		const { bo, bc, B } = khoiCap1(xml); let n = 0;
		const moi = B.map(b => {
			if (b.ten !== "w:p" || b.tx.indexOf("\n") < 0) return b.x;
			const P = docP(b.x), t = chuP(P), cho = []; let i = -1;
			while ((i = t.indexOf("\n", i + 1)) >= 0) if (DAU_CAU.test(t.slice(i + 1)) && t.slice(0, i).replace(/[\s\u00a0]/g, "")) cho.push(i);
			if (!cho.length) return b.x;
			const pPr2 = P.pPr.replace(/<w:numPr>[\s\S]*?<\/w:numPr>/, ""), pPr1 = P.pPr.replace(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/, "").replace(/<w:rPr>[\s\S]*?<\/w:rPr>/, m => m);
			let ps = P.ps, lech = 0; const ra = [];
			cho.forEach(c => { const k = cat(ps, c - lech, c - lech + 1); ra.push(xuatP(Object.assign({}, P, { pPr: ra.length ? pPr2.replace(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/, "") : pPr1, ps: k.truoc, doi: true }))); ps = k.sau; lech = c + 1; n++; });
			ra.push(xuatP(Object.assign({}, P, { pPr: pPr2, ps, doi: true })));
			return ra.join("");
		});
		return { xml: n ? xml.slice(0, bo + 8) + moi.join("") + xml.slice(bc) : xml, n };
	}
	function chiaCau(B, tu, den) {
		let starts = [];
		for (let i = tu; i < den; i++) if (laSoCau(B[i])) starts.push(i);
		let cheDo = "chu";
		if (!starts.length) { cheDo = "so"; const f = B.slice(tu, den).find(b => b.num && b.num.id && b.num.id !== "0"); if (f) for (let i = tu; i < den; i++) if (B[i].num && B[i].num.id === f.num.id && B[i].num.lv === f.num.lv) starts.push(i); }
		const cau = starts.map((s, k) => { const e = k + 1 < starts.length ? starts[k + 1] : den; let e2 = e; while (e2 > s + 1 && B[e2 - 1].ten === "w:p" && rongTxt(B[e2 - 1].tx) && !B[e2 - 1].sect) e2--; return { s, e: e2, dem: e }; });
		return { cheDo, cau, mo: starts.length ? starts[0] : den };
	}
	// đọc bảng đáp án trong phần cuối file
	function oBang(x) { return x.split("</w:tr>").slice(0, -1).map(r => r.split("</w:tc>").slice(0, -1).map(c => chuXml(c + "").replace(/[\s\u00a0]+/g, " ").trim())); }
	const DS1 = v => { const t = chuan(v).replace(/^[A-D]\)\s*/, ""); return /^(D|DUNG|Đ)$/.test(t) ? "Đ" : /^(S|SAI)$/.test(t) ? "S" : ""; };
	function docBang(rows, loaiNgucanh, kq) {
		const so = c => { const m = String(c).match(/^(?:C[âa]u\s*)?(\d{1,2})$/i); return m ? +m[1] : 0; };
		rows.forEach(r => r.forEach(c => { const m = c.match(/^(\d{1,2})\s*[.\-:)]?\s*([A-D])$/); if (m) kq.tn[+m[1]] = m[2]; }));
		for (let r = 0; r + 1 < rows.length; r++) {
			const h = rows[r], v = rows[r + 1]; const cot = []; h.forEach((c, j) => { const n = so(c); if (n) cot.push([j, n]); });
			if (cot.length < 2) continue;
			// dạng cột ĐS: "Câu n" ở hàng đầu, các hàng sau "a) Đ"
			if (/^[a-d]\)\s*/i.test(v[cot[0][0]] || "")) { cot.forEach(([j, n]) => { let s = ""; for (let rr = r + 1; rr < rows.length && s.length < 4; rr++) { const d = DS1(rows[rr][j] || ""); if (!d) break; s += d; } if (s.length === 4) kq.ds[n] = s; }); continue; }
			cot.forEach(([j, n]) => { const val = (v[j] || "").trim(); if (!val) return; let L = loaiNgucanh; if (!L) L = /^[A-D]$/.test(val) ? "tn" : /^[ĐS]{4}$/.test(val) ? "ds" : "tln"; if (L === "tn" && /^[A-D]$/.test(val)) kq.tn[n] = val; else if (L === "ds" && /^[ĐS]{4}$/.test(val)) kq.ds[n] = val; else if (L === "tln") kq.tln[n] = val; });
		}
		// dạng hàng ĐS: "Câu n | Đ | S | S | Đ"
		rows.forEach(r => { const n = so(r[0] || ""); if (!n || r.length < 5) return; const s = r.slice(1, 5).map(DS1).join(""); if (s.length === 4) kq.ds[n] = s; });
	}
	function docDuoi(B, tu, den, kq) {
		let L = "";
		for (let i = tu; i < den; i++) {
			const b = B[i];
			if (laPhan(b)) { L = loaiPhan(b.tx); continue; }
			if (b.ten === "w:tbl") docBang(oBang(b.x), L, kq);
			if (b.ten === "w:p" && (!L || L === "tn")) { const re = /(?:^|[\s.:;])Chọn[\s\u00a0]*:?[\s\u00a0]*([A-D])(?![A-Za-zÀ-ỹ])/g; let m; while ((m = re.exec(b.tx))) kq.chon.push(m[1]); }
		}
	}
	function phanTichDocx(xml0, deChon) {
		const tach = tachDoanCau(xml0), xml = tach.xml;
		const { bo, bc, B } = khoiCap1(xml), canhBao = [], loi = [];
		if (tach.n) canhBao.push("Đã tách " + tach.n + " chỗ “Câu n.” / “PHẦN …” đang nằm chung đoạn với nội dung trước (xuống dòng bằng Shift+Enter) thành đoạn riêng — nội dung không đổi.");
		const sect = B.length && B[B.length - 1].ten === "w:sectPr" ? B.length - 1 : -1, het = sect >= 0 ? sect : B.length;
		// nhiều đề trong một file
		let dsDe = []; for (let i = 0; i < het; i++) if (laDe(B[i])) dsDe.push(i);
		if (dsDe.length < 2) dsDe = [];
		const de = dsDe.map((s, k) => ({ ten: B[s].tx.trim(), s, e: k + 1 < dsDe.length ? dsDe[k + 1] : het }));
		const chon = de.length ? Math.max(0, Math.min(de.length - 1, deChon || 0)) : 0;
		const vung = de.length ? { s: de[chon].s, e: de[chon].e } : { s: 0, e: het };
		const truocDe = de.length ? de[0].s : 0;
		// đầu phần, cuối đề
		const dau = []; for (let i = vung.s; i < vung.e; i++) if (laPhan(B[i])) dau.push(i);
		let duoi = vung.e, hetDe = vung.e;
		const tuDuoi = dau.length ? dau[0] + 1 : vung.s;
		for (let i = tuDuoi; i < vung.e; i++) { const d = laDuoi(B[i]); if (d) { duoi = i; hetDe = d === "het" ? i + 1 : i; break; } }
		const dauDe = dau.filter(i => i < duoi);
		const phan = [];
		if (dauDe.length) dauDe.forEach((h, k) => { const den = k + 1 < dauDe.length ? dauDe[k + 1] : duoi; phan.push({ h, s: h + 1, e: den, loai: loaiPhan(B[h].tx), ten: B[h].tx.trim().slice(0, 60) }); });
		else phan.push({ h: -1, s: vung.s, e: duoi, loai: "", ten: "(không có tiêu đề PHẦN)" });
		const kq = { tn: {}, ds: {}, tln: {}, chon: [] }; docDuoi(B, duoi, vung.e, kq);
		let soTN = 0;
		phan.forEach(p => {
			const c = chiaCau(B, p.s, p.e); p.cheDo = c.cheDo; p.moDau = c.mo;
			if (!p.loai) { const thu = c.cau.slice(0, 3).map(q => { const U = moCau(B.slice(q.s, q.e).map(b => b.x)); const bx = B.slice(q.s, q.e).map(b => b.x); return moPhuongAn(U, bx, "tn").lab ? "tn" : moPhuongAn(U, bx, "ds").lab ? "ds" : "tln"; }); p.loai = thu.sort((a, b) => thu.filter(v => v === b).length - thu.filter(v => v === a).length)[0] || "tln"; }
			p.cau = c.cau.map((q, k) => {
				const bx = B.slice(q.s, q.e).map(b => b.x), U = moCau(bx), cau = { s: q.s, e: q.e, dem: q.dem, so: k + 1, loai: p.loai, khoa: "", da: "", nguonDA: "" };
				if (B.slice(q.s, q.e).some(b => b.sect)) { p.khoaThuTu = "có ngắt section bên trong câu"; }
				cau.tomTat = U.slice(0, 3).map(u => u.txt).join(" ").replace(/\uFFFC/g, "▢").replace(/[\t\n]+/g, " ").replace(/^[\s\u00a0]*C[âÂ]u[\s\u00a0]*\d+[\s\u00a0]*[.:]?/, "").trim().slice(0, 180);
				if (p.loai === "tn" || p.loai === "ds") {
					const pa = moPhuongAn(U, bx, p.loai); cau.pa = pa;
					if (pa.khoa) cau.khoa = pa.khoa;
					else if (p.loai === "tn" && pa.paTxt.some(laKhoa)) cau.khoa = "có phương án kiểu “Cả A và B…/Tất cả…”";
				}
				return cau;
			});
			if (p.cheDo === "chu" || p.cheDo === "so") { /* ok */ }
			if (!p.cau.length && p.loai !== "tl") canhBao.push("Không nhận ra câu hỏi nào trong " + p.ten + ".");
			const ghi = [p.h >= 0 ? B[p.h].tx : ""].concat(B.slice(p.s, p.cau[0] ? p.cau[0].s : p.e).map(b => b.tx)).join(" ").match(/đến[\s\u00a0]+câu[\s\u00a0]+(\d+)/i);
			const tenNgan = (p.ten.match(/^[^.:]*/) || [p.ten])[0].trim();
			if (ghi && +ghi[1] !== p.cau.length) loi.push(tenNgan + ": đề ghi “đến câu " + ghi[1] + "” nhưng chỉ nhận ra " + p.cau.length + " câu — có câu bị dính liền vào đoạn khác (không có dấu xuống dòng trước “Câu n.”). Hãy nhấn Enter trước “Câu n.” trong Word rồi nạp lại.");
			if (p.cheDo === "chu") { const so = p.cau.map(c => +(chuan(B[c.s].tx.replace(/^[\s\u00a0\uFFFC]+/, "")).match(/^CAU\s*(\d+)/) || [])[1]); const sai = so.findIndex((v, i) => v !== i + 1); if (sai >= 0) loi.push(tenNgan + ": số câu không liên tục (sau “Câu " + (so[sai - 1] || 0) + "” là “Câu " + so[sai] + "”) — có câu bị dính liền vào câu trước."); }
			// đáp án: đánh dấu trên đề → bảng đáp án → "Chọn X"
			const dungDau = p.cau.some(c => c.pa && c.pa.dauNhan && c.pa.dauNhan.some(d => d.co));
			p.cau.forEach(c => {
				if (p.loai === "tn") {
					if (dungDau && c.pa && c.pa.dauNhan) { const ds = c.pa.dauNhan.map(d => d.co); if (ds.filter(Boolean).length === 1) { c.da = "ABCD"[ds.indexOf(true)]; c.nguonDA = "đánh dấu"; } }
					const bang = kq.tn[c.so], ch = kq.chon.length >= soTN + p.cau.length ? kq.chon[soTN + c.so - 1] : "";
					if (!c.da && bang) { c.da = bang; c.nguonDA = "bảng đáp án"; } else if (c.da && bang && bang !== c.da) canhBao.push(p.ten.slice(0, 9) + " câu " + c.so + ": đánh dấu trên đề (" + c.da + ") khác bảng đáp án (" + bang + ") — dùng đánh dấu trên đề.");
					if (!c.da && ch && kq.chon.length === soTN + p.cau.length) { c.da = ch; c.nguonDA = "lời giải “Chọn”"; }
				} else if (p.loai === "ds") {
					if (dungDau && c.pa && c.pa.dauNhan) { c.da = c.pa.dauNhan.map(d => d.co ? "Đ" : "S").join(""); c.nguonDA = "đánh dấu"; }
					const bang = kq.ds[c.so]; if (!c.da && bang) { c.da = bang; c.nguonDA = "bảng đáp án"; } else if (c.da && bang && bang !== c.da) canhBao.push(p.ten.slice(0, 10) + " câu " + c.so + ": đánh dấu trên đề (" + c.da + ") khác bảng đáp án (" + bang + ").");
				} else if (p.loai === "tln") {
					if (kq.tln[c.so]) { c.da = kq.tln[c.so]; c.nguonDA = "bảng đáp án"; }
					else { const U = moCau(B.slice(c.s, c.e).map(b => b.x)); const d = U.map(u => u.txt.match(/(?:Đáp số|Đáp án|KQ|Kết quả)[\s\u00a0]*[:：][\s\u00a0]*([^\t\n]+)/i)).find(Boolean); if (d) { c.da = d[1].replace(/\uFFFC/g, "▢").trim(); c.nguonDA = "dòng đáp số"; } }
				}
				if ((p.loai === "tn" || p.loai === "ds") && !c.da && !c.khoa) c.khoa = "chưa xác định được đáp án";
				c.dauDung = dungDau && c.da && c.nguonDA === "đánh dấu";
				if (!c.da && p.loai !== "tl") canhBao.push(p.ten.slice(0, 10).trim() + " — câu " + c.so + ": chưa xác định được đáp án" + (p.loai === "tln" ? "." : " → giữ nguyên thứ tự phương án."));
			});
			if (p.loai === "tn") soTN += p.cau.length;
		});
		// lời giải tách riêng ở cuối đề (để xuất kèm theo đúng thứ tự mỗi mã)
		const loiGiai = docLoiGiai(B, duoi, vung.e, phan);
		return { loai: "docx", xml, bo, bc, B, de, chon, vung, truocDe, phan, duoi, hetDe, sect, kq, loiGiai, canhBao, loi };
	}
	function docLoiGiai(B, tu, den, phan) {
		let s = -1; for (let i = tu; i < den; i++) { const t = boDauNhan(B[i].tx || ""); if (B[i].ten === "w:p" && /^(LOI GIAI|HUONG DAN|DAP AN CHI TIET|GIAI CHI TIET)/.test(t)) { s = i; break; } }
		if (s < 0) return null;
		const dau = []; for (let i = s + 1; i < den; i++) if (laPhan(B[i])) dau.push(i);
		const ph = [];
		if (dau.length && dau[0] > s + 1) { const c = chiaCau(B, s + 1, dau[0]); if (c.cau.length) ph.push({ h: -1, loai: "", mo: [s + 1, c.mo], cau: c.cau }); }
		if (dau.length) dau.forEach((h, k) => { const e = k + 1 < dau.length ? dau[k + 1] : den; const c = chiaCau(B, h + 1, e); ph.push({ h, loai: loaiPhan(B[h].tx), mo: [h + 1, c.mo], cau: c.cau }); });
		else { const c = chiaCau(B, s + 1, den); ph.push({ h: -1, loai: "", mo: [s + 1, c.mo], cau: c.cau }); }
		const khop = [];
		const lech = [];
		ph.forEach(lp => { const p = phan.find((q, qi) => (lp.loai ? q.loai === lp.loai : qi === 0) && !khop.some(k => k.p === qi)); const pi = phan.indexOf(p); if (p && lp.cau.length === p.cau.length) khop.push({ p: pi, lp }); else if (p) lech.push((p.ten.match(/^[^.:]*/) || [""])[0].trim() + " (lời giải " + lp.cau.length + "/" + p.cau.length + " câu)"); });
		return { s, ph, khop, lech };
	}
	// ----- dựng một câu đã đổi (thứ tự phương án + số câu) -----
	function dungCau(bx, cau, pa, soMoi, cheDo) {
		const U = moCau(bx), ops = U.map(() => []), info = cau.pa;
		let khoiThem = null;
		if (pa && info && info.slot && !pa.every((v, i) => v === i)) {
			const goc = info.slot.map(s => cat(U[s.u].P.ps, s.a, s.b).giua);
			info.slot.forEach((s, k) => ops[s.u].push({ loai: "thay", a: s.a, b: s.b, ps: goc[pa[k]] }));
			if (cau.dauDung) {
				const dau = info.dauNhan.find(d => d.co && d.dauMau && d.dauMau.length); const dm = dau ? dau.dauMau : [];
				const dungMoi = pa.map(k => info.dauNhan[k].co);
				info.slot.forEach((s, k) => ops[s.u].push({ loai: "kieu", a: s.nhan.sep, b: s.nhan.het, dung: dungMoi[k], dau: dm }));
			}
			if (cau.loai === "tn") vienChon(U, info.gioi, U.length).forEach(c => { const k = "ABCD".indexOf(c.chu); ops[c.u].push({ loai: "chu", a: c.a, b: c.b, t: "ABCD"[pa.indexOf(k)] }); });
			if (info.doanMoi) khoiThem = info.slot.map((s, k) => info.slot[pa[k]].khoi.map(bi => bx[bi]));
		}
		if (cheDo === "chu" && soMoi) { const v = viTriSoCau(U[0].txt); if (v) ops[0].push({ loai: "chu", a: v.a, b: v.b, t: String(soMoi) }); }
		let moi = dungLaiKhoi(bx, U, ops);
		if (khoiThem) { const bo = new Set(info.slot.flatMap(s => s.khoi)), sauNhan = new Map(info.slot.map((s, k) => [U[s.u].b, k])); const r = []; moi.forEach((x, bi) => { if (bo.has(bi)) return; r.push(x); if (sauNhan.has(bi)) khoiThem[sauNhan.get(bi)].forEach(y => r.push(y)); }); moi = r; }
		return moi;
	}
	function tronDocx(info, cfg, ma, rnd) {
		const B = info.B, out = [], ketQua = [];
		const ganMa = cfg.dongMa === false ? null : ma;
		// phần đầu đề (trước PHẦN I) + đóng dấu mã đề
		const p0 = info.phan[0], dauS = info.de.length ? info.vung.s : 0, dauE = p0.h >= 0 ? p0.h : p0.s;
		const truoc = []; if (info.de.length) for (let i = 0; i < info.truocDe; i++) truoc.push(B[i].x);
		let dauDe = B.slice(dauS, dauE).map(b => b.x), daDong = false;
		if (ganMa) { const r = dongMaDocx(dauDe, ganMa); dauDe = r.bx; daDong = r.ok; }
		out.push(...truoc, ...dauDe);
		if (ganMa && !daDong) out.push('<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/></w:rPr>' + taoT("Mã đề: " + ganMa) + "</w:r></w:p>");
		const moThan = out.length;
		info.phan.forEach(p => {
			if (p.h >= 0) out.push(B[p.h].x);
			for (let i = p.s; i < (p.cau[0] ? p.cau[0].s : p.e); i++) out.push(B[i].x);
			const tron = !p.khoaThuTu && p.loai !== "tl" && ((p.loai === "tn" && cfg.tronTN) || (p.loai === "ds" && cfg.tronDS) || (p.loai === "tln" && cfg.tronTLN));
			const pv = tron ? hoanViKhac(p.cau.length, rnd) : p.cau.map((_, i) => i), cau = [];
			p.cau.forEach((slot, k) => {
				const c = p.cau[pv[k]], doiPA = !c.khoa && c.pa && c.pa.slot && ((p.loai === "tn" && cfg.tronPA) || (p.loai === "ds" && cfg.tronY));
				const pa = doiPA ? hoanViKhac(4, rnd) : [0, 1, 2, 3];
				const bx = B.slice(c.s, c.e).map(b => b.x);
				dungCau(bx, c, pa, k + 1, p.cheDo).forEach(x => out.push(x));
				for (let i = slot.e; i < slot.dem; i++) out.push(B[i].x);   // đoạn trống đệm giữ đúng chỗ
				cau.push({ so: k + 1, goc: c.so, loai: p.loai, pa, da: daSauDoi(c.da, p.loai, pa), daGoc: c.da });
			});
			ketQua.push({ loai: p.loai, ten: p.ten, cau });
		});
		for (let i = info.duoi; i < info.hetDe; i++) out.push(B[i].x);
		const than = out.slice(moThan);
		if (info.sect >= 0) out.push(B[info.sect].x);
		const xml = info.xml.slice(0, info.bo + 8) + out.join("") + info.xml.slice(info.bc);
		const bien = { ma, loai: "docx", xml, than, phan: ketQua, daDong: ganMa ? daDong : null };
		if (cfg.loiGiai && info.loiGiai && info.loiGiai.khop.length) bien.loiGiaiXml = dungLoiGiai(info, bien);
		return bien;
	}
	function dongMaDocx(bx, ma) {
		for (let bi = 0; bi < bx.length; bi++) {
			const U = moCau([bx[bi]]);
			for (let ui = 0; ui < U.length; ui++) {
				const m = U[ui].txt.match(/(M[ãa][\s\u00a0]*đ[ềe](?:[\s\u00a0]*thi)?(?:[\s\u00a0]*số)?[\s\u00a0]*[:：]?[\s\u00a0]*)([0-9.…_xX]*)/i);
				if (!m) continue;
				const a = m.index + m[1].length, b = a + m[2].length;
				try { const moi = dungLaiKhoi([bx[bi]], U, U.map((_, i) => i === ui ? [{ loai: "chu", a, b, t: ma }] : [])); const r = bx.slice(); r[bi] = moi[0]; return { bx: r, ok: true }; } catch (e) { /* thử chỗ khác */ }
			}
		}
		return { bx, ok: false };
	}
	function dungLoiGiai(info, bien) {
		const B = info.B, lg = info.loiGiai, out = [B[lg.s].x, '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr>' + taoT("(Theo thứ tự câu của mã đề " + bien.ma + ")") + "</w:r></w:p>"];
		lg.khop.forEach(({ p, lp }) => {
			if (lp.h >= 0) out.push(B[lp.h].x);
			for (let i = lp.mo[0]; i < lp.mo[1]; i++) out.push(B[i].x);
			const P = info.phan[p];
			bien.phan[p].cau.forEach((c, k) => {
				const q = lp.cau[c.goc - 1], bx = B.slice(q.s, q.e).map(b => b.x), goc = P.cau[c.goc - 1];
				const U = moCau(bx); let pa = null;
				if (P.loai === "tn" || P.loai === "ds") { const x = moPhuongAn(U, bx, P.loai); if (!x.khoa) pa = x; }
				const gia = { loai: P.loai, pa: pa || { gioi: 0 }, dauDung: false };
				let moi;
				if (pa) moi = dungCau(bx, Object.assign({}, gia, { pa }), c.pa, k + 1, lp.cau.length && laSoCau(B[q.s]) ? "chu" : "so");
				else { // không thấy phương án trong lời giải: chỉ đổi số câu và chữ "Chọn X"
					const ops = U.map(() => []); if (P.loai === "tn") vienChon(U, 0, U.length).forEach(x => ops[x.u].push({ loai: "chu", a: x.a, b: x.b, t: "ABCD"[c.pa.indexOf("ABCD".indexOf(x.chu))] }));
					const v = viTriSoCau(U[0].txt); if (v) ops[0].push({ loai: "chu", a: v.a, b: v.b, t: String(k + 1) }); moi = dungLaiKhoi(bx, U, ops);
				}
				moi.forEach(x => out.push(x)); for (let i = q.e; i < q.dem; i++) out.push(B[i].x);
			});
		});
		if (info.sect >= 0) out.push(B[info.sect].x);
		return info.xml.slice(0, info.bo + 8) + out.join("") + info.xml.slice(info.bc);
	}
	// ----- xác thực song ánh cho Word -----
	const noiPA = (U, s, bx) => cat(U[s.u].P.ps, s.a, s.b).giua.map(p => p.k === "obj" ? p.x : p.t).join("") + "|" + s.khoi.map(bi => bx[bi]).join("");
	const DOI_TUONG = /<m:oMath\b[\s\S]*?<\/m:oMath>|<w:object\b[\s\S]*?<\/w:object>|<w:drawing\b[\s\S]*?<\/w:drawing>|<w:pict\b[\s\S]*?<\/w:pict>|<mc:AlternateContent\b[\s\S]*?<\/mc:AlternateContent>/g;
	function vanTayCau(bx, loai, pa) {
		const U = moCau(bx), dt = bx.join("").match(DOI_TUONG) || [];
		// thay nội dung phương án bằng dấu giữ chỗ, ghép danh sách phương án đã sắp
		let than = U.map(u => u.txt), cacPA = [], boB = new Set();
		if (pa && pa.slot) { cacPA = pa.slot.map(s => noiPA(U, s, bx)).sort(); [...pa.slot].sort((x, y) => y.a - x.a).forEach(s => { than[s.u] = than[s.u].slice(0, s.a) + "§" + than[s.u].slice(s.b); }); boB = new Set(pa.slot.flatMap(s => s.khoi)); }
		than = than.filter((_, i) => !boB.has(U[i].b)).join("¶").replace(/^([\s\u00a0\uFFFC]*C[âÂ]u[\s\u00a0]*)\d+/, "$1#").replace(/(Chọn[\s\u00a0]*:?[\s\u00a0]*)[A-D](?![A-Za-zÀ-ỹ])/g, "$1?");
		return than + "\u0000" + cacPA.join("\u0001") + "\u0000" + dt.sort().join("\u0001");
	}
	function xacThucDocx(info, bien) {
		const loi = [], p2 = phanTichDocx(bien.xml, 0);
		if (p2.phan.length !== info.phan.length) loi.push("Số PHẦN " + p2.phan.length + " ≠ gốc " + info.phan.length);
		info.phan.forEach((p, pi) => {
			const q2 = p2.phan[pi]; if (!q2) return;
			if (q2.cau.length !== p.cau.length) loi.push(p.ten.slice(0, 12) + ": " + q2.cau.length + " câu ≠ gốc " + p.cau.length);
			const gap = new Set();
			bien.phan[pi].cau.forEach((c, k) => {
				const g = p.cau[c.goc - 1], v = q2.cau[k]; if (!g || !v) { loi.push(p.ten.slice(0, 9) + " câu " + (k + 1) + ": thiếu"); return; }
				if (gap.has(c.goc)) loi.push(p.ten.slice(0, 9) + ": câu gốc " + c.goc + " bị lặp"); gap.add(c.goc);
				if (c.da !== daSauDoi(g.da, p.loai, c.pa) || c.daGoc !== g.da) loi.push(p.ten.slice(0, 9) + " câu " + (k + 1) + ": đáp án trong bảng không khớp hoán vị phương án");
				const bxG = info.B.slice(g.s, g.e).map(b => b.x), bxV = p2.B.slice(v.s, v.e).map(b => b.x);
				const vtG = vanTayCau(bxG, p.loai, g.pa && g.pa.slot ? g.pa : null);
				let paV = null; if (g.pa && g.pa.slot) { const U = moCau(bxV); const x = moPhuongAn(U, bxV, p.loai); paV = x.slot ? x : null; if (!paV) loi.push(p.ten.slice(0, 9) + " câu " + (k + 1) + ": không đọc lại được phương án"); }
				if (vtG !== vanTayCau(bxV, p.loai, paV)) loi.push(p.ten.slice(0, 9) + " câu " + (k + 1) + " (gốc " + c.goc + "): nội dung không khớp bản gốc");
				// đáp án: phương án ở khe k của mã đề phải là phương án pa[k] của bản gốc
				if (paV && g.pa.slot) {
					const UG = moCau(bxG), UV = moCau(bxV);
					paV.slot.forEach((s, j) => { if (noiPA(UV, s, bxV) !== noiPA(UG, g.pa.slot[c.pa[j]], bxG)) loi.push(p.ten.slice(0, 9) + " câu " + (k + 1) + ": phương án " + "ABCD"[j] + " lệch"); });
					if (g.dauDung) { const d2 = paV.dauNhan.map(d => d.co); const da2 = p.loai === "tn" ? (d2.filter(Boolean).length === 1 ? "ABCD"[d2.indexOf(true)] : "?") : d2.map(x => x ? "Đ" : "S").join(""); if (da2 !== c.da) loi.push(p.ten.slice(0, 9) + " câu " + (k + 1) + ": đánh dấu đáp án đọc lại " + da2 + " ≠ " + c.da); }
				}
			});
			if (gap.size !== p.cau.length) loi.push(p.ten.slice(0, 9) + ": thiếu " + (p.cau.length - gap.size) + " câu gốc");
		});
		// toàn bộ công thức/ảnh trong phần đề phải giữ nguyên số lượng và nội dung
		const dtG = info.B.slice(0, info.truocDe).concat(info.B.slice(info.de.length ? info.vung.s : 0, info.hetDe)).map(b => b.x).join("").match(DOI_TUONG) || [];
		const dtV = p2.B.slice(0, p2.hetDe).map(b => b.x).join("").match(DOI_TUONG) || [];
		if (dtG.length !== dtV.length || dtG.slice().sort().join("\u0001") !== dtV.slice().sort().join("\u0001")) loi.push("Công thức/hình: " + dtV.length + " ≠ gốc " + dtG.length);
		if (bien.loiGiaiXml) { try { khoiCap1(bien.loiGiaiXml); } catch (e) { loi.push("File lời giải: " + e.message); } }
		return loi;
	}

	/* =====================================================================
	 *  API chung
	 * ===================================================================== */
	function demCau(info) {
		const d = { tn: 0, ds: 0, tln: 0, tl: 0 };
		if (info.loai === "tex") info.ex.forEach(x => { d[x.loai]++; });
		else info.phan.forEach(p => { d[p.loai] = (d[p.loai] || 0) + p.cau.length; });
		d.tong = d.tn + d.ds + d.tln + d.tl; return d;
	}
	function phanTich(nguon) {
		const info = nguon.loai === "tex" ? phanTichTex(nguon.text) : phanTichDocx(nguon.xml, nguon.deChon || 0);
		info.dem = demCau(info);
		// danh sách câu thống nhất cho giao diện
		info.ds = info.loai === "tex"
			? info.phan.map(p => ({ loai: p.loai, ten: { tn: "PHẦN I · Trắc nghiệm", ds: "PHẦN II · Đúng/Sai", tln: "PHẦN III · Trả lời ngắn", tl: "PHẦN IV · Tự luận" }[p.loai], cau: p.ex.map((i, k) => { const x = info.ex[i]; return { so: k + 1, da: x.da, khoa: x.khoa, tomTat: tomTatTex(x.raw) }; }) }))
			: info.phan.map(p => ({ loai: p.loai, ten: p.ten, cau: p.cau.map(c => ({ so: c.so, da: c.da, khoa: c.khoa, tomTat: c.tomTat, nguonDA: c.nguonDA })) }));
		if (!info.dem.tong && !info.loi.length) info.loi.push(info.loai === "tex" ? "Không thấy khối \\begin{ex}…\\end{ex} nào." : "Không nhận ra câu hỏi nào (cần tiêu đề “PHẦN I/II/III” và câu bắt đầu bằng “Câu n.” hoặc danh sách đánh số tự động).");
		return info;
	}
	function tomTatTex(raw) { const t = boChuThich(raw).replace(/\\begin\{ex\}|\\end\{ex\}/g, ""); const c = t.search(/\\(choiceTF|choice|shortans|loigiai)(?![A-Za-z])/); return (c >= 0 ? t.slice(0, c) : t).replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, " [hình] ").replace(/\\immini(\[[^\]]*\])?/g, "").replace(/[{}]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180); }
	function tron(info, cfg, ma, rnd) { return info.loai === "tex" ? tronTex(info, cfg, ma, rnd || rngMay()) : tronDocx(info, cfg, ma, rnd || rngMay()); }
	function xacThuc(info, bien) { try { return info.loai === "tex" ? xacThucTex(info, bien) : xacThucDocx(info, bien); } catch (e) { return ["Lỗi khi kiểm tra: " + (e.message || e)]; } }

	// ----- bảng đáp án tổng hợp -----
	function bangDapAn(ds) { // → [{phan, loai, so, da: [mỗi mã], goc: [mỗi mã]}]
		const rows = []; if (!ds.length) return rows;
		ds[0].phan.forEach((p, pi) => p.cau.forEach((c, k) => rows.push({ phan: pi, loai: p.loai, so: k + 1, da: ds.map(v => v.phan[pi].cau[k].da || ""), goc: ds.map(v => v.phan[pi].cau[k].goc) })));
		return rows;
	}
	const PHAN_LA = ["I", "II", "III", "IV", "V"];
	function docxDapAn(ds, tieuDe) {
		const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"', rows = bangDapAn(ds);
		const o = (t, b, w) => '<w:tc><w:tcPr><w:tcW w:w="' + (w || 900) + '" w:type="dxa"/>' + (b ? '<w:shd w:val="clear" w:color="auto" w:fill="E8EEF6"/>' : "") + '</w:tcPr><w:p><w:pPr><w:spacing w:before="20" w:after="20"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr>' + (b ? "<w:b/>" : "") + '<w:sz w:val="22"/></w:rPr>' + taoT(t) + "</w:r></w:p></w:tc>";
		const vien = '<w:tblBorders>' + ["top", "left", "bottom", "right", "insideH", "insideV"].map(k => '<w:' + k + ' w:val="single" w:sz="4" w:space="0" w:color="808080"/>').join("") + "</w:tblBorders>";
		const bang = (hd, rs) => '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:jc w:val="center"/>' + vien + "</w:tblPr><w:tr>" + hd.map(h => o(h, true)).join("") + "</w:tr>" + rs.map(r => "<w:tr>" + r.map((c, j) => o(c, j === 0)).join("") + "</w:tr>").join("") + "</w:tbl>";
		const P = (t, b, jc) => '<w:p><w:pPr><w:spacing w:before="120" w:after="80"/>' + (jc ? '<w:jc w:val="' + jc + '"/>' : "") + '</w:pPr><w:r><w:rPr>' + (b ? "<w:b/>" : "") + '<w:sz w:val="' + (b ? 28 : 22) + '"/></w:rPr>' + taoT(t) + "</w:r></w:p>";
		let body = P(tieuDe || "BẢNG ĐÁP ÁN TỔNG HỢP", true, "center");
		const nhom = {}; rows.forEach(r => { (nhom[r.phan] = nhom[r.phan] || []).push(r); });
		Object.keys(nhom).forEach(pi => { const rs = nhom[pi], L = rs[0].loai; body += P("PHẦN " + PHAN_LA[pi] + " · " + { tn: "Trắc nghiệm nhiều phương án", ds: "Đúng/Sai", tln: "Trả lời ngắn", tl: "Tự luận" }[L], true); body += bang(["Câu"].concat(ds.map(v => "Mã " + v.ma)), rs.map(r => [String(r.so)].concat(r.da.map(d => d || "—")))); });
		body += P("BẢNG ĐỐI CHIẾU: câu của mỗi mã đề ← câu gốc", true);
		Object.keys(nhom).forEach(pi => { const rs = nhom[pi]; body += P("PHẦN " + PHAN_LA[pi], true); body += bang(["Câu"].concat(ds.map(v => "Mã " + v.ma)), rs.map(r => [String(r.so)].concat(r.goc.map(g => "gốc " + g)))); });
		const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + W + '><w:body>' + body + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>';
		return {
			"[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
			"_rels/.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
			"word/document.xml": doc
		};
	}
	function texDapAn(ds, tieuDe) {
		const rows = bangDapAn(ds), nhom = {}; rows.forEach(r => { (nhom[r.phan] = nhom[r.phan] || []).push(r); });
		const e = s => String(s).replace(/[\\{}$&#%_^~]/g, c => "\\" + c);
		let t = "% KMath · Trộn đề thi — bảng đáp án tổng hợp (biên dịch bằng pdflatex)\n\\documentclass[12pt,a4paper]{article}\n\\usepackage[utf8]{vietnam}\n\\usepackage[margin=1.8cm]{geometry}\n\\usepackage{array,longtable}\n\\begin{document}\n\\begin{center}\\textbf{\\large " + e(tieuDe || "BẢNG ĐÁP ÁN TỔNG HỢP") + "}\\end{center}\n";
		const bang = (rs, f) => "\\begin{center}\\begin{longtable}{|c|" + ds.map(() => "c|").join("") + "}\\hline\n\\textbf{Câu} & " + ds.map(v => "\\textbf{" + v.ma + "}").join(" & ") + "\\\\\\hline\n" + rs.map(r => r.so + " & " + f(r).join(" & ") + "\\\\\\hline\n").join("") + "\\end{longtable}\\end{center}\n";
		Object.keys(nhom).forEach(pi => { t += "\\subsection*{PHẦN " + PHAN_LA[pi] + "}\n" + bang(nhom[pi], r => r.da.map(d => e(d || "--"))); });
		t += "\\subsection*{Bảng đối chiếu (câu của mã đề $\\leftarrow$ câu gốc)}\n"; Object.keys(nhom).forEach(pi => { t += "\\paragraph{PHẦN " + PHAN_LA[pi] + "}\n" + bang(nhom[pi], r => r.goc.map(g => String(g))); });
		return t + "\\end{document}\n";
	}

	const API = { boDau, XA, XD, reEsc, conTrucTiep, cuoiPT, docNhom, laChuThich, timLenh, phanTich, tron, xacThuc, sinhMa, kiemMa, rngTuSeed, rngMay, hoanVi, laKhoa, bangDapAn, docxDapAn, texDapAn, demCau, LOAI_TEN, PHAN_LA, _noi: { phanTichTex, tachChoice, tachItemch, docP, xuatP, moCau, moPhuongAn, khoiCap1, chuXml, chuanTex } };
	G.KTronDe = API;
	if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
