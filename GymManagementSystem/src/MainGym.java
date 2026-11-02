import model.Member;
import model.Paket;
import service.PusatKebugaran;
import util.InputValidator;
import util.RekomendasiProgram;

import java.util.Scanner;

public class MainGym {
    static PusatKebugaran pusat = new PusatKebugaran();
    static Scanner sc = InputValidator.getScanner();

    public static void main(String[] args) {
        int pilihan;
        do {
            System.out.println("\n=== MENU GYM ===");
            System.out.println("1. Daftar Member Baru");
            System.out.println("2. Check-in");
            System.out.println("3. Perpanjang Paket");
            System.out.println("4. Cek BMI & Rekomendasi");
            System.out.println("5. Laporan");
            System.out.println("6. Member Terajin");
            System.out.println("7. Cek Masa Aktif");
            System.out.println("0. Keluar");
            System.out.print("Pilih: ");
            pilihan = Integer.parseInt(sc.nextLine());

            switch (pilihan) {
                case 1: menuDaftar(); break;
                case 2: menuCheckIn(); break;
                case 3: menuPerpanjang(); break;
                case 4: menuCekBMI(); break;
                case 5: pusat.tampilkanLaporan(); break;
                case 6: pusat.memberTerajin(); break;
                case 7: pusat.cekMasaAktif(); break;
                case 0: System.out.println("Terima kasih!"); break;
                default: System.out.println("Pilihan tidak valid.");
            }
        } while (pilihan != 0);
    }

    static void menuDaftar() {
        String id   = InputValidator.inputString("ID: ");
        String nama = InputValidator.inputString("Nama: ");
        double berat  = InputValidator.inputPositif("Berat (kg): ");
        double tinggi = InputValidator.inputPositif("Tinggi (cm): ");

        String namaPaket = InputValidator.inputString("Paket (Basic/Silver/Gold): ");
        double harga;
        if (namaPaket.equalsIgnoreCase("Gold"))       harga = 500000;
        else if (namaPaket.equalsIgnoreCase("Silver")) harga = 300000;
        else { namaPaket = "Basic"; harga = 150000; }

        Paket paket = new Paket(namaPaket, harga);
        Member m = new Member(id, nama, berat, tinggi, paket);

        int bulan = InputValidator.inputIntPositif("Lama langganan (bulan): ");
        m.perpanjang(bulan);
        pusat.daftarMemberBaru(m);
        System.out.printf("Total bayar: Rp %.0f%n", paket.hitungHarga(bulan));
    }

    static void menuCheckIn() {
        String id = InputValidator.inputString("ID member: ");
        Member m = pusat.cariMember(id);
        if (m == null) { System.out.println("Member tidak ditemukan."); return; }
        if (m.checkIn())
            System.out.println("Check-in berhasil. Sisa hari: " + m.getSisaHari());
        else
            System.out.println("Gagal: masa aktif habis, silakan perpanjang.");
    }

    static void menuPerpanjang() {
        String id = InputValidator.inputString("ID member: ");
        Member m = pusat.cariMember(id);
        if (m == null) { System.out.println("Member tidak ditemukan."); return; }
        int bulan = InputValidator.inputIntPositif("Jumlah bulan: ");
        m.perpanjang(bulan);
        System.out.printf("Perpanjangan berhasil. Total: Rp %.0f%n",
                m.getPaket().hitungHarga(bulan));
    }

    static void menuCekBMI() {
        String id = InputValidator.inputString("ID member: ");
        Member m = pusat.cariMember(id);
        if (m == null) { System.out.println("Member tidak ditemukan."); return; }
        System.out.printf("BMI: %.2f (%s)%n", m.hitungBMI(), m.kategoriBMI());
        RekomendasiProgram.beriRekomendasi(m.kategoriBMI());
    }
}