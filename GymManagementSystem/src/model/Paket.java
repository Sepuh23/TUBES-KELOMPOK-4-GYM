package model;

public class Paket {
    private String nama;
    private double hargaPerBulan;

    public Paket(String nama, double hargaPerBulan) {
        this.nama = nama;
        this.hargaPerBulan = hargaPerBulan;
    }

    public double hitungHarga(int bulan) {
        double total = hargaPerBulan * bulan;
        if (bulan >= 12)      total *= 0.90; // diskon 10%
        else if (bulan >= 6)  total *= 0.95; // diskon 5%
        return total;
    }

    public String getNama() { return nama; }
    public double getHargaPerBulan() { return hargaPerBulan; }
}