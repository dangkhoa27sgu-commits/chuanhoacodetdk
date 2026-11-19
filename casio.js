/* ===== casio.js — window.KCasio: casiovn.sty keycap renderer ===== */


/* ===== KCasio: phím máy tính Casio fx-580VN X — dùng chung cho Bản in, Tạo video, hướng dẫn =====
   Theo casiovn.sty v1.01 (Lê Đình Mẫn): 53 lệnh \onk … \log10k. Một bộ vẽ SVG duy nhất:
   - HTML: KCasio.svg(ten, {h:"1.3em"}) / KCasio.gan(el) (thay mã giữ chỗ bằng phím)
   - Canvas/video: await KCasio.anh(ten, px) → canvas đã vẽ sẵn (SVG → ảnh) */
window.KCasio = (() => {
	// [tên macro, kiểu phím, nhãn, phím tắt viết thường trong lệnh casio:]
	// kiểu: dk = phím viên thuốc tối (ON/MENU/MODE/OPTN), sh = SHIFT, al = ALPHA, cam = AC/DEL, kh = phím khoa học tối, dp = phím mũi tên, so = phím số/phép tính sáng
	const BANG = [
		["onk", "dk", "t:ON", "ON"], ["ack", "cam", "t:AC", "AC"], ["shiftk", "sh", "t:SHIFT", "SHIFT"], ["alphak", "al", "t:ALPHA", "ALPHA"],
		["menuk", "dk", "t:MENU", "MENU"], ["modek", "dk", "t:MODE", "MODE SETUP"], ["optnk", "dk", "t:OPTN", "OPTN"], ["delk", "cam", "t:DEL", "DEL XOA"],
		["calck", "kh", "t:CALC", "CALC"], ["engk", "kh", "t:ENG", "ENG"], ["stok", "kh", "t:STO", "STO"], ["rclk", "kh", "t:RCL", "RCL"],
		["abovek", "dp", "up", "UP ▲ LEN"], ["belowk", "dp", "down", "DOWN ▼ XUONG"], ["leftk", "dp", "left", "LEFT ◀ TRAI"], ["rightk", "dp", "right", "RIGHT ▶ PHAI"],
		["intk", "kh", "int", "INT ∫ TICHPHAN"], ["vark", "kh", "x", "X VAR"], ["dfrack", "kh", "frac", "FRAC PHANSO"], ["sqrtk", "kh", "sqrt", "SQRT CAN √"],
		["exp2k", "kh", "x2", "X2 X^2 ²"], ["expk", "kh", "xpow", "^ POW X^ MU"], ["inversek", "kh", "xinv", "X-1 X^-1 INV NGHICHDAO"], ["logk", "kh", "logb", "LOGAB LOG_ LOGB"],
		["log10k", "kh", "t:log", "LOG LOG10"], ["lnk", "kh", "t:ln", "LN"], ["sink", "kh", "t:sin", "SIN"], ["cosk", "kh", "t:cos", "COS"], ["tank", "kh", "t:tan", "TAN"],
		["circk", "kh", "dms", "DMS ° DO"], ["signk", "kh", "t:(−)", "(-) (−) NEG AM"], ["openk", "kh", "t:(", "( MONGOAC"], ["closek", "kh", "t:)", ") DONGNGOAC"],
		["convertk", "kh", "sd", "SD S<=>D S⇔D S<>D"], ["mul10expk", "so", "x10", "X10 EXP ×10^X *10^X X10^X"], ["ansk", "so", "t:Ans", "ANS"], ["morerememberk", "kh", "t:M+", "M+ MPLUS"],
		["addk", "so", "t:+", "+ CONG"], ["subk", "so", "t:−", "- − TRU"], ["mulk", "so", "t:×", "* × NHAN"], ["divk", "so", "t:÷", "/ ÷ : CHIA"], ["equalk", "so", "t:=", "= BANG"], ["dotk", "so", "t:.", ". CHAM"],
		["zerok", "so", "t:0", "0"], ["onek", "so", "t:1", "1"], ["twok", "so", "t:2", "2"], ["threek", "so", "t:3", "3"], ["fourk", "so", "t:4", "4"],
		["fivek", "so", "t:5", "5"], ["sixk", "so", "t:6", "6"], ["sevenk", "so", "t:7", "7"], ["eightk", "so", "t:8", "8"], ["ninek", "so", "t:9", "9"]
	];
	const MAP = {}, TAT = {};
	BANG.forEach(([ten, loai, nhan, tat]) => { MAP[ten] = { ten, loai, nhan }; tat.split(" ").forEach(k => { TAT[k.toUpperCase()] = ten; }); });
	// tên dài trước (\exp2k trước \expk, \log10k trước \logk, \mul10expk…), không ăn tiếp chữ cái phía sau
	const TEN = Object.keys(MAP).sort((a, b) => b.length - a.length);
	const RE = new RegExp("\\\\(" + TEN.join("|") + ")(?![A-Za-z])", "g");
	const MAU = {
		dk: { tren: "#5b6372", duoi: "#2c313b", vien: "#1a1e25", chu: "#eef2f7", day: "#15181e", r: 20, w: 70 },
		sh: { tren: "#3a3f49", duoi: "#23272e", vien: "#d9a400", chu: "#ffc81f", day: "#15181e", r: 20, w: 70 },
		al: { tren: "#3a3f49", duoi: "#23272e", vien: "#d9367f", chu: "#ff5aa8", day: "#15181e", r: 20, w: 70 },
		cam: { tren: "#ff8a4c", duoi: "#e2561f", vien: "#a53b10", chu: "#ffffff", day: "#8a3010", r: 9, w: 60 },
		kh: { tren: "#4a505b", duoi: "#262a32", vien: "#16191f", chu: "#ffffff", day: "#101317", r: 9, w: 58 },
		dp: { tren: "#4a505b", duoi: "#262a32", vien: "#16191f", chu: "#ffffff", day: "#101317", r: 12, w: 46 },
		so: { tren: "#ffffff", duoi: "#d4dae3", vien: "#9aa4b2", chu: "#151b26", day: "#7c8695", r: 9, w: 58 }
	};
	const F = "Arial,Helvetica,'Segoe UI',sans-serif", FS = "'Times New Roman',Times,serif";
	const chu = (x, y, s, c, fs, them) => '<text x="' + x + '" y="' + y + '" fill="' + c + '" font-family="' + (them && them.serif ? FS : F) + '" font-size="' + fs + '" font-weight="' + (them && them.nhe ? 400 : 700) + '"' + (them && them.ng ? ' font-style="italic"' : "") + ' text-anchor="' + ((them && them.neo) || "middle") + '" dominant-baseline="central">' + s + "</text>";
	const o = (x, y, a, c) => '<rect x="' + x + '" y="' + y + '" width="' + a + '" height="' + a + '" fill="none" stroke="' + c + '" stroke-width="1.3" rx="0.6"/>';
	function nhan(spec, W, c, loai) {
		const cx = W / 2, cy = 20;
		if (spec.startsWith("t:")) { const s = spec.slice(2), fs = loai === "so" ? (s.length > 2 ? 15 : 21) : (loai === "dk" || loai === "sh" || loai === "al") ? 12.5 : (s.length > 3 ? 12.5 : s.length > 2 ? 15 : 17); return chu(cx, cy + 0.5, s.replace(/&/g, "&amp;").replace(/</g, "&lt;"), c, fs); }
		const net = 'stroke="' + c + '" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"';
		switch (spec) {
			case "up": return '<path d="M' + cx + " " + (cy - 7) + " L" + (cx + 8) + " " + (cy + 5) + " L" + (cx - 8) + " " + (cy + 5) + 'Z" fill="' + c + '"/>';
			case "down": return '<path d="M' + cx + " " + (cy + 7) + " L" + (cx + 8) + " " + (cy - 5) + " L" + (cx - 8) + " " + (cy - 5) + 'Z" fill="' + c + '"/>';
			case "left": return '<path d="M' + (cx - 7) + " " + cy + " L" + (cx + 5) + " " + (cy - 8) + " L" + (cx + 5) + " " + (cy + 8) + 'Z" fill="' + c + '"/>';
			case "right": return '<path d="M' + (cx + 7) + " " + cy + " L" + (cx - 5) + " " + (cy - 8) + " L" + (cx - 5) + " " + (cy + 8) + 'Z" fill="' + c + '"/>';
			case "int": return '<path d="M' + (cx + 1) + " 9 C" + (cx - 3) + " 6 " + (cx - 4) + " 12 " + (cx - 4) + " 20 S" + (cx - 5) + " 34 " + (cx - 9) + ' 31" ' + net + "/>" + o(cx + 3, 6, 5.5, c) + o(cx - 2, 27, 5.5, c);
			case "x": return chu(cx, cy, "x", c, 22, { ng: 1, serif: 1, nhe: 1 });
			case "frac": return o(cx - 5, 7, 10, c) + '<line x1="' + (cx - 9) + '" y1="20.5" x2="' + (cx + 9) + '" y2="20.5" stroke="' + c + '" stroke-width="2"/>' + o(cx - 5, 24, 10, c);
			case "sqrt": return '<path d="M' + (cx - 14) + " 22 L" + (cx - 10) + " 20 L" + (cx - 6) + " 30 L" + (cx - 1) + " 9 L" + (cx + 14) + ' 9" ' + net + "/>" + o(cx + 1.5, 13, 10, c);
			case "x2": return chu(cx - 3, cy + 2, "x", c, 21, { ng: 1, serif: 1, nhe: 1 }) + chu(cx + 7, cy - 6, "2", c, 11);
			case "xpow": return chu(cx - 4, cy + 2, "x", c, 21, { ng: 1, serif: 1, nhe: 1 }) + o(cx + 4, 6.5, 7, c);
			case "xinv": return chu(cx - 6, cy + 2, "x", c, 21, { ng: 1, serif: 1, nhe: 1 }) + chu(cx + 7, cy - 6, "−1", c, 10.5);
			case "logb": return chu(cx - 6, cy - 1, "log", c, 13.5) + o(cx + 7.5, 22, 6, c) + o(cx + 14.5, 14, 7, c);
			case "dms": return '<circle cx="' + (cx - 9) + '" cy="15" r="3" fill="none" stroke="' + c + '" stroke-width="1.8"/><path d="M' + (cx - 1) + " 11 L" + (cx - 3) + " 19 M" + (cx + 6) + " 11 L" + (cx + 4) + " 19 M" + (cx + 10) + " 11 L" + (cx + 8) + ' 19" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>';
			case "sd": return chu(cx - 14, cy + 0.5, "S", c, 14) + '<path d="M' + (cx - 7) + " " + (cy - 2.5) + " H" + (cx + 7) + " M" + (cx - 7) + " " + (cy + 2.5) + " H" + (cx + 7) + " M" + (cx - 4) + " " + (cy - 6) + " L" + (cx - 8) + " " + cy + " L" + (cx - 4) + " " + (cy + 6) + " M" + (cx + 4) + " " + (cy - 6) + " L" + (cx + 8) + " " + cy + " L" + (cx + 4) + " " + (cy + 6) + '" stroke="' + c + '" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' + chu(cx + 14, cy + 0.5, "D", c, 14);
			case "x10": return chu(cx - 4, cy + 2, "×10", c, 14) + chu(cx + 15, cy - 6, "x", c, 12, { ng: 1, serif: 1 });
		}
		return chu(cx, cy, "?", c, 16);
	}
	const rong = ten => { const d = MAP[ten]; return d ? MAU[d.loai].w / 44 : 1; };
	// h: chiều cao (px hoặc "1.3em"); trả chuỗi <svg>
	function svg(ten, opt) {
		const d = MAP[ten]; if (!d) return ""; const m = MAU[d.loai], W = m.w, h = (opt && opt.h) || 40;
		const so = typeof h === "number", hv = so ? h : parseFloat(h), dv = so ? "" : String(h).replace(/[\d.]+/, ""), w = (hv * W / 44).toFixed(3) + dv, id = "kcg" + d.loai;
		return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' 44" width="' + w + '" height="' + (so ? hv : hv + dv) + '" role="img" aria-label="' + ten + '">' +
			'<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + m.tren + '"/><stop offset="1" stop-color="' + m.duoi + '"/></linearGradient></defs>' +
			'<rect x="1" y="4.5" width="' + (W - 2) + '" height="38.5" rx="' + m.r + '" fill="' + m.day + '"/>' +
			'<rect x="1" y="1" width="' + (W - 2) + '" height="38" rx="' + m.r + '" fill="url(#' + id + ')" stroke="' + m.vien + '" stroke-width="' + (d.loai === "sh" || d.loai === "al" ? 1.6 : 1) + '"/>' +
			'<rect x="' + (m.r > 12 ? 10 : 4) + '" y="2.6" width="' + (W - (m.r > 12 ? 20 : 8)) + '" height="9" rx="4.5" fill="#fff" opacity="' + (d.loai === "so" ? 0.55 : 0.1) + '"/>' +
			nhan(d.nhan, W, m.chu, d.loai) + "</svg>";
	}
	const html = (ten, h) => '<span class="kcPhim" title="\\' + ten + '">' + svg(ten, { h: h || "1.6em" }) + "</span>";
	// ảnh cho canvas: vẽ SVG ra canvas đúng kích thước pixel (cache)
	const KHO = new Map();
	function anh(ten, px) {
		const k = ten + "|" + Math.round(px); if (KHO.has(k)) return KHO.get(k);
		const p = (async () => {
			const tl = 2, h = Math.max(8, Math.round(px)), w = Math.round(h * rong(ten)), im = new Image();
			im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg(ten, { h: h * tl }));
			await im.decode();
			const c = document.createElement("canvas"); c.width = w * tl; c.height = h * tl; c.getContext("2d").drawImage(im, 0, 0, w * tl, h * tl); c.wCss = w; c.hCss = h; return c;
		})();
		KHO.set(k, p); return p;
	}
	// đọc chuỗi phím: macro casiovn.sty và/hoặc phím tắt (MENU 9 2 2 =, SHIFT CALC, FRAC, SQRT, x2, ^, UP…), ngăn bằng dấu cách hoặc dấu phẩy
	function tach(s) {
		const ds = [], loi = [];
		String(s || "").replace(RE, " \\$1 ").replace(/,/g, " ").split(/\s+/).filter(Boolean).forEach(tk => {
			if (tk[0] === "\\") { const t = tk.slice(1).replace(/[{}]/g, ""); if (MAP[t]) ds.push(t); else loi.push(tk); return; }
			const T = tk.toUpperCase(); if (TAT[T]) { ds.push(TAT[T]); return; }
			if (/^\d+(\.\d+)?$/.test(tk)) { [...tk].forEach(ch => ds.push(ch === "." ? "dotk" : TAT[ch])); return; }
			loi.push(tk);
		});
		return { ds, loi };
	}
	// HTML (Bản in): thay macro NGOÀI công thức bằng mã giữ chỗ chỉ gồm chữ/số (đi qua bộ dàn trang an toàn), rồi gan() đổi thành phím
	function thayChu(src) {
		let ra = "", i = 0; const s = String(src || ""), re = /\$\$[\s\S]*?\$\$|\$[^$]*\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g; let m;
		const doi = z => z.replace(RE, (_, t) => "ZZCK" + t + "KCZZ");
		while ((m = re.exec(s))) { ra += doi(s.slice(i, m.index)) + m[0]; i = m.index + m[0].length; }
		return ra + doi(s.slice(i));
	}
	function gan(goc, h) {
		const w = document.createTreeWalker(goc, NodeFilter.SHOW_TEXT), ds = []; let n;
		while ((n = w.nextNode())) if (/ZZCK[a-z0-9]+KCZZ/.test(n.nodeValue)) ds.push(n);
		ds.forEach(n => { const sp = document.createElement("span"); sp.innerHTML = n.nodeValue.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])).replace(/ZZCK([a-z0-9]+)KCZZ/g, (z, t) => MAP[t] ? html(t, h) : z); n.replaceWith(...sp.childNodes); });
		return ds.length;
	}
	// trong công thức (KaTeX / TeX): hiện thành ô chữ — tránh lỗi "lệnh lạ"
	const NHAN_CHU = { up: "▲", down: "▼", left: "◀", right: "▶", int: "\\int", x: "x", frac: "\\frac{\\square}{\\square}", sqrt: "\\sqrt{\\square}", x2: "x^2", xpow: "x^{\\square}", xinv: "x^{-1}", logb: "\\log_{\\square}\\square", dms: "{}^{\\circ}\\,'\\,''", sd: "S\\Leftrightarrow D", x10: "\\times 10^{x}" };
	const TEX = {}; Object.values(MAP).forEach(d => { const s = d.nhan.startsWith("t:") ? "\\text{" + d.nhan.slice(2).replace(/−/g, "-") + "}" : (/^(up|down|left|right)$/.test(d.nhan) ? "\\text{" + NHAN_CHU[d.nhan] + "}" : NHAN_CHU[d.nhan]); TEX["\\" + d.ten] = "\\boxed{" + s + "}"; });
	const texThay = s => String(s || "").replace(RE, (_, t) => TEX["\\" + t] + " ");
	return { BANG, MAP, TAT, RE, svg, html, anh, rong, tach, thayChu, gan, TEX, texThay, so: BANG.length };
})();
