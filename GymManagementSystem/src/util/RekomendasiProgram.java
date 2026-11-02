package util;

public class RekomendasiProgram {

    public static void beriRekomendasi(String kategori) {
        if (kategori.equals("Kurus")) {
            System.out.println("Rekomendasi: Latihan beban + program bulking.");
        } else if (kategori.equals("Normal")) {
            System.out.println("Rekomendasi: Latihan campuran (kardio + beban).");
        } else if (kategori.equals("Berlebih")) {
            System.out.println("Rekomendasi: Kardio sedang + defisit kalori.");
        } else {
            System.out.println("Rekomendasi: Kardio rutin + konsultasi ahli gizi.");
        }
    }
}