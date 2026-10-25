import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

// 1. Class Paket
class Paket {
    private String nama;
    private double hargaPerBulan;

    public Paket(String nama, double hargaPerBulan) {
        this.nama = nama;
        this.hargaPerBulan = hargaPerBulan;
    }

    public String getNama() {
        return nama;
    }

    public void setNama(String nama) {
        this.nama = nama;
    }

    public double getHargaPerBulan() {
        return hargaPerBulan;
    }

    public void setHargaPerBulan(double hargaPerBulan) {
        this.hargaPerBulan = hargaPerBulan;
    }

    public double hitungHarga(int bulan) {
        double totalHarga = hargaPerBulan * bulan;
        if (bulan >= 12) {
            totalHarga *= 0.90; // Diskon 10%
        } else if (bulan >= 6) {
            totalHarga *= 0.95; // Diskon 5%
        }
        return totalHarga;
    }
}

// 2. Class Member
class Member {
    private String id;
    private String nama;
    private double beratBadan;
    private double tinggiBadan;
    private Paket paket;
    private int sisaHari;
    private int jumlahKunjungan;

    public Member(String id, String nama, double beratBadan, double tinggiBadan, Paket paket, int durasiBulan) {
        this.id = id;
        this.nama = nama;
        this.beratBadan = beratBadan;
        this.tinggiBadan = tinggiBadan;
        this.paket = paket;
        this.sisaHari = durasiBulan * 30;
        this.jumlahKunjungan = 0;
    }

    public String getId() {
        return id;
    }

    public String getNama() {
        return nama;
    }

    public void setNama(String nama) {
        this.nama = nama;
    }

    public double getBeratBadan() {
        return beratBadan;
    }

    public void setBeratBadan(double beratBadan) {
        this.beratBadan = beratBadan;
    }

    public double getTinggiBadan() {
        return tinggiBadan;
    }

    public void setTinggiBadan(double tinggiBadan) {
        this.tinggiBadan = tinggiBadan;
    }

    public int getSisaHari() {
        return sisaHari;
    }

    public int getJumlahKunjungan() {
        return jumlahKunjungan;
    }

    public Paket getPaket() {
        return paket;
    }

    public void setPaket(Paket paket) {
        this.paket = paket;
    }

    public double hitungBMI() {
        double tinggiMeter = tinggiBadan / 100.0;
        return beratBadan / (tinggiMeter * tinggiMeter);
    }

    public String kategoriBMI() {
        double bmi = hitungBMI();
        if (bmi < 18.5) {
            return "Kurus";
        } else if (bmi < 25.0) {
            return "Normal";
        } else if (bmi < 30.0) {
            return "Berlebih";
        } else {
            return "Obesitas";
        }
    }

    public boolean checkIn() {
        if (sisaHari <= 0) {
            return false;
        }
        jumlahKunjungan++;
        return true;
    }

    public void perpanjang(int bulan) {
        this.sisaHari += bulan * 30;
    }

    public String dapatkanRekomendasi() {
        String kat = kategoriBMI();
        if (kat.equals("Kurus")) {
            return "Program Hypertrophy & Bulking (Fokus Latihan Beban + Surplus Kalori)";
        } else if (kat.equals("Normal")) {
            return "Program Maintenance & Strength Training (Jaga Massa Otot & Ketahanan Fisik)";
        } else if (kat.equals("Berlebih")) {
            return "Program Weight Loss & HIIT (Kombinasi Cardio, Latihan Beban & Defisit Kalori)";
        } else {
            return "Program Low-Impact Cardio & Core Workout (Fokus Cardiovaskular Bertahap)";
        }
    }
}

// 3. Class PusatKebugaran
class PusatKebugaran {
    private List<Member> daftarMember;

    public PusatKebugaran() {
        daftarMember = new ArrayList<>();
    }

    public void tambahMember(Member member) {
        daftarMember.add(member);
        System.out.println("✅ Member " + member.getNama() + " berhasil terdaftar!");
    }

    public Member cariMember(String id) {
        for (Member m : daftarMember) {
            if (m.getId().equalsIgnoreCase(id)) {
                return m;
            }
        }
        return null;
    }

    public void tampilkanLaporan() {
        if (daftarMember.isEmpty()) {
            System.out.println("⚠️ Belum ada data member terdaftar.");
            return;
        }

        System.out.println("\n=================================== LAPORAN PUSAT KEBUGARAN ===================================");
        System.out.printf("%-8s | %-15s | %-8s | %-10s | %-10s | %-8s | %-10s\n", 
                          "ID", "NAMA", "PAKET", "SISA HARI", "KUNJUNGAN", "BMI", "KATEGORI");
        System.out.println("-----------------------------------------------------------------------------------------------");
        for (Member m : daftarMember) {
            System.out.printf("%-8s | %-15s | %-8s | %-10d | %-10d | %-8.2f | %-10s\n",
                              m.getId(), m.getNama(), m.getPaket().getNama(), m.getSisaHari(), 
                              m.getJumlahKunjungan(), m.hitungBMI(), m.kategoriBMI());
        }
        System.out.println("-----------------------------------------------------------------------------------------------");

        memberTerajin();
        cekMasaAktif();
    }

    public void memberTerajin() {
        if (daftarMember.isEmpty()) return;

        Member terajin = daftarMember.get(0);
        for (Member m : daftarMember) {
            if (m.getJumlahKunjungan() > terajin.getJumlahKunjungan()) {
                terajin = m;
            }
        }
        System.out.println("\n⭐ Member Terajin : " + terajin.getNama() + " (" + terajin.getJumlahKunjungan() + " kali check-in)");
    }

    public void cekMasaAktif() {
        System.out.println("⚠️ Member dengan Masa Aktif <= 7 Hari:");
        boolean ada = false;
        for (Member m : daftarMember) {
            if (m.getSisaHari() <= 7) {
                System.out.println("   - ID: " + m.getId() + " | Nama: " + m.getNama() + " | Sisa Hari: " + m.getSisaHari() + " hari");
                ada = true;
            }
        }
        if (!ada) {
            System.out.println("   (Tidak ada member yang masa aktifnya hampir habis)");
        }
    }
}

// 4. Class MainGym
public class MainGym {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        PusatKebugaran gym = new PusatKebugaran();
        boolean running = true;

        while (running) {
            System.out.println("\n==================================");
            System.out.println("     SYSTEM PUSAT KEBUGARAN       ");
            System.out.println("==================================");
            System.out.println("1. Tambah Member Baru");
            System.out.println("2. Edit Data Member (Update)");
            System.out.println("3. Check-In Member");
            System.out.println("4. Perpanjang Paket");
            System.out.println("5. Cek BMI & Rekomendasi");
            System.out.println("6. Tampilkan Laporan");
            System.out.println("7. Keluar Program");
            System.out.print("Pilih menu (1-7): ");

            int pilihan = scanner.nextInt();
            scanner.nextLine();

            switch (pilihan) {
                case 1:
                    System.out.println("\n--- Pendaftaran Member Baru ---");
                    System.out.print("ID Member       : ");
                    String id = scanner.nextLine();

                    if (gym.cariMember(id) != null) {
                        System.out.println("❌ ID Member sudah digunakan!");
                        break;
                    }

                    System.out.print("Nama Member     : ");
                    String nama = scanner.nextLine();

                    double bb = 0;
                    while (bb <= 0) {
                        System.out.print("Berat Badan (kg): ");
                        bb = scanner.nextDouble();
                        if (bb <= 0) System.out.println("❌ Input harus lebih dari 0!");
                    }

                    double tb = 0;
                    while (tb <= 0) {
                        System.out.print("Tinggi Badan(cm): ");
                        tb = scanner.nextDouble();
                        if (tb <= 0) System.out.println("❌ Input harus lebih dari 0!");
                    }
                    scanner.nextLine();

                    System.out.print("Pilih Paket (Basic/Silver/Gold): ");
                    String namaPaket = scanner.nextLine();
                    System.out.print("Harga per Bulan (Rp)           : ");
                    double harga = scanner.nextDouble();

                    int durasi = 0;
                    while (durasi <= 0) {
                        System.out.print("Durasi Langganan (Bulan)       : ");
                        durasi = scanner.nextInt();
                        if (durasi <= 0) System.out.println("❌ Durasi harus lebih dari 0!");
                    }

                    Paket paketBaru = new Paket(namaPaket, harga);
                    double totalHarga = paketBaru.hitungHarga(durasi);
                    System.out.println("Total Bayar (setelah diskon): Rp " + totalHarga);

                    Member memberBaru = new Member(id, nama, bb, tb, paketBaru, durasi);
                    gym.tambahMember(memberBaru);
                    break;

                case 2:
                    System.out.println("\n--- Edit Data Member ---");
                    System.out.print("Masukkan ID Member yang ingin diubah: ");
                    String idEdit = scanner.nextLine();
                    Member mEdit = gym.cariMember(idEdit);

                    if (mEdit != null) {
                        System.out.println("Data Saat Ini: Nama=" + mEdit.getNama() + ", BB=" + mEdit.getBeratBadan() + "kg, TB=" + mEdit.getTinggiBadan() + "cm, Paket=" + mEdit.getPaket().getNama());
                        System.out.println("Pilih Data yang Ingin Diubah:");
                        System.out.println("1. Nama");
                        System.out.println("2. Berat Badan");
                        System.out.println("3. Tinggi Badan");
                        System.out.println("4. Jenis Paket");
                        System.out.print("Pilihan (1-4): ");
                        int subPilih = scanner.nextInt();
                        scanner.nextLine();

                        switch (subPilih) {
                            case 1:
                                System.out.print("Nama Baru: ");
                                String namaBaru = scanner.nextLine();
                                mEdit.setNama(namaBaru);
                                System.out.println("✅ Nama berhasil diperbarui!");
                                break;
                            case 2:
                                double bbBaru = 0;
                                while (bbBaru <= 0) {
                                    System.out.print("Berat Badan Baru (kg): ");
                                    bbBaru = scanner.nextDouble();
                                    if (bbBaru <= 0) System.out.println("❌ Input harus lebih dari 0!");
                                }
                                mEdit.setBeratBadan(bbBaru);
                                System.out.println("✅ Berat badan berhasil diperbarui!");
                                break;
                            case 3:
                                double tbBaru = 0;
                                while (tbBaru <= 0) {
                                    System.out.print("Tinggi Badan Baru (cm): ");
                                    tbBaru = scanner.nextDouble();
                                    if (tbBaru <= 0) System.out.println("❌ Input harus lebih dari 0!");
                                }
                                mEdit.setTinggiBadan(tbBaru);
                                System.out.println("✅ Tinggi badan berhasil diperbarui!");
                                break;
                            case 4:
                                System.out.print("Nama Paket Baru (Basic/Silver/Gold): ");
                                String pBaru = scanner.nextLine();
                                System.out.print("Harga per Bulan Baru (Rp): ");
                                double hBaru = scanner.nextDouble();
                                mEdit.setPaket(new Paket(pBaru, hBaru));
                                System.out.println("✅ Paket berhasil diperbarui!");
                                break;
                            default:
                                System.out.println("❌ Sub-menu tidak valid.");
                        }
                    } else {
                        System.out.println("❌ Member dengan ID tersebut tidak ditemukan.");
                    }
                    break;

                case 3:
                    System.out.println("\n--- Proses Check-In ---");
                    System.out.print("Masukkan ID Member: ");
                    String idCheckIn = scanner.nextLine();
                    Member mCheckIn = gym.cariMember(idCheckIn);

                    if (mCheckIn != null) {
                        if (mCheckIn.checkIn()) {
                            System.out.println("✅ Check-in Berhasil! Total Kunjungan: " + mCheckIn.getJumlahKunjungan());
                        } else {
                            System.out.println("❌ Check-in Ditolak! Masa aktif member telah habis.");
                        }
                    } else {
                        System.out.println("❌ Member tidak ditemukan.");
                    }
                    break;

                case 4:
                    System.out.println("\n--- Perpanjangan Paket ---");
                    System.out.print("Masukkan ID Member: ");
                    String idPerpanjang = scanner.nextLine();
                    Member mPerpanjang = gym.cariMember(idPerpanjang);

                    if (mPerpanjang != null) {
                        int bulanPerpanjang = 0;
                        while (bulanPerpanjang <= 0) {
                            System.out.print("Jumlah bulan perpanjangan: ");
                            bulanPerpanjang = scanner.nextInt();
                            if (bulanPerpanjang <= 0) System.out.println("❌ Bulan harus lebih dari 0!");
                        }

                        double biayaPerpanjang = mPerpanjang.getPaket().hitungHarga(bulanPerpanjang);
                        mPerpanjang.perpanjang(bulanPerpanjang);

                        System.out.println("✅ Perpanjangan Berhasil!");
                        System.out.println("Biaya tagihan : Rp " + biayaPerpanjang);
                        System.out.println("Sisa Hari Baru: " + mPerpanjang.getSisaHari() + " Hari");
                    } else {
                        System.out.println("❌ Member tidak ditemukan.");
                    }
                    break;

                case 5:
                    System.out.println("\n--- Cek BMI & Rekomendasi Program ---");
                    System.out.print("Masukkan ID Member: ");
                    String idBMI = scanner.nextLine();
                    Member mBMI = gym.cariMember(idBMI);

                    if (mBMI != null) {
                        System.out.printf("Nilai BMI  : %.2f\n", mBMI.hitungBMI());
                        System.out.println("Kategori   : " + mBMI.kategoriBMI());
                        System.out.println("Rekomendasi: " + mBMI.dapatkanRekomendasi());
                    } else {
                        System.out.println("❌ Member tidak ditemukan.");
                    }
                    break;

                case 6:
                    gym.tampilkanLaporan();
                    break;

                case 7:
                    System.out.println("\nTerima kasih telah menggunakan sistem Pusat Kebugaran!");
                    running = false;
                    break;

                default:
                    System.out.println("❌ Pilihan menu tidak valid, silakan coba lagi.");
            }
        }
        scanner.close();
    }
}