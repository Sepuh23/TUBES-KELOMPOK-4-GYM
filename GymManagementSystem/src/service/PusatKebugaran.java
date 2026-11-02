package service;

import model.Member;
import java.util.ArrayList;
import java.util.List;

public class PusatKebugaran {
    private List<Member> daftarMember = new ArrayList<>();

    public void daftarMemberBaru(Member m) {
        daftarMember.add(m);
        System.out.println("Member berhasil didaftarkan!");
    }

    public Member cariMember(String id) {
        for (Member m : daftarMember) {
            if (m.getId().equalsIgnoreCase(id)) return m;
        }
        return null;
    }

    public void tampilkanLaporan() {
        System.out.println("\n=== LAPORAN MEMBER ===");
        System.out.printf("%-5s %-15s %-8s %-10s %-10s %-8s%n",
                "ID", "Nama", "BMI", "Kategori", "Kunjungan", "Sisa");
        for (Member m : daftarMember) {
            System.out.printf("%-5s %-15s %-8.2f %-10s %-10d %-8d%n",
                    m.getId(), m.getNama(), m.hitungBMI(),
                    m.kategoriBMI(), m.getJumlahKunjungan(), m.getSisaHari());
        }
    }

    public void memberTerajin() {
        if (daftarMember.isEmpty()) {
            System.out.println("Belum ada member.");
            return;
        }
        Member top = daftarMember.get(0);
        for (Member m : daftarMember) {
            if (m.getJumlahKunjungan() > top.getJumlahKunjungan()) top = m;
        }
        System.out.println("Member terajin: " + top.getNama()
                + " (" + top.getJumlahKunjungan() + " kunjungan)");
    }

    public void cekMasaAktif() {
        System.out.println("\n=== MASA AKTIF ≤ 7 HARI ===");
        boolean ada = false;
        for (Member m : daftarMember) {
            if (m.getSisaHari() <= 7) {
                System.out.println("- " + m.getNama()
                        + " (sisa " + m.getSisaHari() + " hari)");
                ada = true;
            }
        }
        if (!ada) System.out.println("Tidak ada member yang hampir habis.");
    }
}