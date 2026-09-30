import {
  Injectable,
  Pipe,
  PipeTransform,
  computed,
  effect,
  inject,
} from "@angular/core";
import { formatDate, formatNumber } from "@angular/common";
import { Store } from "./store";
import { applyPresentation, Language, Theme } from "./presentation";
import { ENGLISH } from "./translations";

@Injectable({ providedIn: "root" })
export class I18n {
  private readonly store = inject(Store);
  readonly language = computed(
    () => this.store.data().settings.language ?? "fr",
  );
  readonly theme = computed(() => this.store.data().settings.theme ?? "dark");
  readonly locale = computed(() =>
    this.language() === "en" ? "en-US" : "fr-FR",
  );
  constructor() {
    effect(() => {
      applyPresentation({ language: this.language(), theme: this.theme() });
      document.title =
        this.language() === "en"
          ? "Me-Sim · Your possible futures"
          : "Me-Sim · Tes futurs possibles";
    });
  }
  t = (source: string | null | undefined): string => {
    if (source == null) return "";
    if (this.language() === "fr") return source;
    const key = source.trim().replace(/\s+/g, " ");
    const translated = ENGLISH[key];
    if (translated === undefined) {
      // Paths and other user data appended to these UI messages are preserved verbatim.
      for (const prefix of [
        "Export enregistré : ",
        "Restauration terminée. Copie précédente : ",
      ]) {
        if (source.startsWith(prefix))
          return this.t(prefix) + source.slice(prefix.length);
      }
      return source;
    }
    return source.replace(/\S[\s\S]*\S|\S/, translated);
  };
  async setLanguage(language: string) {
    if (language !== "fr" && language !== "en") return;
    return this.save({ language });
  }
  async setTheme(theme: string) {
    if (theme !== "dark" && theme !== "light") return;
    return this.save({ theme });
  }
  private save(value: { language?: Language; theme?: Theme }) {
    return this.store.mutate({
      type: "settings",
      value: { ...this.store.data().settings, ...value },
    });
  }
  color(source: string): string {
    if (this.theme() === "dark" || !/^#[0-9a-f]{6}$/i.test(source))
      return source;
    // Pastel chart/metric colors need darker foregrounds against light surfaces.
    const rgb = source
      .slice(1)
      .match(/../g)!
      .map((x) => Math.round(parseInt(x, 16) * 0.48));
    return "#" + rgb.map((x) => x.toString(16).padStart(2, "0")).join("");
  }
}
@Pipe({ name: "t", pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18n);
  transform(value: string | null | undefined) {
    return this.i18n.t(value);
  }
}
@Pipe({ name: "localDate", pure: false })
export class LocalDatePipe implements PipeTransform {
  private readonly i18n = inject(I18n);
  transform(
    value: string | number | Date | null | undefined,
    format = "mediumDate",
  ) {
    if (value == null || value === "") return null;
    return formatDate(value, format, this.i18n.locale());
  }
}
@Pipe({ name: "localNumber", pure: false })
export class LocalNumberPipe implements PipeTransform {
  private readonly i18n = inject(I18n);
  transform(value: number | string | null | undefined, digits = "1.0-3") {
    if (value == null || value === "") return null;
    return formatNumber(Number(value), this.i18n.locale(), digits);
  }
}
