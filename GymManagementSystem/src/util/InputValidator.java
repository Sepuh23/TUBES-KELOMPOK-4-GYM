package util;

import java.util.Scanner;

public class InputValidator {
    private static Scanner sc = new Scanner(System.in);

    public static double inputPositif(String prompt) {
        while (true) {
            try {
                System.out.print(prompt);
                double v = Double.parseDouble(sc.nextLine());
                if (v > 0) return v;
                System.out.println("Harus lebih dari 0.");
            } catch (NumberFormatException e) {
                System.out.println("Input tidak valid.");
            }
        }
    }

    public static int inputIntPositif(String prompt) {
        while (true) {
            try {
                System.out.print(prompt);
                int v = Integer.parseInt(sc.nextLine());
                if (v > 0) return v;
                System.out.println("Harus lebih dari 0.");
            } catch (NumberFormatException e) {
                System.out.println("Input tidak valid.");
            }
        }
    }

    public static String inputString(String prompt) {
        System.out.print(prompt);
        return sc.nextLine();
    }

    public static Scanner getScanner() {
        return sc;
    }
}