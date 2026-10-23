/**
 * Independent masking corpus: hand-written documents, part 2 of 2 (bank
 * statements, emails, chats, forms, tables, OCR-style scans). Same rules and
 * markup as `documents.ts`. The OCR damage in the scan category was typed by
 * hand, document by document; there is no noise model.
 */
import type { HandDocument } from "./documents";

export const DOCUMENTS_PART_2: HandDocument[] = [
  // ───────────────────────────── bank statements ─────────────────────────────
  {
    id: "bank-01",
    category: "bank-statement",
    layout: "online-banking-csv-export",
    language: "de",
    ocr: false,
    note: "Semicolon CSV export with quoted fields: IBANs without spaces inside quotes, SEPA reference fields (EREF, MREF, CRED) and a masked card number as decoys, a phone number inside a payment reference.",
    marked: `"Umsätze Girokonto";"⟦IBAN~compact-quoted|DE67760300800614925837⟧";"Zeitraum: 01.09.2026 - 30.09.2026"
"Kontoinhaber";"⟦NAME|Moritz Lenzen⟧"

"Buchungstag";"Valuta";"Auftraggeber/Empfänger";"Buchungstext";"Verwendungszweck";"Kontonummer/IBAN";"BIC";"Betrag (EUR)"
"01.09.2026";"01.09.2026";"⟦NAME|Gerd Hollmann⟧";"Dauerauftrag";"Miete 09/2026 ⟦ADDR|Hegelstr. 17⟧";"⟦IBAN~compact-quoted|DE24290500003318475920⟧";"NOLADE21MDG";"-797,00"
"01.09.2026";"01.09.2026";"Stadtwerke Magdeburg GmbH";"Lastschrift";"EREF+SWM-2209-118 MREF+M-4471-0092 CRED+DE33ZZZ00000447188 SVWZ+Abschlag Strom 09/2026 Vertragskonto 300448812";"⟦IBAN~compact-quoted|DE66500502010004418273⟧";"HELADEF1822";"-64,00"
"15.09.2026";"15.09.2026";"Brenner Logistik GmbH";"Gehalt/Rente";"LOHN/GEHALT 09/2026 PERS.NR. 004471";"⟦IBAN~compact-quoted|DE34740618900218374650⟧";"GENODEF1PAS";"2.841,77"
"18.09.2026";"18.09.2026";"PayPal Europe";"Lastschrift";"1047552291866 PP.4471.PP . Kleinanzeigen, Ihr Einkauf bei Kleinanzeigen";"⟦IBAN~compact-quoted|LU280019400644750000⟧";"PPLXLUL2";"-35,00"
"22.09.2026";"22.09.2026";"⟦NAME|Jana Petersen⟧";"Echtzeitüberweisung";"Danke fürs Auslegen Konzert, ruf mich an ⟦TEL|0176 1182 4430⟧";"⟦IBAN~compact-quoted|DE04830944950003827164⟧";"BYLADEM1001";"-48,50"
"28.09.2026";"29.09.2026";"VISA Debit";"Kartenzahlung";"VISA Debit 4532 77XX XXXX 6648 EDEKA CENTER 28.09 17:12";"";"";"-83,19"`,
  },
  {
    id: "bank-02",
    category: "bank-statement",
    layout: "app-statement-stacked-entries",
    language: "en",
    ocr: false,
    note: "Mobile-bank statement: each transaction a stacked block with 'To', 'IBAN', 'Reference' lines and the amount on its own line.",
    marked: `Statement — Current account
⟦NAME|Elif Şahin⟧ · ⟦ADDR|Dieselstraße 27, 70469 Stuttgart⟧
IBAN ⟦IBAN|DE08 2004 1133 0302 9184 76⟧ · BIC COBADEHD001
1 Sep 2026 – 30 Sep 2026

Opening balance            €2,418.33

02 Sep  Outgoing transfer
        To ⟦NAME|Volkan Şahin⟧
        IBAN ⟦IBAN|AT47 2011 1829 1937 4655⟧
        Reference: Flug Antalya Rückzahlung
                                          −€340.00
05 Sep  Mastercard · REWE Markt Feuerbach · Stuttgart
                                           −€62.17
15 Sep  Incoming transfer
        From Brenner Logistik GmbH
        IBAN ⟦IBAN|DE82 1605 0000 0019 2837 46⟧
        Reference: Salary 09/2026, employee 2207
                                        +€2,906.40
29 Sep  Outgoing transfer
        To Wohnbau Feuerbach eG
        IBAN ⟦IBAN|DE23 7025 0150 0028 8173 65⟧
        Reference: Rent 10/2026, tenant no. 7712-03, flat 3.2
                                          −€980.00
Closing balance            €3,942.56

Questions about your account? Chat in the app or call ⟦TEL|+49 30 23125 077⟧.`,
  },
  {
    id: "bank-03",
    category: "bank-statement",
    layout: "credit-card-statement",
    language: "de",
    ocr: false,
    note: "Credit card statement printing the full main-card and additional-card numbers; flight ticket number, exchange rate and amounts with trailing minus as decoys.",
    marked: `Kreditkartenabrechnung September 2026
Hanseatische Kartenbank · Postfach 30 12 08 · 20305 Hamburg

⟦NAME|Malte Hinrichsen⟧
⟦ADDR|Isestraße 14, 20249 Hamburg⟧

Kartennummer ⟦CARD|5154 0926 3718 8400⟧ (Mastercard Gold)
Zusatzkarte  ⟦CARD|2223 0031 2200 3040⟧ (⟦NAME|Jana Hinrichsen⟧)
Abrechnungsdatum 25.09.2026   Kreditrahmen 5.000,00 €

Datum  Buchung  Beschreibung                                    Betrag EUR
28.08. 29.08.   LUFTHANSA 2201234567890 FRANKFURT                 412,80-
02.09. 03.09.   HOTEL NORDLICHT TROMSOE NOK 3.420,00 Kurs 11,62   294,32-
02.09. 03.09.   Auslandseinsatzentgelt 1,75 %                       5,15-
14.09. 15.09.   APPLE.COM/BILL ITUNES.COM                          12,99-
22.09. 22.09.   Gutschrift Erstattung LUFTHANSA                    98,40+
Saldo zu Ihren Lasten                                             626,86-

Der Saldo wird am 05.10.2026 von Ihrem Referenzkonto ⟦IBAN|DE33 4401 0046 0387 1205 64⟧ eingezogen.
Karte verloren? Sperr-Hotline ⟦TEL|+49 69 90009 773⟧ (24 h).`,
  },
  {
    id: "bank-04",
    category: "bank-statement",
    layout: "swiss-statement-footnotes",
    language: "mixed",
    ocr: false,
    note: "Swiss statement: apostrophe thousands separators, a 27-digit QR payment reference, footnote markers glued to an Austrian IBAN.",
    marked: `Kontoauszug / Account statement 3/2026                     Seite 1 von 1
Alpenländische Privatbank AG, Zürich
Konto / Account ⟦IBAN|CH22 0839 0037 4652 9182 0⟧   Währung CHF
Inhaberin / Holder: Dr. ⟦NAME|Annemarie Huber-Lechner⟧, ⟦ADDR|Seefeldstrasse 211, 8008 Zürich⟧

Datum    Text                                                   Belastung   Gutschrift   Saldo
01.07.   Saldovortrag                                                                    18'442.10
03.07.   Zahlung an ⟦NAME|L. Huber⟧, ⟦IBAN|AT47 1400 0034 1092 7785⟧¹       1'130.72                 17'311.38
15.07.   Rente AHV                                                          2'205.00     19'516.38
22.07.   Miete August, QR-Ref. 00 00000 00441 88227 30059        2'640.00                 16'876.38
31.07.   Zinsen / Spesen²                                           12.40                 16'863.98

¹ EUR 1'200.00 zum Kurs 0.9381, Spesen CHF 5.00 im Betrag enthalten.
² Kontoführung CHF 15.00, Zinsgutschrift CHF 2.60.
Ihre Kundenberaterin: ⟦NAME|Seraina Caflisch⟧, ⟦TEL|+41 44 718 22 90⟧, ⟦MAIL|s.caflisch@alpenprivatbank.example⟧`,
  },

  // ───────────────────────────── emails ─────────────────────────────
  {
    id: "email-01",
    category: "email",
    layout: "forwarded-chain-quoted",
    language: "en",
    ocr: false,
    note: "Gmail-style forward of a forward: identifiers inside '>' and '>>' quote prefixes, addresses in angle brackets.",
    marked: `From: ⟦NAME|Ravi Subramanian⟧ <⟦MAIL|ravi.s@kettlecrane.example⟧>
Date: Mon, 12 Oct 2026 at 09:41
Subject: Fwd: Fwd: deposit for the flat
To: ⟦NAME|Tilda Marx⟧ <⟦MAIL|tilda.marx@kettlecrane.example⟧>

Tilda, see below — can you check whether accounting paid this? Thanks, R.

---------- Forwarded message ---------
From: ⟦NAME|Gerd Hollmann⟧ <⟦MAIL|gerd.hollmann@posteingang.example⟧>
Date: Fri, 9 Oct 2026 at 17:02
Subject: Fwd: deposit for the flat
To: <⟦MAIL|ravi.s@kettlecrane.example⟧>

Dear Mr ⟦NAME|Subramanian⟧,
the first deposit instalment has not arrived yet. Details again below.
Best regards, G. ⟦NAME|Hollmann⟧

> ---------- Forwarded message ---------
> From: ⟦NAME|Gerd Hollmann⟧ <⟦MAIL|gerd.hollmann@posteingang.example⟧>
> Date: Thu, 1 Oct 2026 at 08:15
> Subject: deposit for the flat
>
> Account holder: ⟦NAME|Gerd Hollmann⟧
> IBAN: ⟦IBAN|DE24 2905 0000 3318 4759 20⟧
> Reference: Kaution ⟦NAME|Subramanian⟧ ⟦ADDR|Hegelstr. 17⟧
> Amount: EUR 612.00
>
> If you prefer to call: ⟦TEL|0391 7340 518⟧ (evenings) or ⟦TEL|0160 4471 2289⟧.
>
>> On 30 Sep 2026, ⟦NAME|Ravi Subramanian⟧ wrote:
>> Could you send me the bank details again? The PDF from the agency
>> only shows "IBAN: see attachment". My phone is ⟦TEL|+49 1520 339 4418⟧.`,
  },
  {
    id: "email-02",
    category: "email",
    layout: "outlook-reply-chain-html-copy",
    language: "de",
    ocr: false,
    note: "Outlook reply chain copied from HTML: no-break spaces inside an IBAN and phone, a soft hyphen inside an email address, a truncated IBAN typed by the customer.",
    marked: `Von: ⟦NAME|Brigitte Sandmann⟧ <⟦MAIL|b.sandmann@hausverwaltung-sandmann.example⟧>
Gesendet: Dienstag, 6. Oktober 2026 11:02
An: '⟦NAME|Jörg Tetzlaff⟧' <⟦MAIL~soft-hyphen|joerg.tetz­laff@funkpost.example⟧>
Cc: Buchhaltung <⟦MAIL|buchhaltung@hausverwaltung-sandmann.example⟧>
Betreff: AW: WG: Nebenkostenabrechnung 2025 – Rückfrage Guthaben

Sehr geehrter Herr ⟦NAME|Tetzlaff⟧,

das Guthaben von 214,37 € überweisen wir auf das in Ihrer Mail genannte Konto. Bitte bestätigen Sie mir kurz die vollständige IBAN, da in Ihrer Nachricht eine Stelle fehlte. Laut unseren Unterlagen lautet sie
⟦IBAN~nbsp|DE68 6809 0000 0046 2738 19⟧ – ist das korrekt?

Mit freundlichen Grüßen
i. A. ⟦NAME|Brigitte Sandmann⟧
Hausverwaltung Sandmann GmbH | ⟦ADDR|Schillerplatz 4 | 79098 Freiburg⟧
Tel. ⟦TEL~nbsp|+49 761 3830 2214⟧ | Fax ⟦TEL|+49 761 3830 2299⟧
Geschäftsführer: ⟦NAME|Arne Sandmann⟧ | Amtsgericht Freiburg HRB 718442 | USt-IdNr. ⟦TAX~vat|DE412850678⟧

Von: ⟦NAME|Jörg Tetzlaff⟧ <⟦MAIL|joerg.tetzlaff@funkpost.example⟧>
Gesendet: Sonntag, 4. Oktober 2026 19:47
An: ⟦MAIL|info@hausverwaltung-sandmann.example⟧
Betreff: WG: Nebenkostenabrechnung 2025 – Rückfrage Guthaben

Hallo,
bitte das Guthaben auf ⟦IBAN~truncated-invalid|DE68 6809 0000 0046 2738 1⟧ überweisen (mein Konto bei der Sparkasse).
Viele Grüße
⟦NAME|Jörg Tetzlaff⟧
Mobil: ⟦TEL|0172 6633 0451⟧`,
  },
  {
    id: "email-03",
    category: "email",
    layout: "agent-email-obfuscated-address",
    language: "en",
    ocr: false,
    note: "Lettings email with an address written as '[at]' and '[dot]', a phone with 0049 and (0), a mobile with a hyphen.",
    marked: `Subject: Viewing on Saturday + documents we need

Hi ⟦NAME|Kemal⟧, hi ⟦NAME|Jana⟧,

great to hear you're still interested in the 2-room flat in ⟦ADDR|Körnerstraße 51⟧. The viewing is on Saturday 17 October at 11:30; ring "Hausmeister ⟦NAME|Bülent⟧" if the door is locked.

For the application I'll need from each of you:
- copy of ID or passport (front and back),
- last three payslips,
- credit report (not older than 3 months),
- the self-disclosure form (attached, 2 pages).

Please don't send these via WhatsApp. Either upload them in our portal (link in the separate email) or email them to me at ⟦MAIL~obfuscated|lena.marquardt [at] wohnwerk-koeln [dot] example⟧ — I write the address like this because our spam filter is a disaster.

If you get lost: ⟦TEL|0049 (0) 221 4710 388⟧, or my mobile ⟦TEL|0175-882 31 46⟧.

Cheers,
⟦NAME|Lena Marquardt⟧
Wohnwerk Köln · Lettings`,
  },
  {
    id: "email-04",
    category: "email",
    layout: "applicant-reply-prose-identifiers",
    language: "mixed",
    ocr: false,
    note: "Identifiers in running prose, half German, half English: tax ID, pension number with spaces, health insurance number, a lower-case IBAN, a birth date written out and numerically, a passport number.",
    marked: `Re: Ihre Unterlagen für den Arbeitsvertrag / your onboarding documents

Hallo Frau ⟦NAME|Pfeiffer⟧,

sorry for the late reply — here is everything HR asked for, I hope plain text is ok:

my Steuer-ID is ⟦TAX~taxid-prose|67024581964⟧, social security number (Rentenversicherung) ⟦INS~rvnr|53 150277 S 509⟧, and I'm insured with the TK under ⟦INS~kvnr|H309582711⟧. Salary please to ⟦IBAN~lowercase|de28 5405 1030 0011 9283 74⟧ (that's my Sparkasse account, the old one is closed).

Date of birth: ⟦DOB~written|15th of February 1977⟧ (⟦DOB|15.02.1977⟧ in my passport).

Mein Reisepass hat die Nummer ⟦IDN~passport|C2FG8LX03⟧, gültig bis 2031.

Viele Grüße / best
⟦NAME|Sabine Ortlieb⟧
⟦TEL|0176 5520 1839⟧`,
  },
  {
    id: "email-05",
    category: "email",
    layout: "hotel-reply-quoting-card-numbers",
    language: "en",
    ocr: false,
    note: "Hotel reply quoting the guest's card numbers (one with dashes), a CVC and expiry dates as decoys, a refund IBAN and a phone ending in a single 0.",
    marked: `Subject: RE: Booking 88231-B — guarantee and refund
From: Reception Hotel Seeblick <⟦MAIL|reception@hotel-seeblick.example⟧>
To: ⟦NAME|Duncan Fairweather⟧ <⟦MAIL|d.fairweather@northmail.example⟧>

Dear Mr ⟦NAME|Fairweather⟧,

thank you for your message. Please note that we cannot keep card details sent by email; we have entered the card below into our payment terminal and deleted your email afterwards.

> Card for the guarantee: ⟦CARD|4532 7781 0293 6648⟧, valid until 11/27, CVC is 402
> If that one fails, use my company card ⟦CARD~dashes|4024-0071-8823-6490⟧ (exp 03/28).

The refund of the deposit for the cancelled second room (EUR 180.00) will go to the account you named, ⟦IBAN|DE04 5125 0000 7700 3192 64⟧, within 5 working days.

Arrival 23.10.2026, departure 26.10.2026, 1 double room lake view, half board.
Our phone, should you need us: ⟦TEL|+49 8821 7302 0⟧.

Kind regards
⟦NAME|Vroni Zellhuber⟧, Front Office
Hotel Seeblick · ⟦ADDR|Seestraße 14, 82467 Garmisch-Partenkirchen⟧`,
  },

  // ───────────────────────────── chats ─────────────────────────────
  {
    id: "chat-01",
    category: "chat",
    layout: "whatsapp-ios-export",
    language: "de",
    ocr: false,
    note: "WhatsApp iOS export: bracketed timestamps, an unsaved contact shown as a phone number in the sender position, a birth date with two-digit year and the label after it, invisible direction mark before a media line.",
    marked: `[14.08.26, 21:03:44] Mama: Hast du schon das Formular für die Krankenkasse ausgefüllt?
[14.08.26, 21:04:10] ⟦NAME|Nele⟧: Fast. Ich brauch noch deine Versichertennummer und Papas Geburtsdatum
[14.08.26, 21:06:31] Mama: Meine steht auf der Karte: ⟦INS~kvnr|S917364022⟧
[14.08.26, 21:06:58] Mama: Papa ist am ⟦DOB~label-after|17.4.58⟧ geboren 🙈 das weißt du doch
[14.08.26, 21:07:12] ⟦NAME|Nele⟧: 😅 danke
[14.08.26, 21:15:40] ⟦TEL~whatsapp-sender|+49 171 5528390⟧: Hallo Nele, hier ist ⟦NAME|Thorsten⟧ vom Sportverein, deine Nummer hab ich von ⟦NAME|Sven⟧. Kannst du mir die IBAN für den Mitgliedsbeitrag schicken?
[14.08.26, 21:18:02] ⟦NAME|Nele⟧: ⟦IBAN~compact|DE83130910540008817263⟧
[14.08.26, 21:18:09] ⟦NAME|Nele⟧: Kontoinhaberin ⟦NAME|Nele Brandstätter⟧
[14.08.26, 21:19:45] ⟦TEL~whatsapp-sender|+49 171 5528390⟧: Super danke! Beitrag ist 96 € im Jahr, Einzug am 01.09.
[14.08.26, 22:40:13] Mama: ‎Bild weggelassen
[15.08.26, 07:02:55] Mama: Ruf mal Tante ⟦NAME|Gisela⟧ an, sie hat eine neue Nummer: ⟦TEL|0152 0447 1960⟧`,
  },
  {
    id: "chat-02",
    category: "chat",
    layout: "messenger-copy-name-time-headers",
    language: "en",
    ocr: false,
    note: "Messenger conversation copied with 'Name, time' header lines: lower-case IBAN, a card number with expiry and CVC typed into a chat, a UK mobile.",
    marked: `⟦NAME|Ollie⟧, 18:02
can u send me your bank details for the festival tickets

Me, 18:03
sure: ⟦IBAN~lowercase|de37 8605 5592 1001 4827 36⟧

⟦NAME|Ollie⟧, 18:05
legend. also the payment page wants a card and mine's blocked, can I use yours?? I'll pay you back tonight

Me, 18:09
ugh ok. ⟦CARD|4916 3381 2290 4575⟧ exp 09/28, the 3 digits on the back are 113

Me, 18:09
delete that after pls

⟦NAME|Ollie⟧, 18:11
done ✅ booked 2× weekend pass, confirmation FX-8823-KL
my new number btw ⟦TEL|07700 900 461⟧ (uk sim)

Me, 18:14
saved. what's ur email for the ticket transfer

⟦NAME|Ollie⟧, 18:15
⟦MAIL|ollie.brennan@fastpost.example⟧`,
  },
  {
    id: "chat-03",
    category: "chat",
    layout: "team-chat-thread",
    language: "mixed",
    ocr: false,
    note: "Workplace chat thread: display names with times, an @channel mention, a ticket number, a company card number posted in the channel.",
    marked: `#office-berlin
⟦NAME|Merve Aksoy⟧  10:42 AM
@channel who has the Hausverwaltung number? the heating is off again 🥶
⟦NAME|Jonas K.⟧  10:44 AM
Hausverwaltung Mertens: ⟦TEL|030 23125 640⟧ (Frau ⟦NAME|Pohl⟧), Notdienst ⟦TEL|0800 3399 112⟧
⟦NAME|Merve Aksoy⟧  10:45 AM
danke!! also does anyone know if the new hire's laptop is ordered? ⟦NAME|Dmitri⟧ starts Monday
⟦NAME|Lea Schubert⟧  10:51 AM
ordered, ticket IT-4471. for the team lunch on Friday use the company card ⟦CARD|6011 0027 4918 3562⟧, exp 07/28. I need Dmitri's Steuer-ID and IBAN for payroll before the 25th though, his mobile is ⟦TEL|0151-2290 4418⟧
⟦NAME|Jonas K.⟧  10:53 AM
pls not in this channel 😬 send it via the HR tool
⟦NAME|Lea Schubert⟧  10:53 AM
true, sorry. deleting in 5`,
  },
  {
    id: "chat-04",
    category: "chat",
    layout: "whatsapp-android-export",
    language: "de",
    ocr: false,
    note: "WhatsApp Android export ('date, time - name: text'): identity card number, a child's birth date written with '*', emoji glued to a phone number, deleted-message and media placeholders.",
    marked: `03.10.26, 14:22 - ⟦NAME|Paula⟧: Brauchst du für die Ummeldung meine Ausweisnummer?
03.10.26, 14:23 - ⟦NAME|Fabian Kühn⟧: ja, und das Geburtsdatum vom Kleinen
03.10.26, 14:25 - ⟦NAME|Paula⟧: Ausweis ⟦IDN|F7K3N2X9P⟧
03.10.26, 14:25 - ⟦NAME|Paula⟧: ⟦NAME|Emil⟧ *⟦DOB~asterisk|02.02.2024⟧ 👶
03.10.26, 14:26 - ⟦NAME|Paula⟧: <Medien ausgelassen>
03.10.26, 14:30 - ⟦NAME|Fabian Kühn⟧: Termin ist Dienstag 9:40 im Bürgeramt Mitte, Wartenummer kriegen wir vor Ort
03.10.26, 14:31 - ⟦NAME|Fabian Kühn⟧: falls was ist 📞⟦TEL|0176 4482 1937⟧
03.10.26, 14:33 - ⟦NAME|Paula⟧: 👍 und schick mir die Mail vom Amt an ⟦MAIL|paula.kuehn@familie-kuehn.example⟧
03.10.26, 14:35 - ⟦NAME|Fabian Kühn⟧: Diese Nachricht wurde gelöscht.`,
  },
  {
    id: "chat-05",
    category: "chat",
    layout: "group-chat-numbers-only",
    language: "de",
    ocr: false,
    note: "Negative control: a team group chat full of times, dates, shirt numbers, money and a registration number, with no identifier of a promised kind.",
    marked: `[Gruppe „E-Jugend Grün-Weiß“]
Di., 06.10. 18:40 – Trainer ⟦NAME|Uwe⟧: Training morgen 17:30–19:00 auf Platz 2, Treffpunkt 17:15 am Kabinentrakt B.
Di., 06.10. 18:42 – ⟦NAME|Sandra⟧ (Mama von ⟦NAME|Luis⟧): ⟦NAME|Luis⟧ kommt erst 17:45, Zahnarzt bis 17:20 😬
Di., 06.10. 18:51 – Trainer ⟦NAME|Uwe⟧: Kein Problem. Samstag Auswärtsspiel in Oberau, Anstoß 10:30, Abfahrt 09:15. Fahrer bisher: 3 Autos, wir brauchen 4.
Di., 06.10. 18:53 – ⟦NAME|Kemal⟧: Ich kann fahren, 4 Plätze frei.
Di., 06.10. 19:02 – Trainer ⟦NAME|Uwe⟧: 👍 Trikots Nr. 4, 7, 11 und 14 sind noch in der Wäsche bei Familie ⟦NAME|Brandt⟧. Bitte bis Freitag zurück!
Di., 06.10. 19:05 – ⟦NAME|Sandra⟧: Mannschaftskasse: jeder 15 € bis 31.10., wir haben 182,50 € von 300 € fürs Turnier am 14.11.
Di., 06.10. 19:07 – Trainer ⟦NAME|Uwe⟧: Ergebnis letzte Woche 3:2, Tabellenplatz 4 mit 13 Punkten aus 7 Spielen. Turnier-Anmeldung Nr. 2026-0418-07, Startgeld 2 × 25 €.`,
  },

  // ───────────────────────────── forms ─────────────────────────────
  {
    id: "form-01",
    category: "form",
    layout: "comb-field-pdf-form",
    language: "de",
    ocr: false,
    note: "PDF form with one-character-per-box fields: the birth date and the IBAN come out as single characters separated by spaces.",
    marked: `Antrag auf Erstattung von Fahrtkosten – Formular FK-3 (Stand 01/2026)

1. Angaben zur antragstellenden Person
Name, Vorname                     Geburtsdatum (TT MM JJJJ)
⟦NAME|MARX, KONRAD⟧                      ⟦DOB~boxed|2 3 0 9 1 9 8 2⟧
Straße, Hausnummer
⟦ADDR|Ulmenstraße 6⟧
PLZ, Ort
⟦ADDR|23552 Lübeck⟧
Telefon (tagsüber)
⟦TEL|0451 70 38 116⟧

2. Bankverbindung (bitte in Druckbuchstaben, ein Zeichen pro Kästchen)
IBAN
⟦IBAN~boxed|D E 2 1 7 9 0 2 0 0 7 6 1 0 2 8 8 3 7 4 6 5⟧
Kreditinstitut
Volksbank Lübeck

3. Fahrten
Datum        von / nach                      km     Zweck
02.09.2026   Lübeck – Hamburg UKE             136    Kontrolltermin
16.09.2026   Lübeck – Hamburg UKE             136    Kontrolltermin
Summe                                         272    × 0,30 € = 81,60 €

Versichertennummer: ⟦INS~kvnr|W048273191⟧
Ort, Datum: Lübeck, 30.09.2026        Unterschrift: ⟦NAME|K. Marx⟧`,
  },
  {
    id: "form-02",
    category: "form",
    layout: "web-form-response-email-us",
    language: "en",
    ocr: false,
    note: "Web-form response notification from the US: MM/DD/YYYY birth date, North American phone formats, a response ID and submission timestamp as decoys.",
    marked: `New response: Volunteer registration – Riverside Half Marathon 2026

Full name: ⟦NAME|Dana Whitcombe⟧
Date of birth (MM/DD/YYYY): ⟦DOB~us-order|04/07/1995⟧
Email: ⟦MAIL|dana.whitcombe@runmail.example⟧
Phone (incl. country code): ⟦TEL|+1 (415) 555-0142⟧
Emergency contact name: ⟦NAME|Morgan Whitcombe⟧
Emergency contact phone: ⟦TEL|+1 415 555 0199⟧
T-shirt size: M
Preferred station: Water station 3 (km 12)
Medical conditions we should know about: asthma, inhaler in bag
I agree to the volunteer terms: Yes
Submitted: 10/11/2026 9:14:02 PM
Response ID: 2_ABaOnudR4k8Kq1Gx-77Sa`,
  },
  {
    id: "form-03",
    category: "form",
    layout: "sepa-mandate-filled",
    language: "de",
    ocr: false,
    note: "Filled-in SEPA direct-debit mandate: creditor ID and mandate reference as decoys, a pupil's birth date after 'geb.'.",
    marked: `SEPA-Lastschriftmandat für wiederkehrende Zahlungen
Zahlungsempfänger: Musikschule Klangfabrik e.V., ⟦ADDR|Brühl 52, 04109 Leipzig⟧
Gläubiger-Identifikationsnummer: DE47ZZZ00001883104
Mandatsreferenz: KF-2026-00318 (wird separat mitgeteilt)

Ich ermächtige die Musikschule Klangfabrik e.V., Zahlungen von meinem Konto mittels Lastschrift einzuziehen. Zugleich weise ich mein Kreditinstitut an, die von der Musikschule auf mein Konto gezogenen Lastschriften einzulösen.

Vorname und Name (Kontoinhaber): ⟦NAME|Ulrike Mahnke⟧
Straße und Hausnummer: ⟦ADDR|Gohliser Straße 19⟧
PLZ und Ort: ⟦ADDR|04155 Leipzig⟧
Kreditinstitut (Name): Sparkasse Leipzig
IBAN: ⟦IBAN|DE44 6605 0101 0029 3847 51⟧

Schülerin: ⟦NAME|Ida Mahnke⟧, geb. ⟦DOB|19.03.2016⟧, Unterricht: Klavier 30 min, Monatsbeitrag 68,00 €
Telefon für Rückfragen: ⟦TEL|0341 9013 3825⟧
Leipzig, 01.10.2026     Unterschrift: ______________`,
  },
  {
    id: "form-04",
    category: "form",
    layout: "residence-permit-form-english-copy",
    language: "en",
    ocr: false,
    note: "Applicant's English copy of a residence-permit form: UK and Austrian passport numbers, ISO and abbreviated-month birth dates, a German tax ID and health insurance number.",
    marked: `Application for a residence permit – applicant's copy (courtesy translation, not an official document)

Section A – Applicant
Surname: ⟦NAME|Okonjo⟧            Given names: ⟦NAME|Chidi Emmanuel⟧
Date of birth: ⟦DOB|1988-02-29⟧            Place of birth: Enugu
Nationality: British
Passport number: ⟦IDN~uk-passport|548213977⟧    Issued: 14 Mar 2022   Expires: 14 Mar 2032
Current address in Germany: ⟦ADDR|Poppelsdorfer Allee 33, 53115 Bonn⟧
Email: ⟦MAIL|c.okonjo@uni-mail.example⟧   Phone: ⟦TEL|+49 228 9128 3301⟧

Section B – Family members accompanying
1. Spouse: ⟦NAME|Hannah Okonjo-Gruber⟧, born ⟦DOB|11 Jun 1990⟧, Austrian, passport ⟦IDN~at-passport|P4471923⟧
2. Child: ⟦NAME|Ada Okonjo⟧, born ⟦DOB|03 Jan 2022⟧, British, passport ⟦IDN~uk-passport|562104883⟧

Section C – Employment
Employer: university hospital, position: postdoctoral researcher, contract until 30 Sep 2029, gross annual salary EUR 61,200.
German tax ID (if known): ⟦TAX~taxid|21497863024⟧
Health insurance: AOK, insurance no. ⟦INS~kvnr|E736501825⟧

Section D – Declaration
I confirm the information above is complete and correct. Signed in Bonn on 2 October 2026.`,
  },
  {
    id: "form-05",
    category: "form",
    layout: "checkout-review-page-copy",
    language: "de",
    ocr: false,
    note: "Online shop's order review page copied as text: card number without spaces, article numbers and a voucher code as decoys, birth date for an age check.",
    marked: `Bestellübersicht – bitte prüfen Sie Ihre Angaben

Lieferadresse                                  Ändern
⟦NAME|Hannelore Siebert⟧
⟦ADDR|Am Kirchberg 2
96047 Bamberg⟧
Telefon für Rückfragen: ⟦TEL|0951 2083 3317⟧
E-Mail: ⟦MAIL|h.siebert@bamberg-post.example⟧

Zahlungsart: Kreditkarte                       Ändern
Karteninhaber: ⟦NAME|HANNELORE SIEBERT⟧
Kartennummer: ⟦CARD~compact|4556103948277134⟧
Gültig bis: 08/29   Prüfnummer: •••

Geburtsdatum (für die Altersprüfung): ⟦DOB|30.06.1953⟧

Artikel                         Art.-Nr.          Menge   Preis
Gartenschere Bypass 21 cm       4471-0093-22      1       24,95 €
Rosendünger 2,5 kg              4471-1180-07      2       17,98 €
Gutscheincode HERBST26                                    -5,00 €
Versand                                                    4,95 €
Gesamt                                                    42,88 €

[ Zahlungspflichtig bestellen ]`,
  },

  // ───────────────────────────── tables ─────────────────────────────
  {
    id: "table-01",
    category: "table",
    layout: "spreadsheet-rows-pasted-tsv",
    language: "de",
    ocr: false,
    note: "Member list pasted from a spreadsheet as tab-separated rows; birth dates identifiable only by the column header.",
    marked: `Mitgliederliste TSV Grün-Weiß Auental – Stand 10/2026 (aus Excel kopiert)
Nr\tNachname\tVorname\tGeb.-Datum\tStraße\tPLZ Ort\tTelefon\tE-Mail\tIBAN\tBeitrag
1\t⟦NAME|Albrecht⟧\t⟦NAME|Paul⟧\t⟦DOB~table|14.03.2012⟧\t⟦ADDR|Lindenweg 4⟧\t⟦ADDR|79504 Auental⟧\t⟦TEL|07641 55 81 20⟧\t⟦MAIL|familie.albrecht@auental-mail.example⟧\t⟦IBAN|DE03 3704 0044 0532 9910 47⟧\t96,00
2\t⟦NAME|Berisha⟧\t⟦NAME|Drita⟧\t⟦DOB~table|02.09.1979⟧\t⟦ADDR|Mühlgasse 11⟧\t⟦ADDR|79504 Auental⟧\t⟦TEL|0160 9921 4437⟧\t⟦MAIL|drita.b@auental-mail.example⟧\t⟦IBAN~compact|DE58760501010011827364⟧\t144,00
3\t⟦NAME|Corvinus⟧\t⟦NAME|Theo⟧\t⟦DOB~table|30.11.2015⟧\t⟦ADDR|Am Sportplatz 2⟧\t⟦ADDR|79508 Auental-Oberau⟧\t⟦TEL|07641 55 90 03⟧\t⟦MAIL|corvinus.eltern@auental-mail.example⟧\t⟦IBAN|DE30 1002 0500 0003 3184 72⟧\t72,00
4\t⟦NAME|Demir⟧\t⟦NAME|Can⟧\t⟦DOB~table|07.07.2011⟧\t⟦ADDR|Rebenweg 8a⟧\t⟦ADDR|79504 Auental⟧\t⟦TEL|0179 2283 1046⟧\t⟦MAIL|can.demir11@auental-mail.example⟧\t⟦IBAN~compact|DE43520604100004471028⟧\t96,00
5\t⟦NAME|Esposito⟧\t⟦NAME|Chiara⟧\t⟦DOB~table|19.05.1984⟧\t⟦ADDR|Hauptstraße 140⟧\t⟦ADDR|79504 Auental⟧\t⟦TEL|0157 7730 2251⟧\t⟦MAIL|chiara.esposito@auental-mail.example⟧\t⟦IBAN|IT54 K030 6909 6061 0000 0017 452⟧\t144,00`,
  },
  {
    id: "table-02",
    category: "table",
    layout: "payroll-csv-comma",
    language: "en",
    ocr: false,
    note: "Comma-separated payroll export with snake_case headers: ISO birth dates, compact pension numbers, health insurance numbers, compact IBANs.",
    marked: `employee_id,last_name,first_name,dob,tax_id,ss_no,health_ins_no,iban,email
E-0107,⟦NAME|Mertens⟧,⟦NAME|Felix⟧,⟦DOB~iso|1965-07-18⟧,⟦TAX~taxid|46830159240⟧,⟦INS~rvnr-compact|28180765M008⟧,⟦INS~kvnr|G583019479⟧,⟦IBAN~compact|DE36280501000091827364⟧,⟦MAIL|f.mertens@fernwerk.example⟧
E-0112,⟦NAME|Haddad⟧,⟦NAME|Rania⟧,⟦DOB~iso|1993-08-22⟧,⟦TAX~taxid|70513928479⟧,⟦INS~rvnr-compact|15220893H534⟧,⟦INS~kvnr|P207483169⟧,⟦IBAN~compact|DE81120965970001827340⟧,⟦MAIL|r.haddad@fernwerk.example⟧
E-0120,⟦NAME|Lindgren⟧,⟦NAME|Olivia⟧,⟦DOB~iso|2001-05-09⟧,⟦TAX~taxid|13968250416⟧,⟦INS~rvnr-compact|42090501L511⟧,⟦INS~kvnr|A903618245⟧,⟦IBAN~compact|DE36250501800009182734⟧,⟦MAIL|o.lindgren@fernwerk.example⟧
E-0131,⟦NAME|Kaya⟧,⟦NAME|Selin⟧,⟦DOB~iso|1991-09-23⟧,⟦TAX~taxid|98204371694⟧,⟦INS~rvnr-compact|65230991K523⟧,⟦INS~kvnr|Z318472060⟧,⟦IBAN~compact|DE23641500200001029384⟧,⟦MAIL|s.kaya@fernwerk.example⟧`,
  },
  {
    id: "table-03",
    category: "table",
    layout: "markdown-pipe-table",
    language: "de",
    ocr: false,
    note: "Markdown table of a family's documents: identity card and passport numbers without labels next to them (only the column header), tax IDs in the last column.",
    marked: `Unterlagen Familie ⟦NAME|Voss⟧ – Übersicht für den Notartermin

| Person | Geburtsdatum | Dokument | Nummer | gültig bis | Steuer-ID |
|---|---|---|---|---|---|
| ⟦NAME|Jens Voss⟧ | ⟦DOB~table|04.04.1976⟧ | Personalausweis | ⟦IDN~table|N4G7KC2X1⟧ | 03/2031 | ⟦TAX~taxid|85139702687⟧ |
| ⟦NAME|Karin Voss⟧ | ⟦DOB~table|17.10.1978⟧ | Reisepass | ⟦IDN~table-passport|CJ8Y3T0R6⟧ | 11/2029 | ⟦TAX~taxid|62471803564⟧ |
| ⟦NAME|Lotta Voss⟧ | ⟦DOB~table|28.02.2010⟧ | Reisepass | ⟦IDN~table-passport|CVN52H7L0⟧ | 06/2027 | ⟦TAX~taxid|41702839642⟧ |
| ⟦NAME|Henning Voss⟧ | ⟦DOB~table|09.12.2013⟧ | Personalausweis | ⟦IDN~table|W1RX9F0M3⟧ | 01/2030 | ⟦TAX~taxid|83026194780⟧ |

Notar Dr. ⟦NAME|Ehrenfried Kalb⟧, ⟦ADDR|Domshof 21, 28195 Bremen⟧, Termin 29.10.2026 10:00, Urkundenrolle Nr. 1288/2026.`,
  },
  {
    id: "table-04",
    category: "table",
    layout: "ascii-box-table",
    language: "mixed",
    ocr: false,
    note: "Fixed-width table drawn with + - | characters, as pasted from a terminal or old ERP system: IBANs and phones between pipes, a Dutch mobile.",
    marked: `+----------------------+------------------------------+--------------+------------------+
| Mieter / Tenant      | IBAN                         | Miete / Rent | Telefon / Phone  |
+----------------------+------------------------------+--------------+------------------+
| ⟦NAME|Ahmadi, Farid⟧        | ⟦IBAN|DE52 8601 0090 0553 8104 47⟧  |     745,00 € | ⟦TEL|0341 5520 9917⟧   |
| ⟦NAME|Beckmann, Uta⟧        | ⟦IBAN|NL60 RABO 0312 9374 65⟧       |     690,00 € | ⟦TEL|+31 6 1840 2273⟧  |
| ⟦NAME|Chen, Wei⟧            | ⟦IBAN|DE27 1007 0024 0553 8172 64⟧  |     812,50 € | ⟦TEL|0157 8823 0461⟧   |
+----------------------+------------------------------+--------------+------------------+
| Summe / Total        |                              |   2.247,50 € |                  |
+----------------------+------------------------------+--------------+------------------+
Objekt: ⟦ADDR|Eisenbahnstraße 101, 04315 Leipzig⟧ · Hausverwaltung Ost, Objekt-Nr. 0441-2207`,
  },
  {
    id: "table-05",
    category: "table",
    layout: "inventory-tsv-negative-control",
    language: "en",
    ocr: false,
    note: "Negative control: stock list with EAN barcodes, SKUs, lot numbers, customs codes and ISO dates, no identifier of a promised kind.",
    marked: `SKU\tEAN\tDescription\tStock\tUnit price\tLot\tCustoms code\tLast count
GW-0418-22\t4260712839112\tGarden hose 20 m\t118\t24.95\tLOT 2026 0918 4471\t3917 3200\t2026-10-01
GW-0418-23\t4260712839129\tHose reel, wall mounted\t41\t39.90\tLOT 2026 0907 1182\t8424 9000\t2026-10-01
GW-1180-07\t4250366812751\tRose fertiliser 2.5 kg\t260\t8.99\tLOT 2026 0822 0336\t3105 1000\t2026-09-30
GW-2207-01\t4250366812768\tBypass pruner 21 cm\t77\t24.95\tLOT 2026 0715 9920\t8201 5000\t2026-09-30
GW-3302-11\t4006381300172\tCompost thermometer\t12\t11.49\tLOT 2025 1203 0041\t9025 1980\t2026-09-29
Total units\t\t\t508\t\t\t\t
Order ref. 302-5518230-7716642 / supplier no. 700 4471 22 / pallet SSCC 340434161094042557`,
  },

  // ───────────────────────────── OCR-style scans (damage typed by hand) ─────────────────────────────
  {
    id: "scan-01",
    category: "scan-ocr",
    layout: "id-card-front-back-ocr",
    language: "de",
    ocr: true,
    note: "Identity card, front and back, as OCR returns it: 'l' for '1' in the printed card number, 'O' for '0' in the birth date and postcode, umlauts lost, a clean machine-readable zone.",
    marked: `BUNDESREPUBL1K DEUTSCHLAND    PERSONALAUSWEIS
IDENTITY CARD CARTE D'IDENTITE        ⟦IDN~ocr|LZ6R93Kl7⟧
Name/Surname/Nom
⟦NAME|KOWALCZYK⟧
Vornamen/Given names/Prenoms
⟦NAME|MARTA ELZBIETA⟧
Geburtstag/Date of birth/Date de naissance      Staatsangehorigkeit/Nationality
⟦DOB~ocr|17.O4.1988⟧                                       DEUTSCH
Geburtsort/Place of birth
GLEIWITZ
Gultig bis/Date of expiry
12.09.2033

Anschrift/Address
⟦ADDR|4O1O9 LEIPZIG
KARL-LIEBKNECHT-STR. 1O7⟧
Grosse/Height 168 cm   Augenfarbe/Colour of eyes GRUN
IDD<<⟦IDN~mrz|LZ6R93K17⟧7<<<<<<<<<<<<<<<
⟦DOB~mrz|880417⟧8<3309128D<<<<<<<<<<<<<8
⟦NAME|KOWALCZYK<<MARTA<ELZBIETA⟧<<<<<`,
  },
  {
    id: "scan-02",
    category: "scan-ocr",
    layout: "passport-ocr-label-block-then-values",
    language: "de",
    ocr: true,
    note: "Passport data page where OCR read the label column first and the value column afterwards, so the birth date sits five lines below its label; passport machine-readable zone.",
    marked: `REISEPASS PASSPORT PASSEPORT      BUNDESREPUBLIK DEUTSCHLAND
Typ/Type   Kode/Code   Pass-Nr./Passport No.
P          D           ⟦IDN|C7NK2RW48⟧
1. Name/Surname
⟦NAME|ACHTERBERG⟧
2. Vornamen/Given names
⟦NAME|JOHANNA⟧
3. Staatsangehörigkeit/Nationality      DEUTSCH
4. Geburtstag/Date of birth
5. Geschlecht/Sex
6. Geburtsort/Place of birth
7. Ausstellungsdatum/Date of issue
8. Gültig bis/Date of expiry
⟦DOB~reading-order|26.02.1991⟧
F
KASSEL
16.07.2021
15.07.2031
P<D<<⟦NAME|ACHTERBERG<<JOHANNA⟧<<<<<<<<<<<<<<<<<<<<
⟦IDN~mrz|C7NK2RW48⟧5D<<⟦DOB~mrz|910226⟧2F3107151<<<<<<<<<<<<<<04`,
  },
  {
    id: "scan-03",
    category: "scan-ocr",
    layout: "bank-letter-poor-ocr",
    language: "de",
    ocr: true,
    note: "Poor scan of a bank letter: O for 0 and l for 1 throughout, an IBAN broken across two lines, a hyphenated label split across a line break before the tax ID.",
    marked: `Sparkasse Hanau · Am Markt 1 · 63450 Hanau
Frau
⟦NAME|Ute Schafer-Dornbusch⟧
⟦ADDR|Wilhelmstrasse 4O
63452 Hanau⟧
                                   Ihr Zeichen       Unser Zeichen      Datum
                                                     KR/4471            O7.1O.2O26
Ihr Darlehenskonto 70l 448 213

Sehr geehrte Frau ⟦NAME|Schafer-Dornbusch⟧,
die Rate von 412,5O EUR wird ab dem O1.11.2O26 von lhrem Girokonto
⟦IBAN~ocr-wrapped|DE3l 43O6 O967 1187
2O65 4O⟧ eingezogen.
Fur den Freistellungsauftrag benotigen wir lhre steuerliche ldentifikations-
nummer: ⟦TAX~ocr|2958O37l629⟧.
Bei Fragen erreichen Sie uns unter Tel. ⟦TEL~ocr|O6181 2O9-3318⟧.`,
  },
  {
    id: "scan-04",
    category: "scan-ocr",
    layout: "uk-invoice-scan-ocr",
    language: "en",
    ocr: true,
    note: "Scanned UK invoice: 'rn' for 'm' in an email address, a comma for the dot in another, O for 0 in an IBAN and phone; UK VAT registration and sort code as decoys (not promised kinds).",
    marked: `INVOlCE                                   No. 2026/118
Harbour Lane Studio Ltd
⟦ADDR|12 Quay Street, Bristol BS1 4DJ⟧
VAT Reg. GB 312 4471 82
Bill to                         Date
⟦NAME|Maria Kettner⟧                    O3/1O/2026
⟦ADDR|Kirchgasse 7, 65183 Wiesbaden⟧
Description                 Qty     Unit       Total
Photo retouching            24      £12.5O     £3OO.OO
Colour grading, 2 reels     2       £18O.OO    £36O.OO
Total                                          £66O.OO
Paid by card ending 9O24 on O3/1O/2026 – thank you
Bank: ⟦IBAN~ocr|GB74 BUKB 2O2O 1555 839O 27⟧ (sort code 2O-2O-15)
Your contact: ⟦NAME|rnartin Ellis⟧, ⟦MAIL~ocr|rnartin.ellis@harbourlane.example⟧
Studio: ⟦MAIL~ocr|studio@harbourlane,example⟧ · ⟦TEL~ocr|+44 117 496 O418⟧`,
  },
  {
    id: "scan-05",
    category: "scan-ocr",
    layout: "fax-medical-form-ocr",
    language: "de",
    ocr: true,
    note: "Faxed hospital form: fax header line with the sender's number, 'rn' for 'm' in a word, damaged birth date, health insurance and pension numbers with O and l.",
    marked: `09.1O.2O26 11:52  FAX ⟦TEL~ocr|O345 22lO 4439⟧   Klinikum am Weinberg   S. 1/1
Kostenubernahrneantrag Anschlussheilbehandlung (AHB)
Versicherte/r: ⟦NAME|Ostrowski, Barbel⟧        geb. ⟦DOB~ocr|3l.12.1968⟧
Anschrift: ⟦ADDR|Am Hang 2, O6116 Halle⟧
Krankenkasse: IKK   Vers.-Nr. ⟦INS~ocr|N2948lO659⟧
Rentenvers.-Nr. ⟦INS~ocr-rvnr|O4 3ll268 B O29⟧
Diagnose: Z.n. Knie-TEP re. (Z96.6S) am 3O.O9.2O26
Ruckfragen Sozialdienst Frau ⟦NAME|Kuhnel⟧ ⟦TEL~ocr|O345 22lO 4462⟧`,
  },
  {
    id: "scan-06",
    category: "scan-ocr",
    layout: "phone-screenshot-banking-app-ocr",
    language: "de",
    ocr: true,
    note: "Text recognised from a phone screenshot of a banking app: status bar, back arrow, labels and values on separate lines, a button label.",
    marked: `21:47 ⚡ 87 %
‹ Zurück      Überweisung prüfen
Empfänger
⟦NAME|Lotte Brinkmann⟧
IBAN
⟦IBAN|DE41 2655 0105 1913 6428 07⟧
Betrag
250,00 €
Verwendungszweck
Anteil Geburtstagsgeschenk Oma
Ausführung
Sofort (Echtzeitüberweisung)
[ Jetzt senden ]`,
  },
];
