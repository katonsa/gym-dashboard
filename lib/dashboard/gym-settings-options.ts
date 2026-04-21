export const gymTimezoneOptions = [
  { value: "UTC", label: "UTC" },
  { value: "Asia/Jakarta", label: "Jakarta (Asia/Jakarta)" },
  { value: "Asia/Singapore", label: "Singapore (Asia/Singapore)" },
  { value: "Asia/Bangkok", label: "Bangkok (Asia/Bangkok)" },
  { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (Asia/Kuala_Lumpur)" },
  { value: "Asia/Manila", label: "Manila (Asia/Manila)" },
  { value: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh City (Asia/Ho_Chi_Minh)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (Asia/Hong_Kong)" },
  { value: "Asia/Shanghai", label: "Shanghai (Asia/Shanghai)" },
  { value: "Asia/Tokyo", label: "Tokyo (Asia/Tokyo)" },
  { value: "Asia/Seoul", label: "Seoul (Asia/Seoul)" },
  { value: "Australia/Sydney", label: "Sydney (Australia/Sydney)" },
  { value: "Europe/London", label: "London (Europe/London)" },
  { value: "America/New_York", label: "New York (America/New_York)" },
  { value: "America/Los_Angeles", label: "Los Angeles (America/Los_Angeles)" },
] as const

export const gymCurrencyOptions = [
  { value: "IDR", label: "IDR - Indonesian rupiah" },
  { value: "USD", label: "USD - US dollar" },
  { value: "SGD", label: "SGD - Singapore dollar" },
  { value: "MYR", label: "MYR - Malaysian ringgit" },
  { value: "PHP", label: "PHP - Philippine peso" },
  { value: "THB", label: "THB - Thai baht" },
  { value: "VND", label: "VND - Vietnamese dong" },
  { value: "JPY", label: "JPY - Japanese yen" },
  { value: "KRW", label: "KRW - South Korean won" },
  { value: "AUD", label: "AUD - Australian dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British pound" },
] as const

export const gymTimezoneValues = gymTimezoneOptions.map(
  (option) => option.value
)

export const gymCurrencyValues = gymCurrencyOptions.map(
  (option) => option.value
)

export type GymTimezone = (typeof gymTimezoneValues)[number]
export type GymCurrencyCode = (typeof gymCurrencyValues)[number]
