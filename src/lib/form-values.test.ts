import { describe, expect, test } from "bun:test";

import { formValues } from "@/lib/form-values";

describe("formValues", () => {
  test("keeps only the listed fields, as typed", () => {
    const formData = new FormData();
    formData.set("name", "  Chez Mama ");
    formData.set("pin", "1234");
    formData.set("isVeg", "on");

    expect(formValues(formData, ["name", "isVeg"])).toEqual({ name: "  Chez Mama ", isVeg: "on" });
  });

  test("leaves out unchecked checkboxes and files", () => {
    const formData = new FormData();
    formData.set("photo", new File(["x"], "photo.png"));

    expect(formValues(formData, ["isVeg", "photo"])).toEqual({});
  });
});
