import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  // Default locale — will be made dynamic (e.g. per-user setting) later
  const locale = "de";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
