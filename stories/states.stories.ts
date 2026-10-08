import { moduleMetadata, type Meta, type StoryObj } from "@storybook/angular";
import { Icon } from "../src/app/core/icon";
import { UiButton } from "../src/app/ui/button";
const meta: Meta = {
  title: "États/Interface",
  decorators: [moduleMetadata({ imports: [Icon, UiButton] })],
};
export default meta;
export const Formulaire: StoryObj = {
  render: () => ({
    template:
      '<div class="ds-stack"><h1>Saisir une observation</h1><form class="ds-form" (submit)="$event.preventDefault()"><label>Poids (kg)<input type="number" value="75.9" step="0.1" /></label><label>Métrique<select><option>Poids</option><option>Sommeil</option></select></label><label>Valeur invalide<input type="number" value="-1" aria-invalid="true" aria-describedby="value-error" /><span id="value-error" class="ds-error">La valeur doit être positive.</span></label><label>Champ indisponible<input value="Simulation en validation" disabled /></label><label><span>Animations</span><input type="checkbox" checked /></label><button uiButton="primary" type="submit">Enregistrer</button></form></div>',
  }),
};
export const Messages: StoryObj = {
  render: () => ({
    template:
      '<div class="ds-stack"><h1>Retours de saisie</h1><div class="notice" role="status"><ui-icon name="check" />Enregistré sur cet appareil.</div><div class="notice error" role="alert"><ui-icon name="info" />Les données ont changé dans une autre fenêtre. Vérifie ton brouillon avant de réessayer.</div><p>Une erreur explicite conserve le contexte de la saisie.</p></div>',
  }),
};
export const Vide: StoryObj = {
  render: () => ({
    template:
      '<section class="panel empty-state"><h2>Aucune observation pour le moment</h2><p>Commence par une mesure. Une donnée absente reste inconnue.</p><button uiButton="primary"><ui-icon name="plus" />Ajouter une mesure</button></section>',
  }),
};
