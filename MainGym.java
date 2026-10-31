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

    public double getHargaPerBulan() {
        return hargaPerBulan;
    }

    public double hitungHarga(int bulan) {
        double total = hargaPerBulan * bulan;
        if (bulan >= 12) {
            total *= 0.90; // Diskon 10%
        } else if (bulan >= 6) {
            total *= 0.95; // Diskon 5%
        }
        return total;
    }
}

// 2. Class Member
class Member {
    private String id;
    private String nama;
    private double beratBadan; // kg
    private double tinggiBadan; // cm
    private Paket paket;
    private int sisaHari;
    private int jumlahKunjungan;

    public Member(String id, String nama, double beratBadan, double tinggiBadan, Paket paket, int bulanAwal) {
        this.id = id;
        this.nama = nama;
        this.beratBadan = beratBadan;
        this.tinggiBadan = tinggiBadan;
        this.paket = paket;
        this.sisaHari = bulanAwal * 30;
        this.jumlahKunjungan = 0;
    }

    public String getId() { return id; }
    public String getNama() { return nama; }
    public double getBeratBadan() { return beratBadan; }
    public double getTinggiBadan() { return tinggiBadan; }
    public Paket getPaket() { return paket; }
    public int getSisaHari() { return sisaHari; }
    public int getJumlahKunjungan() { return jumlahKunjungan; }

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

    public String rekomendasiProgram() {
        String kategori = kategoriBMI();
        if (kategori.equals("Kurus")) {
            return "Program Pembentukan Otot (Hypertrophy) & Diet Surplus Kalori";
        } else if (kategori.equals("Normal")) {
            return "Program Pembentukan & Pemeliharaan Kebugaran (Maintenance)";
        } else if (kategori.equals("Berlebih")) {
            return "Program Kardio & Defisit Kalori Ringan";
        } else {
            return "Program Penurunan Berat Badan Intensif & Kardio Low-Impact";
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
        sisaHari += bulan * 30;
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
            System.out.println("2. Check-In Member");
            System.out.println("3. Perpanjang Paket");
            System.out.println("4. Cek BMI & Rekomendasi");
            System.out.println("5. Tampilkan Laporan");
            System.out.println("6. Keluar Program");
            System.out.print("Pilih menu (1-6): ");

            int pilihan = scanner.nextInt();
            scanner.nextLine(); // Clear buffer newline

            switch (pilihan) {
                case 1:
                    System.out.println("\n--- Pendaftaran Member Baru ---");
                    System.out.print("ID Member       : ");
                    String id = scanner.nextLine();
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
                    scanner.nextLine(); // Clear buffer setelah input double

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
                    scanner.nextLine(); // Clear buffer akhir case 1

                    Paket paketBaru = new Paket(namaPaket, harga);
                    double totalHarga = paketBaru.hitungHarga(durasi);
                    System.out.println("Total Bayar (setelah diskon): Rp " + totalHarga);

                    Member memberBaru = new Member(id, nama, bb, tb, paketBaru, durasi);
                    gym.tambahMember(memberBaru);
                    break;

                case 2:
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

                case 3:
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
                        scanner.nextLine(); // Clear buffer

                        double biayaPerpanjang = mPerpanjang.getPaket().hitungHarga(bulanPerpanjang);
                        mPerpanjang.perpanjang(bulanPerpanjang);

                        System.out.println("✅ Perpanjangan Berhasil!");
                        System.out.println("Biaya tagihan : Rp " + biayaPerpanjang);
                        System.out.println("Sisa Hari Baru: " + mPerpanjang.getSisaHari() + " Hari");
                    } else {
                        System.out.println("❌ Member tidak ditemukan.");
                    }
                    break;

                case 4:
                    System.out.println("\n--- Cek BMI & Rekomendasi Program ---");
                    System.out.print("Masukkan ID Member: ");
                    String idBMI = scanner.nextLine();
                    Member mBMI = gym.cariMember(idBMI);

                    if (mBMI != null) {
                        System.out.printf("Nilai BMI  : %.2f\n", mBMI.hitungBMI());
                        System.out.println("Kategori   : " + mBMI.kategoriBMI());
                        System.out.println("Rekomendasi: " + mBMI.rekomendasiProgram()); // Fix method call name
                    } else {
                        System.out.println("❌ Member tidak ditemukan.");
                    }
                    break;

                case 5:
                    gym.tampilkanLaporan();
                    break;

                case 6:
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
