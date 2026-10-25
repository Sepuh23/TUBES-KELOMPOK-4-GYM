Markdown# 🏋️‍♂️ Sistem Manajemen Pusat Kebugaran (Gym) & Perhitungan BMI

Aplikasi berbasis **Java Object-Oriented Programming (OOP)** yang dirancang untuk mengelola operasional pusat kebugaran (gym). Sistem ini menangani pendaftaran member, paket berlangganan, pencatatan presensi (check-in), serta perhitungan Indeks Massa Tubuh (BMI) untuk memberikan rekomendasi program latihan yang personal.

---

## 📌 Fitur Utama

- **Manajemen Paket:** Pilihan tingkatan paket (Basic, Silver, Gold) dengan perhitungan diskon otomatis untuk durasi langganan tertentu (5% untuk $\ge 6$ bulan, 10% untuk $\ge 12$ bulan).
- **Administrasi Member:** Pendaftaran member baru dengan data lengkap (ID, nama, berat badan, tinggi badan, dan durasi awal).
- **Pencatatan Presensi (Check-in):** Sistem check-in otomatis yang mencatat akumulasi kunjungan dan menolak akses jika masa aktif langganan sudah habis ($\le 0$ hari).
- **Perpanjangan Langganan:** Perpanjangan paket member secara mudah dengan penambahan masa aktif otomatis ($1 \text{ bulan} = 30 \text{ hari}$).
- **Analisis BMI & Rekomendasi:** Menghitung Indeks Massa Tubuh ($\text{berat} / \text{tinggi}^2$) serta memberikan rekomendasi program latihan dan pola makan berdasarkan kategori kesehatan (*Kurus*, *Normal*, *Berlebih*, *Obesitas*).
- **Laporan & Monitoring:**
  - Laporan rekapitulasi seluruh member beserta kategori BMI.
  - Penentuan member terajin berdasarkan jumlah kunjungan terbanyak.
  - Peringatan masa aktif bagi member yang sisa langganannya $\le 7$ hari.
- **Validasi Input Ketat:** Memastikan nilai input untuk berat badan, tinggi badan, dan durasi bulan selalu lebih besar dari 0 ($> 0$).

---

## 🏗️ Arsitektur Program & Desain OOP

Aplikasi ini dibangun menerapkan prinsip dasar OOP dan terbagi menjadi 4 kelas utama:

├── Paket.java             # Mengelola jenis paket dan perhitungan diskon harga
├── Member.java            # Menyimpan data member, logika BMI, check-in, dan rekomendasi
├── PusatKebugaran.java    # Mengelola koleksi member, laporan, dan filter data
└── MainGym.java           # Entry point utama dengan menu interaktif CLI & validasi input
### Ringkasan Kelas

| Kelas | Tanggung Jawab Utama |
| :--- | :--- |
| **`Paket`** | Menyimpan data paket (`nama`, `hargaPerBulan`) dan menghitung total harga sesuai durasi. |
| **`Member`** | Menyimpan profil fisik dan status keanggotaan. Menangani method `hitungBMI()`, `kategoriBMI()`, `checkIn()`, dan `perpanjang()`. |
| **`PusatKebugaran`** | Mengelola koleksi `List<Member>`. Mengimplementasikan pencarian, laporan tabel, pencarian member terajin, dan monitoring masa aktif. |
| **`MainGym`** | Mengimplementasikan menu interaktif berbasis `Scanner` (CLI) dan alur navigasi aplikasi. |

---

## 🚀 Petunjuk Penggunaan

### Prasyarat

Pastikan perangkat Anda telah terpasang:
- **Java Development Kit (JDK):** Versi 8 atau yang lebih baru.
- **Git** (opsional, untuk melakukan clone repositori).

### Kompilasi & Menjalankan Program

1. **Clone repositori ini:**
   ```bash
   git clone [https://github.com/username-anda/gym-bmi-management.git](https://github.com/username-anda/gym-bmi-management.git)
   cd gym-bmi-management
Kompilasi seluruh file Java:Bashjavac *.java
Jalankan program:Bashjava MainGym
💻 Tampilan & Menu UtamaSaat menjalankan MainGym, Anda akan disajikan menu interaktif Command Line Interface (CLI):Plaintext=== SISTEM MANAJEMEN PUSAT KEBUGARAN (GYM) ===
1. Pendaftaran Member Baru
2. Presensi Check-in Member
3. Perpanjang Paket Langganan
4. Cek BMI & Rekomendasi Program
5. Tampilkan Laporan Member & Kategori BMI
6. Cek Member Terajin & Masa Aktif (<= 7 Hari)
7. Keluar
Pilih menu (1-7):
Matriks Klasifikasi BMI & RekomendasiRentang BMIKategoriRekomendasi Program Latihan$< 18.5$KurusProgram Pembentukan Otot (Hypertrophy) & Diet Surplus Kalori$18.5 - 24.9$NormalProgram Pembentukan & Pemeliharaan Kebugaran (Maintenance)$25.0 - 29.9$BerlebihProgram Kardio & Defisit Kalori Ringan$\ge 30.0$ObesitasProgram Penurunan Berat Badan Intensif & Kardio Low-Impact
