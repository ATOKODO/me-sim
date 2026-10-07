import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "fr-FR",
  title: "Me-Sim",
  description:
    "Documentation de Me-Sim : habitudes, avatar rétro et données locales.",
  cleanUrls: true,
  ignoreDeadLinks: false,
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
  ],
  vite: {
    server: { host: "127.0.0.1", port: 5174, strictPort: true },
    preview: { host: "127.0.0.1", port: 4174, strictPort: true },
  },
  themeConfig: {
    logo: "/favicon.svg",
    nav: [
      { text: "Démarrer", link: "/getting-started" },
      { text: "Utilisation", link: "/data-guide" },
      { text: "Design système", link: "/design-system" },
      { text: "Architecture", link: "/architecture" },
    ],
    sidebar: [
      {
        text: "Commencer",
        items: [
          { text: "Présentation", link: "/" },
          { text: "Installation et développement", link: "/getting-started" },
          { text: "Confidentialité", link: "/privacy" },
        ],
      },
      {
        text: "Utiliser et personnaliser",
        items: [
          { text: "Journal, Target et données", link: "/data-guide" },
          { text: "Personnage et animations", link: "/artist-animation-guide" },
          { text: "Limites scientifiques", link: "/model-card" },
        ],
      },
      {
        text: "Contribuer",
        items: [
          { text: "Architecture", link: "/architecture" },
          { text: "Design système et Storybook", link: "/design-system" },
          { text: "Validation et livraison", link: "/validation" },
        ],
      },
      {
        text: "Revues du projet",
        collapsed: true,
        items: [
          {
            text: "Préparation à la livraison · 1 octobre",
            link: "/review-2026-10-01",
          },
          {
            text: "Refactorings · 7 octobre",
            link: "/refactoring-review-2026-10-07",
          },
        ],
      },
    ],
    outline: { level: [2, 3], label: "Sur cette page" },
    docFooter: { prev: "Page précédente", next: "Page suivante" },
    darkModeSwitchLabel: "Apparence",
    lightModeSwitchTitle: "Passer au thème clair",
    darkModeSwitchTitle: "Passer au thème sombre",
    sidebarMenuLabel: "Menu",
    returnToTopLabel: "Retour en haut",
    skipToContentLabel: "Aller au contenu",
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
      },
    },
    footer: {
      message:
        "Documentation locale · aucune donnée personnelle dans les exemples.",
    },
  },
});
