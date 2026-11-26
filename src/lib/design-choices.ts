/**
 * Small look-and-feel decisions that can be tried live on /design before they become the default.
 * Each one is a data-* attribute on <html> that tokens.css (or a component) reads. A pick is kept
 * in this browser only, so trying one never changes what members see. To make a pick the default
 * for everyone, change the default value in src/styles/tokens.css (or here, for `boardCovers`).
 */
export type Choice = { id: string; attr: string; label: string; why: string; options: { value: string; label: string }[] };

export const CHOICES: Choice[] = [
  {
    id: "toggle",
    attr: "data-toggle",
    label: "Switch color",
    why: "Every switch in the app uses this one color.",
    options: [
      { value: "", label: "Green (iOS)" },
      { value: "teal", label: "Teal gel" },
      { value: "paper", label: "Paper" },
    ],
  },
  {
    id: "bubbles",
    attr: "data-bubbles",
    label: "Your chat bubbles",
    why: "Teal gives Messages its color; Paper is the old, brighter look.",
    options: [
      { value: "", label: "Teal tint" },
      { value: "paper", label: "Paper" },
    ],
  },
  {
    id: "gels",
    attr: "data-gels",
    label: "Color glow strength",
    why: "How strongly each tab's gel lights the top of the screen.",
    options: [
      { value: "soft", label: "Soft" },
      { value: "", label: "Standard" },
      { value: "strong", label: "Strong" },
    ],
  },
  {
    id: "titles",
    attr: "data-titles",
    label: "Title weight",
    why: "Screen and section titles.",
    options: [
      { value: "lighter", label: "Lighter (560)" },
      { value: "", label: "Standard (620)" },
      { value: "bolder", label: "Bolder (680)" },
    ],
  },
  {
    id: "fields",
    attr: "data-fields",
    label: "Text field shape",
    why: "Inputs and text areas. Search bars are always pills.",
    options: [
      { value: "", label: "Rounded" },
      { value: "pill", label: "Pill" },
    ],
  },
];

export const CHOICE_KEY = "mixstro:design-choices";

/** Runs before paint (inlined in the root layout) so a tried-out look never flashes the default first. */
export const CHOICE_BOOT = `try{var c=JSON.parse(localStorage.getItem(${JSON.stringify(CHOICE_KEY)})||"{}");for(var k in c){if(/^data-[a-z]+$/.test(k)&&/^[a-z]*$/.test(c[k])&&c[k])document.documentElement.setAttribute(k,c[k])}}catch(e){}`;
