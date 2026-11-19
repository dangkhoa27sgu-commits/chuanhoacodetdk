/* ===== kpado.js — K-Pado UI: Giai toan, Anh->TikZ, Cau tuong tu, Ban in A4 ===== */


/* ===== K-Pado: giao diện (gọi backend qua window.KFB.kpado — cầu nối trong module Firebase) ===== */
function khoiDongKPado() {
	const $p = id => document.getElementById(id);
	const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
	const tt = (m, loi) => { const e = $p("kpTT"); e.textContent = m; e.classList.toggle("loi", !!loi); };
	// chờ module Firebase + đăng nhập sẵn sàng (trang có thể mở thẳng tab K-Pado trước khi đăng nhập xong)
	const sanSang = async () => { for (let i = 0; i < 100; i++) { if (window.KFB && window.KFB.kpado && window.KFB.uid && window.KFB.uid()) return; await new Promise(r => setTimeout(r, 200)); } throw new Error("Chưa đăng nhập xong — tải lại trang."); };
	const goi = async (ten, data) => {
		await sanSang();
		try { return await window.KFB.kpado(ten, data); }
		catch (e) {
			if (!/quá tải|503|high demand/i.test(e.message || "")) throw e;
			// Google quá tải mọi model → tự đợi 30 giây rồi thử lại 1 lần (lượt đã được hoàn lại)
			for (let g = 30; g > 0; g--) { tt("Máy chủ Google đang quá tải — K-Pado tự thử lại sau " + g + " giây…"); await new Promise(ok => setTimeout(ok, 1000)); }
			tt("K-Pado đang thử lại…");
			return window.KFB.kpado(ten, data);
		}
	};
	try { window.KFB && window.KFB.kpadoPing && window.KFB.kpadoPing(); } catch (e) { }
	// Lõi câu hỏi (dàn trang, cấu trúc ID, bảng mã) nằm ở khối script chính — lấy qua window.TDKMod.QB, không cần mở tab Ngân hàng
	const layQB = async () => { for (let i = 0; i < 60; i++) { const q = window.TDKMod && window.TDKMod.QB; if (q && q.tachEx && q.xemTruoc) return q; await new Promise(ok => setTimeout(ok, 150)); } return null; };
	if (window.KFB) window.KFB.kpadoThuLai = n => tt("Kết nối chậm — K-Pado tự thử lại (lần " + n + "/2)…");
	const capLuot = r => { if (!r || r.han == null) return; const e = $p("kpLuot"); e.textContent = "Gói " + ({ thuong: "Thường", vip: "VIP", admin: "Quản trị" }[r.goi] || r.goi) + " · còn " + (r.goi === "admin" ? "∞" : r.conLai + "/" + r.han) + " lượt hôm nay"; e.classList.toggle("het", r.goi !== "admin" && r.conLai <= 0); };
	$p("kpLuot").textContent = "Đang kiểm tra lượt…"; $p("kpLuot").classList.remove("het");
	Promise.race([goi("kpadoTrangThai", {}), new Promise((_, no) => setTimeout(() => no(new Error("Máy chủ K-Pado không phản hồi.")), 25000))])
		.then(r => { if (!r || r.han == null) throw new Error("Máy chủ trả dữ liệu lạ: " + JSON.stringify(r).slice(0, 80)); capLuot(r); })
		.catch(e => { $p("kpLuot").textContent = "⚠ " + (e.message || "Không xem được lượt"); $p("kpLuot").title = e.message || ""; $p("kpLuot").classList.add("het"); });
	if (khoiDongKPado.daMo) return;
	khoiDongKPado.daMo = true;

	let che = "math", ketQua = "", tho = "", anh = null, anhVe = null, xem = "de";
	// --- đổi chế độ ---
	$p("kpChe").addEventListener("click", e => {
		const b = e.target.closest("button"); if (!b) return; che = b.dataset.che;
		$p("kpChe").querySelectorAll("button").forEach(x => x.setAttribute("aria-selected", x === b));
		document.querySelectorAll("#tabKPado [data-o]").forEach(o => o.hidden = o.dataset.o !== che);
		$p("kpLGHop").hidden = che === "vision";
		$p("kpChay").textContent = che === "vision" ? "✦ Dựng TikZ" : che === "similar" ? "✦ Sinh câu tương tự" : "✦ Hỏi K-Pado";
	});
	// --- ảnh: chọn / kéo thả / dán; thu về cạnh dài 1600px ---
	// phủ lưới toạ độ đỏ (gốc dưới-trái, rộng 12 đơn vị) để AI đọc toạ độ chính xác
	function phuLuoi(c) {
		const W = 12, k = c.width / W, H = Math.round(c.height / k * 100) / 100, o = document.createElement("canvas");
		o.width = c.width; o.height = c.height; const g = o.getContext("2d"); g.drawImage(c, 0, 0);
		const fs = Math.max(10, Math.round(k * 0.2));
		g.font = "bold " + fs + "px sans-serif"; g.lineJoin = "round";
		for (let x = 0; x <= W; x++) { const X = Math.round(x * k); g.strokeStyle = x % 5 ? "rgba(255,40,40,.28)" : "rgba(255,40,40,.5)"; g.lineWidth = x % 5 ? 0.8 : 1.2; g.beginPath(); g.moveTo(X, 0); g.lineTo(X, c.height); g.stroke(); }
		for (let y = 0; y <= H; y++) { const Y = Math.round(c.height - y * k); g.strokeStyle = y % 5 ? "rgba(255,40,40,.28)" : "rgba(255,40,40,.5)"; g.lineWidth = y % 5 ? 0.8 : 1.2; g.beginPath(); g.moveTo(0, Y); g.lineTo(c.width, Y); g.stroke(); }
		const chu = (t, X, Y) => { g.lineWidth = 3; g.strokeStyle = "#fff"; g.strokeText(t, X, Y); g.fillStyle = "#E00000"; g.fillText(t, X, Y); };
		for (let x = 1; x < W; x++) chu(String(x), x * k + 2, c.height - 3);
		for (let y = 1; y < H; y++) chu(String(y), 2, c.height - y * k - 2);
		return { W, H, luoi: o.toDataURL("image/jpeg", 0.82).split(",")[1] };
	}
	// đồ nét (Potrace có sẵn trong bộ luật) các minh hoạ người/vật AI đã khoanh vùng → TikZ thuần, đặt đúng chỗ bằng scope
	const W2KP = () => { const T = window.__TDK || window.TDK; return T && T._w2t; };
	const so2 = v => String(Math.round(v * 100) / 100);
	function docTranh(tho) { const m = /%\s*KPADO-TRANH:\s*(\[[^\n]*\])/.exec(String(tho || "")); if (!m) return []; try { const a = JSON.parse(m[1]); return Array.isArray(a) ? a.filter(o => o && Array.isArray(o.hop) && o.hop.length === 4 && o.hop.every(v => isFinite(+v))) : []; } catch (e) { return []; } }
	const boDongTranh = ma => String(ma || "").replace(/^[ \t]*%\s*KPADO-TRANH:.*\n?/m, "");
	// bỏ các mảnh nét chạm mép khung (trục, nhãn lọt vào) — chỉ giữ hình chính lớn nhất và các chi tiết nằm trọn bên trong
	function lamSachVien(cc) {
		const w = cc.width, h = cc.height, g = cc.getContext("2d"), im = g.getImageData(0, 0, w, h), d = im.data, n = w * h, nhan = new Int32Array(n).fill(-1);
		const toi = i => d[4 * i] * .3 + d[4 * i + 1] * .59 + d[4 * i + 2] * .11 < 150, cum = [];
		for (let i = 0; i < n; i++) {
			if (nhan[i] >= 0 || !toi(i)) continue;
			const id = cum.length, st = [i], ds = []; nhan[i] = id; let cham = false;
			while (st.length) { const q = st.pop(), x = q % w, y = (q / w) | 0; ds.push(q); if (!x || !y || x === w - 1 || y === h - 1) cham = true;
				for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const t = Y * w + X; if (nhan[t] < 0 && toi(t)) { nhan[t] = id; st.push(t); } } }
			cum.push({ ds, cham });
		}
		if (cum.length < 2) return;
		const lon = cum.reduce((x, y) => y.ds.length > x.ds.length ? y : x);
		cum.forEach(c => { if (c !== lon && c.cham) c.ds.forEach(q => { d[4 * q] = d[4 * q + 1] = d[4 * q + 2] = 255; }); });
		g.putImageData(im, 0, 0);
	}
	async function doNetTranh(ds, a) {
		const W2 = W2KP(); if (!W2 || typeof W2.doPotrace !== "function" || !a || !a.c) return [];
		const k = a.c.width / a.W, ra = [];
		for (const o of ds.slice(0, 6)) {
			let [x1, y1, x2, y2] = o.hop.map(Number); if (x1 > x2) [x1, x2] = [x2, x1]; if (y1 > y2) [y1, y2] = [y2, y1];
			x1 = Math.max(0, x1 - 0.08); y1 = Math.max(0, y1 - 0.08); x2 = Math.min(a.W, x2 + 0.08); y2 = Math.min(a.H, y2 + 0.08);
			const px = Math.round(x1 * k), py = Math.round((a.H - y2) * k), pw = Math.round((x2 - x1) * k), ph = Math.round((y2 - y1) * k);
			if (pw < 8 || ph < 8) continue;
			const cc = document.createElement("canvas"); cc.width = pw; cc.height = ph; const g = cc.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, pw, ph); g.drawImage(a.c, px, py, pw, ph, 0, 0, pw, ph); lamSachVien(cc);
			try {
				const v = await W2.doPotrace(cc, { wCm: x2 - x1, soMau: 2 });
				if (v && v.lenh && v.lenh.length) ra.push("% ---- " + String(o.ten || "minh hoạ").replace(/[\n%]/g, " ") + " (đồ nét tự động từ ảnh) ----\n\\begin{scope}[shift={(" + so2(x1) + "," + so2(y1) + ")}]\n" + v.lenh.join("\n") + "\n\\end{scope}");
			} catch (e) { }
		}
		return ra;
	}
	const chenTruocKet = (ma, them) => { const i = ma.lastIndexOf("\\end{tikzpicture}"); return i < 0 ? ma : ma.slice(0, i) + them.join("\n") + "\n" + ma.slice(i); };
	async function anhB64(url, max) { const im = new Image(); im.src = url; await im.decode(); const k = Math.min(1, (max || 1024) / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.85).split(",")[1]; }
	function nhanAnh(f) {
		if (!f || !/^image\/(png|jpe?g|webp)$/.test(f.type)) { tt("Chỉ nhận ảnh PNG, JPG, WEBP.", true); return; }
		const img = new Image(), url = URL.createObjectURL(f);
		img.onload = () => {
			const coDan = (nguon, max) => { const k = Math.min(1, max / Math.max(nguon.width, nguon.height)), o = document.createElement("canvas"); o.width = Math.round(nguon.width * k); o.height = Math.round(nguon.height * k); const g = o.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, o.width, o.height); g.imageSmoothingQuality = "high"; g.drawImage(nguon, 0, 0, o.width, o.height); return o; };
			const c = coDan(img, 2400), nho = coDan(c, 1024), L = phuLuoi(nho), d = nho.toDataURL("image/jpeg", 0.82);
			anh = { data: L.luoi, mime: "image/jpeg", c, W: L.W, H: L.H };
			$p("kpAnhXem").src = d; $p("kpAnhXem").hidden = false; $p("kpThaChu").hidden = true; URL.revokeObjectURL(url);
			tt("Ảnh " + nho.width + "×" + nho.height + " sẵn sàng (gửi AI ~" + Math.round(L.luoi.length * 0.75 / 1024) + " KB).");
		};
		img.src = url;
	}
	$p("kpAnh").addEventListener("change", e => nhanAnh(e.target.files[0]));
	const tha = $p("kpTha");
	tha.addEventListener("dragover", e => { e.preventDefault(); tha.classList.add("keo"); });
	tha.addEventListener("dragleave", () => tha.classList.remove("keo"));
	tha.addEventListener("drop", e => { e.preventDefault(); tha.classList.remove("keo"); nhanAnh(e.dataTransfer.files[0]); });
	document.addEventListener("paste", e => {
		if ($p("tabKPado").hidden || che !== "vision") return;
		const f = [...(e.clipboardData || {}).files || []].find(x => x.type.startsWith("image/")); if (f) { e.preventDefault(); nhanAnh(f); }
	});
	// --- lấy câu mẫu theo ID từ Ngân hàng (IndexedDB trên máy) ---
	$p("kpTimID").addEventListener("click", async () => {
		const id = $p("kpID").value.trim().replace(/^%?\[|\]$/g, ""); if (!id) return;
		try {
			const QB = await layQB(); if (!QB) { tt("Bộ câu hỏi chưa tải xong — thử lại sau vài giây.", true); return; }
			const ds = (await QB.dbTatCa()) || [], c = ds.filter(r => (r.id || "").toUpperCase() === id.toUpperCase());
			if (!c.length) { tt("Ngân hàng không có câu ID " + id + ".", true); return; }
			$p("kpMau").value = c[Math.floor(Math.random() * c.length)].raw; tt("Đã lấy 1/" + c.length + " câu có ID " + id + ".");
		} catch (e) { tt("Không đọc được Ngân hàng: " + (e.message || e), true); }
	});
	// --- Giải toán: cất hình TikZ gốc thành %%TIKZ_GOC_n%% trước khi gửi, trả lại nguyên văn sau khi giải ---
	const RE_TIKZ = /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g;
	function catHinh(de) { const ds = []; const t = de.replace(RE_TIKZ, m => { ds.push(m); return "%%TIKZ_GOC_" + ds.length + "%%"; }); return { t, ds }; }
	function traHinh(ma, ds) {
		let ra = String(ma || ""); const thieu = [];
		ds.forEach((h, i) => { const re = new RegExp("%*[ \\t]*TIKZ_GOC_" + (i + 1) + "(?![0-9])[ \\t]*%*"); if (re.test(ra)) ra = ra.replace(re, () => h); else thieu.push(h); });
		if (thieu.length) {             // AI làm rơi chỗ giữ hình → đặt lại hình ngay trước lời giải / phương án
			const khoi = "\\begin{center}\n" + thieu.join("\n") + "\n\\end{center}\n";
			const vt = ra.search(/\\(choice|choiceTF|shortans|loigiai)\b/), vt2 = ra.indexOf("\\end{ex}");
			ra = vt >= 0 ? ra.slice(0, vt) + khoi + ra.slice(vt) : vt2 >= 0 ? ra.slice(0, vt2) + khoi + ra.slice(vt2) : ra + "\n" + khoi;
		}
		return ra;
	}
	const docJSONKP = t => { t = String(t || "").replace(/```json|```/g, ""); const a = t.indexOf("["), b = t.lastIndexOf("]"); if (a < 0 || b < a) throw new Error("AI trả lời không đúng dạng"); return JSON.parse(t.slice(a, b + 1)); };
	// --- Hậu xử lý ex_test cố định (không phụ thuộc AI): \par\shortans[oly]{…} trước \loigiai, bỏ \\ thừa, \cdot, \lq\lq…\rq\rq ---
	function timNgoac(s, i) { let d = 0; for (let k = i; k < s.length; k++) { const c = s[k]; if (c === "\\") { k++; continue; } if (c === "{") d++; else if (c === "}" && --d === 0) return k; } return -1; }
	function chuanExTest(ma) {
		const bao = { doiShortans: 0, doiViTri: 0, botXuongDong: 0, bang: 0 };
		let ra = String(ma || "");
		// mọi \shortans → \shortans[oly]
		ra = ra.replace(/\\shortans\s*\[[^\]]*\]/g, m => { if (m !== "\\shortans[oly]") bao.doiShortans++; return "\\shortans[oly]"; })
			.replace(/\\shortans(?=\s*\{)/g, (m, i, s) => s.slice(i, i + 14) === "\\shortans[oly]" ? m : (bao.doiShortans++, "\\shortans[oly]"));
		ra = ra.replace(/\\begin\{ex\}[\s\S]*?\\end\{ex\}/g, ex => {
			// 1) đáp án trả lời ngắn: có \par, số thập phân dùng {,}, đứng TRƯỚC \loigiai
			const iS = ex.search(/\\shortans\[oly\]\s*\{/);
			if (iS >= 0) {
				const iMo = ex.indexOf("{", iS + 13), j = timNgoac(ex, iMo);
				if (j > 0) {
					const mPar = ex.slice(0, iS).match(/\\par\s*$/), a = mPar ? iS - mPar[0].length : iS;
					const v = ex.slice(iMo + 1, j).trim().replace(/(\d)\s*(?:\{,\}|,|\.)\s*(\d)/g, "$1{,}$2");
					const khoi = "\\par\\shortans[oly]{" + v + "}", iL = ex.search(/\\loigiai\s*\{/);
					if (iL >= 0 && a > iL) {
						let b = j + 1; while (b < ex.length && /[ \t]/.test(ex[b])) b++; if (ex[b] === "\n") b++;
						ex = ex.slice(0, a).replace(/[ \t]*$/, "") + ex.slice(b);
						ex = ex.slice(0, iL) + khoi + "\n" + ex.slice(iL); bao.doiViTri++;
					} else ex = ex.slice(0, a) + khoi + ex.slice(j + 1);
				}
			}
			// 2) trong \loigiai: bỏ \\ thừa (sau \], trước/sau danh sách, cuối khối, lặp \\ \\), đếm bảng tabular
			const iL = ex.search(/\\loigiai\s*\{/);
			if (iL >= 0) {
				const iMo = ex.indexOf("{", iL), k = timNgoac(ex, iMo);
				if (k > 0) {
					let than = ex.slice(iMo + 1, k); const truoc = than;
					bao.bang += (than.match(/\\begin\{tabular\}/g) || []).length;
					than = than.replace(/\\\]\s*\\\\(?!\S)/g, "\\]")
						.replace(/\\\\[ \t]*(\n[ \t]*)?(?=\\begin\{(itemize|enumerate|center|itemchoice)\}|\\\[)/g, "$1")
						.replace(/(\\end\{(itemize|enumerate|center|itemchoice)\})[ \t]*\\\\/g, "$1")
						.replace(/\\\\([ \t]*\n?[ \t]*\\\\)+/g, "\\\\")
						.replace(/^\s*\\\\/, "").replace(/\\\\\s*$/, "");
					if (than !== truoc) { bao.botXuongDong++; ex = ex.slice(0, iMo + 1) + than + ex.slice(k); }
				}
			}
			// 3) phép nhân giữa hai số: \times / * → \cdot ; ngoặc kép → \lq\lq … \rq\rq
			ex = ex.replace(/(\d)\s*\\times\s*(?=\d)/g, "$1 \\cdot ").replace(/([\d)])\s*\*\s*(?=[\d(])/g, "$1 \\cdot ")
				.replace(/``([^`'\n]{1,200}?)''/g, "\\lq\\lq $1\\rq\\rq{}").replace(/“([^”\n]{1,200}?)”/g, "\\lq\\lq $1\\rq\\rq{}")
				.replace(/(^|[\s(])"([^"\n$]{1,200}?)"/g, "$1\\lq\\lq $2\\rq\\rq{}");
			return ex;
		});
		return { ma: ra, bao };
	}
	// --- gán ID tự động theo đúng bảng mã + cấu trúc ID đang dùng ở Gán ID / Ngân hàng ---
	async function ganIDTuDong(ma) {
		const QB = await layQB(); if (!QB) return { ma, n: 0, ly: "bộ câu hỏi chưa tải xong" };
		const ct = QB.docCT(), cay = QB.phanCay(QB.docCay());
		if (!cay.ds.length) return { ma, n: 0, ly: "chưa có bảng mã (mở ⚙ Cấu trúc ID ở tab Gán ID)" };
		const ds = QB.tachEx(ma), can = ds.filter(x => !QB.docID(x.id || "", ct));
		if (!can.length) return { ma, n: 0, ly: "" };
		const goiY = can.map(x => QB.doanDang(x.than, cay)), ung = new Set();
		goiY.forEach(d => (d ? d.top || [] : []).forEach(m => { const [a, b] = m.split("-"); ung.add(a); ung.add(a + "-" + b); ung.add(m); }));
		const bang = (ung.size >= 8 ? cay.ds.filter(x => ung.has(x.ma)) : cay.ds).map(x => x.ma + " | " + x.ten).join("\n").slice(0, 15500);
		const mucMD = Object.keys(ct.muc)[1] || Object.keys(ct.muc)[0] || "H", ketQ = new Map();
		try {
			const r = await goi("kpadoGanID", { bang, muc: Object.entries(ct.muc).map(([k, v]) => k + " = " + v).join("; "), cau: can.map(x => ({ loai: QB.TEN_LOAI_DAI[QB.loai(x.than)], than: QB.boLG(x.than).replace(/%[^\n]*/g, "").replace(RE_TIKZ, "[hình vẽ]").replace(/\s+/g, " ").slice(0, 1100) })) });
			docJSONKP(r.ketQua || r.tho).forEach(z => { const i = (+z.cau || 0) - 1, m = String(z.ma || "").toUpperCase().trim().match(/^([0-9A-Z])([0-9A-Z])([0-9A-Z]+)(?:-([0-9A-Z]+))?(?:-([0-9A-Z]+))?$/); if (can[i] && m) ketQ.set(i, { lop: m[1], mon: m[2], chuong: m[3], bai: m[4] || "", dang: m[5] || "", muc: ct.muc[String(z.muc || "").toUpperCase()] ? String(z.muc).toUpperCase() : mucMD }); });
		} catch (e) { }
		let n = 0, ai = 0;
		can.forEach((x, i) => {                          // AI không trả được → dùng bộ đoán theo từ khoá của KMath
			if (ketQ.has(i)) { ai++; return; }
			const d = goiY[i]; if (d) { const [cm, b, g] = d.ma.split("-"); ketQ.set(i, { lop: cm[0], mon: cm[1], chuong: cm.slice(2), bai: b, dang: g, muc: ct.muc[d.muc] ? d.muc : mucMD }); return; }
			const e = QB.doanChuong(x.than, cay); if (e) ketQ.set(i, { lop: e.ma[0], mon: e.ma[1], chuong: e.ma.slice(2), bai: "", dang: "", muc: mucMD });
		});
		let ra = ma;
		can.map((x, i) => ({ x, p: ketQ.get(i) })).filter(z => z.p).sort((a, b) => b.x.a - a.x.a).forEach(({ x, p }) => {
			const id = QB.taoID(p, ct), dau = "\\begin{" + x.env + "}", o = x.idO || []; let moi;
			if (o.length && /^\s*(m[ãa] ?id|id|\?*|\.{2,}|…|[0-9][A-Z?][0-9A-Z?]*-?[0-9?]*)\s*$/i.test(x.ids[0] || "")) { const z = o[0]; moi = x.raw.slice(0, z.s) + id + x.raw.slice(z.e); }
			else moi = dau + "%[" + id + "]" + x.raw.slice(dau.length);
			ra = ra.slice(0, x.a) + moi + ra.slice(x.b); n++;
		});
		return { ma: ra, n, ai, ly: "" };
	}
	// --- vẽ thử TikZ, lỗi thì nhờ K-Pado sửa (tối đa 2 lần, không tốn lượt) ---
	async function veThuVaSua(ma) {
		if (!window.KFB || !window.KFB.veTikzThu) return { ma, anh: null, tt: "" };
		for (let lan = 0; lan <= 2; lan++) {
			tt(lan ? "Hình lỗi — K-Pado đang sửa (lần " + lan + "/2)…" : "Đang vẽ thử hình…");
			const r = await window.KFB.veTikzThu(ma);
			if (r.ok) return { ma, anh: r.png || r.svg, tt: lan ? "✓ Vẽ được sau " + lan + " lần sửa." : "✓ Vẽ được ngay." };
			if (lan === 2) return { ma, anh: null, tt: "⚠ Vẫn chưa vẽ được: " + String(r.log || "").slice(-200) };
			try { const f = await goi("kpadoSuaTikz", { ma, loi: r.log || "" }); ma = f.ketQua; }
			catch (e) { return { ma, anh: null, tt: "⚠ Không sửa được: " + (e.message || e) }; }
		}
	}
	// --- hiển thị kết quả ---
	async function veKQ() {
		$p("kpKQ").value = ketQua;
		$p("kpTrang").hidden = xem !== "de"; $p("kpKQ").hidden = xem !== "ma";
		if (xem !== "de" || !ketQua) return;
		if (anhVe) { $p("kpTrang").innerHTML = '<div style="text-align:center"><img src="' + anhVe + '" alt="Hình K-Pado vẽ" style="max-width:100%"></div>'; return; }
		const code = /\\begin\{ex\}/.test(ketQua) ? ketQua : "\\begin{ex}\n\\begin{center}\n" + ketQua + "\n\\end{center}\n\\end{ex}";
		const T = $p("kpTrang"); T.classList.add("kpPdf");
		T.innerHTML = '<div class="kpPdfThanh"><button type="button" class="vdNutNho" data-z="-">−</button><span class="kpZoom" id="kpZoom"></span><button type="button" class="vdNutNho" data-z="+">+</button><button type="button" class="vdNutNho" data-z="vua" title="Vừa khung">⤢ Vừa khung</button><button type="button" class="vdNutNho" data-z="in" title="In hoặc lưu thành PDF">🖨 In / Lưu PDF</button></div><div class="kpPdfVung"><div class="kpGiay" id="kpGiay"><p class="kpTrong" style="color:#666">Đang dàn trang…</p></div></div>';
		const G = $p("kpGiay"), QB = await layQB();
		if (!QB) { G.innerHTML = '<p class="kpTrong" style="color:#666">Bộ dàn trang chưa tải xong — bấm lại “📄 Bản in” sau vài giây, hoặc xem thẻ “{ } Mã LaTeX”.</p>'; return; }
		// Bản in chỉ hiện kết quả đã dàn trang: bỏ mọi dòng chú thích % (kể cả %! SỬA TAY, %[ID]); ID được hiện riêng thành nhãn
		let banIn = code.replace(/(^|[^\\])%[^\n]*/g, "$1").replace(/\n{3,}/g, "\n\n");
		if (window.KCasio) banIn = window.KCasio.thayChu(banIn);   // \shiftk… ngoài công thức → mã giữ chỗ, dàn trang xong đổi thành phím
		try { await QB.xemTruoc(G, banIn, { lg: true, gach: true, tieuDe: false }); }
		catch (e) { G.innerHTML = '<p class="kpTrong" style="color:#b91c1c">Không dàn trang được: ' + esc(e.message || e) + ' — xem thẻ “{ } Mã LaTeX”.</p>'; return; }
		if (window.KCasio) window.KCasio.gan(G);
		// ID chỉ là dòng chú thích %[...] trong mã; trên Bản in hiện thành nhãn để kiểm tra
		try { const ct = QB.docCT(), ids = QB.tachEx(code).map(x => QB.docID(x.id || "", ct) ? x.id : ""); G.querySelectorAll("article.cau").forEach((el, i) => { const id = ids[i]; const nh = document.createElement("div"); nh.className = "kpIDNhan" + (id ? "" : " chua"); nh.textContent = id ? "ID: " + id : "Chưa có ID"; el.prepend(nh); }); } catch (e) { }
		datZoom(kpZoom);
	}
	let kpZoom = +(localStorage.getItem("tdk_kp_zoom") || 0) || 0;     // 0 = vừa khung
	function datZoom(z) {
		const G = $p("kpGiay"), V = document.querySelector("#kpTrang .kpPdfVung"); if (!G || !V) return;
		kpZoom = z; try { localStorage.setItem("tdk_kp_zoom", String(z)); } catch (e) { }
		const vua = Math.max(0.4, Math.min(1.6, (V.clientWidth - 24) / 794)), k = z || vua;
		G.style.zoom = k; const n = $p("kpZoom"); if (n) n.textContent = Math.round(k * 100) + "%" + (z ? "" : " (vừa)");
	}
	function inBanIn() {
		const G = $p("kpGiay"); if (!G) return;
		const kieu = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map(x => x.outerHTML).join("\n");
		const f = document.createElement("iframe"); f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"; document.body.appendChild(f);
		const d = f.contentDocument; d.open();
		d.write('<!doctype html><html><head><meta charset="utf-8"><title>K-Pado</title>' + kieu + '<style>@page{size:A4;margin:16mm 15mm}html,body{background:#fff!important;color:#111!important;margin:0}.kpGiay{zoom:1!important;box-shadow:none!important;margin:0!important;width:auto!important;padding:0!important}.kpIDNhan{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body><div class="kpGiay">' + G.innerHTML + "</div></body></html>");
		d.close();
		// chờ CSS + phông KaTeX nạp xong rồi mới mở hộp thoại in (chọn "Lưu dưới dạng PDF" để lưu file)
		const chay = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { tt("Trình duyệt chặn in: " + (e.message || e), true); } setTimeout(() => f.remove(), 60000); };
		Promise.race([(f.contentDocument.fonts && f.contentDocument.fonts.ready) || Promise.resolve(), new Promise(ok => setTimeout(ok, 2500))]).then(() => setTimeout(chay, 300));
	}
	$p("kpTrang").addEventListener("click", e => {
		const b = e.target.closest("[data-z]"); if (!b) return; const z = b.dataset.z, hien = kpZoom || +(($p("kpGiay") || {}).style || {}).zoom || 1;
		if (z === "in") inBanIn(); else if (z === "vua") datZoom(0); else datZoom(Math.max(0.4, Math.min(2.5, Math.round((hien + (z === "+" ? 0.1 : -0.1)) * 10) / 10)));
	});
	window.addEventListener("resize", () => { if (!kpZoom && !$p("tabKPado").hidden) datZoom(0); });
	$p("kpXemChe").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; xem = b.dataset.xem; $p("kpXemChe").querySelectorAll("button").forEach(x => x.setAttribute("aria-selected", x === b)); veKQ(); });
	$p("kpKQ").addEventListener("input", () => { ketQua = $p("kpKQ").value; });
	// --- gọi K-Pado ---
	$p("kpChay").addEventListener("click", async () => {
		const vdc = $p("kpVDC").checked, loiGiai = $p("kpLG").checked;
		let ten, data;
		let hinhGoc = [];
		const cheChay = che;                              // khoá chế độ lúc bấm: đổi tab giữa chừng không làm đổi luồng xử lý
		if (cheChay === "math") { const de = $p("kpDe").value.trim(); if (!de) { tt("Nhập đề bài trước.", true); return; } const ch = catHinh(de); hinhGoc = ch.ds; ten = "kpadoMath"; data = { de: ch.t, kieu: $p("kpKieu").value, loiGiai, vdc }; }
		else if (cheChay === "vision") { if (!anh) { tt("Chọn hoặc dán ảnh trước.", true); return; } ten = "kpadoVisionTikz"; data = { anh: anh.data, mime: anh.mime, coLuoi: true, W: anh.W, H: anh.H, ghiChu: $p("kpGhiChu").value.trim(), vdc }; }
		else { const cau = $p("kpMau").value.trim(); if (!cau) { tt("Dán hoặc lấy câu mẫu trước.", true); return; } ten = "kpadoGenSimilar"; data = { cau, soLuong: +$p("kpSoLuong").value, loiGiai, vdc }; }
		const nut = $p("kpChay"); nut.classList.add("dang"); tt(vdc ? "K-Pado đang suy nghĩ sâu (có thể mất 1–2 phút)…" : "K-Pado đang làm việc…");
		const t0 = Date.now();
		if (window.KFB) window.KFB.kpadoTienDo = n => tt(n ? "K-Pado đang viết… " + n + " ký tự" : "K-Pado đang suy nghĩ… " + Math.round((Date.now() - t0) / 1000) + " giây");
		try {
			const r = await goi(ten, data);
			ketQua = r.ketQua; tho = r.tho; anhVe = null; capLuot(r);
			let ttVe = "";
			if (cheChay === "math") {                           // GIẢI TOÁN: không bao giờ vẽ / sửa TikZ — chỉ trả lại hình gốc, gán ID
				if (vdc && /\\begin\{ex\}/.test(r.tho || "")) {   // Chế độ VIP lượt 2: phản biện độc lập + soát định dạng (request riêng, tránh 524)
					try {
						tt("Chế độ VIP: K-Pado đang phản biện và soát lại lời giải…");
						const r2 = await goi("kpadoKiemToan", { de: data.de, ma: r.tho, kieu: data.kieu, loiGiai: data.loiGiai });
						if (/\\begin\{ex\}/.test(r2.ketQua || "") && !(r2.baoCao && r2.baoCao.catNgang)) { ketQua = r2.ketQua; tho = r2.tho; ttVe = "✓ Đã phản biện & soát lời giải (Chế độ VIP)."; }
					} catch (e) { ttVe = "(Bước phản biện bỏ qua: " + (e.message || e) + ")"; }
				}
				const hx = chuanExTest(ketQua); ketQua = hx.ma;
				const ghiHX = [hx.bao.doiShortans || hx.bao.doiViTri ? "sửa \\shortans[oly]" + (hx.bao.doiViTri ? " (đưa lên trước lời giải)" : "") : "", hx.bao.botXuongDong ? "bỏ \\\\ thừa" : "", hx.bao.bang ? "⚠ lời giải còn " + hx.bao.bang + " bảng tabular — nên viết lại bằng lời" : ""].filter(Boolean).join(", ");
				if (ghiHX) ttVe = (ttVe ? ttVe + " · " : "") + "Hậu xử lý: " + ghiHX;
				ketQua = traHinh(ketQua, hinhGoc); tho = traHinh(tho, hinhGoc);
				if (hinhGoc.length) ttVe = (ttVe ? ttVe + " · " : "") + "✓ Giữ nguyên " + hinhGoc.length + " hình gốc.";
				if (/\\begin\{(ex|bt)\}/.test(ketQua)) {
					tt("Đang gán ID tự động…");
					const g = await ganIDTuDong(ketQua); ketQua = g.ma;
					ttVe = (ttVe ? ttVe + " · " : "") + (g.n ? "✓ Đã gán ID " + g.n + " câu" + (g.ai < g.n ? " (" + (g.n - g.ai) + " câu theo từ khoá)" : "") : g.ly ? "Chưa gán ID: " + g.ly : "");
				}
			}
			else if (cheChay === "vision" && /\\begin\{tikzpicture\}/.test(ketQua)) {
				const tranh = docTranh(r.tho); ketQua = boDongTranh(ketQua);
				let v = await veThuVaSua(ketQua); ketQua = v.ma; anhVe = v.anh; ttVe = v.tt;
				if (vdc && v.anh) {                                   // Chế độ VIP: so ảnh gốc với ảnh vừa vẽ rồi tự sửa
					try {
						tt("Chế độ VIP: K-Pado đang soi hình vừa vẽ và tự sửa…");
						const r2 = await goi("kpadoSoiTikz", { anh: anh.data, mime: anh.mime, coLuoi: true, W: anh.W, H: anh.H, anhVe: await anhB64(v.anh, 1024), ma: ketQua });
						if (/\\begin\{tikzpicture\}/.test(r2.ketQua || "")) { const v2 = await veThuVaSua(boDongTranh(r2.ketQua)); if (v2.anh) { ketQua = v2.ma; anhVe = v2.anh; ttVe = "✓ Đã soi và sửa lại hình (Chế độ VIP)."; } }
					} catch (e) { ttVe += " (Bước soi hình bỏ qua: " + (e.message || e) + ")"; }
				}
				if (tranh.length && anhVe) {                          // đồ nét người/vật rồi ghép vào đúng toạ độ
					tt("Đang đồ nét " + tranh.length + " minh hoạ từ ảnh…");
					const sc = await doNetTranh(tranh, anh);
					if (sc.length) { const full = chenTruocKet(ketQua, sc), vf = await window.KFB.veTikzThu(full); if (vf.ok) { ketQua = full; anhVe = vf.png || vf.svg; ttVe += " · Đã ghép " + sc.length + " minh hoạ đồ nét."; } else ttVe += " · Ghép minh hoạ bị lỗi, chỉ giữ phần toán."; }
				}
			}
			// Câu tương tự: hình nằm trong câu ex → không đem cả câu đi vẽ như một hình TikZ (lỗi cũ làm mất lời giải)
			const bc = r.baoCao || {};
			$p("kpBC").innerHTML = "Bộ luật: <b>" + (bc.daSua || 0) + "</b> chỗ đã chuẩn hoá" + (bc.canSuaTay ? " · <span style='color:#FCD34D'>" + bc.canSuaTay + " chỗ cần sửa tay</span>" : "") + (bc.catNgang ? " · <span style='color:#FCA5A5'>kết quả bị cắt ngang — bật Chế độ VIP hoặc rút gọn đề</span>" : "") + " · " + Math.round((Date.now() - t0) / 1000) + " giây";
			["kpCopy", "kpSangGan", "kpSangChuan", "kpXemTho"].forEach(id => $p(id).disabled = false);
			tt((ttVe || "Xong.") + (bc.loiBoLuat ? " (Bộ luật lỗi: " + bc.loiBoLuat + ")" : ""));
			await veKQ();
		} catch (e) { tt(e.message || String(e), true); }
		finally { nut.classList.remove("dang"); }
	});
	// --- nút thao tác ---
	$p("kpCopy").addEventListener("click", () => navigator.clipboard.writeText(ketQua).then(() => tt("Đã copy."), () => { $p("kpKQ").hidden = false; $p("kpKQ").select(); tt("Bấm Ctrl+C để copy."); }));
	$p("kpSangGan").addEventListener("click", () => { localStorage.setItem("tdk_gi_ma", JSON.stringify(ketQua)); $p("nhomDeThi").click(); setTimeout(() => $p("nutTabGanID").click(), 50); });
	$p("kpSangChuan").addEventListener("click", () => { $p("vao").value = ketQua; $p("vao").dispatchEvent(new Event("input")); $p("nutTabChuan").click(); });
	$p("kpXemTho").addEventListener("click", () => { xem = "ma"; $p("kpXemChe").querySelectorAll("button").forEach(x => x.setAttribute("aria-selected", x.dataset.xem === "ma")); $p("kpKQ").hidden = false; $p("kpTrang").hidden = true; $p("kpKQ").value = tho; tt("Đang xem mã thô (chưa chuẩn hoá). Bấm 📄 Bản in để quay lại kết quả."); });
}
