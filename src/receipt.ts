// The example used throughout the page: one tax receipt, one everyday question.
export type ReceiptRow = { label: string; value: string; personal: boolean };

export const RECEIPT: ReceiptRow[] = [
  { label: "Name", value: "Anna Weber", personal: true },
  { label: "Tax ID", value: "47 036 892 815", personal: true },
  { label: "Address", value: "Lindenstr. 4, Berlin", personal: true },
  { label: "Bank account", value: "DE89 3704 0044 0532", personal: true },
  { label: "Yearly income", value: "€52,400", personal: false },
  { label: "Days worked from home", value: "180", personal: false },
];

export const PERSONAL_COUNT = RECEIPT.filter((r) => r.personal).length;

export const QUESTION = "How much can I get back for working from home?";
export const ANSWER_NAME = "Anna";
export const ANSWER_REST = ", you can claim €1,080 for working from home: 180 days at €6 a day.";
