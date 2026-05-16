# GadgetStock Design System & Architecture

Dokumen ini menjelaskan tentang sistem desain (Design System), panduan visual, dan arsitektur CSS yang digunakan dalam aplikasi **GadgetStock**. Aplikasi ini menggunakan pendekatan custom CSS (Vanilla CSS) tanpa framework eksternal seperti Tailwind atau Bootstrap untuk memaksimalkan fleksibilitas dan performa.

## 1. Filosofi Desain

Aplikasi **GadgetStock** (Sistem Point of Sales & Inventory Management) mengusung desain yang modern, responsif, dan fungsional. Kami menggunakan prinsip-prinsip desain "Material You" dengan penamaan variabel semantik untuk mempermudah _theming_, memisahkan antara warna latar (surface) dan warna teks (on-surface).

### Prinsip Utama:
1. **Fungsional & Jelas**: Karena ini merupakan aplikasi _dashboard_ & POS, data dan antarmuka interaktif menjadi prioritas.
2. **Modern & Premium Aesthetic**: Menggunakan border-radius yang halus, efek blur (backdrop-filter), serta skema warna yang konsisten.
3. **Responsive**: Layout beradaptasi dari Desktop (Sidebar-based) hingga Mobile (Bottom-Navigation-based).

---

## 2. Tipografi (Typography)

Kami menggunakan font modern sans-serif yang di-_host_ dari Google Fonts untuk konsistensi di seluruh perangkat.

- **Primary Font**: `Inter`, digunakan pada body text, heading, dan sebagian besar UI aplikasi karena tingkat keterbacaannya yang tinggi pada ukuran kecil (UI Dashboard).
- **Fallback Font**: `-apple-system, BlinkMacSystemFont, sans-serif`
- **Monospace Font**: `JetBrains Mono` atau `Fira Code` (untuk elemen yang butuh font monospace seperti kode produk atau angka tabular).
- **Iconography**: `Material Symbols Outlined` dari Google Fonts, menyediakan ikon-ikon ringan dengan dukungan _variations_ (opsz, wght, FILL, GRAD).

---

## 3. Palet Warna (Color Palette)

Aplikasi memanfaatkan **CSS Variables** (`:root`) di `main.css` untuk mengatur sistem warna. Variabel warna ini dikelompokkan ke dalam _Primary_, _Secondary_, _Tertiary_, _Surface/Background_, dan warna sistem (_Error/Success/Info/Warning_).

### **Primary Colors** (Brand & Aksi Utama)
- `--primary-container`: `#001f3f` (Navy Blue/Dark Blue) - Digunakan untuk tombol utama, sidebar active states, dan komponen pahlawan (hero).
- `--primary`: `#000613` (Warna sangat gelap)
- `--on-primary`: `#ffffff` (Putih - warna teks di atas latar primary)
- `--primary-fixed`: `#d4e3ff` (Biru terang - untuk badge/highlight)

### **Secondary & Tertiary Colors** (Elemen Netral & Aksen)
- `--secondary-container`: `#e4e2e1` - Tombol sekunder atau kartu yang tidak mencolok.
- `--tertiary`: `#110200` & `--tertiary-container`: `#391303` - Elemen pelengkap untuk variasi (misal status warning).

### **Surface & Background** (Latar Belakang & Layout)
Sistem ini menggunakan level *surface* untuk membedakan kedalaman (Z-Index visual).
- `--background`: `#f8f9fa` (Off-white / Slate-50) - Latar belakang utama aplikasi.
- `--surface-container-lowest`: `#ffffff` (Putih bersih) - Background Kartu (Card), Modal.
- `--surface-container-low`: `#f3f4f5` - Background Table Header.
- `--surface`: `#f8f9fa`
- `--outline`: `#74777f` & `--outline-variant`: `#c4c6cf` - Digunakan untuk border form, border tabel.

### **System/Feedback Colors**
- **Error / Danger**: `--error` (`#ba1a1a`), `--error-container` (`#ffdad6`)
- **Success**: Latar `#dcfce7`, Teks `#15803d`

---

## 4. Arsitektur Layout

Sistem layout dirancang dengan Flexbox dan CSS Grid, dipisahkan menjadi beberapa _shell_.

### **A. Desktop Layout Shell (`min-width: 768px`)**
- **Sidebar (`#sidebar`)**: Navigasi vertikal statis di sisi kiri (lebar `16rem` / 256px).
- **Top Bar (`#topbar`)**: Bagian atas (header) yang sticky. Menggunakan `backdrop-filter: blur(12px)` untuk kesan transparan/glassmorphism modern. Terdapat Search bar dan User Profile.
- **Main Content (`#main-content`)**: Area dinamis (flex container) tempat komponen halaman (seperti `dashboard.html`, `inventory.html`) dimuat.

### **B. Mobile Layout Shell (`max-width: 767px`)**
- Sidebar bergeser ke luar layar (`transform: translateX(-100%)`).
- **Bottom Navigation (`#bottom-nav`)**: Menu muncul di bagian bawah layar menggantikan sidebar (untuk kemudahan akses jempol pada mobile). Tombol _New Sale_ / FAB ditempatkan melayang (floating).

### **C. Sistem Grid & Utilitas**
Terdapat _utility classes_ layaknya framework populer untuk layouting dengan cepat:
- `.grid-cols-2`, `.grid-cols-3`, `.grid-cols-4`
- `.page-layout-pos`: Layout khusus untuk halaman Point of Sales (`pos.html`) yang membagi layar menjadi 2 panel (kiri: daftar produk, kanan: area nota/cart).

---

## 5. Komponen UI (UI Components)

### **Buttons (`.btn`)**
- `.btn-primary`: Latar navy blue, gaya modern.
- `.btn-secondary`: Abu-abu lembut, interaksi `brightness`.
- `.btn-ghost`: Transparan, dengan hover state redup.
- `.btn-danger`: Merah (Error state).
Semua tombol memiliki mikro-animasi pada event `:active` (`transform: scale(0.97)`) untuk _feedback_ taktil ke pengguna.

### **Forms (`.form-input`, `.form-select`)**
- Memiliki style border abu-abu yang berubah (transisi border-color) ke warna *Primary* saat mendapat fokus (`:focus`).
- Label form diformat dengan uppercase kecil (micro-copy) untuk estetika dashboard yang bersih.

### **Cards (`.card`)**
- Menggunakan sudut melengkung besar (`var(--radius-lg)`), border halus transparan, dan _box-shadow_ sangat lembut (`0 1px 3px rgba(0,0,0,0.04)`) demi tampilan yang tidak *cluttered*.
- Terdapat varian `.card-hero` untuk statistik utama di Dashboard, dengan background navy dan aksen cahaya putih (`blur`) dekoratif.

### **Badges (`.badge`)**
Elemen kecil penanda status (contoh: status stok "Aman", "Menipis", "Kritis", dsb).
- Tersedia varian `.badge-success`, `.badge-warning`, `.badge-danger`, `.badge-critical`, `.badge-info`.

### **Data Table (`.data-table`)**
- Tabel responsif (header di `surface-container-low`), baris (row) memiliki efek `:hover` tipis. Teks header berupa uppercase dengan spasi ekstra (`letter-spacing`).

---

## 6. Animasi & Interaksi

Aplikasi secara luas mengimplementasikan *mikro-animasi* lewat CSS keyframes untuk menjadikannya *terasa hidup*:
- `fadeIn`: Memunculkan modal & overlay secara gradual.
- `slideInRight`: Animasi komponen *Toast* / Notifikasi sistem dari sebelah kanan layar.
- `scaleIn`: Pop-up untuk konten Modal.
- *Loading State*: Memiliki `.skeleton` animasi latar belakang bergeser (gradient animation) ketika memuat data.

---

## 7. Referensi File

Seluruh variabel dan utilitas desain CSS ini ditulis pada:
- File Utama: `public/css/main.css`
- Diterapkan secara meluas ke dokumen HTML pada direktori: `public/pages/*.html` (Dashboard, POS, Inventory, Settings, dll.)

_Dokumen ini dapat terus diperbarui sejalan dengan perkembangan antarmuka pengguna GadgetStock._
