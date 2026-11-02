
# Sistem Manajemen Pusat Kebugaran (Gym)

Aplikasi CLI Java (OOP) untuk mengelola member gym, paket langganan,
check-in, perhitungan BMI, dan rekomendasi program latihan.

## Struktur
- model/    → Paket, Member
- service/  → PusatKebugaran
- util/     → InputValidator, RekomendasiProgram
- MainGym   → entry point

## Compile & Run
```bash
javac -d bin src/model/*.java src/service/*.java src/util/*.java src/MainGym.java
java -cp bin MainGym