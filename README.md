# 🏋️ System Pusat Kebugaran (Gym Management System)

Aplikasi konsol berbasis Java sederhana untuk mengelola data anggota gym, paket langganan, proses *check-in*, serta perhitungan *Body Mass Index* (BMI).

---

## 🛠️ Fitur Utama

1. **Tambah Member Baru**: Menginput data member, mengalkulasi durasi paket, dan menghitung diskon otomatis (Diskon 5% untuk $\ge$ 6 bulan, 10% untuk $\ge$ 12 bulan).
2. **Check-In Member**: Mencatat kehadiran member dan mengurangi kuota hari jika masa aktif masih berlaku.
3. **Cek BMI & Kategori**: Menhitung indeks massa tubuh member berdasarkan tinggi dan berat badan.
4. **Laporan Sederhana**: Menampilkan daftar seluruh member terdaftar beserta sisa hari dan jumlah kunjungan.

---

## 📐 Struktur Kode (`MainGym.java`)

- **Class `Paket`**: Menyimpan nama paket dan harga bulanan serta menghitung diskon.
- **Class `Member`**: Menyimpan data anggota, menghitung nilai BMI, dan mengelola status check-in.
- **Class `MainGym`**: Berisi fungsi `main()`, menu interaktif berbasis CLI, dan method pembantu `cari()` untuk pencarian ID member.

---

## 🚀 Cara Menjalankan Program

### 1. Kompilasi Kode
Buka terminal/command prompt di direktori root project, lalu jalankan:

```bash
javac -d bin src/MainGym.java

2. Jalankan Program
Setelah proses kompilasi selesai, jalankan program dengan perintah:

Bash
java -cp bin MainGym
📝 Contoh Penggunaan Singkat
Pilih Menu 1 untuk mendaftarkan member baru.

Masukkan data diri (ID, Nama, Berat, Tinggi, Nama Paket, Harga, Durasi).

Pilih Menu 2 dan masukkan ID Member untuk melakukan check-in.

Pilih Menu 3 untuk melihat nilai BMI dan status kategori tubuh member.

Pilih Menu 4 untuk melihat daftar laporan seluruh anggota.



