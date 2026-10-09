import { defineConfig, type DefaultTheme } from "vitepress";

function navigation(language: "fr" | "en"): DefaultTheme.Config {
  const en = language === "en";
  const t = (fr: string, english: string) => (en ? english : fr);
  const path = (page: string) => (en ? "/en/" : "/") + page;
  return {
    logo: "/favicon.svg",
    langMenuLabel: t("Changer de langue", "Change language"),
    nav: [
      { text: t("Démarrer", "Get started"), link: path("getting-started") },
      { text: t("Utilisation", "User guide"), link: path("data-guide") },
      {
        text: t("Design système", "Design system"),
        link: path("design-system"),
      },
      { text: t("Architecture", "Architecture"), link: path("architecture") },
    ],
    sidebar: [
      {
        text: t("Commencer", "Start here"),
        items: [
          { text: t("Présentation", "Overview"), link: path("") },
          {
            text: t(
              "Installation et développement",
              "Installation and development",
            ),
            link: path("getting-started"),
          },
          { text: t("Confidentialité", "Privacy"), link: path("privacy") },
        ],
      },
      {
        text: t("Utiliser et personnaliser", "Use and customize"),
        items: [
          {
            text: t("Journal, Target et données", "Journal, Target and data"),
            link: path("data-guide"),
          },
          {
            text: t("Personnage et animations", "Character and animations"),
            link: path("artist-animation-guide"),
          },
          {
            text: t("Limites scientifiques", "Scientific limits"),
            link: path("model-card"),
          },
        ],
      },
      {
        text: t("Contribuer", "Contribute"),
        items: [
          { text: "Architecture", link: path("architecture") },
          {
            text: t(
              "Design système et Storybook",
              "Design system and Storybook",
            ),
            link: path("design-system"),
          },
          {
            text: t("Validation et livraison", "Validation and delivery"),
            link: path("validation"),
          },
        ],
      },
      {
        text: t("Revues du projet", "Project reviews"),
        collapsed: true,
        items: [
          {
            text: t(
              "Préparation à la livraison · 1 octobre",
              "Release readiness · 1 October",
            ),
            link: path("review-2026-10-01"),
          },
          {
            text: t("Refactorings · 7 octobre", "Refactoring · 7 October"),
            link: path("refactoring-review-2026-10-07"),
          },
          {
            text: t(
              "Publication open source · 9 octobre",
              "Open source publication · 9 October",
            ),
            link: path("open-source-review-2026-10-09"),
          },
          {
            text: t(
              "Dépendances et imports · 9 octobre",
              "Dependencies and imports · 9 October",
            ),
            link: path("dependency-import-hardening"),
          },
        ],
      },
    ],
    outline: { level: [2, 3], label: t("Sur cette page", "On this page") },
    docFooter: {
      prev: t("Page précédente", "Previous page"),
      next: t("Page suivante", "Next page"),
    },
    darkModeSwitchLabel: t("Apparence", "Appearance"),
    lightModeSwitchTitle: t("Passer au thème clair", "Switch to light theme"),
    darkModeSwitchTitle: t("Passer au thème sombre", "Switch to dark theme"),
    sidebarMenuLabel: t("Menu", "Menu"),
    returnToTopLabel: t("Retour en haut", "Return to top"),
    skipToContentLabel: t("Aller au contenu", "Skip to content"),
    footer: {
      message: t(
        "Documentation locale · aucune donnée personnelle dans les exemples.",
        "Local documentation · no personal data in the examples.",
      ),
    },
  };
}

export default defineConfig({
  lang: "fr-FR",
  title: "Me-Sim",
  description:
    "Documentation de Me-Sim : habitudes, avatar rétro et données locales.",
  cleanUrls: true,
  ignoreDeadLinks: false,
  locales: {
    root: { label: "Français", lang: "fr-FR" },
    en: {
      label: "English",
      lang: "en-US",
      description:
        "Me-Sim documentation: habits, a retro avatar and local data.",
      themeConfig: navigation("en"),
    },
  },
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
  ],
  vite: {
    server: { host: "127.0.0.1", port: 5174, strictPort: true },
    preview: { host: "127.0.0.1", port: 4174, strictPort: true },
  },
  themeConfig: {
    ...navigation("fr"),
    search: {
      provider: "local",
      options: {
        disableQueryPersistence: true,
        translations: {
          button: {
            buttonText: "Rechercher",
            buttonAriaLabel: "Rechercher dans la documentation",
          },
          modal: {
            noResultsText: "Aucun résultat pour",
            resetButtonTitle: "Effacer la recherche",
            backButtonTitle: "Fermer la recherche",
            displayDetails: "Afficher les détails",
            footer: {
              selectText: "Sélectionner",
              selectKeyAriaLabel: "Entrée",
              navigateText: "Naviguer",
              navigateUpKeyAriaLabel: "Flèche vers le haut",
              navigateDownKeyAriaLabel: "Flèche vers le bas",
              closeText: "Fermer",
              closeKeyAriaLabel: "Échap",
            },
          },
        },
        locales: {
          en: {
            translations: {
              button: {
                buttonText: "Search",
                buttonAriaLabel: "Search documentation",
              },
              modal: {
                noResultsText: "No results for",
                resetButtonTitle: "Clear search",
                backButtonTitle: "Close search",
                displayDetails: "Show details",
                footer: {
                  selectText: "Select",
                  selectKeyAriaLabel: "Enter",
                  navigateText: "Navigate",
                  navigateUpKeyAriaLabel: "Arrow up",
                  navigateDownKeyAriaLabel: "Arrow down",
                  closeText: "Close",
                  closeKeyAriaLabel: "Escape",
                },
              },
            },
          },
        },
      },
    },
  },
});
