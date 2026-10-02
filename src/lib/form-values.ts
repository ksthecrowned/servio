/** Raw form fields keyed by name, as typed (checkboxes: "on" when ticked). */
export type FormValues<K extends string> = Partial<Record<K, string>>;

/**
 * Picks what was typed in a form, to send back alongside an error: React
 * resets a form after its action runs, so without this a failed submit wipes
 * every field. List only fields that are safe to echo back — never a PIN or
 * a password.
 */
export function formValues<K extends string>(formData: FormData, keys: readonly K[]): FormValues<K> {
  const values: FormValues<K> = {};
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === "string") values[key] = value;
  }
  return values;
}
