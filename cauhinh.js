// =====================================================================
//  CẤU HÌNH — sửa file này trước khi đưa web lên
// =====================================================================

// 1. Dán đối tượng firebaseConfig lấy từ Firebase console
//    (Cài đặt dự án → Chung → Ứng dụng của bạn → biểu tượng </> → Config)
export const firebaseConfig = {
	apiKey: "AIzaSyC1vfpCS9WKY1_ocYxmkNUwcO7mN8cMMjY",
	authDomain: "chuanhoacodetdk.firebaseapp.com",
	projectId: "chuanhoacodetdk",
	storageBucket: "chuanhoacodetdk.firebasestorage.app",
	messagingSenderId: "758576213957",
	appId: "1:758576213957:web:b2a95cc7b2e61ab2d2a5ac"
};

// 2. Gmail quản trị (được vào trang admin.html). Phải trùng với firestore.rules
export const EMAIL_QUAN_TRI = ["dangkhoa08352708@gmail.com"];

// 3. Thông tin liên hệ hiện ở màn hình "Chờ duyệt"
export const LIEN_HE = "Liên hệ thầy Trương Đăng Khoa để được kích hoạt tài khoản.";
