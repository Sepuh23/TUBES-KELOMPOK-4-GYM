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