/* tronde-goi.js — KMath · Trộn đề thi: ĐÓNG GÓI THEO MẪU (không DOM, chạy được trong Node để kiểm thử)
 *  • goiTex : main.tex theo mẫu của thầy + data/de_XXXX.tex + ans/ (mỗi mã một bộ file đáp án riêng)
 *  • goiWord: chép nguyên văn khối câu hỏi vào khuôn word mẫu.docx (đổi rId, chép media/embeddings,
 *             kiểu đoạn, danh sách đánh số, khai báo [Content_Types]) + điền Mã đề, trường NUMPAGES
 *  • xlsUnT : Excel đáp án đúng mẫu "UnT_Mau-Dap-An-Trac-Nghiem-THPT-2025"
 *  • phieuSVG/phieuHTML: 3 mẫu phiếu tô (TNMarker, Azota, Bộ GD) dựng lại bằng SVG đúng toạ độ mẫu TikZ, khổ A4
 *  Cần tronde.js (window.KTronDe) nạp trước.
 */
(function (G) {
	"use strict";
	const K = G.KTronDe || (typeof require === "function" ? require("./tronde.js") : null);
	const { XA, XD, reEsc, conTrucTiep, cuoiPT, docNhom, laChuThich, timLenh } = K;
	const PHAN_LA = ["I", "II", "III", "IV"], LOAI_PH = { tn: "I", ds: "II", tln: "III", tl: "IV" };
	const texEsc = s => String(s == null ? "" : s).replace(/\\/g, "\\textbackslash{}").replace(/([&%#_$])/g, "\\$1").replace(/[{}]/g, m => "\\" + m).replace(/~/g, "\\textasciitilde{}").replace(/\^/g, "\\textasciicircum{}");
	const ten = (s, d) => String(s == null || s === "" ? d : s);

	/* =====================================================================
	 *  1) LaTeX — main.tex theo mẫu
	 * ===================================================================== */
	const ANS_LOAI = { tn: "TN", ds: "DS", tln: "TLN", tl: "TL" }, INDAPAN = { tn: "TN", ds: "TF", tln: "TLN" }, COT = { tn: 6, ds: 2, tln: 3 };
	function boLenh(t, re) { return t.replace(re, (m, ...a) => { const i = a[a.length - 2]; return laChuThich(t, i) ? m : ""; }); }
	// thân đề cho data/de_XXXX.tex: bỏ khung document, bỏ lệnh trùng với main, đổi tên file đáp án ans/ansTN-XXXX…
	function thanTex(tho, ma) {
		let t = tho; const canh = [];
		const bd = timLenh(t, /\\begin\{document\}/g); if (bd) { const ed = timLenh(t, /\\end\{document\}/g, bd.index); t = t.slice(bd.index + 16, ed ? ed.index : t.length); canh.push("Đề nguồn là file đầy đủ (\\documentclass…): chỉ lấy phần giữa \\begin{document} và \\end{document}."); }
		t = boLenh(t, /\\(?:dethi|ketthucdethi)(?![A-Za-z])/g);
		t = boLenh(t, /\\label\{[AB]\\thedeso\}/g);
		t = boLenh(t, /\\(?:made|tende|sogddt|tentruong|tengiaovien|namhoc|toanlop|thoigian)\{[^{}]*\}/g);
		t = boLenh(t, /\\def\\maDe\{[^{}]*\}[^\n]*/g);
		const info = K._noi.phanTichTex(t), moc = info.moc;
		// các \Opensolutionfile{ans}[ten]
		const mo = []; const reO = /\\Opensolutionfile\s*\{[^}]*\}\s*\[([^\]]+)\]/g; let m;
		while ((m = reO.exec(t))) if (!laChuThich(t, m.index)) mo.push({ i: m.index, ten: m[1].trim() });
		if (mo.length) {
			const dung = {}, doi = [];
			mo.forEach((o, k) => { const x = info.ex.find(e => e.s > o.i && (k + 1 >= mo.length || e.s < mo[k + 1].i)); const L = x ? x.loai : "tn"; let tenMoi = "ans/ans" + ANS_LOAI[L] + "-" + ma; dung[tenMoi] = (dung[tenMoi] || 0) + 1; if (dung[tenMoi] > 1) tenMoi += "-" + dung[tenMoi]; o.moi = tenMoi; o.loai = L; doi.push([o.ten, tenMoi]); });
			doi.sort((a, b) => b[0].length - a[0].length).forEach(([cu, moi]) => { t = t.replace(new RegExp(reEsc(cu) + "(?![\\w-])", "g"), "\u0007" + moi); });
			t = t.replace(/\u0007/g, "");
			// thiếu \indapan cho file nào thì thêm vào cuối
			mo.forEach(o => { if (o.loai !== "tl" && !new RegExp("\\\\indapan\\s*\\[[^\\]]*\\]\\s*\\{[^}]*\\}\\s*\\{" + reEsc(o.moi) + "\\}").test(t)) t = t.replace(/\s*$/, "\n\\indapan[" + INDAPAN[o.loai] + "]{" + COT[o.loai] + "}{" + o.moi + "}\n"); });
		} else {
			// đề chỉ có các khối ex: dựng khung \caulc… \Opensolutionfile… \Closesolutionfile cho từng phần
			const LENH = { tn: "\\caulc", ds: "\\cauds", tln: "\\caukq", tl: "\\cautl" }, ds = [], dung = {};
			info.phan.forEach(p => {
				const dau = info.ex[p.ex[0]], cuoi = info.ex[p.ex[p.ex.length - 1]]; let tenMoi = "ans/ans" + ANS_LOAI[p.loai] + "-" + ma; dung[tenMoi] = (dung[tenMoi] || 0) + 1; if (dung[tenMoi] > 1) tenMoi += "-" + dung[tenMoi];
				ds.push({ s: dau.s, e: dau.s, t: (moc.length ? "" : LENH[p.loai] + "\n") + "\\Opensolutionfile{ans}[" + tenMoi + "]\n" }, { s: cuoi.e, e: cuoi.e, t: "\n\\Closesolutionfile{ans}\n" });
				p.ten = tenMoi;
			});
			ds.sort((a, b) => b.s - a.s).forEach(d => { t = t.slice(0, d.s) + d.t + t.slice(d.e); });
			t = t.replace(/\s*$/, "\n" + info.phan.filter(p => p.loai !== "tl").map(p => "\\indapan[" + INDAPAN[p.loai] + "]{" + COT[p.loai] + "}{" + p.ten + "}").join("\n") + "\n");
			canh.push("Đề nguồn chưa có \\Opensolutionfile: đã dựng khung đáp án cho từng phần.");
		}
		return { t: "% KMath · Trộn đề thi — mã đề " + ma + " (được \\input từ main.tex)\n" + t.replace(/^\s+/, ""), canh };
	}
	function taoMainTex(M, ma, meta, opt) {
		const bd = timLenh(M, /\\begin\{document\}/g); if (!bd) throw new Error("main.tex mẫu không có \\begin{document}");
		let pre = M.slice(0, bd.index);
		const cheDo = /^(dethi|loigiai|solcolor)$/.test(opt.cheDo) ? opt.cheDo : "dethi";
		if (/\\usepackage\s*(\[[^\]]*\])?\s*\{ex_test\}/.test(pre)) pre = pre.replace(/\\usepackage\s*(\[[^\]]*\])?\s*\{ex_test\}/, "\\usepackage[" + cheDo + "]{ex_test}");
		else throw new Error("main.tex mẫu không nạp ex_test");
		// số trang theo TỪNG đề: \pageref{LastPage} → tổng trang của đề hiện tại (nhãn B\thedeso, mỗi đề đếm lại từ 1)
		pre = pre.split("\n").map(l => /\\(fancyfoot|fancyhead|lfoot|cfoot|rfoot|lhead|chead|rhead)\b/.test(l) && !/^\s*%/.test(l) ? l.replace(/\\pageref\{LastPage\}/g, "\\kmSoTrangDe{}") : l).join("\n");
		// chế độ lời giải: [loigiai] thì bỏ \hideansEX đang bật; bảng đáp án theo tuỳ chọn
		if (cheDo === "loigiai") pre = pre.replace(/^(\s*)(\\hideansEX\{)/gm, "$1%$2");
		pre = pre.replace(/^(\s*)(\\(?:anbangdapan|hienbangdapan)\s*)$/gm, "$1%$2");
		pre = pre.replace(/\s*$/, "\n\n%==================================================================\n% KMath · Trộn đề thi — thêm tự động\n%==================================================================\n"
			+ "% Tổng số trang của đề đang in (lần biên dịch đầu chưa có nhãn → hiện ?)\n\\makeatletter\n\\newcommand{\\kmSoTrangDe}{\\IfRefUndefinedExpandable{B\\thedeso}{?}{\\getpagerefnumber{B\\thedeso}}}\n\\makeatother\n"
			+ (opt.anBang ? "\\anbangdapan\n" : "\\hienbangdapan\n") + "\n");
		const tt = [["sogddt", meta.so], ["tentruong", meta.truong], ["tengiaovien", meta.gv], ["tende", meta.tenDe], ["namhoc", meta.namHoc], ["toanlop", meta.lop], ["thoigian", meta.thoiGian]].filter(([, v]) => v != null && String(v).trim() !== "").map(([k, v]) => "\t\\" + k + "{" + texEsc(String(v).trim()) + "}").join("\n");
		let than = "\\begin{document}\n\t% Thông tin đề (sửa trong tab Trộn đề thi của KMath)\n" + tt + "\n";
		ma.forEach(m => {
			than += "\n\t%------------------------------ MÃ ĐỀ " + m + " ------------------------------\n\t\\made{" + m + "}\n\t\\setcounter{page}{1}\n\t\\dethi\n\t\\input{data/de_" + m + "}\n\t\\ketthucdethi\n";
			if (opt.phieu && opt.inputPhieu) than += "\t\\input{phieu-to/phieu_" + m + "}\n\t\\clearpage\n";
		});
		return "% KMath · Trộn đề thi — " + ma.length + " mã đề: " + ma.join(", ") + "\n% Biên dịch pdfLaTeX 2 lần (lần 1 ghi file ans/ và nhãn trang, lần 2 in bảng đáp án + số trang).\n% Cần ex_test.sty cạnh main.tex.\n" + pre + than + "\\end{document}\n";
	}
	function goiTex(ds, meta, opt, M, phieuTex) {
		const f = {}, canh = [];
		f["main.tex"] = taoMainTex(M, ds.map(b => b.ma), meta, opt);
		ds.forEach(b => { const r = thanTex(b.tho, b.ma); f["data/de_" + b.ma + ".tex"] = r.t; r.canh.forEach(c => { if (!canh.includes(c)) canh.push(c); }); if (opt.phieu && phieuTex) f["phieu-to/phieu_" + b.ma + ".tex"] = "% Phiếu tô — mã đề " + b.ma + "\n" + phieuTex(b); });
		f["ans/DOC-TRUOC.txt"] = "Thư mục chứa các file đáp án (ansTN-XXXX.tex, ansDS-XXXX.tex, ansTLN-XXXX.tex) do ex_test tự ghi khi biên dịch main.tex.\r\nGiữ nguyên thư mục này cạnh main.tex.\r\n";
		return { f, canh };
	}
	function xacThucGoiTex(goi, ds) {
		const loi = [], main = goi.f["main.tex"], hd = t => t.replace(/(^|[^\\])%.*$/gm, "$1");
		const m = hd(main), than = m.slice(m.indexOf("\\begin{document}")), dem = re => (than.match(re) || []).length;
		if (dem(/\\dethi(?![A-Za-z])/g) !== ds.length || dem(/\\ketthucdethi(?![A-Za-z])/g) !== ds.length) loi.push("main.tex: số \\dethi / \\ketthucdethi ≠ số mã đề");
		if (dem(/\\setcounter\{page\}\{1\}/g) !== ds.length) loi.push("main.tex: thiếu đặt lại số trang cho mỗi đề");
		if (/\\pageref\{LastPage\}/.test(m.split("\\begin{document}")[0].split("\n").filter(l => /\\(fancyfoot|fancyhead)/.test(l)).join("\n"))) loi.push("main.tex: chân trang vẫn dùng LastPage (sai khi nhiều mã)");
		const tenAns = new Set();
		ds.forEach(b => {
			if (!new RegExp("\\\\made\\{" + b.ma + "\\}").test(m) || !new RegExp("\\\\input\\{data/de_" + b.ma + "\\}").test(m)) loi.push("main.tex: thiếu mã " + b.ma);
			const t = goi.f["data/de_" + b.ma + ".tex"]; if (!t) { loi.push("Thiếu data/de_" + b.ma + ".tex"); return; }
			const h = hd(t);
			if (/\\(dethi|ketthucdethi)(?![A-Za-z])|\\label\{[AB]\\thedeso\}|\\begin\{document\}|\\documentclass/.test(h)) loi.push("data/de_" + b.ma + ".tex còn lệnh trùng với main.tex");
			const mo = [...h.matchAll(/\\Opensolutionfile\s*\{[^}]*\}\s*\[([^\]]+)\]/g)].map(x => x[1]), dong = (h.match(/\\Closesolutionfile/g) || []).length;
			if (mo.length !== dong) loi.push("data/de_" + b.ma + ".tex: \\Opensolutionfile/\\Closesolutionfile lệch");
			mo.forEach(x => { if (!/^ans\/ans(TN|DS|TLN|TL)-\d{4}(-\d+)?$/.test(x) || x.indexOf(b.ma) < 0) loi.push("Tên file đáp án lạ: " + x); if (tenAns.has(x)) loi.push("Trùng file đáp án giữa các mã: " + x); tenAns.add(x); });
			[...h.matchAll(/\\indapan\s*\[[^\]]*\]\s*\{[^}]*\}\s*\{([^}]+)\}/g)].forEach(x => { if (!mo.includes(x[1])) loi.push("\\indapan trỏ tới file không có: " + x[1]); });
			// ngoặc nhọn cân bằng (bỏ qua \{ \} và chú thích)
			let d = 0; const s = h.replace(/\\[{}%\\]/g, ""); for (const c of s) { if (c === "{") d++; else if (c === "}") d--; if (d < 0) break; } if (d !== 0) loi.push("data/de_" + b.ma + ".tex: ngoặc { } không cân");
			// mọi câu của mã đề vẫn còn đủ và giữ nguyên
			const ex1 = K._noi.phanTichTex(b.tho).ex.map(x => x.raw), ex2 = K._noi.phanTichTex(t).ex.map(x => x.raw);
			if (ex1.length !== ex2.length || ex1.some((x, i) => x !== ex2[i])) loi.push("data/de_" + b.ma + ".tex: nội dung câu khác bản đã trộn");
		});
		if (!Object.keys(goi.f).some(k => /^ans\//.test(k))) loi.push("Thiếu thư mục ans/");
		return loi;
	}

	/* =====================================================================
	 *  2) Word — gói câu hỏi vào khuôn word mẫu.docx
	 *  Gói = { "đường/dẫn": string | Uint8Array }
	 * ===================================================================== */
	const chuGoi = (g, p) => { const v = g[p]; if (v == null) return null; return typeof v === "string" ? v : new TextDecoder("utf-8").decode(v); };
	const thuMuc = p => p.slice(0, p.lastIndexOf("/") + 1), tenFile = p => p.slice(p.lastIndexOf("/") + 1);
	const relsCua = p => thuMuc(p) + "_rels/" + tenFile(p) + ".rels";
	function giaiDuong(goc, dich) { if (/^\//.test(dich)) return dich.slice(1); const a = (goc + dich).split("/"), r = []; a.forEach(x => { if (x === "..") r.pop(); else if (x !== ".") r.push(x); }); return r.join("/"); }
	function docRels(x) { const m = new Map(); (x || "").replace(/<Relationship\b[^>]*\/?>/g, r => { const g = n => (r.match(new RegExp("\\b" + n + '="([^"]*)"')) || [])[1]; m.set(g("Id"), { id: g("Id"), type: g("Type"), target: XD(g("Target") || ""), mode: g("TargetMode") }); return r; }); return m; }
	const RELS_RONG = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
	function themRel(x, id, type, target, mode) { return (x || RELS_RONG).replace("</Relationships>", '<Relationship Id="' + id + '" Type="' + type + '" Target="' + XA(target).replace(/"/g, "&quot;") + '"' + (mode ? ' TargetMode="' + mode + '"' : "") + "/></Relationships>"); }
	function loaiNoiDung(ct) { const def = new Map(), ov = new Map(); (ct || "").replace(/<Default\b[^>]*>/g, d => { def.set(((d.match(/Extension="([^"]+)"/) || [])[1] || "").toLowerCase(), (d.match(/ContentType="([^"]+)"/) || [])[1]); return d; }); (ct || "").replace(/<Override\b[^>]*>/g, d => { ov.set((d.match(/PartName="([^"]+)"/) || [])[1], (d.match(/ContentType="([^"]+)"/) || [])[1]); return d; }); return { def, ov }; }
	// chỉnh chữ trong một đoạn văn (gộp các w:t) mà vẫn giữ run, trường (field) và định dạng
	function suaDoan(p, sua) {
		const ts = []; const re = /<w:t(\s[^>]*)?>([^<]*)<\/w:t>|<w:t(\s[^>]*)?\/>/g; let m;
		while ((m = re.exec(p))) ts.push({ s: m.index, e: m.index + m[0].length, at: m[1] || m[3] || "", t: m[2] != null ? XD(m[2]) : "" });
		if (!ts.length) return p;
		const cu = ts.map(x => x.t).join(""), moi = sua(cu); if (moi == null || moi === cu) return p;
		let a = 0; while (a < cu.length && a < moi.length && cu[a] === moi[a]) a++;
		let b = 0; while (b < cu.length - a && b < moi.length - a && cu[cu.length - 1 - b] === moi[moi.length - 1 - b]) b++;
		const tu = a, den = cu.length - b, chen = moi.slice(a, moi.length - b);
		let pos = 0, daChen = false;
		ts.forEach((x, i) => { const s = pos, e = pos + x.t.length; pos = e; let t = x.t;
			const c1 = Math.max(0, Math.min(t.length, tu - s)), c2 = Math.max(0, Math.min(t.length, den - s));
			let them = ""; if (!daChen && (tu < e || i === ts.length - 1) && tu >= s) { them = chen; daChen = true; }
			x.moi = t.slice(0, c1) + them + t.slice(c2); });
		let r = "", tu2 = 0; ts.forEach(x => { r += p.slice(tu2, x.s) + '<w:t xml:space="preserve">' + XA(x.moi) + "</w:t>"; tu2 = x.e; }); return r + p.slice(tu2);
	}
	// áp suaDoan cho mọi đoạn "trong cùng" (kể cả đoạn trong hộp văn bản, bảng, đầu/chân trang)
	function suaMoiDoan(x, sua) { return x.replace(/<w:p\b(?:(?!<w:p[\s>])[\s\S])*?<\/w:p>/g, p => suaDoan(p, sua)); }
	// trường động: ký hiệu \u0001TÊN\u0001 trong w:t → tách run, chèn <w:fldSimple w:instr=" TÊN ">
	function chenTruong(x) {
		return x.replace(/(<w:r\b[^>]*>)((?:(?!<\/w:r>)[\s\S])*?)<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g, (m, mo, giua, t) => {
			if (t.indexOf("\u0001") < 0) return m;
			const rPr = (giua.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [""])[0];
			return mo + giua + t.split(/\u0001(\w+)\u0001/).map((s, i) => i % 2 ? '</w:r><w:fldSimple w:instr=" ' + s + ' \\* MERGEFORMAT"><w:r>' + rPr + "<w:t>1</w:t></w:r></w:fldSimple><w:r>" + rPr : '<w:t xml:space="preserve">' + s + "</w:t>").join("");
		});
	}
	const RE_MA = /(M[ãa][\s\u00a0]*đ[ềe](?:[\s\u00a0]*thi)?[\s\u00a0]*[:：][\s\u00a0]*)([.…·_]{2,}|\d{3,4}|X{3,4})/gi;
	function dienMa(x, ma) { return suaMoiDoan(x, t => t.replace(RE_MA, (m, a) => (/[\s\u00a0]$/.test(a) ? a : a + " ") + ma)); }
	function dienDau(x, meta) {
		// bảng đầu đề: ô trái đoạn 1 = Sở/Bộ, ô phải đoạn 1 = Tên đề (theo đúng khuôn mẫu); các dòng khác nhận theo chữ
		const i = x.indexOf("<w:tbl>"), j = i >= 0 ? x.indexOf("</w:tbl>", i) : -1;
		if (i >= 0) {
			let tbl = x.slice(i, j + 8); const o = [...tbl.matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)];
			const datDau = (cell, v) => { if (!v) return cell; let xong = false; return cell.replace(/<w:p\b(?:(?!<w:p[\s>])[\s\S])*?<\/w:p>/g, p => { if (xong || !/<w:t[\s>]/.test(p)) return p; xong = true; return suaDoan(p, () => v); }); };
			if (o[0] && meta.so) tbl = tbl.replace(o[0][0], datDau(o[0][0], meta.so));
			if (o[1] && meta.tenDe) tbl = tbl.replace(o[1][0], datDau(o[1][0], meta.tenDe));
			x = x.slice(0, i) + tbl + x.slice(j + 8);
		}
		return suaMoiDoan(x, t => {
			let r = t;
			if (meta.namHoc) r = r.replace(/(Năm học[\s\u00a0]*:?[\s\u00a0]*)(.*?)(\s*)$/, (m, a, b, c) => a + meta.namHoc + c);
			if (meta.mon) r = r.replace(/^(\s*Môn(?: thi)?[\s\u00a0]*:?[\s\u00a0]*)(.*?)(\s*)$/, (m, a, b, c) => a + meta.mon + c);
			if (meta.thoiGian) r = r.replace(/(Thời gian(?: làm bài)?[\s\u00a0]*:?[\s\u00a0]*)(\.{2,}|…+|\d+)([\s\u00a0]*phút)/, (m, a, b, c) => a + meta.thoiGian + c);
			r = r.replace(/(Đề thi (?:có|gồm có|gồm)[\s\u00a0]*)(\.{2,}|…+|\d+)([\s\u00a0]*trang)/, (m, a, b, c) => a.replace(/\s*$/, " ") + "\u0001NUMPAGES\u0001" + c);
			return r;
		});
	}
	function chanTrang(x) { if (/NUMPAGES/.test(x) || !/\bPAGE\b/.test(x)) return x; return suaMoiDoan(x, t => t.replace(/(Trang[\s\u00a0]*\d+)(?=[\s\u00a0]*[–\-—|])/, "$1/\u0001NUMPAGES\u0001")); }
	const SAU_UPDATE = ["w:hdrShapeDefaults", "w:footnotePr", "w:endnotePr", "w:compat", "w:docVars", "w:rsids", "m:mathPr", "w:attachedSchema", "w:themeFontLang", "w:clrSchemeMapping", "w:doNotIncludeSubdocsInStats", "w:doNotAutoCompressPictures", "w:forceUpgrade", "w:captions", "w:readModeInkLockDown", "w:smartTagType", "sl:schemaLibrary", "w:shapeDefaults", "w:doNotEmbedSmartTags", "w:decimalSymbol", "w:listSeparator"];
	function batCapNhatTruong(s) { if (/<w:updateFields\b/.test(s)) return s.replace(/<w:updateFields\b[^>]*\/>/, '<w:updateFields w:val="true"/>'); let k = -1; SAU_UPDATE.forEach(t => { const i = s.indexOf("<" + t); if (i >= 0 && (k < 0 || i < k)) k = i; }); if (k < 0) k = s.lastIndexOf("</w:settings>"); return s.slice(0, k) + '<w:updateFields w:val="true"/>' + s.slice(k); }
	const lineAuto = x => x.replace(/<w:spacing\b[^>]*\/>/g, sp => /w:lineRule="exact"/.test(sp) ? sp.replace(/w:line="\d+"/, 'w:line="240"').replace(/w:lineRule="exact"/, 'w:lineRule="auto"') : sp);
	function laySTyle(stylesX) { const m = new Map(); (stylesX || "").replace(/<w:style\b[\s\S]*?<\/w:style>/g, s => { const id = (s.match(/w:styleId="([^"]+)"/) || [])[1]; if (id) m.set(id, s); return s; }); return m; }
	function laySoMay(numX) { const ab = new Map(), num = new Map(); (numX || "").replace(/<w:abstractNum\b[\s\S]*?<\/w:abstractNum>/g, s => { ab.set((s.match(/w:abstractNumId="(\d+)"/) || [])[1], s); return s; }); (numX || "").replace(/<w:num\b[^>]*w:numId="(\d+)"[\s\S]*?<\/w:num>/g, (s, id) => { num.set(id, s); return s; }); return { ab, num }; }
	function goiWord(mau, nguon, than, meta, ma) {
		const out = Object.assign({}, mau), canh = [];
		let doc = chuGoi(mau, "word/document.xml"); if (!doc) throw new Error("Khuôn Word không có word/document.xml");
		const docN = chuGoi(nguon, "word/document.xml");
		// --- vị trí chèn: bỏ nội dung mẫu (từ "PHẦN…"/"Câu 1…" đầu tiên) tới trước sectPr cuối ---
		const { bo, bc, B } = K._noi.khoiCap1(doc), sect = B.length && B[B.length - 1].ten === "w:sectPr" ? B.length - 1 : B.length;
		let tu = B.findIndex((b, i) => i > 0 && i < sect && b.ten === "w:p" && /^\s*(PH[ẦẤA]N\s|C[âÂ]u\s*\d)/i.test(b.tx.replace(/^[\s\uFFFC]+/, "")));
		if (tu < 0) tu = sect;
		let dau = B.slice(0, tu).map(b => b.x).join("");
		dau = chenTruong(dienMa(dienDau(dau, meta), ma));
		// --- nội dung câu hỏi ---
		let C = than.join("");
		const soSect = (C.match(/<w:sectPr\b/g) || []).length; if (soSect) { C = C.replace(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g, ""); canh.push("Bỏ " + soSect + " ngắt section trong đề nguồn (dùng bố cục trang của khuôn mẫu)."); }
		C = C.replace(/<w:commentRange(?:Start|End)\b[^>]*\/>/g, "").replace(/<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:commentReference\b[^>]*\/>(?:(?!<\/w:r>)[\s\S])*?<\/w:r>/g, "");
		const soChuThich = (C.match(/<w:(footnote|endnote)Reference\b/g) || []).length; if (soChuThich) { C = C.replace(/<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:(?:footnote|endnote)Reference\b[^>]*\/>(?:(?!<\/w:r>)[\s\S])*?<\/w:r>/g, ""); canh.push("Bỏ " + soChuThich + " chú thích chân trang (footnote) trong đề nguồn."); }
		C = lineAuto(C);
		// --- quan hệ (rId), media, embeddings ---
		const relsN = docRels(chuGoi(nguon, "word/_rels/document.xml.rels")), ctN = loaiNoiDung(chuGoi(nguon, "[Content_Types].xml"));
		let relsM = chuGoi(out, "word/_rels/document.xml.rels") || RELS_RONG, ct = chuGoi(out, "[Content_Types].xml");
		const ctM = loaiNoiDung(ct), daChep = new Map(); let soRel = 0, soTep = 0;
		const dungId = new Set([...docRels(relsM).keys()]); const idMoi = () => { let k; do { k = "rIdKM" + (++soRel); } while (dungId.has(k)); dungId.add(k); return k; };
		function khaiLoai(p, pGoc) {
			const pn = "/" + p, pgn = "/" + pGoc;
			if (ctN.ov.has(pgn)) { if (!new RegExp('PartName="' + reEsc(pn) + '"').test(ct)) ct = ct.replace("</Types>", '<Override PartName="' + pn + '" ContentType="' + ctN.ov.get(pgn) + '"/></Types>'); return; }
			const ext = (p.split(".").pop() || "").toLowerCase(), loai = ctN.def.get(ext) || (ext === "bin" ? "application/vnd.openxmlformats-officedocument.oleObject" : ext === "wmf" ? "image/x-wmf" : ext === "emf" ? "image/x-emf" : null);
			if (!loai) { canh.push("Không rõ loại tệp ." + ext + " — Word có thể báo lỗi tệp " + p); return; }
			if (!ctM.def.has(ext) && !new RegExp('Extension="' + reEsc(ext) + '"', "i").test(ct)) ct = ct.replace(/(<Types\b[^>]*>)/, '$1<Default Extension="' + ext + '" ContentType="' + loai + '"/>');
		}
		function chepPhan(pGoc) { // chép một phần (và các phần nó trỏ tới) sang gói mới, trả về đường dẫn mới
			if (daChep.has(pGoc)) return daChep.get(pGoc);
			if (nguon[pGoc] == null) { canh.push("Đề nguồn thiếu tệp " + pGoc); daChep.set(pGoc, null); return null; }
			let p = thuMuc(pGoc) + "km_" + tenFile(pGoc), k = 1; while (out[p] != null) p = thuMuc(pGoc) + "km" + (++k) + "_" + tenFile(pGoc);
			daChep.set(pGoc, p); out[p] = nguon[pGoc]; soTep++; khaiLoai(p, pGoc);
			const rg = chuGoi(nguon, relsCua(pGoc));
			if (rg) { let moi = RELS_RONG; docRels(rg).forEach(r => { let dich = r.target; if (r.mode !== "External") { const d2 = chepPhan(giaiDuong(thuMuc(pGoc), r.target)); if (d2) dich = tuongDoi(thuMuc(p), d2); } moi = themRel(moi, r.id, r.type, dich, r.mode); }); out[relsCua(p)] = moi; }
			return p;
		}
		const tuongDoi = (tuDir, dich) => { const a = tuDir.split("/").filter(Boolean), b = dich.split("/"); let i = 0; while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++; return "../".repeat(a.length - i) + b.slice(i).join("/"); };
		const mapId = new Map();
		C = C.replace(/\b(r:(?:id|embed|link|pict|dm|lo|qs|cs|href))="([^"]+)"/g, (m, at, id) => {
			if (!mapId.has(id)) {
				const r = relsN.get(id); if (!r) { canh.push("rId lạ trong đề nguồn: " + id); mapId.set(id, id); }
				else if (r.mode === "External") { const k = idMoi(); relsM = themRel(relsM, k, r.type, r.target, "External"); mapId.set(id, k); }
				else { const dich = chepPhan(giaiDuong("word/", r.target)); const k = idMoi(); relsM = themRel(relsM, k, r.type, dich ? tuongDoi("word/", dich) : r.target); mapId.set(id, k); }
			}
			return at + '="' + mapId.get(id) + '"';
		});
		// --- kiểu đoạn/ký tự/bảng: chép kèm (đổi tên KM…), giữ đúng định dạng nguồn ---
		const stN = laySTyle(chuGoi(nguon, "word/styles.xml")), stylesM0 = chuGoi(out, "word/styles.xml") || "", stM = laySTyle(stylesM0);
		const canKieu = new Set(["Normal"]); (C.match(/<w:(?:pStyle|rStyle|tblStyle)\s+w:val="([^"]+)"/g) || []).forEach(s => canKieu.add(s.match(/w:val="([^"]+)"/)[1]));
		const macDinhN = (chuGoi(nguon, "word/styles.xml") || "").match(/<w:style\b[^>]*w:type="paragraph"[^>]*w:default="1"[^>]*w:styleId="([^"]+)"|<w:style\b[^>]*w:default="1"[^>]*w:type="paragraph"[^>]*w:styleId="([^"]+)"/);
		const idNormal = macDinhN ? (macDinhN[1] || macDinhN[2]) : "Normal"; canKieu.add(idNormal);
		const hang = [...canKieu]; for (let i = 0; i < hang.length; i++) { const s = stN.get(hang[i]); if (!s) continue; (s.match(/<w:(?:basedOn|link)\s+w:val="([^"]+)"/g) || []).forEach(x => { const v = x.match(/w:val="([^"]+)"/)[1]; if (!canKieu.has(v)) { canKieu.add(v); hang.push(v); } }); }
		const tenKM = id => "KM" + id.replace(/[^A-Za-z0-9]/g, "");
		// --- danh sách đánh số ---
		const soN = laySoMay(chuGoi(nguon, "word/numbering.xml")); let numX = chuGoi(out, "word/numbering.xml");
		const soM = laySoMay(numX), mapNum = new Map(); let maxAb = Math.max(-1, ...[...soM.ab.keys()].map(Number)), maxNum = Math.max(0, ...[...soM.num.keys()].map(Number));
		const canNum = new Set(); (C.match(/<w:numId\s+w:val="(\d+)"/g) || []).forEach(s => canNum.add(s.match(/(\d+)/)[1]));
		canKieu.forEach(id => { const s = stN.get(id); if (s) (s.match(/<w:numId\s+w:val="(\d+)"/g) || []).forEach(x => canNum.add(x.match(/(\d+)/)[1])); });
		canNum.delete("0");
		let abThem = "", numThem = "";
		canNum.forEach(id => { const n = soN.num.get(id); if (!n) { canh.push("Danh sách số " + id + " không có trong numbering.xml nguồn"); return; } const abId = (n.match(/<w:abstractNumId\s+w:val="(\d+)"/) || [])[1], ab = soN.ab.get(abId); if (!ab) return;
			const abMoi = ++maxAb, numMoi = ++maxNum; mapNum.set(id, String(numMoi));
			abThem += ab.replace(/w:abstractNumId="\d+"/, 'w:abstractNumId="' + abMoi + '"').replace(/<w:nsid\s+w:val="[0-9A-Fa-f]+"\/>/, '<w:nsid w:val="' + (0x4B4D0000 + abMoi).toString(16).toUpperCase() + '"/>').replace(/<w:(?:numStyleLink|styleLink)\b[^>]*\/>/g, "").replace(/<w:pStyle\s+w:val="([^"]+)"\s*\/>/g, (m, v) => canKieu.has(v) ? '<w:pStyle w:val="' + tenKM(v) + '"/>' : "");
			numThem += n.replace(/w:numId="\d+"/, 'w:numId="' + numMoi + '"').replace(/<w:abstractNumId\s+w:val="\d+"\s*\/>/, '<w:abstractNumId w:val="' + abMoi + '"/>'); });
		if (mapNum.size) {
			if (!numX) { numX = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:numbering>'; relsM = themRel(relsM, idMoi(), "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering", "numbering.xml"); if (!/numbering\.xml/.test(ct)) ct = ct.replace("</Types>", '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>'); }
			const iNum = numX.search(/<w:num\s[^>]*w:numId=/); numX = iNum >= 0 ? numX.slice(0, iNum) + abThem + numX.slice(iNum) : numX.replace("</w:numbering>", abThem + "</w:numbering>");
			const iCuoi = numX.indexOf("<w:numIdMacAtCleanup"); numX = iCuoi >= 0 ? numX.slice(0, iCuoi) + numThem + numX.slice(iCuoi) : numX.replace("</w:numbering>", numThem + "</w:numbering>");
			out["word/numbering.xml"] = numX;
			C = C.replace(/<w:numId\s+w:val="(\d+)"\s*\/>/g, (m, v) => mapNum.has(v) ? '<w:numId w:val="' + mapNum.get(v) + '"/>' : m);
		}
		// kiểu: đổi tên, gộp mặc định của tài liệu nguồn vào kiểu Normal để chữ/khoảng cách giữ đúng như nguồn
		const docDef = (chuGoi(nguon, "word/styles.xml") || "").match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/), defR = docDef ? (docDef[0].match(/<w:rPrDefault>\s*<w:rPr>([\s\S]*?)<\/w:rPr>/) || [])[1] || "" : "", defP = docDef ? (docDef[0].match(/<w:pPrDefault>\s*<w:pPr>([\s\S]*?)<\/w:pPr>/) || [])[1] || "" : "";
		const conXml = x => K.conTrucTiep("<x>" + x + "</x>", 3, 3 + x.length).map(c => ({ ten: c.ten, x: x.slice(c.s - 3, c.e - 3) }));
		const tron = (s, tag, them) => { if (!them) return s; const re = new RegExp("<w:" + tag + ">([\\s\\S]*?)</w:" + tag + ">"), m = s.match(re); const co = m ? m[1] : "", daCo = new Set(conXml(co).map(c => c.ten)); const add = conXml(them).filter(c => !daCo.has(c.ten)).map(c => c.x).join(""); if (!add) return s; if (m) return s.replace(re, "<w:" + tag + ">" + co + add + "</w:" + tag + ">"); const moi = "<w:" + tag + ">" + add + "</w:" + tag + ">"; if (tag === "pPr" && /<w:rPr>/.test(s)) return s.replace(/<w:rPr>/, moi + "<w:rPr>"); const sau = s.search(/<w:(tblPr|trPr|tcPr|tblStylePr)\b/); return sau >= 0 ? s.slice(0, sau) + moi + s.slice(sau) : s.replace(/<\/w:style>$/, moi + "</w:style>"); };
		let stylesThem = "";
		canKieu.forEach(id => { let s = stN.get(id); if (!s) { if (id !== "Normal" && id !== idNormal) canh.push("Kiểu “" + id + "” không có trong styles.xml nguồn"); return; } const moi = tenKM(id); if (stM.has(moi)) return;
			s = s.replace(/w:styleId="[^"]+"/, 'w:styleId="' + moi + '"').replace(/\s+w:default="1"/, "").replace(/<w:name\s+w:val="([^"]*)"\s*\/>/, (m, v) => '<w:name w:val="KM ' + v + '"/>')
				.replace(/<w:(basedOn|link|next)\s+w:val="([^"]+)"\s*\/>/g, (m, t, v) => canKieu.has(v) && stN.has(v) ? "<w:" + t + ' w:val="' + tenKM(v) + '"/>' : t === "basedOn" ? "" : "")
				.replace(/<w:numId\s+w:val="(\d+)"\s*\/>/g, (m, v) => mapNum.has(v) ? '<w:numId w:val="' + mapNum.get(v) + '"/>' : m);
			if (id === idNormal) { s = tron(s, "pPr", defP); s = tron(s, "rPr", defR); }
			stylesThem += lineAuto(s); });
		if (stylesThem) out["word/styles.xml"] = lineAuto(stylesM0).replace("</w:styles>", stylesThem + "</w:styles>");
		else if (stylesM0) out["word/styles.xml"] = lineAuto(stylesM0);
		const coKieu = id => stN.has(id);
		C = C.replace(/<w:(pStyle|rStyle|tblStyle)\s+w:val="([^"]+)"\s*\/>/g, (m, t, v) => coKieu(v) ? "<w:" + t + ' w:val="' + tenKM(v) + '"/>' : "");
		// đoạn không ghi kiểu → kiểu KM-Normal (giữ phông/cỡ/khoảng cách của đề nguồn)
		if (stN.has(idNormal)) {
			const kn = '<w:pStyle w:val="' + tenKM(idNormal) + '"/>';
			C = C.replace(/<w:p(\s[^>]*)?\/>/g, (m, a) => "<w:p" + (a || "") + "><w:pPr>" + kn + "</w:pPr></w:p>")
				.replace(/<w:p(\s[^>]*)?>(?!<w:pPr)/g, (m, a) => "<w:p" + (a || "") + "><w:pPr>" + kn + "</w:pPr>")
				.replace(/(<w:p(?:\s[^>]*)?><w:pPr>)(?!<w:pStyle)/g, "$1" + kn);
		}
		// --- ráp tài liệu ---
		const sectX = sect < B.length ? B[sect].x : "";
		doc = doc.slice(0, bo + 8) + dau + C + sectX + doc.slice(bc);
		// khai báo namespace dùng trong nội dung nguồn
		const rootN = (docN.match(/<w:document\b[^>]*>/) || [""])[0]; let rootM = (doc.match(/<w:document\b[^>]*>/) || [""])[0], rootMoi = rootM;
		(rootN.match(/\sxmlns:[\w]+="[^"]*"/g) || []).forEach(ns => { const pf = ns.match(/xmlns:([\w]+)=/)[1]; if (!new RegExp("\\sxmlns:" + pf + "=").test(rootMoi)) rootMoi = rootMoi.replace(/>$/, ns + ">"); });
		const ign = (rootN.match(/mc:Ignorable="([^"]*)"/) || [, ""])[1].split(/\s+/).filter(Boolean); if (ign.length) { const cu = (rootMoi.match(/mc:Ignorable="([^"]*)"/) || [, ""])[1].split(/\s+/).filter(Boolean); const hop = [...new Set(cu.concat(ign))].filter(p => new RegExp("\\sxmlns:" + p + "=").test(rootMoi)); rootMoi = /mc:Ignorable=/.test(rootMoi) ? rootMoi.replace(/mc:Ignorable="[^"]*"/, 'mc:Ignorable="' + hop.join(" ") + '"') : rootMoi.replace(/>$/, ' mc:Ignorable="' + hop.join(" ") + '">'); }
		doc = doc.replace(rootM, rootMoi);
		// id hình (wp:docPr) phải duy nhất
		let sid = 0; doc = doc.replace(/<wp:docPr\b([^>]*?)\bid="\d+"/g, (m, a) => "<wp:docPr" + a + 'id="' + (++sid) + '"');
		out["word/document.xml"] = doc;
		out["word/_rels/document.xml.rels"] = relsM;
		// đầu/chân trang: Mã đề + trang x/y
		Object.keys(out).filter(p => /^word\/(header|footer)\d*\.xml$/.test(p)).forEach(p => { out[p] = chenTruong(chanTrang(dienMa(chuGoi(out, p), ma))); });
		if (out["word/settings.xml"] != null) out["word/settings.xml"] = batCapNhatTruong(chuGoi(out, "word/settings.xml"));
		out["[Content_Types].xml"] = ct;
		return { f: out, canh, soTep };
	}
	// kiểm tra gói Word đã ráp: rId trỏ đúng tệp, đủ khai báo loại tệp, không giãn dòng exact, đủ kiểu/danh sách, Mã đề, trường số trang
	function xacThucGoiWord(goi, nguon, than, ma) {
		const f = goi.f, loi = [], doc = chuGoi(f, "word/document.xml"), ct = loaiNoiDung(chuGoi(f, "[Content_Types].xml"));
		Object.keys(f).filter(p => /\.xml$/.test(p) && /^word\/[^/]+\.xml$/.test(p)).forEach(p => {
			const x = chuGoi(f, p), rels = docRels(chuGoi(f, relsCua(p)));
			(x.match(/\br:(?:id|embed|link|pict|dm|lo|qs|cs|href)="([^"]+)"/g) || []).forEach(m => { const id = m.match(/"([^"]+)"/)[1], r = rels.get(id); if (!r) loi.push(p + ": " + id + " không có trong rels"); else if (r.mode !== "External" && f[giaiDuong("word/", r.target)] == null) loi.push(p + ": " + id + " trỏ tới tệp không có " + r.target); });
		});
		Object.keys(f).filter(p => !/\/$/.test(p) && p !== "[Content_Types].xml" && !/(^|\/)_rels\/|\.rels$/.test(p)).forEach(p => { const ext = (p.split(".").pop() || "").toLowerCase(); if (!ct.ov.has("/" + p) && !ct.def.has(ext)) loi.push("Chưa khai báo loại tệp cho " + p); });
		["word/document.xml", "word/styles.xml"].forEach(p => { if (/w:lineRule="exact"/.test(chuGoi(f, p) || "")) loi.push(p + " còn giãn dòng exact"); });
		const st = laySTyle(chuGoi(f, "word/styles.xml")); (doc.match(/<w:(?:pStyle|rStyle|tblStyle)\s+w:val="([^"]+)"/g) || []).forEach(m => { const v = m.match(/w:val="([^"]+)"/)[1]; if (!st.has(v)) loi.push("Kiểu " + v + " chưa có trong styles.xml"); });
		const so = laySoMay(chuGoi(f, "word/numbering.xml")); new Set((doc.match(/<w:numId\s+w:val="(\d+)"/g) || []).map(m => m.match(/(\d+)/)[1])).forEach(v => { if (v !== "0" && !so.num.has(v)) loi.push("Danh sách numId " + v + " chưa có"); });
		const root = (doc.match(/<w:document\b[^>]*>/) || [""])[0]; new Set((doc.match(/<\/?([A-Za-z][\w]*):/g) || []).map(m => m.replace(/[<\/:]/g, ""))).forEach(pf => { if (pf !== "xml" && !new RegExp("xmlns:" + pf + "=").test(doc)) loi.push("Thiếu khai báo namespace " + pf); });
		const ids = (doc.match(/<wp:docPr\b[^>]*\bid="(\d+)"/g) || []).map(m => m.match(/id="(\d+)"/)[1]); if (new Set(ids).size !== ids.length) loi.push("Trùng id hình (wp:docPr)");
		const chu = x => (x.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => XD(t.replace(/<[^>]+>/g, ""))).join("");
		if (chu(doc).indexOf("Mã đề: " + ma) < 0 && !new RegExp("Mã\\s*đề[^0-9]{0,8}" + ma).test(chu(doc))) loi.push("Chưa điền Mã đề " + ma + " ở đầu đề");
		const chan = Object.keys(f).filter(p => /^word\/footer\d*\.xml$/.test(p)).map(p => chuGoi(f, p)).join("");
		if (chan && /Mã\s*đề/.test(chu(chan)) && !new RegExp("Mã\\s*đề[^0-9]{0,8}" + ma).test(chu(chan))) loi.push("Chưa điền Mã đề ở chân trang");
		if (chan && /\bPAGE\b/.test(chan) && !/NUMPAGES/.test(chan)) loi.push("Chân trang chưa có tổng số trang");
		if (!/<w:updateFields w:val="true"\/>/.test(chuGoi(f, "word/settings.xml") || "")) loi.push("Chưa bật cập nhật trường khi mở");
		// nội dung câu hỏi: chữ và mọi tệp công thức/hình phải khớp từng byte với bản đã trộn
		const hashTep = (g, relsX, x) => { const r = docRels(relsX), ds = []; (x.match(/\br:(?:id|embed|link|pict)="([^"]+)"/g) || []).forEach(m => { const rr = r.get(m.match(/"([^"]+)"/)[1]); if (!rr || rr.mode === "External") return; const b = g[giaiDuong("word/", rr.target)]; ds.push(b == null ? "∅" : bam(b)); }); return ds.sort().join(","); };
		const thanX = than.join("");
		if (chu(doc).indexOf(chu(thanX)) < 0) loi.push("Chữ của phần câu hỏi không khớp bản đã trộn");
		const h1 = hashTep(nguon, chuGoi(nguon, "word/_rels/document.xml.rels"), thanX), h2 = hashTep(f, chuGoi(f, "word/_rels/document.xml.rels"), doc);
		const h2b = h2.split(",").filter(Boolean), h1b = h1.split(",").filter(Boolean); const dem = a => a.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {}); const d1 = dem(h1b), d2 = dem(h2b);
		Object.keys(d1).forEach(k => { if ((d2[k] || 0) < d1[k]) loi.push("Thiếu tệp công thức/hình (" + (d1[k] - (d2[k] || 0)) + ")"); });
		return [...new Set(loi)];
	}
	function bam(b) { if (typeof b === "string") b = new TextEncoder().encode(b); let h1 = 0x811c9dc5, h2 = 0; for (let i = 0; i < b.length; i++) { h1 ^= b[i]; h1 = Math.imul(h1, 16777619); h2 = (h2 + b[i] * (i + 1)) >>> 0; } return (h1 >>> 0).toString(16) + h2.toString(16) + ":" + b.length; }

	/* =====================================================================
	 *  3) unT edu — đúng khung mẫu "Đề 3 phần THPT 2025": Phần 1 (40 câu) · Phần 2 (8 câu × a–d) · Phần 3 (12 câu)
	 * ===================================================================== */
	function xlsUnT(ds) {
		const o = { A1: { v: "Phần", s: 1 }, B1: { v: "Câu", s: 1 } }, canh = [], cot = n => { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
		const tln = v => String(v || "").replace(/\$/g, "").replace(/\{,\}/g, ".").replace(/,/g, ".").replace(/\s+/g, "").trim();
		ds.forEach((b, j) => { o[cot(j + 3) + "1"] = { v: String(b.ma), s: 1 }; });
		for (let r = 2; r <= 85; r++) { o["B" + r] = { v: r <= 41 ? r - 1 : r <= 73 ? (Math.floor((r - 42) / 4) + 1) + "abcd"[(r - 42) % 4] : r - 73, s: 2 }; }
		o.A2 = { v: "Phần 1", s: 2 }; o.A42 = { v: "Phần 2", s: 2 }; o.A74 = { v: "Phần 3", s: 2 };
		ds.forEach((b, j) => {
			const c = cot(j + 3); let n1 = 0, n2 = 0, n3 = 0;
			b.phan.forEach(p => p.cau.forEach(q => {
				if (q.loai === "tn") { n1++; if (n1 <= 40) o[c + (n1 + 1)] = { v: q.da || "", s: 2 }; }
				else if (q.loai === "ds") { n2++; if (n2 <= 8) String(q.da || "").split("").slice(0, 4).forEach((x, k) => { o[c + (42 + (n2 - 1) * 4 + k)] = { v: x, s: 2 }; }); }
				else if (q.loai === "tln") { n3++; const v = tln(q.da); if (n3 <= 12) o[c + (73 + n3)] = { v, s: 2 }; if (v.length > 4) canh.push("Mã " + b.ma + " câu TLN " + n3 + ": đáp số “" + v + "” dài hơn 4 ký tự (unT chỉ nhận tối đa 4)."); }
			}));
			if (n1 > 40 || n2 > 8 || n3 > 12) canh.push("Mã " + b.ma + ": vượt khung unT (40 TN · 8 ĐS · 12 TLN) — phần dư không ghi.");
		});
		const rong = { A: 9, B: 7 }; ds.forEach((_, j) => { rong[cot(j + 3)] = 8; });
		return { sheets: [{ ten: "Đáp án", o, gop: ["A2:A41", "A42:A73", "A74:A85"], rong }], canh };
	}

	/* =====================================================================
	 *  4) Phiếu tô — SVG khổ A4 (đơn vị bp, gốc góc trên-trái; y TikZ âm → y SVG dương)
	 * ===================================================================== */
	const CM = 72 / 2.54, PT = 72 / 72.27;
	function veSVG(L) {
		const so = v => (+v).toFixed(2);
		const body = L.map(e => {
			const sw = e.lw != null ? e.lw : 0.4 * PT, mau = e.mau || "#000";
			if (e.k === "rect") return '<rect x="' + so(Math.min(e.x1, e.x2)) + '" y="' + so(Math.min(-e.y1, -e.y2)) + '" width="' + so(Math.abs(e.x2 - e.x1)) + '" height="' + so(Math.abs(e.y2 - e.y1)) + '" ' + (e.fill ? 'fill="' + e.fill + '"' + (e.ve ? ' stroke="' + mau + '" stroke-width="' + so(sw) + '"' : "") : 'fill="none" stroke="' + mau + '" stroke-width="' + so(sw) + '"') + "/>";
			if (e.k === "line") return '<line x1="' + so(e.x1) + '" y1="' + so(-e.y1) + '" x2="' + so(e.x2) + '" y2="' + so(-e.y2) + '" stroke="' + mau + '" stroke-width="' + so(sw) + '"/>';
			if (e.k === "circ") return '<circle cx="' + so(e.x) + '" cy="' + so(-e.y) + '" r="' + so(e.r) + '" ' + (e.fill ? 'fill="' + e.fill + '"' + (e.ve ? ' stroke="' + mau + '" stroke-width="' + so(sw) + '"' : "") : 'fill="none" stroke="' + mau + '" stroke-width="' + so(sw) + '"') + "/>";
			if (e.k === "text") {
				const co = e.co, anc = e.anc || "middle", ff = e.b ? ' font-weight="bold"' : "", fi = e.i ? ' font-style="italic"' : "";
				let y = -e.y; if (e.v === "c") y += co * 0.33; else if (e.v === "t") y += co * 0.75;
				const parts = Array.isArray(e.t) ? e.t : [e.t];
				return '<text x="' + so(e.x) + '" y="' + so(y) + '" font-size="' + so(co) + '" text-anchor="' + anc + '"' + ff + fi + ' fill="' + (e.mau || "#000") + '">' + parts.map(p => typeof p === "string" ? XA(p) : '<tspan textLength="' + so(p.w) + '" lengthAdjust="spacingAndGlyphs" fill="#000">' + ".".repeat(Math.max(2, Math.round(p.w / (co * 0.25)))) + "</tspan>").join("") + "</text>";
			}
			return "";
		}).join("");
		return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595.28 841.89" width="210mm" height="297mm" font-family="\'Times New Roman\',Times,serif">' + body + "</svg>";
	}
	// chữ TikZ đơn giản: \makebox[Wbp]{\dotfill}, $-$
	function tachChuTikz(s) { const out = []; let r = String(s).replace(/\$-\$/g, "−").replace(/\\,/g, " "); const re = /\\makebox\[([\d.]+)(bp|cm)\]\{\\dotfill\}/g; let m, tu = 0; while ((m = re.exec(r))) { if (m.index > tu) out.push(r.slice(tu, m.index)); out.push({ w: +m[1] * (m[2] === "cm" ? CM : 1) }); tu = m.index + m[0].length; } if (tu < r.length) out.push(r.slice(tu)); return out.map(x => typeof x === "string" ? x.replace(/\\[a-zA-Z]+\s*/g, "") : x); }
	// đọc mã TikZ của phiếu Azota/Bộ GD (do app.js sinh: chỉ gồm \draw/\fill/\node toạ độ bp) → danh sách hình
	function tikzSangHinh(tex) {
		const L = [], n = s => +s;
		tex.split("\n").forEach(l => {
			l = l.trim(); let m;
			const opt = (l.match(/^\\(?:draw|fill)\[([^\]]*)\]/) || [, ""])[1], lw = (opt.match(/line width=([\d.]+)bp/) || [])[1], filled = /^\\fill/.test(l) || /fill=black/.test(opt);
			if ((m = l.match(/\(([-\d.]+)bp,([-\d.]+)bp\)\s*rectangle\s*\(([-\d.]+)bp,([-\d.]+)bp\)/))) L.push({ k: "rect", x1: n(m[1]), y1: n(m[2]), x2: n(m[3]), y2: n(m[4]), lw: lw ? n(lw) : null, fill: /^\\fill/.test(l) ? "#000" : null });
			else if ((m = l.match(/\(([-\d.]+)bp,([-\d.]+)bp\)\s*--\s*\(([-\d.]+)bp,([-\d.]+)bp\)/))) L.push({ k: "line", x1: n(m[1]), y1: n(m[2]), x2: n(m[3]), y2: n(m[4]), lw: lw ? n(lw) : null });
			else if ((m = l.match(/\(([-\d.]+)bp,([-\d.]+)bp\)\s*circle\s*\(([-\d.]+)bp\)/))) L.push({ k: "circ", x: n(m[1]), y: n(m[2]), r: n(m[3]), lw: lw ? n(lw) : null, fill: filled ? "#000" : null, ve: /fill=black/.test(opt) });
			else if ((m = l.match(/^\\node\[anchor=([a-z ]+),font=\{\\fontsize\{([\d.]+)pt\}\{[\d.]+pt\}(\\bfseries\\itshape|\\bfseries|\\selectfont)\}\] at \(([-\d.]+)bp,([-\d.]+)bp\) \{(.*)\};$/))) {
				const a = m[1]; L.push({ k: "text", x: n(m[4]), y: n(m[5]), co: n(m[2]), b: /bfseries/.test(m[3]), i: /itshape/.test(m[3]), anc: /west/.test(a) ? "start" : /east/.test(a) ? "end" : "middle", v: "base", t: tachChuTikz(m[6]) });
			}
		});
		return L;
	}
	// TNMarker — dựng lại đúng toạ độ mẫu PHIEU_TNM (đơn vị cm, gốc góc trên-trái trang)
	function hinhTNM(d) {
		const L = [], P = (x, y) => [x * CM, y * CM], lw1 = 1 * PT, R5 = 5 * PT, xam80 = "#333", xam50 = "#808080";
		const rect = (x1, y1, x2, y2, o) => { const [a, b] = P(x1, y1), [c, e] = P(x2, y2); L.push(Object.assign({ k: "rect", x1: a, y1: b, x2: c, y2: e, lw: lw1 }, o)); };
		const vuong = (x, y, s) => rect(x - s / 2, y + s / 2, x + s / 2, y - s / 2, { fill: "#000", lw: 0 });
		const tron = (x, y, o) => { const [a, b] = P(x, y); L.push(Object.assign({ k: "circ", x: a, y: b, r: R5, lw: lw1 }, o)); };
		const chu = (x, y, t, co, o) => { const [a, b] = P(x, y); L.push(Object.assign({ k: "text", x: a, y: b, t, co: co * PT, v: "c" }, o)); };
		const line = (x1, y1, x2, y2) => { const [a, b] = P(x1, y1), [c, e] = P(x2, y2); L.push({ k: "line", x1: a, y1: b, x2: c, y2: e, lw: lw1 }); };
		const mk = w => ({ w: w * CM });
		rect(1.75, -9.85, 19.25, -28, { fill: "#e6e6e6", lw: 0 });
		[[1.3, -1.28], [13.74, -1.28], [19.68, -1.28], [1.3, -9.32], [13.65, -9.32], [19.68, -9.32], [1.3, -28.42], [19.68, -28.42]].forEach(([x, y]) => vuong(x, y, 0.54));
		[[17.47, -5.9], [17.47, -8.79], [6.17, -10.64], [10.49, -10.64], [14.81, -10.64], [6.17, -15.79], [10.49, -15.79], [14.81, -15.79], [6.17, -16.52], [10.49, -16.52], [14.81, -16.52], [6.17, -19.55], [10.49, -19.55], [14.81, -19.55], [4.94, -19.94], [7.71, -19.94], [13.25, -19.94], [16.02, -19.94], [4.94, -27.73], [7.71, -27.73], [10.48, -27.73], [13.25, -27.73], [16.02, -27.73]].forEach(([x, y]) => vuong(x, y, 0.27));
		chu(8, -1.5, "PHIẾU TRẢ LỜI TRẮC NGHIỆM", 15, { b: true });
		chu(9.6, -2.3, ["Kỳ thi ", mk(6.3)], 10);
		chu(1.5 + 0.12, -3, ["Bài thi ", mk(7.1), " Ngày thi:", mk(0.5), "/", mk(0.5), "/20", mk(0.5)], 10, { anc: "start" });
		rect(1.7, -3.35, 5.7, -8.8); line(1.7, -4, 5.7, -4); line(1.7, -5.5, 5.7, -5.5); line(1.7, -7.2, 5.7, -7.2);
		chu(3.7, -3.8, "Điểm", 10);
		[[-5.9, "1"], [-7.6, "2"]].forEach(([y, k]) => { chu(3.7, y + 0.2, "Họ tên, chữ ký của", 10); chu(3.7, y - 0.2, "cán bộ coi thi " + k, 10); });
		rect(5.95, -3.35, 13.15, -8.8);
		["Hội đồng thi: ", "Điểm thi: ", "Phòng thi số: ", "Họ và tên thí sinh: ", null, "Chữ ký của thí sinh: "].forEach((t, i) => { const y = -3.9 - i * 0.9, x = 5.95 + 0.12; if (t == null) chu(x, y, ["5. Ngày sinh: ", mk(0.5), "/", mk(0.5), "/", mk(2), " (Nam/Nữ)."], 10, { anc: "start" }); else { const w = 7 - 0.24 - (t.length + 3) * 0.19; chu(x, y, [(i + 1) + ". " + t, mk(Math.max(0.8, w))], 10, { anc: "start" }); } });
		for (let i = 0; i < 8; i++) rect(13.97 + i * 0.4, -2.3, 14.37 + i * 0.4, -2.89); chu(15.57, -2.0, "7. Số báo danh", 10);
		for (let i = 0; i < 4; i++) rect(17.77 + i * 0.4, -2.3, 18.17 + i * 0.4, -2.89); chu(18.57, -2.0, "8. Mã đề thi", 10);
		rect(13.94, -3, 17.23, -8.8);
		for (let j = 0; j <= 9; j++) { const y = -3.3 - j * 0.575; tron(13.66, y); chu(13.66, y, String(j), 8); for (let i = 0; i < 8; i++) { tron(14.16 + i * 0.405, y); chu(14.16 + i * 0.405, y, String(j), 7, { mau: xam80 }); } }
		rect(17.75, -3, 19.43, -8.8);
		for (let j = 0; j <= 9; j++) { const y = -3.3 - j * 0.575; tron(19.74, y); chu(19.74, y, String(j), 8); for (let i = 0; i < 4; i++) { tron(17.975 + i * 0.405, y); chu(17.975 + i * 0.405, y, String(j), 7, { mau: xam80 }); } }
		String(d.ma).replace(/\D/g, "").padStart(4, "0").slice(-4).split("").forEach((c, i) => { const [a, b] = P(17.975 + i * 0.405, -3.3 - +c * 0.575); L.push({ k: "circ", x: a, y: b, r: 4 * PT, fill: "#000", lw: 0 }); chu(17.97 + i * 0.4, -2.595, c, 10.95, { b: true }); });
		const TN = Math.min(40, d.tn), DS = Math.min(8, d.ds), TLN = Math.min(6, d.tln);
		for (let k = 0; k < 4; k++) if (k * 10 + 1 <= TN) { chu(2.175, -10.2, "PHẦN I", 10.95, { b: true, anc: "start" }); rect(2.175 + k * 4.315, -10.6, 5.85 + k * 4.315, -15.8, { fill: "#fff", ve: true }); }
		for (let k = 0; k < 4; k++) for (let ri = 1; ri <= 10; ri++) { const r = k * 10 + ri; if (r > TN) continue; "ABCD".split("").forEach((c, i) => { const x = 2.935 + k * 4.315 + i * 0.865, y = -11.35 - (ri - 1) * 0.445; tron(x, y); chu(x, y, c, 6, { mau: xam50 }); if (ri === 1) chu(x, y + 0.45, c, 6, { b: true }); }); chu(2.935 + k * 4.315 - 0.45, -11.35 - (ri - 1) * 0.445, String(r), 10, { b: true }); }
		for (let k = 0; k < 4; k++) [1, 2].forEach((q, qi) => { const r = 2 * k + q; if (r > DS) return; chu(2.175, -16.125, "PHẦN II", 10.95, { b: true, anc: "start" });
			if (qi === 0) rect(2.175 + k * 4.32, -16.5, 4.2325 + k * 4.32, -19.55, { fill: "#fff", ve: true }); else rect(4.2325 + k * 4.32, -16.5, 5.85 + k * 4.32, -19.55, { fill: "#fff", ve: true });
			chu(3.3675 + k * 4.32 + qi * 1.73, -16.85, "Câu " + r, 10, { b: true });
			"abcd".split("").forEach((y, yi) => [["D", 0], ["S", 0.865]].forEach(([t, dx]) => { const x = 2.935 + k * 4.32 + qi * 1.73 + dx, yy = -17.8 - yi * 0.445; tron(x, yy); chu(x, yy, t, 7, { mau: xam80 }); if (yi === 0) chu(x, yy + 0.45, t === "D" ? "Đúng" : "Sai", 10, { b: true }); if (t === "D" && qi === 0) chu(x - 0.4, yy, y + ")", 10, { b: true }); })); });
		for (let r = 1; r <= TLN; r++) { const o = (r - 1) * 2.765, o2 = (r - 1) * 2.77; chu(2.175, -19.9, "PHẦN III", 10.95, { b: true, anc: "start" }); rect(2.18 + o2, -20.355, 4.95 + o2, -27.3, { fill: "#fff", ve: true }); chu(3 + o, -20.95, "Câu " + r, 10, { b: true });
			["−", ",", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].forEach((v, i) => chu(2.4 + o, -21.77 - i * 0.46, v, 10, { b: true }));
			tron(2.79 + o, -21.77); chu(2.79 + o, -21.77, "−", 7, { mau: xam80 }); [0, 1].forEach(pi => { tron(3.38 + o + pi * 0.59, -22.23); chu(3.38 + o + pi * 0.59, -22.23, ",", 7, { mau: xam80 }); });
			for (let p = 1; p <= 4; p++) for (let j = 0; j <= 9; j++) { tron(2.79 + o2 + (p - 1) * 0.59, -22.69 - j * 0.46); chu(2.79 + o2 + (p - 1) * 0.59, -22.69 - j * 0.46, String(j), 7, { mau: xam80 }); } }
		return L;
	}
	// kieu: "tnm" | "azota" | "bgd"; d = {ma, tn, ds, tln}; tikz = mã TikZ của phiếu (cho Azota/Bộ GD, lấy từ Tạo đề thi)
	function phieuSVG(kieu, d, tikz) { return veSVG(kieu === "tnm" ? hinhTNM(d) : tikzSangHinh(tikz || "")); }
	function phieuHTML(svgs, tieuDe) {
		return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>' + XA(tieuDe || "Phiếu tô trắc nghiệm") + '</title><style>@page{size:A4;margin:0}html,body{margin:0;padding:0;background:#888}.trang{width:210mm;height:297mm;margin:0 auto 8mm;background:#fff;overflow:hidden;page-break-after:always;break-after:page}.trang svg{display:block}.ghi{font:13px system-ui,sans-serif;color:#fff;text-align:center;padding:8px}@media print{html,body{background:#fff}.ghi{display:none}.trang{margin:0}}</style></head><body><div class="ghi">In với khổ A4, tỉ lệ 100% (Thực tế / Actual size), lề: Không — để các ô định vị đúng vị trí cho máy chấm.</div>'
			+ svgs.map(s => '<div class="trang">' + s + "</div>").join("") + "</body></html>";
	}
	function phieuDem(b) { const d = { ma: b.ma, tn: 0, ds: 0, tln: 0, tl: 0 }; b.phan.forEach(p => { d[p.loai] += p.cau.length; }); return d; }
	// dữ liệu mã đề theo khuôn của "Tạo đề thi" (để dùng lại Excel/QR/phiếu tô sẵn có trong app.js)
	function sangMA(b) { return { ma: b.ma, phan: b.phan.map(p => ({ ph: LOAI_PH[p.loai], cau: p.cau.map(c => ({ loai: c.loai, da: c.da || "" })) })) }; }

	const API = { goiTex, xacThucGoiTex, thanTex, taoMainTex, goiWord, xacThucGoiWord, suaDoan, xlsUnT, phieuSVG, phieuHTML, phieuDem, sangMA, tikzSangHinh, hinhTNM, veSVG, bam };
	K.goi = API;
	if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
