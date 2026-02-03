export function numberToTurkishWords(amount: number): string {
    const birler = ["", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz"];
    const onlar = ["", "On", "Yirmi", "Otuz", "Kırk", "Elli", "Altmış", "Yetmiş", "Seksen", "Doksan"];
    const binler = ["", "Bin", "Milyon", "Milyar", "Trilyon"];

    if (amount === 0) return "Sıfır";

    const integerPart = Math.floor(amount);
    let decimalPart = Math.round((amount - integerPart) * 100);

    // If decimal part has 3 digits due to float precision, trim it
    if (decimalPart >= 100) decimalPart = 99;

    const convertGroup = (n: number): string => {
        let str = "";
        const hundreds = Math.floor(n / 100);
        const tens = Math.floor((n % 100) / 10);
        const ones = n % 10;

        if (hundreds > 0) {
            str += (hundreds > 1 ? birler[hundreds] + " " : "") + "Yüz ";
        }
        if (tens > 0) {
            str += onlar[tens] + " ";
        }
        if (ones > 0) {
            str += birler[ones] + " ";
        }
        return str.trim();
    };

    let result = "";
    let strAmount = integerPart.toString();

    // Pad to multiple of 3
    while (strAmount.length % 3 !== 0) {
        strAmount = "0" + strAmount;
    }

    const groups = [];
    for (let i = 0; i < strAmount.length; i += 3) {
        groups.push(parseInt(strAmount.substr(i, 3)));
    }

    for (let i = 0; i < groups.length; i++) {
        const groupValue = groups[i];
        const groupIndex = groups.length - 1 - i;

        if (groupValue > 0) {
            let groupText = convertGroup(groupValue);

            // Special case for "Bir Bin" -> "Bin"
            if (groupIndex === 1 && groupValue === 1) {
                groupText = "Bin";
            } else if (groupIndex > 0) {
                groupText += " " + binler[groupIndex];
            } else {
                // For the last group (ones)
            }

            result += groupText + " ";
        }
    }

    result = result.trim() + " Türk Lirası";

    if (decimalPart > 0) {
        result += ", " + convertGroup(decimalPart) + " Kuruş";
    }

    return result;
}
