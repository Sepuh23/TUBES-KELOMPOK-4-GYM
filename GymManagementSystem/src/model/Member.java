package model;

public class Member {
    private String id;
    private String nama;
    private double beratBadan;   // kg
    private double tinggiBadan;  // cm
    private Paket paket;
    private int sisaHari;
    private int jumlahKunjungan;

    public Member(String id, String nama, double beratBadan,
                  double tinggiBadan, Paket paket) {
        this.id = id;
        this.nama = nama;
        this.beratBadan = beratBadan;
        this.tinggiBadan = tinggiBadan;
        this.paket = paket;
        this.sisaHari = 0;
        this.jumlahKunjungan = 0;
    }

    public double hitungBMI() {
        double t = tinggiBadan / 100.0;
        return beratBadan / (t * t);
    }

    public String kategoriBMI() {
        double bmi = hitungBMI();
        if (bmi < 18.5) return "Kurus";
        else if (bmi < 25) return "Normal";
        else if (bmi < 30) return "Berlebih";
        else return "Obesitas";
    }

    public boolean checkIn() {
        if (sisaHari <= 0) return false;
        jumlahKunjungan++;
        sisaHari--;
        return true;
    }

    public void perpanjang(int bulan) {
        sisaHari += bulan * 30;
    }

    public String getId() { return id; }
    public String getNama() { return nama; }
    public Paket getPaket() { return paket; }
    public int getSisaHari() { return sisaHari; }
    public int getJumlahKunjungan() { return jumlahKunjungan; }
}