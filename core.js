/* ===== core.js — small independent UI-glue scripts ===== */

/* -- Master Layout: tab bar into header -- */

/* Master Layout: đưa thanh Tab lên header (giữ nguyên nút, id, sự kiện) + sao nền */
(function () {
	const kh = document.querySelector("header.dau > .khung"), tk = document.getElementById("taiKhoan"), tab = document.querySelector("#manCongCu .tabKhung");
	if (kh && tk && tab) kh.insertBefore(tab, tk);
	const cv = document.getElementById("kmNenSao"); if (!cv) return;
	const c = cv.getContext("2d");
	function ve() {
		const d = Math.min(devicePixelRatio || 1, 2), w = innerWidth, h = innerHeight;
		cv.width = w * d; cv.height = h * d; c.setTransform(d, 0, 0, d, 0, 0);
		for (let i = 0, n = Math.round(w * h / 4000); i < n; i++) {
			c.fillStyle = "rgba(210,235,255," + (.25 + Math.random() * .5).toFixed(2) + ")";
			c.beginPath(); c.arc(Math.random() * w, Math.random() * h, Math.random() * .8 + .2, 0, 6.2832); c.fill();
		}
	}
	ve(); let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(ve, 200); });
})();


/* -- Login portal cosmic background effect -- */

/* ===== Cổng đăng nhập vũ trụ: hiệu ứng giao diện (không đụng Firebase) ===== */
(function () {
	const $k = id => document.getElementById(id), cong = $k("manDangNhap");
	if (!cong) return;
	const itChuyen = matchMedia("(prefers-reduced-motion: reduce)").matches;
	// sao sắc nét theo độ phân giải màn hình
	const cv = $k("kcSao"), ctx = cv.getContext("2d");
	function veSao() {
		if (cong.hidden) return;
		const d = Math.min(devicePixelRatio || 1, 2), w = innerWidth, h = innerHeight;
		cv.width = w * d; cv.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);
		for (let i = 0, n = Math.round(w * h / 2600); i < n; i++) {
			const x = Math.random() * w, y = Math.random() * h, r = Math.random() < .9 ? Math.random() * .7 + .2 : Math.random() * 1.2 + .8;
			ctx.fillStyle = "rgba(" + (200 + Math.random() * 55 | 0) + "," + (225 + Math.random() * 30 | 0) + ",255," + (.35 + Math.random() * .6).toFixed(2) + ")";
			ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
		}
		for (let i = 0; i < 9; i++) {
			const x = Math.random() * w, y = Math.random() * h, L = 8 + Math.random() * 14, g = ctx.createRadialGradient(x, y, 0, x, y, L * .6);
			g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(1, "rgba(120,200,255,0)");
			ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, L * .6, 0, 6.2832); ctx.fill();
			ctx.strokeStyle = "rgba(200,235,255,.7)"; ctx.lineWidth = .7;
			ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.stroke();
		}
	}
	new MutationObserver(veSao).observe(cong, { attributes: true, attributeFilter: ["hidden"] });
	let henSao; addEventListener("resize", () => { clearTimeout(henSao); henSao = setTimeout(veSao, 200); });
	veSao();
	// thị sai
	if (!itChuyen && !matchMedia("(pointer: coarse)").matches) {
		const nen = $k("kcLopNen");
		cong.addEventListener("mousemove", e => { nen.style.transform = "translate3d(" + ((e.clientX / innerWidth - .5) * -10) + "px," + ((e.clientY / innerHeight - .5) * -7) + "px,0)"; });
	}
	// hạt sáng quanh logo + KMath
	if (!itChuyen) {
		const khoi = $k("kcKhoi"), hop = $k("kcHat"); let hen = null;
		const ban = n => {
			const W = khoi.offsetWidth, H = khoi.offsetHeight;
			for (let i = 0; i < n; i++) {
				const h = document.createElement("span"); h.className = "kcH" + (Math.random() < .18 ? " tia" : "");
				const x0 = Math.random() < .55 ? W * (.04 + Math.random() * .28) : W * (.35 + Math.random() * .6), y0 = H * (.15 + Math.random() * .7);
				const g = Math.random() * 6.2832, d = 30 + Math.random() * 90;
				h.style.cssText = "--x0:" + x0 + "px;--y0:" + y0 + "px;--x1:" + (x0 + Math.cos(g) * d) + "px;--y1:" + (y0 + Math.sin(g) * d - 20) + "px;--s:" + (.6 + Math.random() * 1.2).toFixed(2) + ";--t:" + (.7 + Math.random() * .9).toFixed(2) + "s";
				hop.appendChild(h); h.addEventListener("animationend", () => h.remove());
			}
		};
		const batDau = () => { if (hen) return; ban(26); hen = setInterval(() => ban(4), 110); }, dung = () => { clearInterval(hen); hen = null; };
		khoi.addEventListener("mouseenter", batDau); khoi.addEventListener("mouseleave", dung);
		khoi.addEventListener("touchstart", () => { batDau(); setTimeout(dung, 1200); }, { passive: true });
	}
	// tab: chưa đăng nhập → bấm tab thì đánh dấu + đưa tới form
	const tabs = [...cong.querySelectorAll(".kcTab, #kcMenuDT button")], the = $k("kcThe");
	const toiForm = msg => { the.scrollIntoView({ behavior: "smooth", block: "center" }); $k("kcEmail").focus({ preventScroll: true }); if (msg) { const b = $k("loiDangNhap"); b.className = "kcBao"; b.textContent = msg; } };
	tabs.forEach(t => t.addEventListener("click", () => {
		const ten = t.textContent.trim();
		tabs.forEach(x => x.classList.toggle("on", x.textContent.trim() === ten));
		$k("kcMenuDT").classList.remove("mo"); $k("kcNutMenu").setAttribute("aria-expanded", "false");
		toiForm("Đăng nhập để dùng " + ten + ".");
	}));
	$k("kcVeDau").addEventListener("click", () => { tabs.forEach(x => x.classList.remove("on")); cong.scrollTo({ top: 0, behavior: "smooth" }); });
	$k("kcToiForm").addEventListener("click", () => toiForm(""));
	$k("kcNutMenu").addEventListener("click", e => { const mo = $k("kcMenuDT").classList.toggle("mo"); e.currentTarget.setAttribute("aria-expanded", mo); });
	// hiện / ẩn mật khẩu
	$k("kcHienMk").addEventListener("click", e => { const mk = $k("kcMk"), hien = mk.type === "password"; mk.type = hien ? "text" : "password"; e.currentTarget.setAttribute("aria-label", hien ? "Ẩn mật khẩu" : "Hiện mật khẩu"); });
	// chuyển Đăng nhập / Đăng ký (trạng thái đọc ở module Firebase qua window.__kcChe)
	const che = [...cong.querySelectorAll(".kcChe button")];
	function datChe(k) {
		const dk = k === "dk"; window.__kcChe = k;
		che.forEach(b => b.setAttribute("aria-selected", b.dataset.che === k));
		$k("kcTieuDe").textContent = dk ? "Tạo tài khoản" : "Đăng nhập hệ thống";
		$k("kcMoTa").textContent = dk ? "Tài khoản mới cần quản trị viên duyệt trước khi dùng." : "Chào mừng thầy cô quay lại KMath.";
		$k("kcOTen").hidden = !dk; $k("kcQuenMk").hidden = dk;
		$k("kcMk").autocomplete = dk ? "new-password" : "current-password";
		$k("kcNutChinh").textContent = dk ? "Đăng ký" : "Đăng nhập";
		$k("kcHoiDuoi").textContent = dk ? "Đã có tài khoản?" : "Chưa có tài khoản?";
		$k("kcNutDoi").textContent = dk ? "Đăng nhập" : "Đăng ký ngay";
		$k("loiDangNhap").textContent = "";
	}
	che.forEach(b => b.addEventListener("click", () => datChe(b.dataset.che)));
	$k("kcNutDoi").addEventListener("click", () => datChe(window.__kcChe === "dk" ? "dn" : "dk"));
	datChe("dn");
})();
