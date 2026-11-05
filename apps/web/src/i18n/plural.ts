const rules = new Intl.PluralRules('pl');

export interface PluralForms {
  readonly one: string;
  readonly few: string;
  readonly many: string;
}

export function plural(count: number, forms: PluralForms): string {
  switch (rules.select(count)) {
    case 'one':
      return forms.one;
    case 'few':
      return forms.few;
    default:
      return forms.many;
  }
}
